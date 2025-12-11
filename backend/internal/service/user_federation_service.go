package service

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"keycloak-multi-manage/internal/client/keycloak"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/repository/postgres"
	"github.com/go-ldap/ldap/v3"
)

type UserFederationService struct {
	clusterRepo    *postgres.ClusterRepository
	keycloakClient *keycloak.Client
}

func NewUserFederationService(clusterRepo *postgres.ClusterRepository) *UserFederationService {
	return &UserFederationService{
		clusterRepo:    clusterRepo,
		keycloakClient: keycloak.NewClient(),
	}
}

// GetUserFederationProviders gets all user federation providers for a realm in a cluster
func (s *UserFederationService) GetUserFederationProviders(clusterID int, realm string) ([]domain.UserFederationProvider, error) {
	cluster, err := s.clusterRepo.GetByID(clusterID)
	if err != nil {
		return nil, fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}

	// Get access token using client credentials
	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}
	accessToken := tokenResp.AccessToken

	// Use the provided realm or cluster's realm
	targetRealm := realm
	if targetRealm == "" {
		targetRealm = cluster.Realm
	}

	// Get providers from Keycloak
	providers, err := s.keycloakClient.GetUserFederationProviders(cluster.BaseURL, targetRealm, accessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get user federation providers: %w", err)
	}

	// Debug log
	fmt.Printf("GetUserFederationProviders: targetRealm=%s, rawProvidersCount=%d\n", targetRealm, len(providers))

	// Convert to domain models
	// Note: Keycloak API already filters by realm, so we don't need to filter by parentId
	// parentId is the realm ID (UUID), not the realm name
	result := make([]domain.UserFederationProvider, 0, len(providers))
	for _, p := range providers {
		providerID := getString(p, "id")
		providerName := getString(p, "name")
		parentID := getString(p, "parentId")
		
		// Debug log
		fmt.Printf("Processing provider: id=%s, name=%s, parentId=%s, targetRealm=%s\n", providerID, providerName, parentID, targetRealm)
		
		provider := domain.UserFederationProvider{
			ID:          providerID,
			Name:        providerName,
			ProviderID:  getString(p, "providerId"),
			ProviderType: getString(p, "providerType"),
			ParentID:    parentID,
		}

		// Handle config (Keycloak returns map[string][]string)
		if config, ok := p["config"].(map[string]interface{}); ok {
			provider.Config = make(map[string][]string)
			for k, v := range config {
				if arr, ok := v.([]interface{}); ok {
					strArr := make([]string, 0, len(arr))
					for _, item := range arr {
						if str, ok := item.(string); ok {
							strArr = append(strArr, str)
						}
					}
					provider.Config[k] = strArr
				}
			}

			// Check enabled status from config
			if enabledVal, ok := config["enabled"]; ok {
				if arr, ok := enabledVal.([]interface{}); ok && len(arr) > 0 {
					if str, ok := arr[0].(string); ok {
						provider.Enabled = str == "true"
					}
				}
			}
		}

		result = append(result, provider)
		fmt.Printf("Added provider to result: id=%s, name=%s\n", provider.ID, provider.Name)
	}

	fmt.Printf("GetUserFederationProviders: returning %d providers\n", len(result))
	return result, nil
}

