package keycloak

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
	"keycloak-multi-manage/internal/domain"
)

type Client struct {
	httpClient *http.Client
}

func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	TokenType   string `json:"token_type"`
	ExpiresIn   int    `json:"expires_in"`
}

func (c *Client) GetAccessToken(baseURL, realm, username, password string) (string, error) {
	url := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/token", baseURL, realm)
	
	data := fmt.Sprintf("grant_type=password&client_id=admin-cli&username=%s&password=%s",
		username, password)
	
	req, err := http.NewRequest("POST", url, bytes.NewBufferString(data))
	if err != nil {
		return "", err
	}
	
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to get token: %s", string(body))
	}
	
	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", err
	}
	
	return tokenResp.AccessToken, nil
}

func (c *Client) GetRoles(baseURL, realm, accessToken string) ([]domain.Role, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/roles", baseURL, realm)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get roles: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	var roles []domain.Role
	if err := json.NewDecoder(resp.Body).Decode(&roles); err != nil {
		return nil, err
	}
	
	return roles, nil
}

func (c *Client) HealthCheck(baseURL, realm string) (bool, error) {
	url := fmt.Sprintf("%s/realms/%s", baseURL, realm)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return false, err
	}
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	
	return resp.StatusCode == http.StatusOK, nil
}

func (c *Client) GetMetrics(baseURL, realm, accessToken string) (*domain.ClusterMetrics, error) {
	metrics := &domain.ClusterMetrics{}
	
	// Get Clients count
	clients, err := c.getClients(baseURL, realm, accessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get clients: %w", err)
	}
	metrics.Clients = len(clients)
	
	// Get Roles count
	roles, err := c.GetRoles(baseURL, realm, accessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get roles: %w", err)
	}
	metrics.Roles = len(roles)
	
	// Get Users count
	usersCount, err := c.getUsersCount(baseURL, realm, accessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get users count: %w", err)
	}
	metrics.Users = usersCount
	
	// Get Groups count
	groupsCount, err := c.getGroupsCount(baseURL, realm, accessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get groups count: %w", err)
	}
	metrics.Groups = groupsCount
	
	return metrics, nil
}

func (c *Client) GetClients(baseURL, realm, accessToken string) ([]map[string]interface{}, error) {
	return c.getClients(baseURL, realm, accessToken)
}

func (c *Client) getClients(baseURL, realm, accessToken string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/clients", baseURL, realm)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get clients: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	var clients []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&clients); err != nil {
		return nil, err
	}
	
	return clients, nil
}

func (c *Client) getUsersCount(baseURL, realm, accessToken string) (int, error) {
	// Get all users and count them (more reliable than header)
	users, err := c.GetUsers(baseURL, realm, accessToken, 0) // 0 means no limit
	if err != nil {
		return 0, err
	}
	return len(users), nil
}

func (c *Client) getGroupsCount(baseURL, realm, accessToken string) (int, error) {
	// Get all groups and count them (more reliable than header)
	groups, err := c.GetGroups(baseURL, realm, accessToken, 0) // 0 means no limit
	if err != nil {
		return 0, err
	}
	return len(groups), nil
}

func (c *Client) GetUsers(baseURL, realm, accessToken string, max int) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/users", baseURL, realm)
	if max > 0 {
		url = fmt.Sprintf("%s?max=%d", url, max)
	}
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get users: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	var users []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return nil, err
	}
	
	return users, nil
}

// SearchUsers searches for users matching the query
func (c *Client) SearchUsers(baseURL, realm, accessToken, query string) ([]map[string]interface{}, error) {
	// Keycloak supports search parameter for users
	url := fmt.Sprintf("%s/admin/realms/%s/users?search=%s", baseURL, realm, query)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to search users: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	var users []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return nil, err
	}
	
	return users, nil
}

// SearchClients searches for clients matching the query
func (c *Client) SearchClients(baseURL, realm, accessToken, query string) ([]map[string]interface{}, error) {
	// Get all clients and filter by clientId
	clients, err := c.getClients(baseURL, realm, accessToken)
	if err != nil {
		return nil, err
	}
	
	queryLower := strings.ToLower(query)
	var results []map[string]interface{}
	for _, client := range clients {
		clientId, _ := client["clientId"].(string)
		name, _ := client["name"].(string)
		
		if strings.Contains(strings.ToLower(clientId), queryLower) || 
		   (name != "" && strings.Contains(strings.ToLower(name), queryLower)) {
			results = append(results, client)
		}
	}
	
	return results, nil
}

// SearchRoles searches for roles matching the query
func (c *Client) SearchRoles(baseURL, realm, accessToken, query string) ([]domain.Role, error) {
	// Get all roles and filter by name
	roles, err := c.GetRoles(baseURL, realm, accessToken)
	if err != nil {
		return nil, err
	}
	
	queryLower := strings.ToLower(query)
	var results []domain.Role
	for _, role := range roles {
		if strings.Contains(strings.ToLower(role.Name), queryLower) {
			results = append(results, role)
		}
	}
	
	return results, nil
}

func (c *Client) GetGroups(baseURL, realm, accessToken string, max int) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/groups", baseURL, realm)
	if max > 0 {
		url = fmt.Sprintf("%s?max=%d", url, max)
	}
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get groups: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	var groups []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&groups); err != nil {
		return nil, err
	}
	
	return groups, nil
}

// GetClientDetails gets detailed client information including scopes
func (c *Client) GetClientDetails(baseURL, realm, accessToken string) ([]domain.ClientDetail, error) {
	// Get all clients
	clients, err := c.getClients(baseURL, realm, accessToken)
	if err != nil {
		return nil, err
	}
	
	var clientDetails []domain.ClientDetail
	for _, client := range clients {
		clientID, _ := client["id"].(string)
		if clientID == "" {
			continue
		}
		
		detail := domain.ClientDetail{
			ID:                    getString(client, "id"),
			ClientID:              getString(client, "clientId"),
			Name:                  getString(client, "name"),
			Description:           getString(client, "description"),
			Protocol:              getString(client, "protocol"),
			RedirectUris:          getStringSlice(client, "redirectUris"),
			WebOrigins:            getStringSlice(client, "webOrigins"),
			PublicClient:          getBool(client, "publicClient"),
			BearerOnly:            getBool(client, "bearerOnly"),
			DirectAccessGrantsEnabled: getBool(client, "directAccessGrantsEnabled"),
			ServiceAccountsEnabled: getBool(client, "serviceAccountsEnabled"),
			Enabled:               getBool(client, "enabled"),
		}
		
		// Get default client scopes
		defaultScopes, err := c.getClientScopes(baseURL, realm, accessToken, clientID, "default")
		if err == nil {
			detail.DefaultClientScopes = defaultScopes
		}
		
		// Get optional client scopes
		optionalScopes, err := c.getClientScopes(baseURL, realm, accessToken, clientID, "optional")
		if err == nil {
			detail.OptionalClientScopes = optionalScopes
		}
		
		clientDetails = append(clientDetails, detail)
	}
	
	return clientDetails, nil
}

// GetClientSecret gets the client secret for a specific client
func (c *Client) GetClientSecret(baseURL, realm, accessToken, clientID string) (string, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/client-secret", baseURL, realm, clientID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to get client secret: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	var secretResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&secretResp); err != nil {
		return "", err
	}
	
	secret, ok := secretResp["value"].(string)
	if !ok {
		return "", fmt.Errorf("client secret not found in response")
	}
	
	return secret, nil
}

func (c *Client) getClientScopes(baseURL, realm, accessToken, clientID, scopeType string) ([]string, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/%s-client-scopes", baseURL, realm, clientID, scopeType)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return []string{}, nil // Return empty if not found
	}
	
	var scopes []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&scopes); err != nil {
		return []string{}, nil
	}
	
	var scopeNames []string
	for _, scope := range scopes {
		if name, ok := scope["name"].(string); ok {
			scopeNames = append(scopeNames, name)
		}
	}
	
	return scopeNames, nil
}

