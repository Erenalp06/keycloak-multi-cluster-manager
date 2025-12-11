package handler

import (
	"fmt"
	"github.com/gofiber/fiber/v2"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/service"
	"strconv"
)

type UserFederationHandler struct {
	service *service.UserFederationService
}

func NewUserFederationHandler(service *service.UserFederationService) *UserFederationHandler {
	return &UserFederationHandler{service: service}
}

// GetUserFederationProviders gets all user federation providers for a realm
func (h *UserFederationHandler) GetUserFederationProviders(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}

	realm := c.Query("realm", "")

	providers, err := h.service.GetUserFederationProviders(clusterID, realm)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Log for debugging
	fmt.Printf("GetUserFederationProviders: clusterID=%d, realm=%s, count=%d\n", clusterID, realm, len(providers))

	return c.JSON(providers)
}

// GetUserFederationProvider gets a specific user federation provider
func (h *UserFederationHandler) GetUserFederationProvider(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}

	providerID := c.Params("providerId")
	if providerID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Provider ID is required"})
	}

	realm := c.Query("realm", "")

	provider, err := h.service.GetUserFederationProvider(clusterID, realm, providerID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	if provider == nil {
		return c.Status(404).JSON(fiber.Map{"error": "Provider not found"})
	}

	return c.JSON(provider)
}

// CreateUserFederationProvider creates a new user federation provider
func (h *UserFederationHandler) CreateUserFederationProvider(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}

	var req domain.CreateUserFederationProviderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Name is required"})
	}

	if req.Config == nil || len(req.Config) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Config is required"})
	}

	realm := c.Query("realm", "")

	provider, err := h.service.CreateUserFederationProvider(clusterID, realm, req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(provider)
}

// UpdateUserFederationProvider updates an existing user federation provider
func (h *UserFederationHandler) UpdateUserFederationProvider(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}

	providerID := c.Params("providerId")
	if providerID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Provider ID is required"})
	}

	var req domain.UpdateUserFederationProviderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	realm := c.Query("realm", "")

	provider, err := h.service.UpdateUserFederationProvider(clusterID, realm, providerID, req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(provider)
}

// DeleteUserFederationProvider deletes a user federation provider
func (h *UserFederationHandler) DeleteUserFederationProvider(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}

	providerID := c.Params("providerId")
	if providerID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Provider ID is required"})
	}

	realm := c.Query("realm", "")

	if err := h.service.DeleteUserFederationProvider(clusterID, realm, providerID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(204).Send(nil)
}

// TestUserFederationConnection tests the connection to a user federation provider
func (h *UserFederationHandler) TestUserFederationConnection(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}

	providerID := c.Params("providerId")
	if providerID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Provider ID is required"})
	}

	realm := c.Query("realm", "")

	result, err := h.service.TestUserFederationConnection(clusterID, realm, providerID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}

// SyncUserFederation syncs users from a user federation provider
func (h *UserFederationHandler) SyncUserFederation(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}

	providerID := c.Params("providerId")
	if providerID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Provider ID is required"})
	}

	var req domain.SyncUserFederationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Action == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Action is required"})
	}

	realm := c.Query("realm", "")

	if err := h.service.SyncUserFederation(clusterID, realm, providerID, req); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Sync started successfully"})
}

// TestLDAPConnection tests LDAP connection with just URL
func (h *UserFederationHandler) TestLDAPConnection(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}

	var req domain.TestLDAPConnectionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	result, err := h.service.TestLDAPConnection(clusterID, req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}

// TestLDAPAuthentication tests LDAP authentication with URL, Bind DN and Credential
func (h *UserFederationHandler) TestLDAPAuthentication(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid cluster ID"})
	}

	var req domain.TestLDAPAuthenticationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	result, err := h.service.TestLDAPAuthentication(clusterID, req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}