// GetUserFederationProvider gets a specific user federation provider
func (s *UserFederationService) GetUserFederationProvider(clusterID int, realm, providerID string) (*domain.UserFederationProvider, error) {
	cluster, err := s.clusterRepo.GetByID(clusterID)
	if err != nil {
		return nil, fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}

	// Get access token using client credentials
	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}
	accessToken := tokenResp.AccessToken

	// Use the provided realm or cluster's realm
	targetRealm := realm
	if targetRealm == "" {
		targetRealm = cluster.Realm
	}

	// Get provider from Keycloak
	providerMap, err := s.keycloakClient.GetUserFederationProvider(cluster.BaseURL, targetRealm, accessToken, providerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user federation provider: %w", err)
	}

	// Convert to domain model
	provider := &domain.UserFederationProvider{
		ID:          getString(providerMap, "id"),
		Name:        getString(providerMap, "name"),
		ProviderID:  getString(providerMap, "providerId"),
		ProviderType: getString(providerMap, "providerType"),
		ParentID:    getString(providerMap, "parentId"),
	}

	// Handle config
	if config, ok := providerMap["config"].(map[string]interface{}); ok {
		provider.Config = make(map[string][]string)
		for k, v := range config {
			if arr, ok := v.([]interface{}); ok {
				strArr := make([]string, 0, len(arr))
				for _, item := range arr {
					if str, ok := item.(string); ok {
						strArr = append(strArr, str)
					}
				}
				provider.Config[k] = strArr
			}
		}

		// Check enabled status
		if enabledVal, ok := config["enabled"]; ok {
			if arr, ok := enabledVal.([]interface{}); ok && len(arr) > 0 {
				if str, ok := arr[0].(string); ok {
					provider.Enabled = str == "true"
				}
			}
		}
	}

	return provider, nil
}

