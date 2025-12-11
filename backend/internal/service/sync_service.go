package service

import (
	"fmt"
	"keycloak-multi-manage/internal/client/keycloak"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/repository/postgres"
)

type SyncService struct {
	clusterRepo    *postgres.ClusterRepository
	keycloakClient *keycloak.Client
}

func NewSyncService(clusterRepo *postgres.ClusterRepository) *SyncService {
	return &SyncService{
		clusterRepo:    clusterRepo,
		keycloakClient: keycloak.NewClient(),
	}
}

// SyncRole syncs a role from source cluster to destination cluster
func (s *SyncService) SyncRole(sourceClusterID, destinationClusterID int, roleName string) error {
	// Get source cluster
	sourceCluster, err := s.clusterRepo.GetByID(sourceClusterID)
	if err != nil {
		return fmt.Errorf("failed to get source cluster: %w", err)
	}
	if sourceCluster == nil {
		return fmt.Errorf("source cluster not found")
	}
	
	// Get destination cluster
	destCluster, err := s.clusterRepo.GetByID(destinationClusterID)
	if err != nil {
		return fmt.Errorf("failed to get destination cluster: %w", err)
	}
	if destCluster == nil {
		return fmt.Errorf("destination cluster not found")
	}
	
	// Get access tokens
	sourceTokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		sourceCluster.BaseURL,
		sourceCluster.Realm,
		sourceCluster.ClientID,
		sourceCluster.ClientSecret,
	)
	if err != nil {
		return fmt.Errorf("failed to get source token: %w", err)
	}
	sourceToken := sourceTokenResp.AccessToken
	
	destTokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		destCluster.BaseURL,
		destCluster.Realm,
		destCluster.ClientID,
		destCluster.ClientSecret,
	)
	if err != nil {
		return fmt.Errorf("failed to get destination token: %w", err)
	}
	destToken := destTokenResp.AccessToken
	if err != nil {
		return fmt.Errorf("failed to get destination token: %w", err)
	}
	
	// Get role from source
	sourceRoles, err := s.keycloakClient.GetRoles(
		sourceCluster.BaseURL,
		sourceCluster.Realm,
		sourceToken,
	)
	if err != nil {
		return fmt.Errorf("failed to get source roles: %w", err)
	}
	
	var role *domain.Role
	for _, r := range sourceRoles {
		if r.Name == roleName {
			role = &r
			break
		}
	}
	
	if role == nil {
		return fmt.Errorf("role not found in source cluster")
	}
	
	// Create role in destination
	return s.keycloakClient.CreateRole(
		destCluster.BaseURL,
		destCluster.Realm,
		destToken,
		*role,
	)
}

