package service

import (
	"encoding/json"
	"fmt"
	"keycloak-multi-manage/internal/client/keycloak"
	"keycloak-multi-manage/internal/repository/postgres"
)

type ExportImportService struct {
	clusterRepo    *postgres.ClusterRepository
	keycloakClient *keycloak.Client
}

func NewExportImportService(clusterRepo *postgres.ClusterRepository) *ExportImportService {
	return &ExportImportService{
		clusterRepo:    clusterRepo,
		keycloakClient: keycloak.NewClient(),
	}
}

// ExportRealm exports realm configuration as JSON
func (s *ExportImportService) ExportRealm(clusterID int) ([]byte, error) {
	cluster, err := s.clusterRepo.GetByID(clusterID)
	if err != nil {
		return nil, fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}

	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}
	token := tokenResp.AccessToken

	realmConfig, err := s.keycloakClient.ExportRealm(cluster.BaseURL, cluster.Realm, token)
	if err != nil {
		return nil, fmt.Errorf("failed to export realm: %w", err)
	}

	jsonData, err := json.MarshalIndent(realmConfig, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal realm config: %w", err)
	}

	return jsonData, nil
}

// ImportRealm imports realm configuration from JSON
func (s *ExportImportService) ImportRealm(clusterID int, realmConfigJSON []byte) error {
	cluster, err := s.clusterRepo.GetByID(clusterID)
	if err != nil {
		return fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return fmt.Errorf("cluster not found")
	}

	var realmConfig map[string]interface{}
	if err := json.Unmarshal(realmConfigJSON, &realmConfig); err != nil {
		return fmt.Errorf("failed to unmarshal realm config: %w", err)
	}

	// Use master realm for admin operations - we need master realm admin credentials for import
	// This is a limitation: import requires master realm admin, not service account
	// For now, we'll use the service account from the target realm
	// TODO: This might need master realm admin credentials passed separately
	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
	)
	if err != nil {
		return fmt.Errorf("failed to get access token: %w", err)
	}
	token := tokenResp.AccessToken

	if err := s.keycloakClient.ImportRealm(cluster.BaseURL, token, realmConfig); err != nil {
		return fmt.Errorf("failed to import realm: %w", err)
	}

	return nil
}

// ExportUsers exports all users as JSON
func (s *ExportImportService) ExportUsers(clusterID int) ([]byte, error) {
	cluster, err := s.clusterRepo.GetByID(clusterID)
	if err != nil {
		return nil, fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}

	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}
	token := tokenResp.AccessToken

	users, err := s.keycloakClient.ExportUsers(cluster.BaseURL, cluster.Realm, token)
	if err != nil {
		return nil, fmt.Errorf("failed to export users: %w", err)
	}

	jsonData, err := json.MarshalIndent(users, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal users: %w", err)
	}

	return jsonData, nil
}

// ImportUsers imports users from JSON
func (s *ExportImportService) ImportUsers(clusterID int, usersJSON []byte) error {
	cluster, err := s.clusterRepo.GetByID(clusterID)
	if err != nil {
		return fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return fmt.Errorf("cluster not found")
	}

	var users []map[string]interface{}
	if err := json.Unmarshal(usersJSON, &users); err != nil {
		return fmt.Errorf("failed to unmarshal users: %w", err)
	}

	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
	)
	if err != nil {
		return fmt.Errorf("failed to get access token: %w", err)
	}
	token := tokenResp.AccessToken

	if err := s.keycloakClient.ImportUsers(cluster.BaseURL, cluster.Realm, token, users); err != nil {
		return fmt.Errorf("failed to import users: %w", err)
	}

	return nil
}

// ExportClients exports all clients as JSON
func (s *ExportImportService) ExportClients(clusterID int) ([]byte, error) {
	cluster, err := s.clusterRepo.GetByID(clusterID)
	if err != nil {
		return nil, fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return nil, fmt.Errorf("cluster not found")
	}

	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}
	token := tokenResp.AccessToken

	clients, err := s.keycloakClient.ExportClients(cluster.BaseURL, cluster.Realm, token)
	if err != nil {
		return nil, fmt.Errorf("failed to export clients: %w", err)
	}

	jsonData, err := json.MarshalIndent(clients, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal clients: %w", err)
	}

	return jsonData, nil
}

// ImportClients imports clients from JSON
func (s *ExportImportService) ImportClients(clusterID int, clientsJSON []byte) error {
	cluster, err := s.clusterRepo.GetByID(clusterID)
	if err != nil {
		return fmt.Errorf("failed to get cluster: %w", err)
	}
	if cluster == nil {
		return fmt.Errorf("cluster not found")
	}

	var clients []map[string]interface{}
	if err := json.Unmarshal(clientsJSON, &clients); err != nil {
		return fmt.Errorf("failed to unmarshal clients: %w", err)
	}

	tokenResp, err := s.keycloakClient.GetClientCredentialsToken(
		cluster.BaseURL,
		cluster.Realm,
		cluster.ClientID,
		cluster.ClientSecret,
	)
	if err != nil {
		return fmt.Errorf("failed to get access token: %w", err)
	}
	token := tokenResp.AccessToken

	if err := s.keycloakClient.ImportClients(cluster.BaseURL, cluster.Realm, token, clients); err != nil {
		return fmt.Errorf("failed to import clients: %w", err)
	}

	return nil
}