// CreateUserFederationProvider creates a new user federation provider
func (s *UserFederationService) CreateUserFederationProvider(clusterID int, realm string, req domain.CreateUserFederationProviderRequest) (*domain.UserFederationProvider, error) {
	cluster, err := s.clusterRepo.GetByID(clusterID)
	if err != nil {
		return nil, fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}

	// Get access token using client credentials
	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}
	accessToken := tokenResp.AccessToken

	// Use the provided realm or cluster's realm
	targetRealm := realm
	if targetRealm == "" {
		targetRealm = cluster.Realm
	}

	// Get realm UUID - parentId must be realm UUID, not realm name
	realmInfo, err := s.keycloakClient.ExportRealm(cluster.BaseURL, targetRealm, accessToken)
	var realmID string
	if err == nil {
		// Realm config contains "id" field which is the UUID
		if id, ok := realmInfo["id"].(string); ok && id != "" {
			realmID = id
			fmt.Printf("Got realm UUID: %s for realm: %s\n", realmID, targetRealm)
		}
	}
	// Fail if we couldn't get realm UUID - this is critical for provider creation
	if realmID == "" {
		return nil, fmt.Errorf("could not determine realm UUID for realm: %s", targetRealm)
	}

	// Convert config from map[string]string to map[string][]string (Keycloak format)
	providerConfig := make(map[string]interface{})
	// Clean control characters from user input fields only
	providerConfig["name"] = cleanControlChars(req.Name)
	providerIDValue := cleanControlChars(req.ProviderID)
	if providerIDValue == "" {
		providerIDValue = "ldap"
	}
	providerConfig["providerId"] = providerIDValue
	providerConfig["providerType"] = "org.keycloak.storage.UserStorageProvider"
	providerConfig["parentId"] = realmID // Must be realm UUID, not realm name

	// Convert config map[string]string to map[string][]string
	// Clean control characters from all values to prevent Keycloak loading issues
	config := make(map[string][]string)
	
	// Preserve original searchScope value before cleaning (if provided by UI)
	originalSearchScope := ""
	if scopeVal, ok := req.Config["searchScope"]; ok && scopeVal != "" {
		originalSearchScope = scopeVal
	}
	
	for k, v := range req.Config {
		cleaned := cleanControlChars(v)
		config[k] = []string{cleaned}
	}
	
	// Set required Keycloak fields
	// Edit Mode is mandatory for LDAP providers
	if config["editMode"] == nil || len(config["editMode"]) == 0 || config["editMode"][0] == "" {
		config["editMode"] = []string{"READ_ONLY"} // Default to READ_ONLY, other options: UNSYNCED, WRITABLE
	}
	
	// Set enabled
	if req.Enabled {
		config["enabled"] = []string{"true"}
	} else {
		config["enabled"] = []string{"false"}
	}
	
	// Set priority (default to "0") - overwrite empty strings
	if config["priority"] == nil || len(config["priority"]) == 0 || config["priority"][0] == "" {
		config["priority"] = []string{"0"}
	}
	
	// Set default values for other required fields if not provided
	vendorValue := "other"
	if config["vendor"] != nil && len(config["vendor"]) > 0 && config["vendor"][0] != "" {
		vendorValue = config["vendor"][0]
	} else {
		config["vendor"] = []string{"other"} // Default vendor, can be "ad", "rhds", "other", "tivoli", "edirectory", "novell"
	}
	
	// Set correct userObjectClasses for AD if vendor is "ad" and objectClasses not provided
	if vendorValue == "ad" {
		if config["userObjectClasses"] == nil || len(config["userObjectClasses"]) == 0 || config["userObjectClasses"][0] == "" {
			config["userObjectClasses"] = []string{"person,organizationalPerson,user"}
		}
		// Also set correct uuidLDAPAttribute for AD
		if config["uuidLDAPAttribute"] == nil || len(config["uuidLDAPAttribute"]) == 0 || config["uuidLDAPAttribute"][0] == "" {
			config["uuidLDAPAttribute"] = []string{"objectGUID"}
		}
	}
	if config["connectionPooling"] == nil || len(config["connectionPooling"]) == 0 {
		config["connectionPooling"] = []string{"true"}
	}
	if config["authType"] == nil || len(config["authType"]) == 0 {
		config["authType"] = []string{"simple"}
	}
	if config["startTls"] == nil || len(config["startTls"]) == 0 {
		config["startTls"] = []string{"false"}
	}
	if config["pagination"] == nil || len(config["pagination"]) == 0 {
		config["pagination"] = []string{"true"}
	}
	if config["importEnabled"] == nil || len(config["importEnabled"]) == 0 {
		config["importEnabled"] = []string{"true"}
	}
	if config["syncRegistrations"] == nil || len(config["syncRegistrations"]) == 0 {
		config["syncRegistrations"] = []string{"true"}
	}
	// searchScope should be "1" (ONE_LEVEL) or "2" (SUBTREE) for Keycloak API
	// NEVER override UI-provided value - only set default if UI sent empty
	if originalSearchScope != "" {
		// UI provided a value - use it (after cleaning and normalization)
		scopeValue := strings.TrimSpace(strings.ToUpper(cleanControlChars(originalSearchScope)))
		if scopeValue == "1" || scopeValue == "ONE_LEVEL" {
			config["searchScope"] = []string{"1"} // Keycloak API expects "1" for ONE_LEVEL
		} else if scopeValue == "2" || scopeValue == "SUBTREE" {
			config["searchScope"] = []string{"2"} // Keycloak API expects "2" for SUBTREE
		} else {
			// Invalid value from UI, use default
			config["searchScope"] = []string{"1"} // Default to "1" (ONE_LEVEL)
		}
	} else {
		// UI did not provide searchScope - set default
		config["searchScope"] = []string{"1"} // Default to "1" (ONE_LEVEL)
	}
	
	// Clean up userObjectClasses - remove extra spaces after commas and control chars
	// Only clean user input fields (not system-generated values)
	if userObjectClasses, ok := config["userObjectClasses"]; ok && len(userObjectClasses) > 0 {
		cleaned := strings.ReplaceAll(userObjectClasses[0], ", ", ",")
		cleaned = cleanControlChars(cleaned)
		config["userObjectClasses"] = []string{cleaned}
	}
	
	// Clean control characters from user input fields only
	// Don't clean system-generated values like "true", "false", "0", etc.
	userInputFields := []string{"connectionUrl", "bindDn", "bindCredential", "usersDn", 
		"usernameLDAPAttribute", "rdnLDAPAttribute", "uuidLDAPAttribute", "userObjectClasses",
		"connectionTimeout", "readTimeout", "customUserSearchFilter", "relativeCreateDn"}
	for _, field := range userInputFields {
		if val, ok := config[field]; ok && len(val) > 0 {
			config[field] = []string{cleanControlChars(val[0])}
		}
	}
	
	providerConfig["config"] = config

	// Log the request being sent to Keycloak (mask sensitive data)
	logConfig := make(map[string]interface{})
	for k, v := range config {
		if k == "bindCredential" {
			// Mask password
			if len(v) > 0 && v[0] != "" {
				logConfig[k] = []string{"********"}
			} else {
				logConfig[k] = v
			}
		} else {
			logConfig[k] = v
		}
	}
	logProviderConfig := make(map[string]interface{})
	logProviderConfig["name"] = providerConfig["name"]
	logProviderConfig["providerId"] = providerConfig["providerId"]
	logProviderConfig["providerType"] = providerConfig["providerType"]
	logProviderConfig["parentId"] = providerConfig["parentId"]
	logProviderConfig["config"] = logConfig
	
	requestJSON, _ := json.MarshalIndent(logProviderConfig, "", "  ")
	fmt.Printf("========================================\n")
	fmt.Printf("CreateUserFederationProvider Request:\n")
	fmt.Printf("Cluster: %s (ID: %d)\n", cluster.Name, cluster.ID)
	fmt.Printf("Realm: %s (UUID: %s)\n", targetRealm, realmID)
	fmt.Printf("Request Body:\n%s\n", string(requestJSON))
	fmt.Printf("========================================\n")

	// Create provider in Keycloak
	providerID, err := s.keycloakClient.CreateUserFederationProvider(cluster.BaseURL, targetRealm, accessToken, providerConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create user federation provider: %w", err)
	}

	fmt.Printf("Created provider with ID: %s, waiting for Keycloak to process...\n", providerID)

	// Wait longer for Keycloak to fully process the creation
	// Keycloak sometimes needs time to index and make the provider available
	time.Sleep(1 * time.Second)

	// Get the created provider - retry a few times if needed
	var provider *domain.UserFederationProvider
	maxRetries := 5
	for i := 0; i < maxRetries; i++ {
		if i > 0 {
			time.Sleep(time.Duration(500*(i)) * time.Millisecond) // Increasing delay: 0.5s, 1s, 1.5s, 2s, 2.5s
		}
		provider, err = s.GetUserFederationProvider(clusterID, targetRealm, providerID)
		if err == nil && provider != nil {
			fmt.Printf("Successfully retrieved provider after %d retries\n", i+1)
			break
		}
		fmt.Printf("Retry %d/%d: Failed to get provider, error: %v\n", i+1, maxRetries, err)
	}
	
	if provider == nil {
		// If we still can't get it, return a basic provider with the ID we know
		fmt.Printf("Warning: Could not retrieve provider after %d retries, returning basic provider info\n", maxRetries)
		provider = &domain.UserFederationProvider{
			ID:          providerID,
			Name:        req.Name,
			ProviderID:  req.ProviderID,
			ProviderType: "org.keycloak.storage.UserStorageProvider",
			ParentID:    realmID,
			Enabled:     req.Enabled,
			Config:      make(map[string][]string),
		}
		// Convert config
		for k, v := range req.Config {
			provider.Config[k] = []string{v}
		}
	}
	
	return provider, nil
}

