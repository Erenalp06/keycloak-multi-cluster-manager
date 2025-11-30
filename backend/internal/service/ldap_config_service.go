package service

import (
	"fmt"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/repository/postgres"
)

type LDAPConfigService struct {
	repo               *postgres.LDAPConfigRepository
	certificateService *CertificateService
}

func NewLDAPConfigService(repo *postgres.LDAPConfigRepository, certService *CertificateService) *LDAPConfigService {
	return &LDAPConfigService{
		repo:               repo,
		certificateService: certService,
	}
}

func (s *LDAPConfigService) Get() (*domain.LDAPConfig, error) {
	return s.repo.Get()
}

func (s *LDAPConfigService) Update(req *domain.UpdateLDAPConfigRequest) (*domain.LDAPConfig, error) {
	return s.repo.Update(req)
}

func (s *LDAPConfigService) TestConnection() error {
	config, err := s.repo.Get()
	if err != nil {
		return err
	}

	ldapService := NewLDAPService(config, s.certificateService)
	return ldapService.TestConnection()
}

// FetchAndSaveCertificate fetches certificate from AD server and saves it
func (s *LDAPConfigService) FetchAndSaveCertificate() (*domain.CertificateInfo, error) {
	config, err := s.repo.Get()
	if err != nil {
		return nil, err
	}
	
	if !config.Enabled {
		return nil, fmt.Errorf("LDAP is not enabled")
	}
	
	if !config.UseSSL && !config.UseTLS {
		return nil, fmt.Errorf("SSL or TLS must be enabled to fetch certificate")
	}
	
	// Fetch certificate
	certInfo, certPEM, err := s.certificateService.FetchCertificate(config.ServerURL, config.UseSSL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch certificate: %w", err)
	}
	
	// Calculate fingerprint from certPEM
	fingerprint := s.certificateService.CalculateFingerprintFromPEM(certPEM)
	
	// Extract hostname for file naming
	host, _, _ := s.certificateService.ParseServerURL(config.ServerURL, config.UseSSL)
	
	// Save to file
	_, err = s.certificateService.SaveCertificate(certPEM, host)
	if err != nil {
		return nil, fmt.Errorf("failed to save certificate to file: %w", err)
	}
	
	// Save to database
	err = s.repo.UpdateCertificate(certPEM, certInfo, fingerprint)
	if err != nil {
		return nil, fmt.Errorf("failed to save certificate to database: %w", err)
	}
	
	return certInfo, nil
}

// DeleteCertificate removes the certificate
func (s *LDAPConfigService) DeleteCertificate() error {
	return s.repo.DeleteCertificate()
}

