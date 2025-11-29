package domain

// SearchRequest represents a multi-cluster search request
type SearchRequest struct {
	Query      string   `json:"query" validate:"required"`
	SearchType string   `json:"search_type" validate:"required,oneof=user client role"`
	ClusterIDs []int    `json:"cluster_ids,omitempty"` // Empty means search all clusters
}

// SearchResult represents a single search result item
type SearchResult struct {
	ClusterID   int                    `json:"cluster_id"`
	ClusterName string                 `json:"cluster_name"`
	Realm       string                 `json:"realm"`
	Type        string                 `json:"type"` // "user", "client", "role"
	Data        map[string]interface{} `json:"data"`
}

// SearchResponse represents the search response
type SearchResponse struct {
	Query      string        `json:"query"`
	SearchType string        `json:"search_type"`
	Results    []SearchResult `json:"results"`
	Total      int           `json:"total"`
}