// UpdateUserFederationProvider updates an existing user federation provider
func (s *UserFederationService) UpdateUserFederationProvider(clusterID int, realm, providerID string, req domain.UpdateUserFederationProviderRequest) (*domain.UserFederationProvider, error) {
	cluster, err := s.clusterRepo.GetByID(clusterID)
	if err != nil {
		return nil, fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}

	// Get access token using client credentials
	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}
	accessToken := tokenResp.AccessToken

	// Use the provided realm or cluster's realm
	targetRealm := realm
	if targetRealm == "" {
		targetRealm = cluster.Realm
	}

	// Get existing provider to merge config
	existingProvider, err := s.GetUserFederationProvider(clusterID, targetRealm, providerID)
	if err != nil {
		return nil, fmt.Errorf("failed to get existing provider: %w", err)
	}

	// Get realm UUID - parentId must be realm UUID, not realm name
	realmInfo, err := s.keycloakClient.ExportRealm(cluster.BaseURL, targetRealm, accessToken)
	var realmID string
	if err == nil {
		if id, ok := realmInfo["id"].(string); ok && id != "" {
			realmID = id
			fmt.Printf("Got realm UUID: %s for realm: %s\n", realmID, targetRealm)
		}
	}
	// Fail if we couldn't get realm UUID - this is critical for provider update
	if realmID == "" {
		return nil, fmt.Errorf("could not determine realm UUID for realm: %s", targetRealm)
	}

	// Prepare update config
	providerConfig := make(map[string]interface{})
	if req.Name != "" {
		providerConfig["name"] = cleanControlChars(req.Name)
	} else {
		providerConfig["name"] = existingProvider.Name
	}

	providerConfig["providerId"] = existingProvider.ProviderID
	providerConfig["providerType"] = existingProvider.ProviderType
	providerConfig["parentId"] = realmID // Use realm UUID

	// Merge config
	config := make(map[string][]string)
	// Copy existing config
	for k, v := range existingProvider.Config {
		config[k] = v
	}
	
	// Preserve original searchScope value before cleaning (if provided by UI)
	originalSearchScope := ""
	if scopeVal, ok := req.Config["searchScope"]; ok && scopeVal != "" {
		originalSearchScope = scopeVal
	}
	
	// Update with new config values (clean control chars from user input)
	for k, v := range req.Config {
		cleaned := cleanControlChars(v)
		config[k] = []string{cleaned}
	}
	
	// Ensure required fields are set correctly
	// Priority - overwrite empty strings
	if config["priority"] == nil || len(config["priority"]) == 0 || config["priority"][0] == "" {
		config["priority"] = []string{"0"}
	}
	
	// searchScope - NEVER override UI-provided value, only set default if UI sent empty
	// Keycloak API expects "1" (ONE_LEVEL) or "2" (SUBTREE)
	if originalSearchScope != "" {
		// UI provided a value - use it (after cleaning and normalization)
		scopeValue := strings.TrimSpace(strings.ToUpper(cleanControlChars(originalSearchScope)))
		if scopeValue == "1" || scopeValue == "ONE_LEVEL" {
			config["searchScope"] = []string{"1"} // Keycloak API expects "1" for ONE_LEVEL
		} else if scopeValue == "2" || scopeValue == "SUBTREE" {
			config["searchScope"] = []string{"2"} // Keycloak API expects "2" for SUBTREE
		} else {
			// Invalid value from UI, use default
			config["searchScope"] = []string{"1"} // Default to "1" (ONE_LEVEL)
		}
	} else {
		// UI did not provide searchScope - keep existing or set default
		if config["searchScope"] == nil || len(config["searchScope"]) == 0 || config["searchScope"][0] == "" {
			config["searchScope"] = []string{"1"} // Default to "1" (ONE_LEVEL)
		} else {
			// Existing provider has a value - convert if needed
			existingScope := strings.TrimSpace(strings.ToUpper(config["searchScope"][0]))
			if existingScope == "ONE_LEVEL" {
				config["searchScope"] = []string{"1"}
			} else if existingScope == "SUBTREE" {
				config["searchScope"] = []string{"2"}
			}
			// If already "1" or "2", keep it as is
		}
	}
	
	// AD vendor check for objectClasses
	vendorValue := "other"
	if config["vendor"] != nil && len(config["vendor"]) > 0 && config["vendor"][0] != "" {
		vendorValue = config["vendor"][0]
	}
	if vendorValue == "ad" {
		if config["userObjectClasses"] == nil || len(config["userObjectClasses"]) == 0 || config["userObjectClasses"][0] == "" {
			config["userObjectClasses"] = []string{"person,organizationalPerson,user"}
		}
		if config["uuidLDAPAttribute"] == nil || len(config["uuidLDAPAttribute"]) == 0 || config["uuidLDAPAttribute"][0] == "" {
			config["uuidLDAPAttribute"] = []string{"objectGUID"}
		}
	}
	
	// Clean user input fields
	userInputFields := []string{"connectionUrl", "bindDn", "bindCredential", "usersDn", 
		"usernameLDAPAttribute", "rdnLDAPAttribute", "uuidLDAPAttribute", "userObjectClasses",
		"connectionTimeout", "readTimeout", "customUserSearchFilter", "relativeCreateDn"}
	for _, field := range userInputFields {
		if val, ok := config[field]; ok && len(val) > 0 {
			config[field] = []string{cleanControlChars(val[0])}
		}
	}
	
	// Clean userObjectClasses format
	if userObjectClasses, ok := config["userObjectClasses"]; ok && len(userObjectClasses) > 0 {
		cleaned := strings.ReplaceAll(userObjectClasses[0], ", ", ",")
		config["userObjectClasses"] = []string{cleaned}
	}

	// Update enabled status
	if req.Config["enabled"] != "" {
		config["enabled"] = []string{req.Config["enabled"]}
	} else if req.Enabled {
		config["enabled"] = []string{"true"}
	} else if !req.Enabled && req.Config["enabled"] == "" {
		// Only update if explicitly set
		config["enabled"] = []string{"false"}
	}

	providerConfig["config"] = config

	// Update provider in Keycloak
	err = s.keycloakClient.UpdateUserFederationProvider(cluster.BaseURL, targetRealm, accessToken, providerID, providerConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to update user federation provider: %w", err)
	}

	// Get the updated provider
	return s.GetUserFederationProvider(clusterID, targetRealm, providerID)
}

