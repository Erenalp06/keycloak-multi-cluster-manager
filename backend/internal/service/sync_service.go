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
	sourceToken, err := s.keycloakClient.GetAccessToken(
		sourceCluster.BaseURL,
		sourceCluster.Realm,
		sourceCluster.Username,
		sourceCluster.Password,
	)
	if err != nil {
		return fmt.Errorf("failed to get source token: %w", err)
	}
	
	destToken, err := s.keycloakClient.GetAccessToken(
		destCluster.BaseURL,
		destCluster.Realm,
		destCluster.Username,
		destCluster.Password,
	)
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

// SyncClient syncs a client from source cluster to destination cluster
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
	sourceToken, err := s.keycloakClient.GetAccessToken(
		sourceCluster.BaseURL,
		sourceCluster.Realm,
		sourceCluster.Username,
		sourceCluster.Password,
	)
	if err != nil {
		return fmt.Errorf("failed to get source token: %w", err)
	}
	
	destToken, err := s.keycloakClient.GetAccessToken(
		destCluster.BaseURL,
		destCluster.Realm,
		destCluster.Username,
		destCluster.Password,
	)
	if err != nil {
		return fmt.Errorf("failed to get destination token: %w", err)
	}
	
	// Get client details from source
	sourceClients, err := s.keycloakClient.GetClientDetails(
		sourceCluster.BaseURL,
		sourceCluster.Realm,
		sourceToken,
	)
	if err != nil {
		return fmt.Errorf("failed to get source clients: %w", err)
	}
	
	var client *domain.ClientDetail
	for _, c := range sourceClients {
		if c.ClientID == clientID {
			client = &c
			break
		}
	}
	
	if client == nil {
		return fmt.Errorf("client not found in source cluster")
	}
	
	// Create client in destination
	return s.keycloakClient.CreateClient(
		destCluster.BaseURL,
		destCluster.Realm,
		destToken,
		*client,
	)
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
	sourceToken, err := s.keycloakClient.GetAccessToken(
		sourceCluster.BaseURL,
		sourceCluster.Realm,
		sourceCluster.Username,
		sourceCluster.Password,
	)
	if err != nil {
		return fmt.Errorf("failed to get source token: %w", err)
	}
	
	destToken, err := s.keycloakClient.GetAccessToken(
		destCluster.BaseURL,
		destCluster.Realm,
		destCluster.Username,
		destCluster.Password,
	)
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
	sourceToken, err := s.keycloakClient.GetAccessToken(
		sourceCluster.BaseURL,
		sourceCluster.Realm,
		sourceCluster.Username,
		sourceCluster.Password,
	)
	if err != nil {
		return fmt.Errorf("failed to get source token: %w", err)
	}
	
	destToken, err := s.keycloakClient.GetAccessToken(
		destCluster.BaseURL,
		destCluster.Realm,
		destCluster.Username,
		destCluster.Password,
	)
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

