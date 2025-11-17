package domain

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
	RequiredActions []string              `json:"requiredActions"`
}

type UserDiff struct {
	User            UserDetail `json:"user"`
	Source          string     `json:"source"`
	Destination     string     `json:"destination"`
	Status          string     `json:"status"` // "missing_in_destination", "missing_in_source", "different_config"
	Side            string     `json:"side"`   // "source" or "destination" - which side this diff is about
	Differences     []string   `json:"differences,omitempty"`
	SourceValue     map[string]interface{} `json:"sourceValue,omitempty"`
	DestinationValue map[string]interface{} `json:"destinationValue,omitempty"`
}