// SyncClient syncs a client from source cluster to destination cluster using export/import
func (s *SyncService) SyncClient(sourceClusterID, destinationClusterID int, clientID string) error {
	// Get clusters
	sourceCluster, err := s.clusterRepo.GetByID(sourceClusterID)
	if err != nil || sourceCluster == nil {
		return fmt.Errorf("source cluster not found")
	}
	
	destCluster, err := s.clusterRepo.GetByID(destinationClusterID)
	if err != nil || destCluster == nil {
		return fmt.Errorf("destination cluster not found")
	}
	
	// Get access tokens
	sourceTokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		sourceCluster.BaseURL,
		sourceCluster.Realm,
		sourceCluster.ClientID,
		sourceCluster.ClientSecret,
	)
	if err != nil {
		return fmt.Errorf("failed to get source token: %w", err)
	}
	sourceToken := sourceTokenResp.AccessToken
	
	destTokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		destCluster.BaseURL,
		destCluster.Realm,
		destCluster.ClientID,
		destCluster.ClientSecret,
	)
	if err != nil {
		return fmt.Errorf("failed to get destination token: %w", err)
	}
	destToken := destTokenResp.AccessToken
	
	// Export all clients from source
	exportedClients, err := s.keycloakClient.ExportClients(
		sourceCluster.BaseURL,
		sourceCluster.Realm,
		sourceToken,
	)
	if err != nil {
		return fmt.Errorf("failed to export clients from source: %w", err)
	}
	
	// Find the specific client to sync
	var clientToSync map[string]interface{}
	for _, client := range exportedClients {
		if clientIDStr, ok := client["clientId"].(string); ok && clientIDStr == clientID {
			clientToSync = client
			break
		}
	}
	
	if clientToSync == nil {
		return fmt.Errorf("client not found in source cluster")
	}
	
	// Import only the specific client to destination
	clientsToImport := []map[string]interface{}{clientToSync}
	if err := s.keycloakClient.ImportClients(
		destCluster.BaseURL,
		destCluster.Realm,
		destToken,
		clientsToImport,
	); err != nil {
		return fmt.Errorf("failed to import client: %w", err)
	}

	// After client import, sync client roles
	// Get source client details to get client roles
	sourceClientDetails, err := s.keycloakClient.GetClientDetails(
		sourceCluster.BaseURL,
		sourceCluster.Realm,
		sourceToken,
	)
	if err != nil {
		return fmt.Errorf("failed to get source client details: %w", err)
	}

	var sourceClientDetail *domain.ClientDetail
	for _, client := range sourceClientDetails {
		if client.ClientID == clientID {
			sourceClientDetail = &client
			break
		}
	}

	if sourceClientDetail == nil {
		return fmt.Errorf("source client detail not found")
	}

	// Get destination client UUID
	destClients, err := s.keycloakClient.GetClients(
		destCluster.BaseURL,
		destCluster.Realm,
		destToken,
	)
	if err != nil {
		return fmt.Errorf("failed to get destination clients: %w", err)
	}

	var destClientUUID string
	for _, client := range destClients {
		if clientIDStr, ok := client["clientId"].(string); ok && clientIDStr == clientID {
			if uuid, ok := client["id"].(string); ok {
				destClientUUID = uuid
				break
			}
		}
	}

	if destClientUUID == "" {
		return fmt.Errorf("destination client UUID not found after import")
	}

	// Get destination client roles
	destClientRoles, err := s.keycloakClient.GetClientRoles(
		destCluster.BaseURL,
		destCluster.Realm,
		destToken,
		destClientUUID,
	)
	if err != nil {
		return fmt.Errorf("failed to get destination client roles: %w", err)
	}

	// Create a map of destination client role names
	destRoleMap := make(map[string]bool)
	for _, role := range destClientRoles {
		if roleName, ok := role["name"].(string); ok {
			destRoleMap[roleName] = true
		}
	}

	// Sync missing client roles from source to destination
	for _, roleName := range sourceClientDetail.ClientRoles {
		if !destRoleMap[roleName] {
			// Get full role details from source
			sourceClientUUID := sourceClientDetail.ID
			sourceRoles, err := s.keycloakClient.GetClientRoles(
				sourceCluster.BaseURL,
				sourceCluster.Realm,
				sourceToken,
				sourceClientUUID,
			)
			if err != nil {
				continue // Skip if we can't get source roles
			}

			var sourceRole map[string]interface{}
			for _, role := range sourceRoles {
				if name, ok := role["name"].(string); ok && name == roleName {
					sourceRole = role
					break
				}
			}

			if sourceRole == nil {
				continue
			}

			// Create role in destination
			roleName, _ := sourceRole["name"].(string)
			roleDesc, _ := sourceRole["description"].(string)
			roleComposite, _ := sourceRole["composite"].(bool)
			
			role := domain.Role{
				Name:        roleName,
				Description: roleDesc,
				Composite:   roleComposite,
			}

			if err := s.keycloakClient.CreateClientRole(
				destCluster.BaseURL,
				destCluster.Realm,
				destToken,
				destClientUUID,
				role,
			); err != nil {
				// Log error but continue with other roles
				fmt.Printf("Warning: failed to create client role %s: %v\n", roleName, err)
			}
		}
	}

	// Sync client scopes (default and optional)
	// First, ensure all scopes exist in destination realm before assigning them to client
	allScopesToSync := make(map[string]bool)
	for _, scopeName := range sourceClientDetail.DefaultClientScopes {
		allScopesToSync[scopeName] = true
	}
	for _, scopeName := range sourceClientDetail.OptionalClientScopes {
		allScopesToSync[scopeName] = true
	}
	
	// For each scope that needs to be synced, check if it exists in destination
	for scopeName := range allScopesToSync {
		// Get source scope details
		sourceScopeDetails, err := s.keycloakClient.GetClientScopeDetails(
			sourceCluster.BaseURL,
			sourceCluster.Realm,
			sourceToken,
			scopeName,
		)
		if err != nil {
			fmt.Printf("Warning: failed to get source client scope details for '%s': %v\n", scopeName, err)
			continue
		}
		
		// Try to get the scope from destination - if it fails, it doesn't exist
		destScopeDetails, err := s.keycloakClient.GetClientScopeDetails(
			destCluster.BaseURL,
			destCluster.Realm,
			destToken,
			scopeName,
		)
		if err != nil {
			// Scope doesn't exist in destination, create it with all mappers
			if err := s.keycloakClient.CreateClientScope(
				destCluster.BaseURL,
				destCluster.Realm,
				destToken,
				sourceScopeDetails,
			); err != nil {
				fmt.Printf("Warning: failed to create client scope '%s' in destination realm: %v\n", scopeName, err)
			} else {
				fmt.Printf("Successfully created client scope '%s' in destination realm\n", scopeName)
			}
		} else {
			// Scope exists, sync mappers
			if err := s.syncScopeMappers(
				sourceCluster,
				destCluster,
				sourceToken,
				destToken,
				sourceScopeDetails,
				destScopeDetails,
				scopeName,
			); err != nil {
				fmt.Printf("Warning: failed to sync mappers for scope '%s': %v\n", scopeName, err)
			}
		}
	}
	
	// Now sync scopes to client (they should all exist in realm now)
	// Always sync scopes, even if empty (to ensure consistency)
	if err := s.keycloakClient.UpdateClientScopes(
		destCluster.BaseURL,
		destCluster.Realm,
		destToken,
		destClientUUID,
		"default",
		sourceClientDetail.DefaultClientScopes,
	); err != nil {
		// Log error but don't fail the entire sync
		fmt.Printf("Warning: failed to sync default client scopes for client %s: %v\n", clientID, err)
	}

	if err := s.keycloakClient.UpdateClientScopes(
		destCluster.BaseURL,
		destCluster.Realm,
		destToken,
		destClientUUID,
		"optional",
		sourceClientDetail.OptionalClientScopes,
	); err != nil {
		// Log error but don't fail the entire sync
		fmt.Printf("Warning: failed to sync optional client scopes for client %s: %v\n", clientID, err)
	}

	return nil
}

