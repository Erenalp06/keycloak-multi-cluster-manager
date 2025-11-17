package handler

import (
	"github.com/gofiber/fiber/v2"
	"keycloak-multi-manage/internal/service"
	"strconv"
)

type DiffHandler struct {
	service *service.DiffService
}

func NewDiffHandler(service *service.DiffService) *DiffHandler {
	return &DiffHandler{service: service}
}

func (h *DiffHandler) GetRoleDiff(c *fiber.Ctx) error {
	sourceID, err := strconv.Atoi(c.Query("source"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source cluster ID"})
	}
	
	destinationID, err := strconv.Atoi(c.Query("destination"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid destination cluster ID"})
	}
	
	diffs, err := h.service.GetRoleDiff(sourceID, destinationID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(diffs)
}

func (h *DiffHandler) GetClientDiff(c *fiber.Ctx) error {
	sourceID, err := strconv.Atoi(c.Query("source"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source cluster ID"})
	}
	
	destinationID, err := strconv.Atoi(c.Query("destination"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid destination cluster ID"})
	}
	
	diffs, err := h.service.GetClientDiff(sourceID, destinationID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(diffs)
}

func (h *DiffHandler) GetGroupDiff(c *fiber.Ctx) error {
	sourceID, err := strconv.Atoi(c.Query("source"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source cluster ID"})
	}
	
	destinationID, err := strconv.Atoi(c.Query("destination"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid destination cluster ID"})
	}
	
	diffs, err := h.service.GetGroupDiff(sourceID, destinationID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(diffs)
}

func (h *DiffHandler) GetUserDiff(c *fiber.Ctx) error {
	sourceID, err := strconv.Atoi(c.Query("source"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid source cluster ID"})
	}
	
	destinationID, err := strconv.Atoi(c.Query("destination"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid destination cluster ID"})
	}
	
	diffs, err := h.service.GetUserDiff(sourceID, destinationID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	
	return c.JSON(diffs)
}

