package service

import (
	"fmt"
	"keycloak-multi-manage/internal/client/keycloak"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/repository/postgres"
)

type ClusterService struct {
	repo         *postgres.ClusterRepository
	keycloakClient *keycloak.Client
}

func NewClusterService(repo *postgres.ClusterRepository) *ClusterService {
	return &ClusterService{
		repo:         repo,
		keycloakClient: keycloak.NewClient(),
	}
}

func (s *ClusterService) Create(req domain.CreateClusterRequest) (*domain.Cluster, error) {
	if req.Realm == "" {
		req.Realm = "master"
	}
	
	// 1. Get master realm admin token
	masterToken, err := s.keycloakClient.GetAccessToken(
		req.BaseURL,
		"master",
		req.MasterUsername,
		req.MasterPassword,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to authenticate with master realm: %w", err)
	}
	
	// 2. Setup client in the target realm
	clientSecret, err := s.keycloakClient.SetupRealmClient(
		req.BaseURL,
		req.Realm,
		masterToken,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to setup realm client: %w", err)
	}
	
	// 3. Create cluster with client credentials
	cluster := &domain.Cluster{
		Name:            req.Name,
		BaseURL:         req.BaseURL,
		Realm:           req.Realm,
		ClientID:        "multi-manage",
		ClientSecret:    clientSecret,
		GroupName:       req.GroupName,
		MetricsEndpoint: req.MetricsEndpoint,
	}
	
	if err := s.repo.Create(cluster); err != nil {
		return nil, err
	}
	
	return cluster, nil
}

func (s *ClusterService) GetAll() ([]*domain.Cluster, error) {
	return s.repo.GetAll()
}

func (s *ClusterService) GetByID(id int) (*domain.Cluster, error) {
	return s.repo.GetByID(id)
}

func (s *ClusterService) Update(id int, req domain.CreateClusterRequest) (*domain.Cluster, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}
	
	// If realm changed or base URL changed, we need to re-setup the client
	realmChanged := cluster.Realm != req.Realm
	baseURLChanged := cluster.BaseURL != req.BaseURL
	
	if realmChanged || baseURLChanged {
		if req.Realm == "" {
			req.Realm = "master"
		}
		
		// Get master realm admin token
		masterToken, err := s.keycloakClient.GetAccessToken(
			req.BaseURL,
			"master",
			req.MasterUsername,
			req.MasterPassword,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to authenticate with master realm: %w", err)
		}
		
		// Setup client in the new realm
		clientSecret, err := s.keycloakClient.SetupRealmClient(
			req.BaseURL,
			req.Realm,
			masterToken,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to setup realm client: %w", err)
		}
		
		cluster.ClientSecret = clientSecret
	}
	
	cluster.Name = req.Name
	cluster.BaseURL = req.BaseURL
	cluster.Realm = req.Realm
	if cluster.Realm == "" {
		cluster.Realm = "master"
	}
	cluster.ClientID = "multi-manage"
	cluster.GroupName = req.GroupName
	cluster.MetricsEndpoint = req.MetricsEndpoint
	
	if err := s.repo.Update(cluster); err != nil {
		return nil, err
	}
	
	return cluster, nil
}

func (s *ClusterService) Delete(id int) error {
	return s.repo.Delete(id)
}

func (s *ClusterService) HealthCheck(id int) (*domain.ClusterHealth, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return &domain.ClusterHealth{
			ClusterID: id,
			Status:    "not_found",
			Message:   "Cluster not found",
		}, nil
	}
	
	healthy, err := s.keycloakClient.HealthCheck(cluster.BaseURL, cluster.Realm)
	if err != nil {
		return &domain.ClusterHealth{
			ClusterID: id,
			Status:    "error",
			Message:   err.Error(),
		}, nil
	}
	
	if healthy {
		return &domain.ClusterHealth{
			ClusterID: id,
			Status:    "healthy",
		}, nil
	}
	
	return &domain.ClusterHealth{
		ClusterID: id,
		Status:    "unhealthy",
		Message:   "Keycloak realm not accessible",
	}, nil
}

// getClusterAccessToken gets access token for a cluster using client credentials
func (s *ClusterService) getClusterAccessToken(cluster *domain.Cluster) (string, error) {
	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
	)
	if err != nil {
		return "", err
	}
	return tokenResp.AccessToken, nil
}

