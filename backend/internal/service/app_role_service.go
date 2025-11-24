package service

import (
	"errors"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/repository/postgres"
)

type AppRoleService struct {
	roleRepo       *postgres.AppRoleRepository
	permissionRepo *postgres.PermissionRepository
}

func NewAppRoleService(roleRepo *postgres.AppRoleRepository, permissionRepo *postgres.PermissionRepository) *AppRoleService {
	return &AppRoleService{
		roleRepo:       roleRepo,
		permissionRepo: permissionRepo,
	}
}

func (s *AppRoleService) GetAllRoles() ([]*domain.AppRole, error) {
	return s.roleRepo.GetAll()
}

func (s *AppRoleService) GetRoleByID(id int) (*domain.AppRole, error) {
	return s.roleRepo.GetByID(id)
}

func (s *AppRoleService) GetUserRoles(userID int) ([]*domain.AppRole, error) {
	return s.roleRepo.GetByUserID(userID)
}

func (s *AppRoleService) GetAllPermissions() ([]*domain.Permission, error) {
	return s.permissionRepo.GetAll()
}

func (s *AppRoleService) CreateRole(req *domain.CreateRoleRequest) (*domain.AppRole, error) {
	// Check if role name already exists
	existingRoles, err := s.roleRepo.GetAll()
	if err != nil {
		return nil, err
	}
	for _, role := range existingRoles {
		if role.Name == req.Name {
			return nil, errors.New("role name already exists")
		}
	}

	// Get permissions
	allPermissions, err := s.permissionRepo.GetAll()
	if err != nil {
		return nil, err
	}

	permissionMap := make(map[int]*domain.Permission)
	for _, perm := range allPermissions {
		permissionMap[perm.ID] = perm
	}

	var permissions []domain.Permission
	for _, permID := range req.PermissionIDs {
		if perm, ok := permissionMap[permID]; ok {
			permissions = append(permissions, *perm)
		}
	}

	role := &domain.AppRole{
		Name:        req.Name,
		Description: req.Description,
		Permissions: permissions,
	}

	err = s.roleRepo.Create(role)
	if err != nil {
		return nil, err
	}

	return role, nil
}

func (s *AppRoleService) UpdateRole(id int, req *domain.UpdateRoleRequest) (*domain.AppRole, error) {
	role, err := s.roleRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if role == nil {
		return nil, errors.New("role not found")
	}

	// Update name if provided
	if req.Name != "" {
		// Check if new name conflicts with existing role
		existingRoles, err := s.roleRepo.GetAll()
		if err != nil {
			return nil, err
		}
		for _, r := range existingRoles {
			if r.ID != id && r.Name == req.Name {
				return nil, errors.New("role name already exists")
			}
		}
		role.Name = req.Name
	}

	// Update description if provided
	if req.Description != "" {
		role.Description = req.Description
	}

	// Update permissions if provided
	if req.PermissionIDs != nil {
		allPermissions, err := s.permissionRepo.GetAll()
		if err != nil {
			return nil, err
		}

		permissionMap := make(map[int]*domain.Permission)
		for _, perm := range allPermissions {
			permissionMap[perm.ID] = perm
		}

		var permissions []domain.Permission
		for _, permID := range req.PermissionIDs {
			if perm, ok := permissionMap[permID]; ok {
				permissions = append(permissions, *perm)
			}
		}
		role.Permissions = permissions
	}

	err = s.roleRepo.Update(role)
	if err != nil {
		return nil, err
	}

	return role, nil
}

func (s *AppRoleService) DeleteRole(id int) error {
	// Prevent deletion of default roles
	role, err := s.roleRepo.GetByID(id)
	if err != nil {
		return err
	}
	if role == nil {
		return errors.New("role not found")
	}
	if role.Name == "admin" || role.Name == "user" {
		return errors.New("cannot delete default roles")
	}

	return s.roleRepo.Delete(id)
}

func (s *AppRoleService) AssignRolesToUser(userID int, roleIDs []int) error {
	// Validate all role IDs exist
	for _, roleID := range roleIDs {
		role, err := s.roleRepo.GetByID(roleID)
		if err != nil {
			return err
		}
		if role == nil {
			return errors.New("role not found")
		}
	}

	return s.roleRepo.AssignRolesToUser(userID, roleIDs)
}

func (s *AppRoleService) GetUserPermissions(userID int) ([]*domain.Permission, error) {
	return s.permissionRepo.GetByUserID(userID)
}

func (s *AppRoleService) HasPermission(userID int, permissionName string) (bool, error) {
	return s.permissionRepo.HasPermission(userID, permissionName)
}