// DeleteUserFederationProvider deletes a user federation provider
func (s *UserFederationService) DeleteUserFederationProvider(clusterID int, realm, providerID string) error {
	cluster, err := s.clusterRepo.GetByID(clusterID)
	if err != nil {
		return fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return fmt.Errorf("cluster not found")
	}

	// Get access token using client credentials
	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
	)
	if err != nil {
		return fmt.Errorf("failed to get access token: %w", err)
	}
	accessToken := tokenResp.AccessToken

	// Use the provided realm or cluster's realm
	targetRealm := realm
	if targetRealm == "" {
		targetRealm = cluster.Realm
	}

	// Delete provider from Keycloak
	return s.keycloakClient.DeleteUserFederationProvider(cluster.BaseURL, targetRealm, accessToken, providerID)
}

// TestUserFederationConnection tests the connection to a user federation provider
func (s *UserFederationService) TestUserFederationConnection(clusterID int, realm, providerID string) (map[string]interface{}, error) {
	cluster, err := s.clusterRepo.GetByID(clusterID)
	if err != nil {
		return nil, fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}

	// Get access token using client credentials
	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}
	accessToken := tokenResp.AccessToken

	// Use the provided realm or cluster's realm
	targetRealm := realm
	if targetRealm == "" {
		targetRealm = cluster.Realm
	}

	// Test connection
	return s.keycloakClient.TestUserFederationConnection(cluster.BaseURL, targetRealm, accessToken, providerID)
}

