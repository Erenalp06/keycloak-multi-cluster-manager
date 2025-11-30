package handler

import (
	"github.com/gofiber/fiber/v2"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/service"
)

type LDAPConfigHandler struct {
	service *service.LDAPConfigService
}

func NewLDAPConfigHandler(service *service.LDAPConfigService) *LDAPConfigHandler {
	return &LDAPConfigHandler{service: service}
}

func (h *LDAPConfigHandler) Get(c *fiber.Ctx) error {
	config, err := h.service.Get()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// Clear password from response
	config.BindPassword = ""
	return c.JSON(config)
}

func (h *LDAPConfigHandler) Update(c *fiber.Ctx) error {
	var req domain.UpdateLDAPConfigRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	// Basic validation
	if req.ServerURL == "" || req.BindDN == "" || req.UserSearchBase == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Server URL, Bind DN, and User Search Base are required"})
	}

	config, err := h.service.Update(&req)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(config)
}

func (h *LDAPConfigHandler) TestConnection(c *fiber.Ctx) error {
	err := h.service.TestConnection()
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "LDAP connection successful",
	})
}

func (h *LDAPConfigHandler) FetchCertificate(c *fiber.Ctx) error {
	certInfo, err := h.service.FetchAndSaveCertificate()
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Certificate fetched and saved successfully",
		"certificate": certInfo,
	})
}

func (h *LDAPConfigHandler) DeleteCertificate(c *fiber.Ctx) error {
	err := h.service.DeleteCertificate()
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Certificate deleted successfully",
	})
}

