package domain

type GroupDetail struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Path        string                 `json:"path"`
	SubGroups   []GroupDetail          `json:"subGroups,omitempty"`
	RealmRoles  []string               `json:"realmRoles"`
	ClientRoles map[string][]string    `json:"clientRoles"` // clientId -> roles
	Attributes  map[string][]string    `json:"attributes"`
}

type GroupDiff struct {
	Group          GroupDetail `json:"group"`
	Source         string      `json:"source"`
	Destination    string      `json:"destination"`
	Status         string      `json:"status"` // "missing_in_destination", "missing_in_source", "different_config"
	Side           string      `json:"side"`   // "source" or "destination" - which side this diff is about
	Differences    []string    `json:"differences,omitempty"`
	SourceValue    map[string]interface{} `json:"sourceValue,omitempty"`
	DestinationValue map[string]interface{} `json:"destinationValue,omitempty"`
}

