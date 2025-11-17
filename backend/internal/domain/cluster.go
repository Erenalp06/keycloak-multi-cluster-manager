package domain

import "time"

type Cluster struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	BaseURL   string    `json:"base_url"`
	Realm     string    `json:"realm"`
	Username  string    `json:"username"`
	Password  string    `json:"password"`
	GroupName *string   `json:"group_name,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateClusterRequest struct {
	Name      string  `json:"name" validate:"required"`
	BaseURL   string  `json:"base_url" validate:"required,url"`
	Realm     string  `json:"realm"`
	Username  string  `json:"username" validate:"required"`
	Password  string  `json:"password" validate:"required"`
	GroupName *string `json:"group_name,omitempty"`
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