// GetGroupDetails gets detailed group information including roles and attributes
func (c *Client) GetGroupDetails(baseURL, realm, accessToken string) ([]domain.GroupDetail, error) {
	groups, err := c.GetGroups(baseURL, realm, accessToken, 0)
	if err != nil {
		return nil, err
	}
	
	var groupDetails []domain.GroupDetail
	for _, group := range groups {
		detail := c.convertToGroupDetail(group, baseURL, realm, accessToken)
		groupDetails = append(groupDetails, detail)
	}
	
	return groupDetails, nil
}

func (c *Client) convertToGroupDetail(group map[string]interface{}, baseURL, realm, accessToken string) domain.GroupDetail {
	groupID := getString(group, "id")
	
	detail := domain.GroupDetail{
		ID:        groupID,
		Name:      getString(group, "name"),
		Path:      getString(group, "path"),
		Attributes: make(map[string][]string),
		ClientRoles: make(map[string][]string),
	}
	
	// Get attributes
	if attrs, ok := group["attributes"].(map[string]interface{}); ok {
		for k, v := range attrs {
			if arr, ok := v.([]interface{}); ok {
				var strArr []string
				for _, item := range arr {
					if str, ok := item.(string); ok {
						strArr = append(strArr, str)
					}
				}
				detail.Attributes[k] = strArr
			}
		}
	}
	
	// Get realm roles
	realmRoles, err := c.getGroupRealmRoles(baseURL, realm, accessToken, groupID)
	if err == nil {
		detail.RealmRoles = realmRoles
	}
	
	// Get client roles
	clientRoles, err := c.getGroupClientRoles(baseURL, realm, accessToken, groupID)
	if err == nil {
		detail.ClientRoles = clientRoles
	}
	
	// Get sub-groups recursively
	if subGroups, ok := group["subGroups"].([]interface{}); ok {
		for _, sg := range subGroups {
			if subGroupMap, ok := sg.(map[string]interface{}); ok {
				subDetail := c.convertToGroupDetail(subGroupMap, baseURL, realm, accessToken)
				detail.SubGroups = append(detail.SubGroups, subDetail)
			}
		}
	}
	
	return detail
}

func (c *Client) getGroupRealmRoles(baseURL, realm, accessToken, groupID string) ([]string, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/groups/%s/role-mappings/realm", baseURL, realm, groupID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return []string{}, nil
	}
	
	var roles []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&roles); err != nil {
		return []string{}, nil
	}
	
	var roleNames []string
	for _, role := range roles {
		if name, ok := role["name"].(string); ok {
			roleNames = append(roleNames, name)
		}
	}
	
	return roleNames, nil
}

func (c *Client) getGroupClientRoles(baseURL, realm, accessToken, groupID string) (map[string][]string, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/groups/%s/role-mappings/clients", baseURL, realm, groupID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return make(map[string][]string), nil
	}
	
	var clientRolesMap map[string][]map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&clientRolesMap); err != nil {
		return make(map[string][]string), nil
	}
	
	result := make(map[string][]string)
	for clientID, roles := range clientRolesMap {
		var roleNames []string
		for _, role := range roles {
			if name, ok := role["name"].(string); ok {
				roleNames = append(roleNames, name)
			}
		}
		result[clientID] = roleNames
	}
	
	return result, nil
}

// GetUserDetails gets detailed user information including roles, groups, and attributes
func (c *Client) GetUserDetails(baseURL, realm, accessToken string) ([]domain.UserDetail, error) {
	users, err := c.GetUsers(baseURL, realm, accessToken, 0)
	if err != nil {
		return nil, err
	}
	
	var userDetails []domain.UserDetail
	for _, user := range users {
		userID := getString(user, "id")
		
		detail := domain.UserDetail{
			ID:              userID,
			Username:        getString(user, "username"),
			Email:           getString(user, "email"),
			FirstName:       getString(user, "firstName"),
			LastName:        getString(user, "lastName"),
			Enabled:         getBool(user, "enabled"),
			Attributes:      make(map[string][]string),
			ClientRoles:     make(map[string][]string),
		}
		
		// Get attributes
		if attrs, ok := user["attributes"].(map[string]interface{}); ok {
			for k, v := range attrs {
				if arr, ok := v.([]interface{}); ok {
					var strArr []string
					for _, item := range arr {
						if str, ok := item.(string); ok {
							strArr = append(strArr, str)
						}
					}
					detail.Attributes[k] = strArr
				}
			}
		}
		
		// Get required actions
		if actions, ok := user["requiredActions"].([]interface{}); ok {
			for _, action := range actions {
				if str, ok := action.(string); ok {
					detail.RequiredActions = append(detail.RequiredActions, str)
				}
			}
		}
		
		// Get realm roles
		realmRoles, err := c.getUserRealmRoles(baseURL, realm, accessToken, userID)
		if err == nil {
			detail.RealmRoles = realmRoles
		}
		
		// Get client roles
		clientRoles, err := c.getUserClientRoles(baseURL, realm, accessToken, userID)
		if err == nil {
			detail.ClientRoles = clientRoles
		}
		
		// Get groups
		groups, err := c.getUserGroups(baseURL, realm, accessToken, userID)
		if err == nil {
			detail.Groups = groups
		}
		
		userDetails = append(userDetails, detail)
	}
	
	return userDetails, nil
}

func (c *Client) getUserRealmRoles(baseURL, realm, accessToken, userID string) ([]string, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/users/%s/role-mappings/realm", baseURL, realm, userID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return []string{}, nil
	}
	
	var roles []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&roles); err != nil {
		return []string{}, nil
	}
	
	var roleNames []string
	for _, role := range roles {
		if name, ok := role["name"].(string); ok {
			roleNames = append(roleNames, name)
		}
	}
	
	return roleNames, nil
}

func (c *Client) getUserClientRoles(baseURL, realm, accessToken, userID string) (map[string][]string, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/users/%s/role-mappings/clients", baseURL, realm, userID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return make(map[string][]string), nil
	}
	
	var clientRolesMap map[string][]map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&clientRolesMap); err != nil {
		return make(map[string][]string), nil
	}
	
	result := make(map[string][]string)
	for clientID, roles := range clientRolesMap {
		var roleNames []string
		for _, role := range roles {
			if name, ok := role["name"].(string); ok {
				roleNames = append(roleNames, name)
			}
		}
		result[clientID] = roleNames
	}
	
	return result, nil
}

func (c *Client) getUserGroups(baseURL, realm, accessToken, userID string) ([]string, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/users/%s/groups", baseURL, realm, userID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return []string{}, nil
	}
	
	var groups []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&groups); err != nil {
		return []string{}, nil
	}
	
	var groupPaths []string
	for _, group := range groups {
		if path, ok := group["path"].(string); ok {
			groupPaths = append(groupPaths, path)
		}
	}
	
	return groupPaths, nil
}

// Helper functions
func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if str, ok := v.(string); ok {
			return str
		}
	}
	return ""
}

func getBool(m map[string]interface{}, key string) bool {
	if v, ok := m[key]; ok {
		if b, ok := v.(bool); ok {
			return b
		}
	}
	return false
}

func getStringSlice(m map[string]interface{}, key string) []string {
	if v, ok := m[key]; ok {
		if arr, ok := v.([]interface{}); ok {
			var result []string
			for _, item := range arr {
				if str, ok := item.(string); ok {
					result = append(result, str)
				}
			}
			return result
		}
	}
	return []string{}
}

// ExportRealm exports the realm configuration as JSON
func (c *Client) ExportRealm(baseURL, realm, accessToken string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s", baseURL, realm)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to export realm: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	var realmConfig map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&realmConfig); err != nil {
		return nil, err
	}
	
	return realmConfig, nil
}

// ImportRealm imports a realm configuration
func (c *Client) ImportRealm(baseURL, accessToken string, realmConfig map[string]interface{}) error {
	url := fmt.Sprintf("%s/admin/realms", baseURL)
	
	jsonData, err := json.Marshal(realmConfig)
	if err != nil {
		return fmt.Errorf("failed to marshal realm config: %w", err)
	}
	
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to import realm: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	return nil
}

