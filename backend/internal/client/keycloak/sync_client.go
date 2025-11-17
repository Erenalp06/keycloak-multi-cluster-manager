package keycloak

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"keycloak-multi-manage/internal/domain"
)

// CreateRole creates a new role in Keycloak
func (c *Client) CreateRole(baseURL, realm, accessToken string, role domain.Role) error {
	url := fmt.Sprintf("%s/admin/realms/%s/roles", baseURL, realm)
	
	roleData := map[string]interface{}{
		"name":        role.Name,
		"description": role.Description,
		"composite":   role.Composite,
	}
	
	jsonData, err := json.Marshal(roleData)
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
		return fmt.Errorf("failed to create role: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	return nil
}

// CreateClient creates a new client in Keycloak
func (c *Client) CreateClient(baseURL, realm, accessToken string, client domain.ClientDetail) error {
	url := fmt.Sprintf("%s/admin/realms/%s/clients", baseURL, realm)
	
	clientData := map[string]interface{}{
		"clientId":                  client.ClientID,
		"name":                      client.Name,
		"description":               client.Description,
		"protocol":                  client.Protocol,
		"redirectUris":              client.RedirectUris,
		"webOrigins":                client.WebOrigins,
		"publicClient":              client.PublicClient,
		"bearerOnly":                client.BearerOnly,
		"directAccessGrantsEnabled": client.DirectAccessGrantsEnabled,
		"serviceAccountsEnabled":    client.ServiceAccountsEnabled,
		"enabled":                   client.Enabled,
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
	
	// If client was created, update scopes
	if resp.StatusCode == http.StatusCreated {
		// Get the created client ID
		clients, err := c.getClients(baseURL, realm, accessToken)
		if err == nil {
			for _, cl := range clients {
				if getString(cl, "clientId") == client.ClientID {
					clientID := getString(cl, "id")
					if clientID != "" {
						// Update default scopes
						if len(client.DefaultClientScopes) > 0 {
							c.updateClientScopes(baseURL, realm, accessToken, clientID, "default", client.DefaultClientScopes)
						}
						// Update optional scopes
						if len(client.OptionalClientScopes) > 0 {
							c.updateClientScopes(baseURL, realm, accessToken, clientID, "optional", client.OptionalClientScopes)
						}
					}
					break
				}
			}
		}
	}
	
	return nil
}

// UpdateClient updates an existing client in Keycloak
func (c *Client) UpdateClient(baseURL, realm, accessToken, clientID string, client domain.ClientDetail) error {
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s", baseURL, realm, clientID)
	
	clientData := map[string]interface{}{
		"clientId":                  client.ClientID,
		"name":                      client.Name,
		"description":               client.Description,
		"protocol":                  client.Protocol,
		"redirectUris":              client.RedirectUris,
		"webOrigins":                client.WebOrigins,
		"publicClient":              client.PublicClient,
		"bearerOnly":                client.BearerOnly,
		"directAccessGrantsEnabled": client.DirectAccessGrantsEnabled,
		"serviceAccountsEnabled":    client.ServiceAccountsEnabled,
		"enabled":                   client.Enabled,
	}
	
	jsonData, err := json.Marshal(clientData)
	if err != nil {
		return err
	}
	
	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(jsonData))
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
	
	if resp.StatusCode != http.StatusNoContent {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to update client: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	return nil
}

// updateClientScopes updates client scopes
func (c *Client) updateClientScopes(baseURL, realm, accessToken, clientID, scopeType string, scopeNames []string) error {
	// Get available scopes
	scopes, err := c.getClientScopes(baseURL, realm, accessToken, clientID, scopeType)
	if err != nil {
		return err
	}
	
	// Get scope IDs
	var scopeIDs []map[string]interface{}
	for _, scopeName := range scopeNames {
		// Find scope ID by name
		for _, scope := range scopes {
			if scope == scopeName {
				// Get scope details to find ID
				scopeDetails, err := c.getClientScopeDetails(baseURL, realm, accessToken, scopeName)
				if err == nil && scopeDetails != nil {
					if id, ok := scopeDetails["id"].(string); ok {
						scopeIDs = append(scopeIDs, map[string]interface{}{"id": id})
					}
				}
				break
			}
		}
	}
	
	if len(scopeIDs) == 0 {
		return nil
	}
	
	url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/%s-client-scopes", baseURL, realm, clientID, scopeType)
	
	jsonData, err := json.Marshal(scopeIDs)
	if err != nil {
		return err
	}
	
	req, err := http.NewRequest("PUT", url, bytes.NewBuffer(jsonData))
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
	
	// 204 or 200 is OK
	if resp.StatusCode != http.StatusNoContent && resp.StatusCode != http.StatusOK {
		return nil // Don't fail if scopes can't be updated
	}
	
	return nil
}

// getClientScopeDetails gets details of a client scope by name
func (c *Client) getClientScopeDetails(baseURL, realm, accessToken, scopeName string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/admin/realms/%s/client-scopes", baseURL, realm)
	
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
		return nil, fmt.Errorf("failed to get client scopes")
	}
	
	var scopes []map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&scopes); err != nil {
		return nil, err
	}
	
	for _, scope := range scopes {
		if name, ok := scope["name"].(string); ok && name == scopeName {
			return scope, nil
		}
	}
	
	return nil, fmt.Errorf("scope not found")
}

