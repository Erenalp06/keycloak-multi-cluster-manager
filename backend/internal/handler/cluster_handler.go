package handler

import (
	"github.com/gofiber/fiber/v2"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/service"
	"strconv"
)

type ClusterHandler struct {
	service *service.ClusterService
}

func NewClusterHandler(service *service.ClusterService) *ClusterHandler {
	return &ClusterHandler{service: service}
}

func (h *ClusterHandler) Create(c *fiber.Ctx) error {
	var req domain.CreateClusterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	
	if req.Name == "" || req.BaseURL == "" || req.Username == "" || req.Password == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Missing required fields"})
	}
	
	cluster, err := h.service.Create(req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.Status(201).JSON(cluster)
}

func (h *ClusterHandler) GetAll(c *fiber.Ctx) error {
	clusters, err := h.service.GetAll()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(clusters)
}

func (h *ClusterHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	cluster, err := h.service.GetByID(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	if cluster == nil {
		return c.Status(404).JSON(fiber.Map{"error": "Cluster not found"})
	}
	
	return c.JSON(cluster)
}

func (h *ClusterHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	var req domain.CreateClusterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	
	if req.Name == "" || req.BaseURL == "" || req.Username == "" || req.Password == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Missing required fields"})
	}
	
	cluster, err := h.service.Update(id, req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(cluster)
}

func (h *ClusterHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	if err := h.service.Delete(id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.Status(204).Send(nil)
}

func (h *ClusterHandler) HealthCheck(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	health, err := h.service.HealthCheck(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(health)
}

func (h *ClusterHandler) GetMetrics(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	metrics, err := h.service.GetMetrics(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(metrics)
}

func (h *ClusterHandler) GetClients(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	clients, err := h.service.GetClients(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(clients)
}

func (h *ClusterHandler) GetUsers(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	max := 100 // Default limit
	if maxParam := c.Query("max"); maxParam != "" {
		if parsedMax, err := strconv.Atoi(maxParam); err == nil && parsedMax > 0 {
			max = parsedMax
		}
	}
	
	users, err := h.service.GetUsers(id, max)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(users)
}

func (h *ClusterHandler) GetGroups(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	max := 100 // Default limit
	if maxParam := c.Query("max"); maxParam != "" {
		if parsedMax, err := strconv.Atoi(maxParam); err == nil && parsedMax > 0 {
			max = parsedMax
		}
	}
	
	groups, err := h.service.GetGroups(id, max)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(groups)
}

func (h *ClusterHandler) GetClientDetails(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	clients, err := h.service.GetClientDetails(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(clients)
}

func (h *ClusterHandler) GetClientSecret(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	clientID := c.Query("clientId")
	if clientID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "clientId query parameter is required"})
	}
	
	secret, err := h.service.GetClientSecret(clusterID, clientID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(fiber.Map{"secret": secret})
}

func (h *ClusterHandler) GetGroupDetails(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	groups, err := h.service.GetGroupDetails(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(groups)
}

func (h *ClusterHandler) GetUserDetails(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	users, err := h.service.GetUserDetails(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(users)
}

func (h *ClusterHandler) GetServerInfo(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	serverInfo, err := h.service.GetServerInfo(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(serverInfo)
}

func (h *ClusterHandler) GetUserToken(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	var req struct {
		GrantType    string `json:"grant_type"`
		Username     string `json:"username"`
		Password     string `json:"password"`
		ClientID     string `json:"client_id"`
		ClientSecret string `json:"client_secret"`
	}
	
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	
	// Default to password grant if not specified
	if req.GrantType == "" {
		req.GrantType = "password"
	}
	
	if req.GrantType == "password" {
		if req.Username == "" || req.Password == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Username and password are required for password grant"})
		}
		result, err := h.service.GetUserToken(id, req.Username, req.Password, req.ClientID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(result)
	} else if req.GrantType == "client_credentials" {
		if req.ClientID == "" || req.ClientSecret == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Client ID and client secret are required for client_credentials grant"})
		}
		result, err := h.service.GetClientCredentialsToken(id, req.ClientID, req.ClientSecret)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(result)
	}
	
	return c.Status(400).JSON(fiber.Map{"error": "Unsupported grant_type. Supported types: password, client_credentials"})
}

func (h *ClusterHandler) Search(c *fiber.Ctx) error {
	var req domain.SearchRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}
	
	if req.Query == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Query is required"})
	}
	
	if req.SearchType != "user" && req.SearchType != "client" && req.SearchType != "role" {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid search_type. Must be 'user', 'client', or 'role'"})
	}
	
	result, err := h.service.Search(req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(result)
}

func (h *ClusterHandler) GetRBACAnalysis(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	entityType := c.Query("type") // user, role, client
	entityName := c.Query("name") // username, roleName, clientID
	
	if entityType == "" {
		// Backward compatibility: if type is not specified, assume role
		entityType = "role"
		entityName = c.Query("role")
	}
	
	if entityName == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Entity name is required"})
	}
	
	var analysis *domain.RBACAnalysis
	
	switch entityType {
	case "user":
		analysis, err = h.service.GetUserRBACAnalysis(id, entityName)
	case "role":
		analysis, err = h.service.GetRBACAnalysis(id, entityName)
	case "client":
		analysis, err = h.service.GetClientRBACAnalysis(id, entityName)
	default:
		return c.Status(400).JSON(fiber.Map{"error": "Invalid entity type. Must be 'user', 'role', or 'client'"})
	}
	
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(analysis)
}

func (h *ClusterHandler) GetPrometheusMetrics(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}
	
	metrics, err := h.service.GetPrometheusMetrics(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(metrics)
}

