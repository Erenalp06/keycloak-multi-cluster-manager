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
		Name:      req.Name,
		BaseURL:   req.BaseURL,
		Realm:     req.Realm,
		Username:  req.Username,
		Password:  req.Password,
		GroupName: req.GroupName,
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