// SyncUserFederation syncs users from a user federation provider
func (s *UserFederationService) SyncUserFederation(clusterID int, realm, providerID string, req domain.SyncUserFederationRequest) error {
	cluster, err := s.clusterRepo.GetByID(clusterID)
	if err != nil {
		return fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return fmt.Errorf("cluster not found")
	}

	// Get access token using client credentials
	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
	)
	if err != nil {
		return fmt.Errorf("failed to get access token: %w", err)
	}
	accessToken := tokenResp.AccessToken

	// Use the provided realm or cluster's realm
	targetRealm := realm
	if targetRealm == "" {
		targetRealm = cluster.Realm
	}

	// Sync users
	return s.keycloakClient.SyncUserFederation(cluster.BaseURL, targetRealm, accessToken, providerID, req.Action)
}

// TestLDAPConnection tests LDAP connection with just URL (before creating provider)
func (s *UserFederationService) TestLDAPConnection(clusterID int, req domain.TestLDAPConnectionRequest) (map[string]interface{}, error) {
	result := make(map[string]interface{})
	
	// Validate inputs
	if req.ConnectionURL == "" {
		return nil, fmt.Errorf("connection URL is required")
	}

	connectionURL := req.ConnectionURL
	
	// Basic validation: check if URL is valid
	if !strings.HasPrefix(connectionURL, "ldap://") && !strings.HasPrefix(connectionURL, "ldaps://") {
		result["success"] = false
		result["error"] = "Connection URL must start with ldap:// or ldaps://"
		return result, nil
	}

	// Try to connect to LDAP server (without authentication)
	useTLS := strings.HasPrefix(connectionURL, "ldaps://")
	
	var conn *ldap.Conn
	var err error
	
	if useTLS {
		// For LDAPS, we'll try to connect with insecure skip verify for testing
		conn, err = ldap.DialURL(connectionURL, ldap.DialWithTLSConfig(&tls.Config{
			InsecureSkipVerify: true,
		}))
	} else {
		conn, err = ldap.DialURL(connectionURL)
	}
	
	if err != nil {
		result["success"] = false
		result["error"] = fmt.Sprintf("Failed to connect to LDAP server: %v", err)
		return result, nil
	}
	defer conn.Close()

	// Set timeout
	conn.SetTimeout(5 * time.Second)

	// Connection successful
	result["success"] = true
	result["message"] = "Successfully connected to LDAP server"
	result["connection_url"] = connectionURL

	return result, nil
}

