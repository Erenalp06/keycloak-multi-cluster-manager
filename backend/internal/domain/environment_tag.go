package domain

import "time"

type EnvironmentTag struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Color       string    `json:"color"`
	Description string    `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateEnvironmentTagRequest struct {
	Name        string `json:"name" validate:"required"`
	Color       string `json:"color"`
	Description string `json:"description,omitempty"`
}

type UpdateEnvironmentTagRequest struct {
	Name        string `json:"name,omitempty"`
	Color       string `json:"color,omitempty"`
	Description string `json:"description,omitempty"`
}

type AssignTagsToClustersRequest struct {
	ClusterIDs []int `json:"cluster_ids" validate:"required,min=1"`
	TagIDs     []int `json:"tag_ids" validate:"required,min=1"`
}

type RemoveTagsFromClustersRequest struct {
	ClusterIDs []int `json:"cluster_ids" validate:"required,min=1"`
	TagIDs     []int `json:"tag_ids" validate:"required,min=1"`
}

