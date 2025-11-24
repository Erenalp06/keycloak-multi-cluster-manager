package domain

import "time"

// Role represents a Keycloak role (different from AppRole)
type Role struct {
	ID          string `json:"id,omitempty"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Composite   bool   `json:"composite,omitempty"`
}

// RoleDiff represents differences between roles in two clusters
type RoleDiff struct {
	Role        Role   `json:"role"`
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Status      string `json:"status"` // "missing_in_destination", "missing_in_source", "different_config"
	Side        string `json:"side"`   // "source" or "destination" - which side this diff is about
}

// Permission represents a system permission
type Permission struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// AppRole represents an application role (different from Keycloak Role)
type AppRole struct {
	ID          int          `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description,omitempty"`
	Permissions []Permission `json:"permissions,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type CreateRoleRequest struct {
	Name        string   `json:"name" validate:"required,min=3,max=100"`
	Description string   `json:"description,omitempty"`
	PermissionIDs []int  `json:"permission_ids,omitempty"`
}

type UpdateRoleRequest struct {
	Name        string   `json:"name,omitempty"`
	Description string   `json:"description,omitempty"`
	PermissionIDs []int  `json:"permission_ids,omitempty"`
}

type AssignRoleRequest struct {
	RoleIDs []int `json:"role_ids" validate:"required"`
}