// ExportUsers exports all users as JSON array
func (c *Client) ExportUsers(baseURL, realm, accessToken string) ([]map[string]interface{}, error) {
	return c.GetUsers(baseURL, realm, accessToken, 0)
}

// ImportUsers imports users from JSON array
func (c *Client) ImportUsers(baseURL, realm, accessToken string, users []map[string]interface{}) error {
	for _, user := range users {
		username := getString(user, "username")
		
		// Remove ID to allow Keycloak to generate new one or use existing
		delete(user, "id")
		delete(user, "createdTimestamp")
		
		jsonData, err := json.Marshal(user)
		if err != nil {
			return fmt.Errorf("failed to marshal user: %w", err)
		}
		
		url := fmt.Sprintf("%s/admin/realms/%s/users", baseURL, realm)
		req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
		if err != nil {
			return err
		}
		
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
		req.Header.Set("Content-Type", "application/json")
		
		resp, err := c.httpClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		
		// If user already exists (409), try to update it
		if resp.StatusCode == http.StatusConflict {
			// Find existing user by username
			existingUsers, err := c.GetUsers(baseURL, realm, accessToken, 0)
			if err != nil {
				return fmt.Errorf("failed to get existing users: %w", err)
			}
			
			var existingUserID string
			for _, eu := range existingUsers {
				if getString(eu, "username") == username {
					existingUserID = getString(eu, "id")
					break
				}
			}
			
			if existingUserID == "" {
				return fmt.Errorf("user %v already exists but could not find its ID", username)
			}
			
			// Update existing user
			updateURL := fmt.Sprintf("%s/admin/realms/%s/users/%s", baseURL, realm, existingUserID)
			updateReq, err := http.NewRequest("PUT", updateURL, bytes.NewBuffer(jsonData))
			if err != nil {
				return err
			}
			
			updateReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
			updateReq.Header.Set("Content-Type", "application/json")
			
			updateResp, err := c.httpClient.Do(updateReq)
			if err != nil {
				return err
			}
			defer updateResp.Body.Close()
			
			if updateResp.StatusCode != http.StatusNoContent {
				body, _ := io.ReadAll(updateResp.Body)
				return fmt.Errorf("failed to update existing user %v: status %d, body: %s", username, updateResp.StatusCode, string(body))
			}
		} else if resp.StatusCode != http.StatusCreated {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("failed to import user %v: status %d, body: %s", username, resp.StatusCode, string(body))
		}
	}
	
	return nil
}

// GetServerInfo gets Keycloak server information including version
func (c *Client) GetServerInfo(baseURL, accessToken string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/serverinfo", baseURL)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get server info: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	var serverInfo map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&serverInfo); err != nil {
		return nil, err
	}
	
	return serverInfo, nil
}

// ExportClients exports all clients as JSON array
func (c *Client) ExportClients(baseURL, realm, accessToken string) ([]map[string]interface{}, error) {
	return c.getClients(baseURL, realm, accessToken)
}

// ImportClients imports clients from JSON array
func (c *Client) ImportClients(baseURL, realm, accessToken string, clients []map[string]interface{}) error {
	for _, client := range clients {
		clientIdStr := getString(client, "clientId")
		
		// Remove ID to allow Keycloak to generate new one or use existing
		delete(client, "id")
		
		jsonData, err := json.Marshal(client)
		if err != nil {
			return fmt.Errorf("failed to marshal client: %w", err)
		}
		
		url := fmt.Sprintf("%s/admin/realms/%s/clients", baseURL, realm)
		req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
		if err != nil {
			return err
		}
		
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
		req.Header.Set("Content-Type", "application/json")
		
		resp, err := c.httpClient.Do(req)
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		
		// If client already exists (409), try to update it
		if resp.StatusCode == http.StatusConflict {
			// Find existing client by clientId
			existingClients, err := c.getClients(baseURL, realm, accessToken)
			if err != nil {
				return fmt.Errorf("failed to get existing clients: %w", err)
			}
			
			var existingClientID string
			for _, ec := range existingClients {
				if getString(ec, "clientId") == clientIdStr {
					existingClientID = getString(ec, "id")
					break
				}
			}
			
			if existingClientID == "" {
				return fmt.Errorf("client %v already exists but could not find its ID", clientIdStr)
			}
			
			// Update existing client
			updateURL := fmt.Sprintf("%s/admin/realms/%s/clients/%s", baseURL, realm, existingClientID)
			updateReq, err := http.NewRequest("PUT", updateURL, bytes.NewBuffer(jsonData))
			if err != nil {
				return err
			}
			
			updateReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
			updateReq.Header.Set("Content-Type", "application/json")
			
			updateResp, err := c.httpClient.Do(updateReq)
			if err != nil {
				return err
			}
			defer updateResp.Body.Close()
			
			if updateResp.StatusCode != http.StatusNoContent {
				body, _ := io.ReadAll(updateResp.Body)
				return fmt.Errorf("failed to update existing client %v: status %d, body: %s", clientIdStr, updateResp.StatusCode, string(body))
			}
		} else if resp.StatusCode != http.StatusCreated {
			body, _ := io.ReadAll(resp.Body)
			return fmt.Errorf("failed to import client %v: status %d, body: %s", clientIdStr, resp.StatusCode, string(body))
		}
	}
	
	return nil
}

// GetUserToken gets access token for a specific user using password grant
func (c *Client) GetUserToken(baseURL, realm, username, password, clientID string) (*TokenResponse, error) {
	if clientID == "" {
		clientID = "admin-cli"
	}
	
	url := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/token", baseURL, realm)
	
	data := fmt.Sprintf("grant_type=password&client_id=%s&username=%s&password=%s",
		clientID, username, password)
	
	req, err := http.NewRequest("POST", url, bytes.NewBufferString(data))
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get user token: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}
	
	return &tokenResp, nil
}

// GetClientCredentialsToken gets access token using client credentials grant
func (c *Client) GetClientCredentialsToken(baseURL, realm, clientID, clientSecret string) (*TokenResponse, error) {
	if clientID == "" {
		return nil, fmt.Errorf("client_id is required for client_credentials grant")
	}
	
	url := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/token", baseURL, realm)
	
	data := fmt.Sprintf("grant_type=client_credentials&client_id=%s&client_secret=%s",
		clientID, clientSecret)
	
	req, err := http.NewRequest("POST", url, bytes.NewBufferString(data))
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get client credentials token: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	var tokenResp TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return nil, err
	}
	
	return &tokenResp, nil
}

// DecodeToken decodes a JWT token and returns header, payload, and claims
func (c *Client) DecodeToken(token string) (map[string]interface{}, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token format")
	}
	
	result := make(map[string]interface{})
	
	// Decode header
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("failed to decode header: %w", err)
	}
	var header map[string]interface{}
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, fmt.Errorf("failed to parse header: %w", err)
	}
	result["header"] = header
	
	// Decode payload
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("failed to decode payload: %w", err)
	}
	var payload map[string]interface{}
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, fmt.Errorf("failed to parse payload: %w", err)
	}
	result["payload"] = payload
	
	// Extract claims
	claims := make(map[string]interface{})
	if exp, ok := payload["exp"]; ok {
		claims["expiration"] = exp
	}
	if iat, ok := payload["iat"]; ok {
		claims["issued_at"] = iat
	}
	if sub, ok := payload["sub"]; ok {
		claims["subject"] = sub
	}
	if email, ok := payload["email"]; ok {
		claims["email"] = email
	}
	if preferredUsername, ok := payload["preferred_username"]; ok {
		claims["username"] = preferredUsername
	}
	if realmAccess, ok := payload["realm_access"]; ok {
		if realmAccessMap, ok := realmAccess.(map[string]interface{}); ok {
			if roles, ok := realmAccessMap["roles"]; ok {
				claims["realm_roles"] = roles
			}
		}
	}
	if resourceAccess, ok := payload["resource_access"]; ok {
		if resourceAccessMap, ok := resourceAccess.(map[string]interface{}); ok {
			clientRoles := make(map[string]interface{})
			for clientID, access := range resourceAccessMap {
				if accessMap, ok := access.(map[string]interface{}); ok {
					if roles, ok := accessMap["roles"]; ok {
						clientRoles[clientID] = roles
					}
				}
			}
			if len(clientRoles) > 0 {
				claims["client_roles"] = clientRoles
			}
		}
	}
	result["claims"] = claims
	
	return result, nil
}