// syncScopeMappers syncs protocol mappers from source scope to destination scope
func (s *SyncService) syncScopeMappers(
	sourceCluster, destCluster *domain.Cluster,
	sourceToken, destToken string,
	sourceScopeDetails, destScopeDetails map[string]interface{},
	scopeName string,
) error {
	// Get source mappers
	var sourceMappers []map[string]interface{}
	if mappers, ok := sourceScopeDetails["protocolMappers"].([]interface{}); ok {
		for _, m := range mappers {
			if mapper, ok := m.(map[string]interface{}); ok {
				sourceMappers = append(sourceMappers, mapper)
			}
		}
	} else {
		// If protocolMappers is not in the response, fetch it separately
		if scopeID, ok := sourceScopeDetails["id"].(string); ok && scopeID != "" {
			if mappers, err := s.keycloakClient.GetClientScopeMappers(
				sourceCluster.BaseURL,
				sourceCluster.Realm,
				sourceToken,
				scopeID,
			); err == nil {
				sourceMappers = mappers
			}
		}
	}
	
	// Get destination mappers
	var destMappers []map[string]interface{}
	if mappers, ok := destScopeDetails["protocolMappers"].([]interface{}); ok {
		for _, m := range mappers {
			if mapper, ok := m.(map[string]interface{}); ok {
				destMappers = append(destMappers, mapper)
			}
		}
	} else {
		// If protocolMappers is not in the response, fetch it separately
		if scopeID, ok := destScopeDetails["id"].(string); ok && scopeID != "" {
			if mappers, err := s.keycloakClient.GetClientScopeMappers(
				destCluster.BaseURL,
				destCluster.Realm,
				destToken,
				scopeID,
			); err == nil {
				destMappers = mappers
			}
		}
	}
	
	// Create a map of destination mapper names for quick lookup
	destMapperMap := make(map[string]map[string]interface{})
	for _, mapper := range destMappers {
		if name, ok := mapper["name"].(string); ok {
			destMapperMap[name] = mapper
		}
	}
	
	// Get destination scope ID
	destScopeID, ok := destScopeDetails["id"].(string)
	if !ok || destScopeID == "" {
		return fmt.Errorf("destination scope ID not found for scope '%s'", scopeName)
	}
	
	// Sync each source mapper to destination
	for _, sourceMapper := range sourceMappers {
		mapperName, ok := sourceMapper["name"].(string)
		if !ok || mapperName == "" {
			continue
		}
		
		_, exists := destMapperMap[mapperName]
		if !exists {
			// Mapper doesn't exist in destination, create it
			if err := s.keycloakClient.CreateClientScopeMapper(
				destCluster.BaseURL,
				destCluster.Realm,
				destToken,
				destScopeID,
				sourceMapper,
			); err != nil {
				fmt.Printf("Warning: failed to create mapper '%s' for scope '%s': %v\n", mapperName, scopeName, err)
			} else {
				fmt.Printf("Successfully created mapper '%s' for scope '%s'\n", mapperName, scopeName)
			}
		} else {
			// Mapper exists, check if config is different
			// For now, we'll skip updating existing mappers as it requires DELETE + CREATE
			// or PUT with full mapper config. This can be enhanced later if needed.
			// Just log that mapper already exists
			fmt.Printf("Mapper '%s' already exists in scope '%s', skipping\n", mapperName, scopeName)
		}
	}
	
	return nil
}