func (s *ClusterService) GetMetrics(id int) (*domain.ClusterMetrics, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return nil, err
	}
	
	metrics, err := s.keycloakClient.GetMetrics(cluster.BaseURL, cluster.Realm, token)
	if err != nil {
		return nil, err
	}
	
	metrics.ClusterID = id
	return metrics, nil
}

func (s *ClusterService) GetClients(id int) ([]map[string]interface{}, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return nil, err
	}
	
	return s.keycloakClient.GetClients(cluster.BaseURL, cluster.Realm, token)
}

func (s *ClusterService) GetUsers(id int, max int) ([]map[string]interface{}, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return nil, err
	}
	
	return s.keycloakClient.GetUsers(cluster.BaseURL, cluster.Realm, token, max)
}

func (s *ClusterService) GetGroups(id int, max int) ([]map[string]interface{}, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return nil, err
	}
	
	return s.keycloakClient.GetGroups(cluster.BaseURL, cluster.Realm, token, max)
}

func (s *ClusterService) GetClientDetails(id int) ([]domain.ClientDetail, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return nil, err
	}
	
	return s.keycloakClient.GetClientDetails(cluster.BaseURL, cluster.Realm, token)
}

func (s *ClusterService) GetClientSecret(clusterID int, clientID string) (string, error) {
	cluster, err := s.repo.GetByID(clusterID)
	if err != nil {
		return "", err
	}
	if cluster == nil {
		return "", fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return "", err
	}
	
	return s.keycloakClient.GetClientSecret(cluster.BaseURL, cluster.Realm, token, clientID)
}

func (s *ClusterService) GetGroupDetails(id int) ([]domain.GroupDetail, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return nil, err
	}
	
	return s.keycloakClient.GetGroupDetails(cluster.BaseURL, cluster.Realm, token)
}

func (s *ClusterService) GetUserDetails(id int) ([]domain.UserDetail, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return nil, err
	}
	
	return s.keycloakClient.GetUserDetails(cluster.BaseURL, cluster.Realm, token)
}

func (s *ClusterService) GetServerInfo(id int) (map[string]interface{}, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}

	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return nil, err
	}

	return s.keycloakClient.GetServerInfo(cluster.BaseURL, token)
}

func (s *ClusterService) GetUserToken(clusterID int, username, password, clientID string) (map[string]interface{}, error) {
	cluster, err := s.repo.GetByID(clusterID)
	if err != nil {
		return nil, fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}

	tokenResp, err := s.keycloakClient.GetUserToken(
		cluster.BaseURL,
		cluster.Realm,
		username,
		password,
		clientID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get user token: %w", err)
	}

	// Decode the token
	decoded, err := s.keycloakClient.DecodeToken(tokenResp.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decode token: %w", err)
	}

	result := map[string]interface{}{
		"access_token": tokenResp.AccessToken,
		"token_type":   tokenResp.TokenType,
		"expires_in":   tokenResp.ExpiresIn,
		"decoded":      decoded,
	}

	return result, nil
}

func (s *ClusterService) GetClientCredentialsToken(clusterID int, clientID, clientSecret string) (map[string]interface{}, error) {
	cluster, err := s.repo.GetByID(clusterID)
	if err != nil {
		return nil, fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}

	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		clientID,
		clientSecret,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get client credentials token: %w", err)
	}

	// Decode the token
	decoded, err := s.keycloakClient.DecodeToken(tokenResp.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decode token: %w", err)
	}

	result := map[string]interface{}{
		"access_token": tokenResp.AccessToken,
		"token_type":   tokenResp.TokenType,
		"expires_in":   tokenResp.ExpiresIn,
		"decoded":      decoded,
	}

	return result, nil
}

func (s *ClusterService) GetRBACAnalysis(id int, roleName string) (*domain.RBACAnalysis, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return nil, err
	}
	
	analysis, err := s.keycloakClient.GetRBACAnalysis(cluster.BaseURL, cluster.Realm, token, roleName)
	if err != nil {
		return nil, err
	}
	
	return analysis, nil
}

func (s *ClusterService) GetUserRBACAnalysis(id int, username string) (*domain.RBACAnalysis, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return nil, err
	}
	
	analysis, err := s.keycloakClient.GetUserRBACAnalysis(cluster.BaseURL, cluster.Realm, token, username)
	if err != nil {
		return nil, err
	}
	
	return analysis, nil
}

