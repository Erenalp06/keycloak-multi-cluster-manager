package service

import (
	"fmt"
	"keycloak-multi-manage/internal/client/keycloak"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/repository/postgres"
)

type RoleService struct {
	clusterRepo    *postgres.ClusterRepository
	keycloakClient *keycloak.Client
}

func NewRoleService(clusterRepo *postgres.ClusterRepository) *RoleService {
	return &RoleService{
		clusterRepo:    clusterRepo,
		keycloakClient: keycloak.NewClient(),
	}
}

func (s *RoleService) GetRoles(clusterID int) ([]domain.Role, error) {
	cluster, err := s.clusterRepo.GetByID(clusterID)
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
	
	roles, err := s.keycloakClient.GetRoles(cluster.BaseURL, cluster.Realm, token)
	if err != nil {
		return nil, err
	}
	
	return roles, nil
}

