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

