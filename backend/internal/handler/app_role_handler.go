package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/service"
)

type AppRoleHandler struct {
	service *service.AppRoleService
}

func NewAppRoleHandler(service *service.AppRoleService) *AppRoleHandler {
	return &AppRoleHandler{service: service}
}

func (h *AppRoleHandler) GetAllRoles(c *fiber.Ctx) error {
	roles, err := h.service.GetAllRoles()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(roles)
}

func (h *AppRoleHandler) GetRoleByID(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid role ID"})
	}

	role, err := h.service.GetRoleByID(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	if role == nil {
		return c.Status(404).JSON(fiber.Map{"error": "Role not found"})
	}
	return c.JSON(role)
}

func (h *AppRoleHandler) GetAllPermissions(c *fiber.Ctx) error {
	permissions, err := h.service.GetAllPermissions()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(permissions)
}

func (h *AppRoleHandler) CreateRole(c *fiber.Ctx) error {
	var req domain.CreateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Role name is required"})
	}

	role, err := h.service.CreateRole(&req)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(role)
}

func (h *AppRoleHandler) UpdateRole(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid role ID"})
	}

	var req domain.UpdateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	role, err := h.service.UpdateRole(id, &req)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(role)
}

func (h *AppRoleHandler) DeleteRole(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid role ID"})
	}

	err = h.service.DeleteRole(id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(200).JSON(fiber.Map{"message": "Role deleted successfully"})
}

func (h *AppRoleHandler) AssignRolesToUser(c *fiber.Ctx) error {
	userID, err := strconv.Atoi(c.Params("user_id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	var req domain.AssignRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	err = h.service.AssignRolesToUser(userID, req.RoleIDs)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(200).JSON(fiber.Map{"message": "Roles assigned successfully"})
}

func (h *AppRoleHandler) GetUserRoles(c *fiber.Ctx) error {
	userID, err := strconv.Atoi(c.Params("user_id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid user ID"})
	}

	roles, err := h.service.GetUserRoles(userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(roles)
}

