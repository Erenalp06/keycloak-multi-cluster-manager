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
	cluster := &domain.Cluster{
		Name:            req.Name,
		BaseURL:         req.BaseURL,
		Realm:           req.Realm,
		Username:        req.Username,
		Password:        req.Password,
		GroupName:       req.GroupName,
		MetricsEndpoint: req.MetricsEndpoint,
	}
	
	if cluster.Realm == "" {
		cluster.Realm = "master"
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
	
	cluster.Name = req.Name
	cluster.BaseURL = req.BaseURL
	cluster.Realm = req.Realm
	if cluster.Realm == "" {
		cluster.Realm = "master"
	}
	cluster.Username = req.Username
	cluster.Password = req.Password
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

func (s *ClusterService) GetMetrics(id int) (*domain.ClusterMetrics, error) {
	cluster, err := s.repo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}
	
	token, err := s.keycloakClient.GetAccessToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.Username,
		cluster.Password,
	)
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
	
	token, err := s.keycloakClient.GetAccessToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.Username,
		cluster.Password,
	)
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
	
	token, err := s.keycloakClient.GetAccessToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.Username,
		cluster.Password,
	)
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
	
	token, err := s.keycloakClient.GetAccessToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.Username,
		cluster.Password,
	)
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
	
	token, err := s.keycloakClient.GetAccessToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.Username,
		cluster.Password,
	)
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
	
	token, err := s.keycloakClient.GetAccessToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.Username,
		cluster.Password,
	)
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
	
	token, err := s.keycloakClient.GetAccessToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.Username,
		cluster.Password,
	)
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
	
	token, err := s.keycloakClient.GetAccessToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.Username,
		cluster.Password,
	)
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

	token, err := s.keycloakClient.GetAccessToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.Username,
		cluster.Password,
	)
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
	
	token, err := s.keycloakClient.GetAccessToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.Username,
		cluster.Password,
	)
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
	
	token, err := s.keycloakClient.GetAccessToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.Username,
		cluster.Password,
	)
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
	
	token, err := s.keycloakClient.GetAccessToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.Username,
		cluster.Password,
	)
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
		token, err := s.keycloakClient.GetAccessToken(
			cluster.BaseURL,
			cluster.Realm,
			cluster.Username,
			cluster.Password,
		)
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