func (s *ClusterService) GetClientRBACAnalysis(id int, clientID string) (*domain.RBACAnalysis, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return nil, err
	}
	
	analysis, err := s.keycloakClient.GetClientRBACAnalysis(cluster.BaseURL, cluster.Realm, token, clientID)
	if err != nil {
		return nil, err
	}
	
	return analysis, nil
}

func (s *ClusterService) GetPrometheusMetrics(id int) (*domain.PrometheusMetrics, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}
	
	// If no metrics endpoint is configured, return unavailable
	if cluster.MetricsEndpoint == nil || *cluster.MetricsEndpoint == "" {
		return &domain.PrometheusMetrics{
			ClusterID: id,
			Available: false,
			Error:     "Metrics endpoint not configured",
		}, nil
	}
	
	metrics, err := s.keycloakClient.GetPrometheusMetrics(*cluster.MetricsEndpoint)
	if err != nil {
		return nil, err
	}
	
	metrics.ClusterID = id
	return metrics, nil
}

// Search performs multi-cluster search for users, clients, or roles
func (s *ClusterService) Search(req domain.SearchRequest) (*domain.SearchResponse, error) {
	// Get clusters to search
	var clusters []*domain.Cluster
	var err error
	
	if len(req.ClusterIDs) == 0 {
		// Search all clusters
		clusters, err = s.repo.GetAll()
		if err != nil {
			return nil, fmt.Errorf("failed to get clusters: %w", err)
		}
	} else {
		// Search specific clusters
		clusters = make([]*domain.Cluster, 0, len(req.ClusterIDs))
		for _, id := range req.ClusterIDs {
			cluster, err := s.repo.GetByID(id)
			if err != nil {
				continue // Skip invalid cluster IDs
			}
			if cluster != nil {
				clusters = append(clusters, cluster)
			}
		}
	}
	
	var results []domain.SearchResult
	
	// Search each cluster
	for _, cluster := range clusters {
		token, err := s.getClusterAccessToken(cluster)
		if err != nil {
			// Skip clusters that fail authentication
			continue
		}
		
		switch req.SearchType {
		case "user":
			users, err := s.keycloakClient.SearchUsers(cluster.BaseURL, cluster.Realm, token, req.Query)
			if err == nil {
				for _, user := range users {
					results = append(results, domain.SearchResult{
						ClusterID:   cluster.ID,
						ClusterName: cluster.Name,
						Realm:       cluster.Realm,
						Type:        "user",
						Data:        user,
					})
				}
			}
		case "client":
			clients, err := s.keycloakClient.SearchClients(cluster.BaseURL, cluster.Realm, token, req.Query)
			if err == nil {
				for _, client := range clients {
					results = append(results, domain.SearchResult{
						ClusterID:   cluster.ID,
						ClusterName: cluster.Name,
						Realm:       cluster.Realm,
						Type:        "client",
						Data:        client,
					})
				}
			}
		case "role":
			roles, err := s.keycloakClient.SearchRoles(cluster.BaseURL, cluster.Realm, token, req.Query)
			if err == nil {
				for _, role := range roles {
					results = append(results, domain.SearchResult{
						ClusterID:   cluster.ID,
						ClusterName: cluster.Name,
						Realm:       cluster.Realm,
						Type:        "role",
						Data: map[string]interface{}{
							"id":          role.ID,
							"name":        role.Name,
							"description": role.Description,
							"composite":   role.Composite,
						},
					})
				}
			}
		}
	}
	
	return &domain.SearchResponse{
		Query:      req.Query,
		SearchType: req.SearchType,
		Results:    results,
		Total:      len(results),
	}, nil
}

// DiscoverRealms discovers all realms in a Keycloak instance using master realm admin credentials
func (s *ClusterService) DiscoverRealms(req domain.DiscoverRealmsRequest) ([]domain.RealmInfo, error) {
	return s.keycloakClient.DiscoverRealms(req.BaseURL, req.Username, req.Password)
}

// AssignRealmRolesToUser assigns realm roles to a user
func (s *ClusterService) AssignRealmRolesToUser(clusterID int, userID string, roleNames []string) error {
	cluster, err := s.repo.GetByID(clusterID)
	if err != nil {
		return err
	}
	if cluster == nil {
		return fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return err
	}
	
	return s.keycloakClient.AssignRealmRolesToUser(cluster.BaseURL, cluster.Realm, token, userID, roleNames)
}