// GetPrometheusMetrics fetches Prometheus metrics from Keycloak metrics endpoint
func (c *Client) GetPrometheusMetrics(metricsEndpoint string) (*domain.PrometheusMetrics, error) {
	// Use the provided metrics endpoint URL
	metricsURL := metricsEndpoint
	
	req, err := http.NewRequest("GET", metricsURL, nil)
	if err != nil {
		return &domain.PrometheusMetrics{
			Available: false,
			Error:     fmt.Sprintf("Failed to create request: %v", err),
		}, nil
	}
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return &domain.PrometheusMetrics{
			Available: false,
			Error:     fmt.Sprintf("Failed to fetch metrics: %v", err),
		}, nil
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return &domain.PrometheusMetrics{
			Available: false,
			Error:     fmt.Sprintf("Metrics endpoint returned status %d", resp.StatusCode),
		}, nil
	}
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &domain.PrometheusMetrics{
			Available: false,
			Error:     fmt.Sprintf("Failed to read response: %v", err),
		}, nil
	}
	
	metrics := c.parsePrometheusMetrics(string(body))
	metrics.Available = true
	return metrics, nil
}


// parsePrometheusMetrics parses Prometheus format metrics text
func (c *Client) parsePrometheusMetrics(text string) *domain.PrometheusMetrics {
	metrics := &domain.PrometheusMetrics{
		Available:         false,
		InfinispanMetrics: make(map[string]float64),
	}
	
	var heapUsed, heapMax float64
	
	lines := strings.Split(text, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		
		// Parse metric lines: metric_name{labels} value
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}
		
		metricName := strings.Split(parts[0], "{")[0]
		valueStr := parts[len(parts)-1]
		value, err := strconv.ParseFloat(valueStr, 64)
		if err != nil {
			continue
		}
		
		// Health Row Metrics
		switch {
		case strings.Contains(metricName, "process_uptime_seconds"):
			metrics.Uptime = value
		case strings.Contains(metricName, "keycloak_sessions_active"):
			metrics.ActiveSessions = value
		case strings.Contains(metricName, "jvm_memory_heap_used_bytes"):
			heapUsed = value / (1024 * 1024) // Convert to MB
		case strings.Contains(metricName, "jvm_memory_heap_max_bytes"):
			heapMax = value / (1024 * 1024) // Convert to MB
		case strings.Contains(metricName, "hikari_connections_active") || strings.Contains(metricName, "db_pool_active"):
			// DB Pool Usage - need to get max connections too
			if strings.Contains(metricName, "active") {
				// Try to find max connections in the same line or nearby
				metrics.DbPoolUsage = value // Will be calculated if we find max
			}
		case strings.Contains(metricName, "hikari_connections_max") || strings.Contains(metricName, "db_pool_max"):
			if metrics.DbPoolUsage > 0 {
				metrics.DbPoolUsage = (metrics.DbPoolUsage / value) * 100
			}
		
		// Traffic Row Metrics
		case strings.Contains(metricName, "keycloak_logins") && strings.Contains(metricName, "total"):
			if strings.Contains(line, "result=\"success\"") {
				metrics.Logins1Min = value
			} else if strings.Contains(line, "result=\"error\"") || strings.Contains(line, "result=\"failure\"") {
				metrics.FailedLogins1Min = value
			}
		case strings.Contains(metricName, "keycloak_token_exchanges_total") || strings.Contains(metricName, "keycloak_token_requests_total"):
			if strings.Contains(line, "result=\"success\"") {
				metrics.TokenRequests = value
			} else if strings.Contains(line, "result=\"error\"") {
				metrics.TokenErrors = value
			}
		
		// Performance Row Metrics
		case strings.Contains(metricName, "http_server_requests_seconds_sum"):
			metrics.AvgRequestDuration = value
		case strings.Contains(metricName, "http_server_requests_seconds_count"):
			if metrics.AvgRequestDuration > 0 && value > 0 {
				metrics.AvgRequestDuration = metrics.AvgRequestDuration / value
			}
			metrics.HttpRequestCount = value
		case strings.Contains(metricName, "keycloak_token_endpoint_latency") || (strings.Contains(metricName, "http_server_requests_seconds") && strings.Contains(line, "uri=\"/realms") && strings.Contains(line, "token\"")):
			metrics.TokenEndpointLatency = value
		case strings.Contains(metricName, "jvm_gc_pause_seconds_sum") || strings.Contains(metricName, "jvm_gc_pause_seconds_total"):
			metrics.GcPauses5Min = value
		
		// Cache Row Metrics
		case strings.Contains(metricName, "cache_hits_total") || strings.Contains(metricName, "cache_hits"):
			if metrics.InfinispanMetrics == nil {
				metrics.InfinispanMetrics = make(map[string]float64)
			}
			metrics.InfinispanMetrics["hits"] = value
		case strings.Contains(metricName, "cache_misses_total") || strings.Contains(metricName, "cache_misses"):
			metrics.CacheMisses = value
			if metrics.InfinispanMetrics == nil {
				metrics.InfinispanMetrics = make(map[string]float64)
			}
			metrics.InfinispanMetrics["misses"] = value
		case strings.Contains(metricName, "infinispan"):
			// Store all infinispan metrics
			if metrics.InfinispanMetrics == nil {
				metrics.InfinispanMetrics = make(map[string]float64)
			}
			key := strings.ReplaceAll(metricName, "infinispan_", "")
			metrics.InfinispanMetrics[key] = value
		}
	}
	
	// Calculate JVM Heap Percentage
	if heapMax > 0 && heapUsed > 0 {
		metrics.JvmHeapPercent = (heapUsed / heapMax) * 100
	}
	
	// Calculate Cache Hit Rate
	if metrics.InfinispanMetrics != nil {
		hits := metrics.InfinispanMetrics["hits"]
		misses := metrics.CacheMisses
		if hits > 0 || misses > 0 {
			total := hits + misses
			if total > 0 {
				metrics.CacheHitRate = (hits / total) * 100
			}
		}
	}
	
	return metrics
}

// GetRBACAnalysis analyzes RBAC structure for a specific role
func (c *Client) GetRBACAnalysis(baseURL, realm, accessToken, roleName string) (*domain.RBACAnalysis, error) {
	// Get role details
	role, err := c.getRoleDetails(baseURL, realm, accessToken, roleName)
	if err != nil {
		return nil, fmt.Errorf("failed to get role details: %w", err)
	}

	// Build RBAC tree recursively
	rbacNode := c.buildRBACTree(baseURL, realm, accessToken, role, 0)

	// Calculate statistics
	stats := c.calculateRBACStats(rbacNode)

	return &domain.RBACAnalysis{
		Role:       rbacNode,
		Statistics: stats,
	}, nil
}

