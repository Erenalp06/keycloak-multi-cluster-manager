package domain

// UserFederationProvider represents a user federation provider in Keycloak
// This is a realm-specific configuration for LDAP/AD integration
type UserFederationProvider struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	ProviderID  string                 `json:"provider_id"`  // e.g., "ldap"
	ProviderType string                `json:"provider_type"` // e.g., "org.keycloak.storage.UserStorageProvider"
	Config      map[string][]string    `json:"config"`        // Keycloak stores config as map[string][]string
	ParentID    string                 `json:"parent_id"`
	Enabled     bool                   `json:"enabled"`
}

// CreateUserFederationProviderRequest represents a request to create a user federation provider
type CreateUserFederationProviderRequest struct {
	Name                string            `json:"name" validate:"required"`
	ProviderID          string            `json:"provider_id"` // Default: "ldap"
	Enabled             bool              `json:"enabled"`
	Config              map[string]string `json:"config" validate:"required"`
}

// UpdateUserFederationProviderRequest represents a request to update a user federation provider
type UpdateUserFederationProviderRequest struct {
	Name    string            `json:"name"`
	Enabled bool              `json:"enabled"`
	Config  map[string]string `json:"config"`
}

// TestConnectionRequest represents a request to test connection
type TestConnectionRequest struct {
	ProviderID string `json:"provider_id,omitempty"` // Optional, if not provided, will test new config
	Config     map[string]string `json:"config,omitempty"` // Optional, for testing new config before creation
}

// TestLDAPConnectionRequest represents a request to test LDAP connection (URL only)
type TestLDAPConnectionRequest struct {
	ConnectionURL string `json:"connection_url" validate:"required"`
}

// TestLDAPAuthenticationRequest represents a request to test LDAP authentication (URL + Bind DN + Credential)
type TestLDAPAuthenticationRequest struct {
	ConnectionURL string `json:"connection_url" validate:"required"`
	BindDN        string `json:"bind_dn" validate:"required"`
	BindCredential string `json:"bind_credential" validate:"required"`
}

// SyncUserFederationRequest represents a request to sync users from federation
type SyncUserFederationRequest struct {
	Action string `json:"action" validate:"required,oneof=triggerFullSync triggerChangedUsersSync triggerLdapKeyCache"`
}


