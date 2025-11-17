package keycloak

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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

