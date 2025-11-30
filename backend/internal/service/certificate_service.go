package service

import (
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
	"time"

	"keycloak-multi-manage/internal/domain"
)

type CertificateService struct {
	certDir string
}

func NewCertificateService(certDir string) *CertificateService {
	// Create cert directory if it doesn't exist
	if certDir == "" {
		certDir = "/opt/mcm/certs"
	}
	os.MkdirAll(certDir, 0755)
	
	return &CertificateService{
		certDir: certDir,
	}
}

// FetchCertificate connects to AD server and fetches the certificate
func (s *CertificateService) FetchCertificate(serverURL string, useSSL bool) (*domain.CertificateInfo, string, error) {
	// Extract host:port from URL
	host, port, err := s.ParseServerURL(serverURL, useSSL)
	if err != nil {
		return nil, "", err
	}
	
	// Connect with TLS to fetch certificate
	// We use InsecureSkipVerify to accept any certificate during fetch
	conn, err := tls.DialWithDialer(
		&net.Dialer{Timeout: 10 * time.Second},
		"tcp",
		fmt.Sprintf("%s:%s", host, port),
		&tls.Config{
			InsecureSkipVerify: true, // We want to fetch the cert even if it's invalid
		},
	)
	if err != nil {
		return nil, "", fmt.Errorf("failed to connect to server: %w", err)
	}
	defer conn.Close()
	
	// Get the peer certificate
	state := conn.ConnectionState()
	if len(state.PeerCertificates) == 0 {
		return nil, "", errors.New("no certificate received from server")
	}
	
	cert := state.PeerCertificates[0]
	
	// Parse certificate information
	certInfo := &domain.CertificateInfo{
		Subject:            cert.Subject.String(),
		Issuer:             cert.Issuer.String(),
		SerialNumber:       cert.SerialNumber.String(),
		NotBefore:          cert.NotBefore,
		NotAfter:           cert.NotAfter,
		SignatureAlgorithm: cert.SignatureAlgorithm.String(),
		PublicKeyAlgorithm: cert.PublicKeyAlgorithm.String(),
	}
	
	// Extract DNS names and IP addresses
	if len(cert.DNSNames) > 0 {
		certInfo.DNSNames = cert.DNSNames
	}
	if len(cert.IPAddresses) > 0 {
		ips := make([]string, len(cert.IPAddresses))
		for i, ip := range cert.IPAddresses {
			ips[i] = ip.String()
		}
		certInfo.IPAddresses = ips
	}
	
	// Export certificate to PEM format
	certPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "CERTIFICATE",
		Bytes: cert.Raw,
	})
	
	return certInfo, string(certPEM), nil
}

// SaveCertificate saves the certificate to file and returns the file path
func (s *CertificateService) SaveCertificate(certPEM string, host string) (string, error) {
	// Sanitize hostname for filename
	filename := strings.ReplaceAll(host, ".", "_")
	filename = strings.ReplaceAll(filename, ":", "_")
	filePath := filepath.Join(s.certDir, fmt.Sprintf("%s.pem", filename))
	
	err := os.WriteFile(filePath, []byte(certPEM), 0644)
	if err != nil {
		return "", fmt.Errorf("failed to save certificate: %w", err)
	}
	
	return filePath, nil
}

// LoadCertificateFromFile loads a certificate from file
func (s *CertificateService) LoadCertificateFromFile(filePath string) (*x509.Certificate, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}
	
	block, _ := pem.Decode(data)
	if block == nil {
		return nil, errors.New("failed to decode PEM block")
	}
	
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse certificate: %w", err)
	}
	
	return cert, nil
}

// GetCertPoolFromPEM creates a CertPool from PEM data
func (s *CertificateService) GetCertPoolFromPEM(certPEM string) (*x509.CertPool, error) {
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM([]byte(certPEM)) {
		return nil, errors.New("failed to append certificate to pool")
	}
	return pool, nil
}

// calculateFingerprint calculates SHA256 fingerprint of certificate
func (s *CertificateService) calculateFingerprint(certDER []byte) string {
	hash := sha256.Sum256(certDER)
	return hex.EncodeToString(hash[:])
}

// calculateFingerprintFromPEM calculates SHA256 fingerprint from PEM string
func (s *CertificateService) CalculateFingerprintFromPEM(certPEM string) string {
	block, _ := pem.Decode([]byte(certPEM))
	if block == nil {
		return ""
	}
	return s.calculateFingerprint(block.Bytes)
}

// ParseServerURL extracts host and port from server URL
func (s *CertificateService) ParseServerURL(serverURL string, useSSL bool) (string, string, error) {
	// Remove protocol prefix
	url := strings.TrimPrefix(serverURL, "ldaps://")
	url = strings.TrimPrefix(url, "ldap://")
	url = strings.TrimSuffix(url, "/")
	
	// Split host:port
	parts := strings.Split(url, ":")
	if len(parts) == 2 {
		return parts[0], parts[1], nil
	} else if len(parts) == 1 {
		// Default port based on SSL
		if useSSL {
			return parts[0], "636", nil
		}
		return parts[0], "389", nil
	}
	
	return "", "", fmt.Errorf("invalid server URL format: %s", serverURL)
}

