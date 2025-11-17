package domain

type Role struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description,omitempty"`
	Composite   bool   `json:"composite"`
	ClientRole  bool   `json:"clientRole"`
	ContainerID string `json:"containerId,omitempty"`
}

type RoleDiff struct {
	Role        Role   `json:"role"`
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Status      string `json:"status"` // "missing_in_destination", "missing_in_source", "different_config"
	Side        string `json:"side"`   // "source" or "destination" - which side this diff is about
}

