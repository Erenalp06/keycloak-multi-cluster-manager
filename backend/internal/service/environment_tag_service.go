package service

import (
	"fmt"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/repository/postgres"
)

type EnvironmentTagService struct {
	tagRepo    *postgres.EnvironmentTagRepository
	clusterRepo *postgres.ClusterRepository
}

func NewEnvironmentTagService(tagRepo *postgres.EnvironmentTagRepository, clusterRepo *postgres.ClusterRepository) *EnvironmentTagService {
	return &EnvironmentTagService{
		tagRepo:    tagRepo,
		clusterRepo: clusterRepo,
	}
}

func (s *EnvironmentTagService) GetAll() ([]*domain.EnvironmentTag, error) {
	return s.tagRepo.GetAll()
}

func (s *EnvironmentTagService) GetByID(id int) (*domain.EnvironmentTag, error) {
	return s.tagRepo.GetByID(id)
}

func (s *EnvironmentTagService) Create(req domain.CreateEnvironmentTagRequest) (*domain.EnvironmentTag, error) {
	tag := &domain.EnvironmentTag{
		Name:        req.Name,
		Color:       req.Color,
		Description: req.Description,
	}
	
	if tag.Color == "" {
		tag.Color = "#3b82f6" // Default blue
	}
	
	if err := s.tagRepo.Create(tag); err != nil {
		return nil, err
	}
	
	return tag, nil
}

func (s *EnvironmentTagService) Update(id int, req domain.UpdateEnvironmentTagRequest) (*domain.EnvironmentTag, error) {
	tag, err := s.tagRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if tag == nil {
		return nil, fmt.Errorf("environment tag not found")
	}
	
	if req.Name != "" {
		tag.Name = req.Name
	}
	if req.Color != "" {
		tag.Color = req.Color
	}
	if req.Description != "" {
		tag.Description = req.Description
	}
	
	if err := s.tagRepo.Update(tag); err != nil {
		return nil, err
	}
	
	return tag, nil
}

func (s *EnvironmentTagService) Delete(id int) error {
	return s.tagRepo.Delete(id)
}

func (s *EnvironmentTagService) AssignTagsToClusters(req domain.AssignTagsToClustersRequest) error {
	// Verify all clusters exist
	for _, clusterID := range req.ClusterIDs {
		cluster, err := s.clusterRepo.GetByID(clusterID)
		if err != nil {
			return err
		}
		if cluster == nil {
			return fmt.Errorf("cluster not found: %d", clusterID)
		}
	}
	
	// Verify all tags exist
	for _, tagID := range req.TagIDs {
		tag, err := s.tagRepo.GetByID(tagID)
		if err != nil {
			return err
		}
		if tag == nil {
			return fmt.Errorf("environment tag not found: %d", tagID)
		}
	}
	
	return s.tagRepo.AssignTagsToClusters(req.ClusterIDs, req.TagIDs)
}

func (s *EnvironmentTagService) RemoveTagsFromClusters(req domain.RemoveTagsFromClustersRequest) error {
	return s.tagRepo.RemoveTagsFromClusters(req.ClusterIDs, req.TagIDs)
}

func (s *EnvironmentTagService) GetTagsByClusterID(clusterID int) ([]*domain.EnvironmentTag, error) {
	return s.tagRepo.GetTagsByClusterID(clusterID)
}