// GetUserRBACAnalysis analyzes RBAC structure for a specific user
func (c *Client) GetUserRBACAnalysis(baseURL, realm, accessToken, username string) (*domain.RBACAnalysis, error) {
	// Get user by username
	user, err := c.getUserByUsername(baseURL, realm, accessToken, username)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	userID := getString(user, "id")
	
	// Build user node
	userNode := domain.RBACNode{
		ID:          fmt.Sprintf("user-%s", username),
		Name:        username,
		Type:        "user",
		Description: fmt.Sprintf("User: %s", username),
		Children:    []domain.RBACNode{},
	}

	// Get realm roles for user
	realmRoles, err := c.getUserRealmRoles(baseURL, realm, accessToken, userID)
	if err == nil {
		for _, roleName := range realmRoles {
			role, err := c.getRoleDetails(baseURL, realm, accessToken, roleName)
			if err == nil {
				roleNode := c.buildRBACTree(baseURL, realm, accessToken, role, 0)
				userNode.Children = append(userNode.Children, roleNode)
			}
		}
	}

	// Get client roles for user
	clientRoles, err := c.getUserClientRoles(baseURL, realm, accessToken, userID)
	if err == nil {
		for clientID, roleNames := range clientRoles {
			// Get client details
			client, err := c.getClientByID(baseURL, realm, accessToken, clientID)
			if err == nil {
				clientNode := domain.RBACNode{
					ID:          fmt.Sprintf("client-%s", getString(client, "clientId")),
					Name:        getString(client, "clientId"),
					Type:        "client",
					Description: fmt.Sprintf("Client: %s", getString(client, "clientId")),
					Children:    []domain.RBACNode{},
				}

				// Get client roles
				for _, roleName := range roleNames {
					clientRole, err := c.getClientRoleDetails(baseURL, realm, accessToken, clientID, roleName)
					if err == nil {
						clientRoleNode := c.buildClientRoleNode(baseURL, realm, accessToken, clientRole, 0)
						clientNode.Children = append(clientNode.Children, clientRoleNode)
					}
				}

				userNode.Children = append(userNode.Children, clientNode)
			}
		}
	}

	// Calculate statistics
	stats := c.calculateRBACStats(userNode)

	return &domain.RBACAnalysis{
		Role:       userNode,
		Statistics: stats,
	}, nil
}

// GetClientRBACAnalysis analyzes RBAC structure for a specific client
func (c *Client) GetClientRBACAnalysis(baseURL, realm, accessToken, clientID string) (*domain.RBACAnalysis, error) {
	// Get client by ID
	client, err := c.getClientByID(baseURL, realm, accessToken, clientID)
	if err != nil {
		return nil, fmt.Errorf("failed to get client: %w", err)
	}

	clientNode := domain.RBACNode{
		ID:          fmt.Sprintf("client-%s", getString(client, "clientId")),
		Name:        getString(client, "clientId"),
		Type:        "client",
		Description: fmt.Sprintf("Client: %s", getString(client, "clientId")),
		Children:    []domain.RBACNode{},
	}

	// Get client roles
	clientRoles, err := c.getClientRoles(baseURL, realm, accessToken, clientID)
	if err == nil {
		for _, clientRole := range clientRoles {
			clientRoleNode := c.buildClientRoleNode(baseURL, realm, accessToken, clientRole, 0)
			clientNode.Children = append(clientNode.Children, clientRoleNode)
		}
	}

	// Get all scopes for this client
	scopes, err := c.getScopesForClientRole(baseURL, realm, accessToken, clientID, "")
	if err == nil {
		for _, scope := range scopes {
			scopeNode := domain.RBACNode{
				ID:          fmt.Sprintf("scope-%s", getString(scope, "name")),
				Name:        getString(scope, "name"),
				Type:        "scope",
				Description: fmt.Sprintf("Scope: %s", getString(scope, "name")),
				Children:    []domain.RBACNode{},
			}

			// Get permissions for this scope
			permissions, err := c.getAllPermissionsForClient(baseURL, realm, accessToken, clientID)
			if err == nil {
				for _, permission := range permissions {
					if c.permissionHasScope(permission, getString(scope, "name")) {
						permissionNode := c.buildPermissionNode(baseURL, realm, accessToken, clientID, permission, 0)
						scopeNode.Children = append(scopeNode.Children, permissionNode)
					}
				}
			}

			if len(scopeNode.Children) > 0 {
				clientNode.Children = append(clientNode.Children, scopeNode)
			}
		}
	}

	// Calculate statistics
	stats := c.calculateRBACStats(clientNode)

	return &domain.RBACAnalysis{
		Role:       clientNode,
		Statistics: stats,
	}, nil
}

// getRoleDetails gets detailed information about a role
func (c *Client) getRoleDetails(baseURL, realm, accessToken, roleName string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/roles/%s", baseURL, realm, roleName)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get role details: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	var role map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&role); err != nil {
		return nil, err
	}
	
	return role, nil
}

// buildRBACTree recursively builds the RBAC tree structure
func (c *Client) buildRBACTree(baseURL, realm, accessToken string, role map[string]interface{}, depth int) domain.RBACNode {
	if depth > 10 { // Prevent infinite recursion
		return domain.RBACNode{}
	}

	roleName := getString(role, "name")
	roleID := fmt.Sprintf("role-%s", roleName)
	
	node := domain.RBACNode{
		ID:          roleID,
		Name:        roleName,
		Type:        "role",
		Description: getString(role, "description"),
		Children:    []domain.RBACNode{},
	}

	// Get composite roles
	if getBool(role, "composite") {
		composites, err := c.getCompositeRoles(baseURL, realm, accessToken, roleName)
		if err == nil {
			for _, composite := range composites {
				compositeNode := domain.RBACNode{
					ID:          fmt.Sprintf("composite-%s", getString(composite, "name")),
					Name:        getString(composite, "name"),
					Type:        "composite",
					Description: fmt.Sprintf("Composite: %s", getString(composite, "name")),
					Children:    []domain.RBACNode{},
				}
				
				// Recursively get client roles for composite
				clientRoles, err := c.getClientRolesForRole(baseURL, realm, accessToken, getString(composite, "name"))
				if err == nil {
					for _, clientRole := range clientRoles {
						clientRoleNode := c.buildClientRoleNode(baseURL, realm, accessToken, clientRole, depth+1)
						compositeNode.Children = append(compositeNode.Children, clientRoleNode)
					}
				}
				
				node.Children = append(node.Children, compositeNode)
			}
		}
	}

	// Get client roles directly assigned to this role
	clientRoles, err := c.getClientRolesForRole(baseURL, realm, accessToken, roleName)
	if err == nil {
		for _, clientRole := range clientRoles {
			clientRoleNode := c.buildClientRoleNode(baseURL, realm, accessToken, clientRole, depth+1)
			node.Children = append(node.Children, clientRoleNode)
		}
	}

	return node
}

// buildClientRoleNode builds a client role node with scopes, permissions, and policies
func (c *Client) buildClientRoleNode(baseURL, realm, accessToken string, clientRole map[string]interface{}, depth int) domain.RBACNode {
	clientRoleName := getString(clientRole, "name")
	clientID := getString(clientRole, "containerId")
	
	clientRoleNode := domain.RBACNode{
		ID:          fmt.Sprintf("client-role-%s", clientRoleName),
		Name:        clientRoleName,
		Type:        "client-role",
		Description: fmt.Sprintf("Client Role: %s", clientRoleName),
		Children:    []domain.RBACNode{},
	}

	// Get all scopes for this client
	scopes, err := c.getScopesForClientRole(baseURL, realm, accessToken, clientID, clientRoleName)
	if err == nil {
		for _, scope := range scopes {
			scopeName := getString(scope, "name")
			scopeNode := domain.RBACNode{
				ID:          fmt.Sprintf("scope-%s", scopeName),
				Name:        scopeName,
				Type:        "scope",
				Description: fmt.Sprintf("Scope: %s", scopeName),
				Children:    []domain.RBACNode{},
			}
			
			// Get all permissions for this client and filter by scope
			permissions, err := c.getAllPermissionsForClient(baseURL, realm, accessToken, clientID)
			if err == nil {
				for _, permission := range permissions {
					// Check if permission includes this scope
					if c.permissionHasScope(permission, scopeName) {
						permissionNode := c.buildPermissionNode(baseURL, realm, accessToken, clientID, permission, depth+1)
						scopeNode.Children = append(scopeNode.Children, permissionNode)
					}
				}
			}
			
			// Only add scope node if it has permissions
			if len(scopeNode.Children) > 0 {
				clientRoleNode.Children = append(clientRoleNode.Children, scopeNode)
			}
		}
	}
	
	// Also get permissions without scopes (resource permissions)
	permissions, err := c.getAllPermissionsForClient(baseURL, realm, accessToken, clientID)
	if err == nil {
		for _, permission := range permissions {
			// Check if permission has no scopes (resource permission)
			if !c.permissionHasAnyScope(permission) {
				permissionNode := c.buildPermissionNode(baseURL, realm, accessToken, clientID, permission, depth+1)
				// Add directly to client role if it has policies
				if len(permissionNode.Children) > 0 {
					clientRoleNode.Children = append(clientRoleNode.Children, permissionNode)
				}
			}
		}
	}

	return clientRoleNode
}