// AssignClientRolesToUser assigns client roles to a user
func (s *ClusterService) AssignClientRolesToUser(clusterID int, userID string, clientRoles map[string][]string) error {
	cluster, err := s.repo.GetByID(clusterID)
	if err != nil {
		return err
	}
	if cluster == nil {
		return fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return err
	}
	
	return s.keycloakClient.AssignClientRolesToUser(cluster.BaseURL, cluster.Realm, token, userID, clientRoles)
}

// AddUserToGroup adds a user to a group
func (s *ClusterService) AddUserToGroup(clusterID int, userID, groupID string) error {
	cluster, err := s.repo.GetByID(clusterID)
	if err != nil {
		return err
	}
	if cluster == nil {
		return fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return err
	}
	
	return s.keycloakClient.AddUserToGroup(cluster.BaseURL, cluster.Realm, token, userID, groupID)
}

// AssignRealmRolesToGroup assigns realm roles to a group
func (s *ClusterService) AssignRealmRolesToGroup(clusterID int, groupID string, roleNames []string) error {
	cluster, err := s.repo.GetByID(clusterID)
	if err != nil {
		return err
	}
	if cluster == nil {
		return fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return err
	}
	
	return s.keycloakClient.AssignRealmRolesToGroup(cluster.BaseURL, cluster.Realm, token, groupID, roleNames)
}

// AssignClientRolesToGroup assigns client roles to a group
func (s *ClusterService) AssignClientRolesToGroup(clusterID int, groupID string, clientRoles map[string][]string) error {
	cluster, err := s.repo.GetByID(clusterID)
	if err != nil {
		return err
	}
	if cluster == nil {
		return fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return err
	}
	
	return s.keycloakClient.AssignClientRolesToGroup(cluster.BaseURL, cluster.Realm, token, groupID, clientRoles)
}

// CreateClient creates a new client in Keycloak
func (s *ClusterService) CreateClient(clusterID int, client domain.ClientDetail) error {
	cluster, err := s.repo.GetByID(clusterID)
	if err != nil {
		return err
	}
	if cluster == nil {
		return fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return err
	}
	
	return s.keycloakClient.CreateClient(cluster.BaseURL, cluster.Realm, token, client)
}

// GetClientRoles gets all roles for a specific client
func (s *ClusterService) GetClientRoles(clusterID int, clientID string) ([]map[string]interface{}, error) {
	cluster, err := s.repo.GetByID(clusterID)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return nil, err
	}
	
	// Get client UUID first
	clients, err := s.keycloakClient.GetClients(cluster.BaseURL, cluster.Realm, token)
	if err != nil {
		return nil, err
	}
	
	var clientUUID string
	for _, client := range clients {
		if id, ok := client["clientId"].(string); ok && id == clientID {
			if uuid, ok := client["id"].(string); ok {
				clientUUID = uuid
				break
			}
		}
	}
	
	if clientUUID == "" {
		return nil, fmt.Errorf("client not found: %s", clientID)
	}
	
	return s.keycloakClient.GetClientRoles(cluster.BaseURL, cluster.Realm, token, clientUUID)
}

// CreateUser creates a new user in Keycloak
func (s *ClusterService) CreateUser(clusterID int, user domain.UserDetail) error {
	cluster, err := s.repo.GetByID(clusterID)
	if err != nil {
		return err
	}
	if cluster == nil {
		return fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return err
	}
	
	return s.keycloakClient.CreateUser(cluster.BaseURL, cluster.Realm, token, user)
}

// CreateGroup creates a new group in Keycloak
func (s *ClusterService) CreateGroup(clusterID int, group domain.GroupDetail) error {
	cluster, err := s.repo.GetByID(clusterID)
	if err != nil {
		return err
	}
	if cluster == nil {
		return fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return err
	}
	
	return s.keycloakClient.CreateGroup(cluster.BaseURL, cluster.Realm, token, group)
}

// CreateRealmRole creates a new realm role in Keycloak
func (s *ClusterService) CreateRealmRole(clusterID int, role domain.Role) error {
	cluster, err := s.repo.GetByID(clusterID)
	if err != nil {
		return err
	}
	if cluster == nil {
		return fmt.Errorf("cluster not found")
	}
	
	token, err := s.getClusterAccessToken(cluster)
	if err != nil {
		return err
	}
	
	return s.keycloakClient.CreateRole(cluster.BaseURL, cluster.Realm, token, role)
}

