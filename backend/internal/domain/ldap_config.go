package domain

import "time"

// LDAPConfig represents LDAP authentication configuration
type LDAPConfig struct {
	ID                  int                    `json:"id"`
	Enabled             bool                   `json:"enabled"`
	ServerURL           string                 `json:"server_url"`
	BindDN              string                 `json:"bind_dn"`
	BindPassword        string                 `json:"bind_password,omitempty"` // Omit from JSON responses
	UserSearchBase      string                 `json:"user_search_base"`
	UserSearchFilter    string                 `json:"user_search_filter"`
	GroupSearchBase     string                 `json:"group_search_base,omitempty"`
	GroupSearchFilter   string                 `json:"group_search_filter,omitempty"`
	UseSSL              bool                   `json:"use_ssl"`
	UseTLS              bool                   `json:"use_tls"`
	SkipVerify          bool                   `json:"skip_verify"`
	TimeoutSeconds      int                    `json:"timeout_seconds"`
	CertificatePEM      string                 `json:"certificate_pem,omitempty"`
	CertificateInfo     *CertificateInfo       `json:"certificate_info,omitempty"`
	CertificateFingerprint string              `json:"certificate_fingerprint,omitempty"`
	CreatedAt           time.Time              `json:"created_at"`
	UpdatedAt           time.Time              `json:"updated_at"`
}

// CertificateInfo contains parsed certificate information
type CertificateInfo struct {
	Subject            string    `json:"subject"`
	Issuer             string    `json:"issuer"`
	SerialNumber       string    `json:"serial_number"`
	NotBefore          time.Time `json:"not_before"`
	NotAfter           time.Time `json:"not_after"`
	DNSNames           []string  `json:"dns_names,omitempty"`
	IPAddresses        []string  `json:"ip_addresses,omitempty"`
	SignatureAlgorithm string    `json:"signature_algorithm"`
	PublicKeyAlgorithm string    `json:"public_key_algorithm"`
}

// UpdateLDAPConfigRequest represents a request to update LDAP configuration
type UpdateLDAPConfigRequest struct {
	Enabled           bool   `json:"enabled"`
	ServerURL         string `json:"server_url" validate:"required"`
	BindDN            string `json:"bind_dn" validate:"required"`
	BindPassword      string `json:"bind_password"`
	UserSearchBase    string `json:"user_search_base" validate:"required"`
	UserSearchFilter  string `json:"user_search_filter"`
	GroupSearchBase   string `json:"group_search_base"`
	GroupSearchFilter string `json:"group_search_filter"`
	UseSSL            bool   `json:"use_ssl"`
	UseTLS            bool   `json:"use_tls"`
	SkipVerify        bool   `json:"skip_verify"`
	TimeoutSeconds    int    `json:"timeout_seconds"`
}

// LDAPLoginRequest represents a request to login via LDAP
type LDAPLoginRequest struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

