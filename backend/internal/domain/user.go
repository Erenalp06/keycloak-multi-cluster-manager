package domain

import "time"

// UserRole represents user roles in the system
const (
	RoleAdmin = "admin"
	RoleUser  = "user"
)

// User represents a local application user (for authentication)
type User struct {
	ID           int       `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // Never serialize password hash
	Role         string    `json:"role"` // "admin" or "user"
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// UserDetail represents a Keycloak user with detailed information
type UserDetail struct {
	ID              string                 `json:"id"`
	Username        string                 `json:"username"`
	Email           string                 `json:"email,omitempty"`
	FirstName       string                 `json:"firstName,omitempty"`
	LastName        string                 `json:"lastName,omitempty"`
	Enabled         bool                   `json:"enabled"`
	RealmRoles      []string               `json:"realmRoles"`
	ClientRoles     map[string][]string    `json:"clientRoles"` // clientId -> roles
	Groups          []string               `json:"groups"`
	Attributes      map[string][]string    `json:"attributes"`
	RequiredActions []string               `json:"requiredActions"`
}

type UserDiff struct {
	User             UserDetail            `json:"user"`
	Source           string                `json:"source"`
	Destination      string                `json:"destination"`
	Status           string                `json:"status"` // "missing_in_destination", "missing_in_source", "different_config"
	Side             string                `json:"side"`   // "source" or "destination" - which side this diff is about
	Differences      []string              `json:"differences,omitempty"`
	SourceValue      map[string]interface{} `json:"sourceValue,omitempty"`   // Source values for different fields
	DestinationValue map[string]interface{} `json:"destinationValue,omitempty"` // Destination values for different fields
}

type RegisterRequest struct {
	Username string `json:"username" validate:"required,min=3,max=50"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type LoginRequest struct {
	Username  string `json:"username" validate:"required"`
	Password  string `json:"password" validate:"required"`
	AuthType  string `json:"auth_type,omitempty"` // "local" or "ldap", empty means auto (try LDAP first, fallback to local)
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type CreateUserRequest struct {
	Username string `json:"username" validate:"required,min=3,max=50"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Role     string `json:"role" validate:"required,oneof=admin user"`
}

type UpdateUserRequest struct {
	Username string `json:"username,omitempty"`
	Email    string `json:"email,omitempty"`
	Password string `json:"password,omitempty"`
	Role     string `json:"role,omitempty"`
}
