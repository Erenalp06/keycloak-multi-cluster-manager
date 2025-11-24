package middleware

import (
	"github.com/gofiber/fiber/v2"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/service"
)

func AuthMiddleware(authService *service.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(401).JSON(fiber.Map{"error": "Authorization header required"})
		}

		// Extract token from "Bearer <token>"
		if len(authHeader) < 7 || authHeader[:7] != "Bearer " {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid authorization header format"})
		}

		token := authHeader[7:]
		user, err := authService.ValidateToken(token)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid or expired token"})
		}

		// Store user in context
		c.Locals("user", user)
		return c.Next()
	}
}

// AdminMiddleware ensures the user has admin role (backward compatibility)
func AdminMiddleware(roleService *service.AppRoleService) fiber.Handler {
	return PermissionMiddleware(roleService, "manage_roles")
}

// PermissionMiddleware checks if the user has a specific permission
func PermissionMiddleware(roleService *service.AppRoleService, permissionName string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		user := c.Locals("user")
		if user == nil {
			return c.Status(401).JSON(fiber.Map{"error": "Authentication required"})
		}

		appUser, ok := user.(*domain.User)
		if !ok {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid user context"})
		}

		// Check if user has the required permission
		hasPermission, err := roleService.HasPermission(appUser.ID, permissionName)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to check permissions"})
		}

		if !hasPermission {
			return c.Status(403).JSON(fiber.Map{"error": "Insufficient permissions"})
		}

		return c.Next()
	}
}