// SyncGroup syncs a group from source cluster to destination cluster
func (s *SyncService) SyncGroup(sourceClusterID, destinationClusterID int, groupPath string) error {
	// Get clusters
	sourceCluster, err := s.clusterRepo.GetByID(sourceClusterID)
	if err != nil || sourceCluster == nil {
		return fmt.Errorf("source cluster not found")
	}
	
	destCluster, err := s.clusterRepo.GetByID(destinationClusterID)
	if err != nil || destCluster == nil {
		return fmt.Errorf("destination cluster not found")
	}
	
	// Get access tokens
	sourceTokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		sourceCluster.BaseURL,
		sourceCluster.Realm,
		sourceCluster.ClientID,
		sourceCluster.ClientSecret,
	)
	if err != nil {
		return fmt.Errorf("failed to get source token: %w", err)
	}
	sourceToken := sourceTokenResp.AccessToken
	
	destTokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		destCluster.BaseURL,
		destCluster.Realm,
		destCluster.ClientID,
		destCluster.ClientSecret,
	)
	if err != nil {
		return fmt.Errorf("failed to get destination token: %w", err)
	}
	destToken := destTokenResp.AccessToken
	if err != nil {
		return fmt.Errorf("failed to get destination token: %w", err)
	}
	
	// Get group details from source
	sourceGroups, err := s.keycloakClient.GetGroupDetails(
		sourceCluster.BaseURL,
		sourceCluster.Realm,
		sourceToken,
	)
	if err != nil {
		return fmt.Errorf("failed to get source groups: %w", err)
	}
	
	var group *domain.GroupDetail
	for _, g := range sourceGroups {
		if g.Path == groupPath {
			group = &g
			break
		}
	}
	
	if group == nil {
		return fmt.Errorf("group not found in source cluster")
	}
	
	// Create group in destination
	return s.keycloakClient.CreateGroup(
		destCluster.BaseURL,
		destCluster.Realm,
		destToken,
		*group,
	)
}

// SyncUser syncs a user from source cluster to destination cluster
func (s *SyncService) SyncUser(sourceClusterID, destinationClusterID int, username string) error {
	// Get clusters
	sourceCluster, err := s.clusterRepo.GetByID(sourceClusterID)
	if err != nil || sourceCluster == nil {
		return fmt.Errorf("source cluster not found")
	}
	
	destCluster, err := s.clusterRepo.GetByID(destinationClusterID)
	if err != nil || destCluster == nil {
		return fmt.Errorf("destination cluster not found")
	}
	
	// Get access tokens
	sourceTokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		sourceCluster.BaseURL,
		sourceCluster.Realm,
		sourceCluster.ClientID,
		sourceCluster.ClientSecret,
	)
	if err != nil {
		return fmt.Errorf("failed to get source token: %w", err)
	}
	sourceToken := sourceTokenResp.AccessToken
	
	destTokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		destCluster.BaseURL,
		destCluster.Realm,
		destCluster.ClientID,
		destCluster.ClientSecret,
	)
	if err != nil {
		return fmt.Errorf("failed to get destination token: %w", err)
	}
	destToken := destTokenResp.AccessToken
	if err != nil {
		return fmt.Errorf("failed to get destination token: %w", err)
	}
	
	// Get user details from source
	sourceUsers, err := s.keycloakClient.GetUserDetails(
		sourceCluster.BaseURL,
		sourceCluster.Realm,
		sourceToken,
	)
	if err != nil {
		return fmt.Errorf("failed to get source users: %w", err)
	}
	
	var user *domain.UserDetail
	for _, u := range sourceUsers {
		if u.Username == username {
			user = &u
			break
		}
	}
	
	if user == nil {
		return fmt.Errorf("user not found in source cluster")
	}
	
	// Create user in destination
	return s.keycloakClient.CreateUser(
		destCluster.BaseURL,
		destCluster.Realm,
		destToken,
		*user,
	)
}