// buildPermissionNode builds a permission node with policies
func (c *Client) buildPermissionNode(baseURL, realm, accessToken, clientID string, permission map[string]interface{}, depth int) domain.RBACNode {
	permissionName := getString(permission, "name")
	
	permissionNode := domain.RBACNode{
		ID:          fmt.Sprintf("permission-%s", permissionName),
		Name:        permissionName,
		Type:        "permission",
		Description: fmt.Sprintf("Permission: %s", permissionName),
		Children:    []domain.RBACNode{},
	}

	// Get policies from permission's policies field
	if policies, ok := permission["policies"].([]interface{}); ok {
		for _, policyInterface := range policies {
			if policyID, ok := policyInterface.(string); ok {
				// Get policy details by ID
				policy, err := c.getPolicyByID(baseURL, realm, accessToken, clientID, policyID)
				if err == nil && policy != nil {
					policyType := getString(policy, "type")
					policyNode := domain.RBACNode{
						ID:          fmt.Sprintf("policy-%s", getString(policy, "name")),
						Name:        getString(policy, "name"),
						Type:        "policy",
						Description: fmt.Sprintf("Policy: %s", getString(policy, "name")),
						PolicyType:  policyType,
						Children:    []domain.RBACNode{},
					}
					permissionNode.Children = append(permissionNode.Children, policyNode)
				}
			}
		}
	}

	return permissionNode
}

// Helper functions to fetch RBAC components
func (c *Client) getCompositeRoles(baseURL, realm, accessToken, roleName string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/roles/%s/composites", baseURL, realm, roleName)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return []map[string]interface{}{}, nil
	}
	
	var composites []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&composites)
	return composites, nil
}

func (c *Client) getClientRolesForRole(baseURL, realm, accessToken, roleName string) ([]map[string]interface{}, error) {
	// Get all clients first
	clients, err := c.getClients(baseURL, realm, accessToken)
	if err != nil {
		return nil, err
	}
	
	var clientRoles []map[string]interface{}
	for _, client := range clients {
		clientID := getString(client, "id")
		if clientID == "" {
			continue
		}
		
		// Get client roles
		roles, err := c.getClientRoles(baseURL, realm, accessToken, clientID)
		if err == nil {
			clientRoles = append(clientRoles, roles...)
		}
	}
	
	return clientRoles, nil
}

func (c *Client) getClientRoles(baseURL, realm, accessToken, clientID string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/roles", baseURL, realm, clientID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return []map[string]interface{}{}, nil
	}
	
	var roles []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&roles)
	return roles, nil
}

func (c *Client) getScopesForClientRole(baseURL, realm, accessToken, clientID, roleName string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/authz/resource-server/scope", baseURL, realm, clientID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return []map[string]interface{}{}, nil
	}
	
	var scopes []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&scopes)
	return scopes, nil
}

func (c *Client) getPermissionsForScope(baseURL, realm, accessToken, clientID, scopeName string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/authz/resource-server/permission/scope", baseURL, realm, clientID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return []map[string]interface{}{}, nil
	}
	
	var permissions []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&permissions)
	return permissions, nil
}

func (c *Client) getPoliciesForPermission(baseURL, realm, accessToken, clientID, permissionName string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/authz/resource-server/policy", baseURL, realm, clientID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return []map[string]interface{}{}, nil
	}
	
	var policies []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&policies)
	return policies, nil
}

// getAllPermissionsForClient gets all permissions (resource and scope) for a client
func (c *Client) getAllPermissionsForClient(baseURL, realm, accessToken, clientID string) ([]map[string]interface{}, error) {
	var allPermissions []map[string]interface{}
	
	// Get resource permissions
	resourcePerms, err := c.getResourcePermissions(baseURL, realm, accessToken, clientID)
	if err == nil {
		allPermissions = append(allPermissions, resourcePerms...)
	}
	
	// Get scope permissions
	scopePerms, err := c.getScopePermissions(baseURL, realm, accessToken, clientID)
	if err == nil {
		allPermissions = append(allPermissions, scopePerms...)
	}
	
	return allPermissions, nil
}

// getResourcePermissions gets all resource permissions for a client
func (c *Client) getResourcePermissions(baseURL, realm, accessToken, clientID string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/authz/resource-server/permission/resource", baseURL, realm, clientID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return []map[string]interface{}{}, nil
	}
	
	var permissions []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&permissions)
	return permissions, nil
}

// getScopePermissions gets all scope permissions for a client
func (c *Client) getScopePermissions(baseURL, realm, accessToken, clientID string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/authz/resource-server/permission/scope", baseURL, realm, clientID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return []map[string]interface{}{}, nil
	}
	
	var permissions []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&permissions)
	return permissions, nil
}

// permissionHasScope checks if a permission includes a specific scope
func (c *Client) permissionHasScope(permission map[string]interface{}, scopeName string) bool {
	if scopes, ok := permission["scopes"].([]interface{}); ok {
		for _, scopeInterface := range scopes {
			if scope, ok := scopeInterface.(map[string]interface{}); ok {
				if getString(scope, "name") == scopeName {
					return true
				}
			} else if scopeStr, ok := scopeInterface.(string); ok {
				if scopeStr == scopeName {
					return true
				}
			}
		}
	}
	return false
}

// permissionHasAnyScope checks if a permission has any scopes
func (c *Client) permissionHasAnyScope(permission map[string]interface{}) bool {
	if scopes, ok := permission["scopes"].([]interface{}); ok {
		return len(scopes) > 0
	}
	return false
}

// getPolicyByID gets a policy by its ID
func (c *Client) getPolicyByID(baseURL, realm, accessToken, clientID, policyID string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/authz/resource-server/policy/%s", baseURL, realm, clientID, policyID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get policy: status %d", resp.StatusCode)
	}
	
	var policy map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&policy)
	return policy, nil
}

// getUserByUsername gets a user by username
func (c *Client) getUserByUsername(baseURL, realm, accessToken, username string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/users?username=%s&exact=true", baseURL, realm, username)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get user: status %d", resp.StatusCode)
	}
	
	var users []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&users)
	
	if len(users) == 0 {
		return nil, fmt.Errorf("user not found")
	}
	
	return users[0], nil
}

// DiscoverRealms discovers all realms in a Keycloak instance using master realm admin credentials
func (c *Client) DiscoverRealms(baseURL, username, password string) ([]domain.RealmInfo, error) {
	// Get admin token from master realm
	accessToken, err := c.GetAccessToken(baseURL, "master", username, password)
	if err != nil {
		return nil, fmt.Errorf("failed to get admin token: %w", err)
	}

	// Get all realms
	url := fmt.Sprintf("%s/admin/realms", baseURL)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to discover realms: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	var realms []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&realms); err != nil {
		return nil, err
	}
	
	realmInfos := make([]domain.RealmInfo, 0, len(realms))
	for _, realm := range realms {
		realmName, ok := realm["realm"].(string)
		if !ok {
			continue
		}
		
		enabled, ok := realm["enabled"].(bool)
		if !ok {
			enabled = true // Default to enabled if not specified
		}
		
		realmInfos = append(realmInfos, domain.RealmInfo{
			Realm:   realmName,
			Enabled: enabled,
		})
	}
	
	return realmInfos, nil
}