// TestLDAPAuthentication tests LDAP authentication with URL, Bind DN and Credential
func (s *UserFederationService) TestLDAPAuthentication(clusterID int, req domain.TestLDAPAuthenticationRequest) (map[string]interface{}, error) {
	result := make(map[string]interface{})
	
	// Validate inputs
	if req.ConnectionURL == "" {
		return nil, fmt.Errorf("connection URL is required")
	}
	if req.BindDN == "" {
		return nil, fmt.Errorf("bind DN is required")
	}
	if req.BindCredential == "" {
		return nil, fmt.Errorf("bind credential is required")
	}

	// Parse connection URL
	connectionURL := req.ConnectionURL
	useTLS := strings.HasPrefix(connectionURL, "ldaps://")
	
	// Connect to LDAP server
	var conn *ldap.Conn
	var err error
	
	if useTLS {
		// For LDAPS, we'll try to connect with insecure skip verify for testing
		conn, err = ldap.DialURL(connectionURL, ldap.DialWithTLSConfig(&tls.Config{
			InsecureSkipVerify: true,
		}))
	} else {
		conn, err = ldap.DialURL(connectionURL)
	}
	
	if err != nil {
		result["success"] = false
		result["error"] = fmt.Sprintf("Failed to connect to LDAP server: %v", err)
		return result, nil
	}
	defer conn.Close()

	// Set timeout
	conn.SetTimeout(5 * time.Second)

	// Try to bind with provided credentials
	err = conn.Bind(req.BindDN, req.BindCredential)
	if err != nil {
		result["success"] = false
		result["error"] = fmt.Sprintf("Failed to bind with provided credentials: %v", err)
		return result, nil
	}

	result["success"] = true
	result["message"] = "LDAP authentication successful"
	result["connection_url"] = req.ConnectionURL
	result["bind_dn"] = req.BindDN

	return result, nil
}

// Helper function to safely get string from map
func getString(m map[string]interface{}, key string) string {
	if val, ok := m[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

// cleanControlChars removes control characters (ASCII 0x00-0x1F except tab, newline, carriage return)
// These characters can cause Keycloak to fail loading the provider
func cleanControlChars(s string) string {
	var result strings.Builder
	result.Grow(len(s))
	
	for _, r := range s {
		// Keep printable characters, tab (0x09), newline (0x0A), carriage return (0x0D)
		if r >= 0x20 || r == 0x09 || r == 0x0A || r == 0x0D {
			result.WriteRune(r)
		}
		// Skip control characters (0x00-0x08, 0x0B-0x0C, 0x0E-0x1F)
	}
	
	return result.String()
}

