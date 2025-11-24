package handler

import (
	"github.com/gofiber/fiber/v2"
	"keycloak-multi-manage/internal/service"
	"strconv"
)

type ExportImportHandler struct {
	service *service.ExportImportService
}

func NewExportImportHandler(service *service.ExportImportService) *ExportImportHandler {
	return &ExportImportHandler{
		service: service,
	}
}

// ExportRealm exports realm configuration
func (h *ExportImportHandler) ExportRealm(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid cluster id"})
	}

	jsonData, err := h.service.ExportRealm(clusterID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	c.Set("Content-Type", "application/json")
	c.Set("Content-Disposition", "attachment; filename=realm-export.json")
	return c.Send(jsonData)
}

// ImportRealm imports realm configuration
func (h *ExportImportHandler) ImportRealm(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid cluster id"})
	}

	var req struct {
		RealmConfig string `json:"realmConfig"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	if err := h.service.ImportRealm(clusterID, []byte(req.RealmConfig)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "realm imported successfully"})
}

// ExportUsers exports all users
func (h *ExportImportHandler) ExportUsers(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid cluster id"})
	}

	jsonData, err := h.service.ExportUsers(clusterID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	c.Set("Content-Type", "application/json")
	c.Set("Content-Disposition", "attachment; filename=users-export.json")
	return c.Send(jsonData)
}

// ImportUsers imports users
func (h *ExportImportHandler) ImportUsers(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid cluster id"})
	}

	var req struct {
		Users string `json:"users"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	if err := h.service.ImportUsers(clusterID, []byte(req.Users)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "users imported successfully"})
}

// ExportClients exports all clients
func (h *ExportImportHandler) ExportClients(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid cluster id"})
	}

	jsonData, err := h.service.ExportClients(clusterID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	c.Set("Content-Type", "application/json")
	c.Set("Content-Disposition", "attachment; filename=clients-export.json")
	return c.Send(jsonData)
}

// ImportClients imports clients
func (h *ExportImportHandler) ImportClients(c *fiber.Ctx) error {
	clusterID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid cluster id"})
	}

	var req struct {
		Clients string `json:"clients"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	if err := h.service.ImportClients(clusterID, []byte(req.Clients)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "clients imported successfully"})
}