// CreateMultiManageClient creates the multi-manage client in a realm
func (c *Client) CreateMultiManageClient(baseURL, realm, accessToken, clientID string) error {
	// Check if client already exists
	clients, err := c.getClients(baseURL, realm, accessToken)
	if err != nil {
		return fmt.Errorf("failed to check existing clients: %w", err)
	}
	
	for _, client := range clients {
		if id, ok := client["clientId"].(string); ok && id == clientID {
			// Client already exists
			return nil
		}
	}
	
	// Create client
	url := fmt.Sprintf("%s/admin/realms/%s/clients", baseURL, realm)
	
	clientData := map[string]interface{}{
		"clientId":                clientID,
		"enabled":                 true,
		"clientAuthenticatorType": "client-secret",
		"serviceAccountsEnabled":  true,
		"standardFlowEnabled":     false,
		"implicitFlowEnabled":     false,
		"directAccessGrantsEnabled": false,
		"publicClient":            false,
	}
	
	jsonData, err := json.Marshal(clientData)
	if err != nil {
		return err
	}
	
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusConflict {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to create client: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	return nil
}

// GetServiceAccountUser gets the service account user for a client
func (c *Client) GetServiceAccountUser(baseURL, realm, accessToken, clientID string) (map[string]interface{}, error) {
	// First, get the client UUID
	clients, err := c.getClients(baseURL, realm, accessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get clients: %w", err)
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
	
	// Get service account user
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/service-account-user", baseURL, realm, clientUUID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get service account user: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	var user map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}
	
	return user, nil
}

// AssignRealmAdminRoleToServiceAccount assigns realm-admin role to service account user
// Tries both realm role and client role (realm-management client)
// Tries multiple role names: realm-admin, admin, administrator
func (c *Client) AssignRealmAdminRoleToServiceAccount(baseURL, realm, accessToken, userID, multiManageClientUUID string) error {
	// Try different admin role names
	roleNames := []string{"realm-admin", "admin", "administrator"}
	
	var role map[string]interface{}
	var foundRole bool
	
	for _, roleName := range roleNames {
		url := fmt.Sprintf("%s/admin/realms/%s/roles/%s", baseURL, realm, roleName)
		
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			continue
		}
		
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
		req.Header.Set("Content-Type", "application/json")
		
		resp, err := c.httpClient.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()
		
		if resp.StatusCode == http.StatusOK {
			if err := json.NewDecoder(resp.Body).Decode(&role); err == nil {
				foundRole = true
				break
			}
		}
	}
	
	if !foundRole {
		// If no admin role found, try to get all roles and find one with admin in the name
		url := fmt.Sprintf("%s/admin/realms/%s/roles", baseURL, realm)
		
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return fmt.Errorf("no admin role found and failed to list roles: %w", err)
		}
		
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
		req.Header.Set("Content-Type", "application/json")
		
		resp, err := c.httpClient.Do(req)
		if err != nil {
			return fmt.Errorf("no admin role found and failed to list roles: %w", err)
		}
		defer resp.Body.Close()
		
		if resp.StatusCode == http.StatusOK {
			var roles []map[string]interface{}
			if err := json.NewDecoder(resp.Body).Decode(&roles); err == nil {
				// Look for any role with "admin" in the name (case insensitive)
				for _, r := range roles {
					if name, ok := r["name"].(string); ok {
						nameLower := strings.ToLower(name)
						if strings.Contains(nameLower, "admin") {
							role = r
							foundRole = true
							break
						}
					}
				}
			}
		}
	}
	
	// Try to assign realm role first if found
	if foundRole {
		url := fmt.Sprintf("%s/admin/realms/%s/users/%s/role-mappings/realm", baseURL, realm, userID)
		
		roles := []map[string]interface{}{role}
		jsonData, err := json.Marshal(roles)
		if err != nil {
			// Continue to try client role
		} else {
			req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
			if err == nil {
				req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
				req.Header.Set("Content-Type", "application/json")
				
				resp, err := c.httpClient.Do(req)
				if err == nil {
					resp.Body.Close()
					if resp.StatusCode == http.StatusNoContent || resp.StatusCode == http.StatusOK {
						return nil // Success with realm role!
					}
				}
			}
		}
	}
	
	// If realm role assignment failed or not found, try client role from realm-management
	// Get realm-management client UUID
	clients, err := c.getClients(baseURL, realm, accessToken)
	if err != nil {
		return fmt.Errorf("failed to get clients for client role assignment: %w", err)
	}
	
	var realmManagementClientUUID string
	for _, client := range clients {
		if id, ok := client["clientId"].(string); ok && id == "realm-management" {
			if uuid, ok := client["id"].(string); ok {
				realmManagementClientUUID = uuid
				break
			}
		}
	}
	
	if realmManagementClientUUID == "" {
		return fmt.Errorf("realm-management client not found - cannot assign client role")
	}
	
	// Try to get realm-admin client role from realm-management
	for _, roleName := range roleNames {
		url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/roles/%s", baseURL, realm, realmManagementClientUUID, roleName)
		
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			continue
		}
		
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
		req.Header.Set("Content-Type", "application/json")
		
		resp, err := c.httpClient.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()
		
		if resp.StatusCode == http.StatusOK {
			var clientRole map[string]interface{}
			if err := json.NewDecoder(resp.Body).Decode(&clientRole); err == nil {
				// Assign client role to user
				assignURL := fmt.Sprintf("%s/admin/realms/%s/users/%s/role-mappings/clients/%s", baseURL, realm, userID, realmManagementClientUUID)
				
				roles := []map[string]interface{}{clientRole}
				jsonData, err := json.Marshal(roles)
				if err != nil {
					continue
				}
				
				assignReq, err := http.NewRequest("POST", assignURL, bytes.NewBuffer(jsonData))
				if err != nil {
					continue
				}
				
				assignReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
				assignReq.Header.Set("Content-Type", "application/json")
				
				assignResp, err := c.httpClient.Do(assignReq)
				if err != nil {
					continue
				}
				defer assignResp.Body.Close()
				
				if assignResp.StatusCode == http.StatusNoContent || assignResp.StatusCode == http.StatusOK {
					return nil // Success with client role!
				}
			}
		}
	}
	
	// If still no role found or assigned, log a warning but don't fail
	return fmt.Errorf("no admin role found or assigned in realm %s - client created but role assignment skipped. You may need to manually assign admin role to service account", realm)
}

// SetupRealmClient sets up the multi-manage client in a realm
// Returns the client secret
func (c *Client) SetupRealmClient(baseURL, realm, masterAccessToken string) (string, error) {
	clientID := "multi-manage"
	
	// 1. Create client if it doesn't exist
	if err := c.CreateMultiManageClient(baseURL, realm, masterAccessToken, clientID); err != nil {
		return "", fmt.Errorf("failed to create client: %w", err)
	}
	
	// 2. Get client UUID
	clients, err := c.getClients(baseURL, realm, masterAccessToken)
	if err != nil {
		return "", fmt.Errorf("failed to get clients: %w", err)
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
		return "", fmt.Errorf("client not found after creation: %s", clientID)
	}
	
	// 3. Get client secret
	secret, err := c.GetClientSecret(baseURL, realm, masterAccessToken, clientUUID)
	if err != nil {
		return "", fmt.Errorf("failed to get client secret: %w", err)
	}
	
	// 4. Get service account user
	serviceAccountUser, err := c.GetServiceAccountUser(baseURL, realm, masterAccessToken, clientID)
	if err != nil {
		return "", fmt.Errorf("failed to get service account user: %w", err)
	}
	
	userID, ok := serviceAccountUser["id"].(string)
	if !ok {
		return "", fmt.Errorf("service account user ID not found")
	}
	
	// 5. Assign realm-admin role to service account (non-critical, log warning if fails)
	if err := c.AssignRealmAdminRoleToServiceAccount(baseURL, realm, masterAccessToken, userID, clientUUID); err != nil {
		// Log warning but don't fail - client is created and secret is obtained
		// User can manually assign admin role later if needed
		// Return secret anyway since the most important part (client creation) succeeded
		fmt.Printf("Warning: Failed to assign admin role to service account: %v\n", err)
		// Continue anyway - client and secret are the critical parts
	}
	
	return secret, nil
}

