package service

import (
	"crypto/tls"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/go-ldap/ldap/v3"
	"keycloak-multi-manage/internal/domain"
)

type LDAPService struct {
	config            *domain.LDAPConfig
	certificateService *CertificateService
}

func NewLDAPService(config *domain.LDAPConfig, certService *CertificateService) *LDAPService {
	return &LDAPService{
		config:            config,
		certificateService: certService,
	}
}

// Authenticate authenticates a user against LDAP
func (s *LDAPService) Authenticate(username, password string) (*domain.User, error) {
	if !s.config.Enabled {
		return nil, errors.New("LDAP authentication is not enabled")
	}

	// Connect to LDAP server
	conn, err := s.connect()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to LDAP server: %w", err)
	}
	defer conn.Close()

	// Bind with service account
	err = conn.Bind(s.config.BindDN, s.config.BindPassword)
	if err != nil {
		return nil, fmt.Errorf("failed to bind with service account: %w", err)
	}

	// Search for user
	searchFilter := strings.ReplaceAll(s.config.UserSearchFilter, "{0}", ldap.EscapeFilter(username))
	searchRequest := ldap.NewSearchRequest(
		s.config.UserSearchBase,
		ldap.ScopeWholeSubtree,
		ldap.NeverDerefAliases,
		0,
		int(time.Duration(s.config.TimeoutSeconds)*time.Second),
		false,
		searchFilter,
		[]string{"dn", "uid", "cn", "mail", "sn", "givenName"},
		nil,
	)

	sr, err := conn.Search(searchRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to search for user: %w", err)
	}

	if len(sr.Entries) == 0 {
		return nil, errors.New("user not found in LDAP")
	}

	if len(sr.Entries) > 1 {
		return nil, errors.New("multiple users found with the same username")
	}

	userDN := sr.Entries[0].DN

	// Authenticate user with their password
	err = conn.Bind(userDN, password)
	if err != nil {
		return nil, errors.New("invalid username or password")
	}

	// Extract user attributes
	entry := sr.Entries[0]
	user := &domain.User{
		Username: username,
		Role:     domain.RoleUser, // Default role for LDAP users
	}

	// Get email
	if mail := entry.GetAttributeValue("mail"); mail != "" {
		user.Email = mail
	} else {
		// Fallback: use username@domain if email not found
		user.Email = username + "@ldap.local"
	}

	// Get display name
	if cn := entry.GetAttributeValue("cn"); cn != "" {
		// Could store in a separate field if needed
		_ = cn
	}

	return user, nil
}

// TestConnection tests the LDAP connection with current configuration
func (s *LDAPService) TestConnection() error {
	if !s.config.Enabled {
		return errors.New("LDAP authentication is not enabled")
	}

	conn, err := s.connect()
	if err != nil {
		return fmt.Errorf("failed to connect to LDAP server: %w", err)
	}
	defer conn.Close()

	// Try to bind with service account
	err = conn.Bind(s.config.BindDN, s.config.BindPassword)
	if err != nil {
		return fmt.Errorf("failed to bind with service account: %w", err)
	}

	return nil
}

func (s *LDAPService) connect() (*ldap.Conn, error) {
	var conn *ldap.Conn
	var err error

	// Build TLS config
	tlsConfig := &tls.Config{
		InsecureSkipVerify: s.config.SkipVerify,
	}
	
	// If certificate is available and we're not skipping verify, use it
	if !s.config.SkipVerify && s.config.CertificatePEM != "" && s.certificateService != nil {
		certPool, err := s.certificateService.GetCertPoolFromPEM(s.config.CertificatePEM)
		if err == nil {
			tlsConfig.RootCAs = certPool
			tlsConfig.InsecureSkipVerify = false
		}
	}

	// Determine protocol
	if s.config.UseSSL {
		// LDAPS - DialTLS expects host:port format, not full URL
		// Extract host:port from URL
		serverURL := s.config.ServerURL
		if strings.HasPrefix(serverURL, "ldaps://") {
			serverURL = strings.TrimPrefix(serverURL, "ldaps://")
		}
		// Remove trailing slash if present
		serverURL = strings.TrimSuffix(serverURL, "/")
		
		conn, err = ldap.DialTLS("tcp", serverURL, tlsConfig)
	} else {
		// LDAP - DialURL accepts full URL
		conn, err = ldap.DialURL(s.config.ServerURL)
	}

	if err != nil {
		return nil, err
	}

	// Set timeout
	timeout := time.Duration(s.config.TimeoutSeconds) * time.Second
	conn.SetTimeout(timeout)

	// Start TLS if needed
	if !s.config.UseSSL && s.config.UseTLS {
		err = conn.StartTLS(tlsConfig)
		if err != nil {
			conn.Close()
			return nil, fmt.Errorf("failed to start TLS: %w", err)
		}
	}

	return conn, nil
}

