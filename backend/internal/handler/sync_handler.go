package handler

import (
	"strconv"
	"keycloak-multi-manage/internal/service"
	"github.com/gofiber/fiber/v2"
)

type SyncHandler struct {
	service *service.SyncService
}

func NewSyncHandler(service *service.SyncService) *SyncHandler {
	return &SyncHandler{
		service: service,
	}
}

// SyncRole syncs a role from source to destination
func (h *SyncHandler) SyncRole(c *fiber.Ctx) error {
	sourceID, err := strconv.Atoi(c.Query("source"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source cluster ID"})
	}
	
	destinationID, err := strconv.Atoi(c.Query("destination"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid destination cluster ID"})
	}
	
	roleName := c.Query("roleName")
	if roleName == "" {
		return c.Status(400).JSON(fiber.Map{"error": "roleName is required"})
	}
	
	if err := h.service.SyncRole(sourceID, destinationID, roleName); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(fiber.Map{"message": "Role synced successfully"})
}

// SyncClient syncs a client from source to destination
func (h *SyncHandler) SyncClient(c *fiber.Ctx) error {
	sourceID, err := strconv.Atoi(c.Query("source"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source cluster ID"})
	}
	
	destinationID, err := strconv.Atoi(c.Query("destination"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid destination cluster ID"})
	}
	
	clientID := c.Query("clientId")
	if clientID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "clientId is required"})
	}
	
	if err := h.service.SyncClient(sourceID, destinationID, clientID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(fiber.Map{"message": "Client synced successfully"})
}

// SyncGroup syncs a group from source to destination
func (h *SyncHandler) SyncGroup(c *fiber.Ctx) error {
	sourceID, err := strconv.Atoi(c.Query("source"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source cluster ID"})
	}
	
	destinationID, err := strconv.Atoi(c.Query("destination"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid destination cluster ID"})
	}
	
	groupPath := c.Query("groupPath")
	if groupPath == "" {
		return c.Status(400).JSON(fiber.Map{"error": "groupPath is required"})
	}
	
	if err := h.service.SyncGroup(sourceID, destinationID, groupPath); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(fiber.Map{"message": "Group synced successfully"})
}

// SyncUser syncs a user from source to destination
func (h *SyncHandler) SyncUser(c *fiber.Ctx) error {
	sourceID, err := strconv.Atoi(c.Query("source"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source cluster ID"})
	}
	
	destinationID, err := strconv.Atoi(c.Query("destination"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid destination cluster ID"})
	}
	
	username := c.Query("username")
	if username == "" {
		return c.Status(400).JSON(fiber.Map{"error": "username is required"})
	}
	
	if err := h.service.SyncUser(sourceID, destinationID, username); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(fiber.Map{"message": "User synced successfully"})
}