// getClientByID gets a client by ID
func (c *Client) getClientByID(baseURL, realm, accessToken, clientID string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s", baseURL, realm, clientID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get client: status %d", resp.StatusCode)
	}
	
	var client map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&client)
	return client, nil
}

// AssignRealmRolesToUser assigns realm roles to a user (public method)
func (c *Client) AssignRealmRolesToUser(baseURL, realm, accessToken, userID string, roleNames []string) error {
	roles, err := c.GetRoles(baseURL, realm, accessToken)
	if err != nil {
		return err
	}
	
	var roleIDs []map[string]interface{}
	for _, roleName := range roleNames {
		for _, role := range roles {
			if role.Name == roleName {
				roleIDs = append(roleIDs, map[string]interface{}{
					"id":   role.ID,
					"name": role.Name,
				})
				break
			}
		}
	}
	
	if len(roleIDs) == 0 {
		return fmt.Errorf("no roles found")
	}
	
	url := fmt.Sprintf("%s/admin/realms/%s/users/%s/role-mappings/realm", baseURL, realm, userID)
	jsonData, err := json.Marshal(roleIDs)
	if err != nil {
		return err
	}
	
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to assign realm roles: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	return nil
}

// AssignClientRolesToUser assigns client roles to a user (public method)
func (c *Client) AssignClientRolesToUser(baseURL, realm, accessToken, userID string, clientRoles map[string][]string) error {
	for clientID, roleNames := range clientRoles {
		if len(roleNames) == 0 {
			continue
		}
		
		// Get client UUID first
		clients, err := c.getClients(baseURL, realm, accessToken)
		if err != nil {
			continue
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
			continue
		}
		
		// Get client roles
		url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/roles", baseURL, realm, clientUUID)
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			continue
		}
		
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
		req.Header.Set("Content-Type", "application/json")
		
		resp, err := c.httpClient.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()
		
		if resp.StatusCode != http.StatusOK {
			continue
		}
		
		var clientRolesList []map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&clientRolesList); err != nil {
			continue
		}
		
		// Find role IDs
		var roleIDs []map[string]interface{}
		for _, roleName := range roleNames {
			for _, role := range clientRolesList {
				if name, ok := role["name"].(string); ok && name == roleName {
					roleIDs = append(roleIDs, role)
					break
				}
			}
		}
		
		if len(roleIDs) == 0 {
			continue
		}
		
		// Assign roles
		assignURL := fmt.Sprintf("%s/admin/realms/%s/users/%s/role-mappings/clients/%s", baseURL, realm, userID, clientUUID)
		jsonData, err := json.Marshal(roleIDs)
		if err != nil {
			continue
		}
		
		assignReq, err := http.NewRequest("POST", assignURL, bytes.NewBuffer(jsonData))
		if err != nil {
			continue
		}
		
		assignReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
		assignReq.Header.Set("Content-Type", "application/json")
		
		assignResp, err := c.httpClient.Do(assignReq)
		if err != nil {
			continue
		}
		defer assignResp.Body.Close()
		
		if assignResp.StatusCode != http.StatusNoContent && assignResp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(assignResp.Body)
			return fmt.Errorf("failed to assign client roles for client %s: status %d, body: %s", clientID, assignResp.StatusCode, string(body))
		}
	}
	
	return nil
}

// AddUserToGroup adds a user to a group
func (c *Client) AddUserToGroup(baseURL, realm, accessToken, userID, groupID string) error {
	url := fmt.Sprintf("%s/admin/realms/%s/users/%s/groups/%s", baseURL, realm, userID, groupID)
	
	req, err := http.NewRequest("PUT", url, nil)
	if err != nil {
		return err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to add user to group: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	return nil
}

// AssignRealmRolesToGroup assigns realm roles to a group
func (c *Client) AssignRealmRolesToGroup(baseURL, realm, accessToken, groupID string, roleNames []string) error {
	roles, err := c.GetRoles(baseURL, realm, accessToken)
	if err != nil {
		return err
	}
	
	var roleIDs []map[string]interface{}
	for _, roleName := range roleNames {
		for _, role := range roles {
			if role.Name == roleName {
				roleIDs = append(roleIDs, map[string]interface{}{
					"id":   role.ID,
					"name": role.Name,
				})
				break
			}
		}
	}
	
	if len(roleIDs) == 0 {
		return fmt.Errorf("no roles found")
	}
	
	url := fmt.Sprintf("%s/admin/realms/%s/groups/%s/role-mappings/realm", baseURL, realm, groupID)
	jsonData, err := json.Marshal(roleIDs)
	if err != nil {
		return err
	}
	
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to assign realm roles to group: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	return nil
}

// AssignClientRolesToGroup assigns client roles to a group
func (c *Client) AssignClientRolesToGroup(baseURL, realm, accessToken, groupID string, clientRoles map[string][]string) error {
	for clientID, roleNames := range clientRoles {
		if len(roleNames) == 0 {
			continue
		}
		
		// Get client UUID first
		clients, err := c.getClients(baseURL, realm, accessToken)
		if err != nil {
			continue
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
			continue
		}
		
		// Get client roles
		url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/roles", baseURL, realm, clientUUID)
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			continue
		}
		
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
		req.Header.Set("Content-Type", "application/json")
		
		resp, err := c.httpClient.Do(req)
		if err != nil {
			continue
		}
		defer resp.Body.Close()
		
		if resp.StatusCode != http.StatusOK {
			continue
		}
		
		var clientRolesList []map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&clientRolesList); err != nil {
			continue
		}
		
		// Find role IDs
		var roleIDs []map[string]interface{}
		for _, roleName := range roleNames {
			for _, role := range clientRolesList {
				if name, ok := role["name"].(string); ok && name == roleName {
					roleIDs = append(roleIDs, role)
					break
				}
			}
		}
		
		if len(roleIDs) == 0 {
			continue
		}
		
		// Assign roles
		assignURL := fmt.Sprintf("%s/admin/realms/%s/groups/%s/role-mappings/clients/%s", baseURL, realm, groupID, clientUUID)
		jsonData, err := json.Marshal(roleIDs)
		if err != nil {
			continue
		}
		
		assignReq, err := http.NewRequest("POST", assignURL, bytes.NewBuffer(jsonData))
		if err != nil {
			continue
		}
		
		assignReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
		assignReq.Header.Set("Content-Type", "application/json")
		
		assignResp, err := c.httpClient.Do(assignReq)
		if err != nil {
			continue
		}
		defer assignResp.Body.Close()
		
		if assignResp.StatusCode != http.StatusNoContent && assignResp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(assignResp.Body)
			return fmt.Errorf("failed to assign client roles to group for client %s: status %d, body: %s", clientID, assignResp.StatusCode, string(body))
		}
	}
	
	return nil
}

// GetClientRoles gets all roles for a specific client (public method)
func (c *Client) GetClientRoles(baseURL, realm, accessToken, clientUUID string) ([]map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/roles", baseURL, realm, clientUUID)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get client roles: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	var roles []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&roles); err != nil {
		return nil, err
	}
	
	return roles, nil
}

// getClientRoleDetails gets details of a client role
func (c *Client) getClientRoleDetails(baseURL, realm, accessToken, clientID, roleName string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/roles/%s", baseURL, realm, clientID, roleName)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	req.Header.Set("Content-Type", "application/json")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get client role: status %d", resp.StatusCode)
	}
	
	var role map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&role)
	return role, nil
}

// calculateRBACStats recursively counts RBAC components
func (c *Client) calculateRBACStats(node domain.RBACNode) domain.RBACStats {
	stats := domain.RBACStats{}
	c.countRBACNodes(node, &stats)
	return stats
}

func (c *Client) countRBACNodes(node domain.RBACNode, stats *domain.RBACStats) {
	switch node.Type {
	case "role":
		stats.Roles++
	case "composite":
		stats.Composites++
	case "client-role":
		stats.ClientRoles++
	case "scope":
		stats.Scopes++
	case "permission":
		stats.Permissions++
	case "policy":
		stats.Policies++
	}
	
	for _, child := range node.Children {
		c.countRBACNodes(child, stats)
	}
}

