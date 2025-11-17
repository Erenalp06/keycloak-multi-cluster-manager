package domain

type ClientDetail struct {
	ID                    string   `json:"id"`
	ClientID              string   `json:"clientId"`
	Name                  string   `json:"name"`
	Description           string   `json:"description,omitempty"`
	Protocol              string   `json:"protocol"`
	RedirectUris          []string `json:"redirectUris"`
	WebOrigins            []string `json:"webOrigins"`
	PublicClient          bool     `json:"publicClient"`
	BearerOnly            bool     `json:"bearerOnly"`
	DirectAccessGrantsEnabled bool `json:"directAccessGrantsEnabled"`
	ServiceAccountsEnabled bool   `json:"serviceAccountsEnabled"`
	DefaultClientScopes   []string `json:"defaultClientScopes"`
	OptionalClientScopes  []string `json:"optionalClientScopes"`
	Enabled               bool     `json:"enabled"`
}

type ClientDiff struct {
	Client                ClientDetail `json:"client"`
	Source                string       `json:"source"`
	Destination           string       `json:"destination"`
	Status                string       `json:"status"` // "missing_in_destination", "missing_in_source", "different_config"
	Side                  string       `json:"side"`   // "source" or "destination" - which side this diff is about
	Differences           []string     `json:"differences,omitempty"`
	SourceValue           map[string]interface{} `json:"sourceValue,omitempty"`   // Source values for different fields
	DestinationValue      map[string]interface{} `json:"destinationValue,omitempty"` // Destination values for different fields
}

