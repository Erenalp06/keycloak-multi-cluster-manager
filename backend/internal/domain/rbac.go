package domain

// RBACNode represents a node in the RBAC hierarchy tree
type RBACNode struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Type        string     `json:"type"` // role, composite, client-role, scope, permission, policy
	Description string     `json:"description,omitempty"`
	PolicyType  string     `json:"policy_type,omitempty"` // role, time, group, ip, aggregated, etc.
	Children    []RBACNode `json:"children,omitempty"`
}

// RBACAnalysis represents the complete RBAC structure for a role
type RBACAnalysis struct {
	Role        RBACNode `json:"role"`
	Statistics  RBACStats `json:"statistics"`
}

// RBACStats contains counts for each RBAC component type
type RBACStats struct {
	Roles       int `json:"roles"`
	Composites  int `json:"composites"`
	ClientRoles int `json:"client_roles"`
	Scopes      int `json:"scopes"`
	Permissions int `json:"permissions"`
	Policies    int `json:"policies"`
}