// CreateGroup creates a new group in Keycloak
func (c *Client) CreateGroup(baseURL, realm, accessToken string, group domain.GroupDetail) error {
	url := fmt.Sprintf("%s/admin/realms/%s/groups", baseURL, realm)
	
	groupData := map[string]interface{}{
		"name": group.Name,
	}
	
	// Add attributes if any
	if len(group.Attributes) > 0 {
		groupData["attributes"] = group.Attributes
	}
	
	jsonData, err := json.Marshal(groupData)
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
		return fmt.Errorf("failed to create group: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	// If group was created, assign roles
	if resp.StatusCode == http.StatusCreated {
		// Get the created group ID
		groups, err := c.GetGroups(baseURL, realm, accessToken, 0)
		if err == nil {
			for _, gr := range groups {
				if getString(gr, "path") == group.Path {
					groupID := getString(gr, "id")
					if groupID != "" {
						// Assign realm roles
						if len(group.RealmRoles) > 0 {
							c.assignGroupRealmRoles(baseURL, realm, accessToken, groupID, group.RealmRoles)
						}
						// Assign client roles
						if len(group.ClientRoles) > 0 {
							c.assignGroupClientRoles(baseURL, realm, accessToken, groupID, group.ClientRoles)
						}
					}
					break
				}
			}
		}
	}
	
	return nil
}

// assignGroupRealmRoles assigns realm roles to a group
func (c *Client) assignGroupRealmRoles(baseURL, realm, accessToken, groupID string, roleNames []string) error {
	// Get role IDs
	var roleIDs []map[string]interface{}
	roles, err := c.GetRoles(baseURL, realm, accessToken)
	if err != nil {
		return err
	}
	
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
		return nil
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
	
	// 204 is OK
	if resp.StatusCode != http.StatusNoContent {
		return nil // Don't fail if roles can't be assigned
	}
	
	return nil
}

// assignGroupClientRoles assigns client roles to a group
func (c *Client) assignGroupClientRoles(baseURL, realm, accessToken, groupID string, clientRoles map[string][]string) error {
	// For each client, assign its roles
	for clientID, roleNames := range clientRoles {
		if len(roleNames) == 0 {
			continue
		}
		
		// Get client roles
		url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/roles", baseURL, realm, clientID)
		
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
		assignURL := fmt.Sprintf("%s/admin/realms/%s/groups/%s/role-mappings/clients/%s", baseURL, realm, groupID, clientID)
		
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
		assignResp.Body.Close()
	}
	
	return nil
}

// CreateUser creates a new user in Keycloak
func (c *Client) CreateUser(baseURL, realm, accessToken string, user domain.UserDetail) error {
	url := fmt.Sprintf("%s/admin/realms/%s/users", baseURL, realm)
	
	userData := map[string]interface{}{
		"username":  user.Username,
		"email":     user.Email,
		"firstName": user.FirstName,
		"lastName":  user.LastName,
		"enabled":   user.Enabled,
	}
	
	// Add attributes if any
	if len(user.Attributes) > 0 {
		userData["attributes"] = user.Attributes
	}
	
	// Add required actions if any
	if len(user.RequiredActions) > 0 {
		userData["requiredActions"] = user.RequiredActions
	}
	
	jsonData, err := json.Marshal(userData)
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
		return fmt.Errorf("failed to create user: status %d, body: %s", resp.StatusCode, string(body))
	}
	
	// If user was created, assign roles and groups
	if resp.StatusCode == http.StatusCreated {
		// Get the created user ID
		users, err := c.GetUsers(baseURL, realm, accessToken, 0)
		if err == nil {
			for _, usr := range users {
				if getString(usr, "username") == user.Username {
					userID := getString(usr, "id")
					if userID != "" {
						// Assign realm roles
						if len(user.RealmRoles) > 0 {
							c.assignUserRealmRoles(baseURL, realm, accessToken, userID, user.RealmRoles)
						}
						// Assign client roles
						if len(user.ClientRoles) > 0 {
							c.assignUserClientRoles(baseURL, realm, accessToken, userID, user.ClientRoles)
						}
						// Assign groups
						if len(user.Groups) > 0 {
							c.assignUserGroups(baseURL, realm, accessToken, userID, user.Groups)
						}
					}
					break
				}
			}
		}
	}
	
	return nil
}

