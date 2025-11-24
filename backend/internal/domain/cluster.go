package domain

import "time"

type Cluster struct {
	ID              int       `json:"id"`
	Name            string    `json:"name"`
	BaseURL         string    `json:"base_url"`
	Realm           string    `json:"realm"`
	Username        string    `json:"username"`
	Password        string    `json:"password"`
	GroupName       *string   `json:"group_name,omitempty"`
	MetricsEndpoint *string   `json:"metrics_endpoint,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type CreateClusterRequest struct {
	Name            string  `json:"name" validate:"required"`
	BaseURL         string  `json:"base_url" validate:"required,url"`
	Realm           string  `json:"realm"`
	Username        string  `json:"username" validate:"required"`
	Password        string  `json:"password" validate:"required"`
	GroupName       *string `json:"group_name,omitempty"`
	MetricsEndpoint *string `json:"metrics_endpoint,omitempty"`
}

type ClusterHealth struct {
	ClusterID int    `json:"cluster_id"`
	Status    string `json:"status"`
	Message   string `json:"message,omitempty"`
}

type ClusterMetrics struct {
	ClusterID int `json:"cluster_id"`
	Clients   int `json:"clients"`
	Roles     int `json:"roles"`
	Users     int `json:"users"`
	Groups    int `json:"groups"`
}

type PrometheusMetrics struct {
	ClusterID           int     `json:"cluster_id"`
	Available           bool    `json:"available"`
	
	// Health Row
	Uptime              float64 `json:"uptime,omitempty"`              // seconds
	ActiveSessions      float64 `json:"active_sessions,omitempty"`
	JvmHeapPercent      float64 `json:"jvm_heap_percent,omitempty"`     // percentage
	DbPoolUsage         float64 `json:"db_pool_usage,omitempty"`        // percentage
	
	// Traffic Row
	Logins1Min          float64 `json:"logins_1min,omitempty"`
	FailedLogins1Min    float64 `json:"failed_logins_1min,omitempty"`
	TokenRequests       float64 `json:"token_requests,omitempty"`
	TokenErrors         float64 `json:"token_errors,omitempty"`
	
	// Performance Row
	AvgRequestDuration  float64 `json:"avg_request_duration,omitempty"`  // seconds
	TokenEndpointLatency float64 `json:"token_endpoint_latency,omitempty"` // seconds
	HttpRequestCount    float64 `json:"http_request_count,omitempty"`
	GcPauses5Min        float64 `json:"gc_pauses_5min,omitempty"`       // seconds
	
	// Cache Row
	CacheHitRate        float64 `json:"cache_hit_rate,omitempty"`       // percentage
	CacheMisses         float64 `json:"cache_misses,omitempty"`
	InfinispanMetrics   map[string]float64 `json:"infinispan_metrics,omitempty"`
	
	Error               string  `json:"error,omitempty"`
}