// assignUserRealmRoles assigns realm roles to a user
func (c *Client) assignUserRealmRoles(baseURL, realm, accessToken, userID string, roleNames []string) error {
	// Get role IDs
	var roleIDs []map[string]interface{}
	roles, err := c.GetRoles(baseURL, realm, accessToken)
	if err != nil {
		return err
	}
	
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
		return nil
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
	
	// 204 is OK
	if resp.StatusCode != http.StatusNoContent {
		return nil // Don't fail if roles can't be assigned
	}
	
	return nil
}

// assignUserClientRoles assigns client roles to a user
func (c *Client) assignUserClientRoles(baseURL, realm, accessToken, userID string, clientRoles map[string][]string) error {
	// Similar to assignGroupClientRoles
	for clientID, roleNames := range clientRoles {
		if len(roleNames) == 0 {
			continue
		}
		
		// Get client roles
		url := fmt.Sprintf("%s/admin/realms/%s/clients/%s/roles", baseURL, realm, clientID)
		
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
		assignURL := fmt.Sprintf("%s/admin/realms/%s/users/%s/role-mappings/clients/%s", baseURL, realm, userID, clientID)
		
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
		assignResp.Body.Close()
	}
	
	return nil
}

// assignUserGroups assigns groups to a user
func (c *Client) assignUserGroups(baseURL, realm, accessToken, userID string, groupPaths []string) error {
	// Get all groups
	groups, err := c.GetGroups(baseURL, realm, accessToken, 0)
	if err != nil {
		return err
	}
	
	// Find group IDs by path
	for _, groupPath := range groupPaths {
		for _, group := range groups {
			if getString(group, "path") == groupPath {
				groupID := getString(group, "id")
				if groupID != "" {
					url := fmt.Sprintf("%s/admin/realms/%s/users/%s/groups/%s", baseURL, realm, userID, groupID)
					
					req, err := http.NewRequest("PUT", url, nil)
					if err != nil {
						continue
					}
					
					req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
					
					resp, err := c.httpClient.Do(req)
					if err != nil {
						continue
					}
					resp.Body.Close()
				}
				break
			}
		}
	}
	
	return nil
}

