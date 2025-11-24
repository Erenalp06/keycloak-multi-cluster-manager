package postgres

import (
	"database/sql"
	"keycloak-multi-manage/internal/domain"
)

type PermissionRepository struct {
	db *sql.DB
}

func NewPermissionRepository(db *sql.DB) *PermissionRepository {
	return &PermissionRepository{db: db}
}

func (r *PermissionRepository) GetAll() ([]*domain.Permission, error) {
	query := `
		SELECT id, name, description, created_at
		FROM permissions
		ORDER BY name
	`
	
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var permissions []*domain.Permission
	for rows.Next() {
		permission := &domain.Permission{}
		err := rows.Scan(
			&permission.ID,
			&permission.Name,
			&permission.Description,
			&permission.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		permissions = append(permissions, permission)
	}
	
	return permissions, rows.Err()
}

func (r *PermissionRepository) GetByID(id int) (*domain.Permission, error) {
	query := `
		SELECT id, name, description, created_at
		FROM permissions
		WHERE id = $1
	`
	
	permission := &domain.Permission{}
	err := r.db.QueryRow(query, id).Scan(
		&permission.ID,
		&permission.Name,
		&permission.Description,
		&permission.CreatedAt,
	)
	
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	
	return permission, nil
}

func (r *PermissionRepository) GetByUserID(userID int) ([]*domain.Permission, error) {
	query := `
		SELECT DISTINCT p.id, p.name, p.description, p.created_at
		FROM permissions p
		INNER JOIN role_permissions rp ON p.id = rp.permission_id
		INNER JOIN user_roles ur ON rp.role_id = ur.role_id
		WHERE ur.user_id = $1
		ORDER BY p.name
	`
	
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var permissions []*domain.Permission
	for rows.Next() {
		permission := &domain.Permission{}
		err := rows.Scan(
			&permission.ID,
			&permission.Name,
			&permission.Description,
			&permission.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		permissions = append(permissions, permission)
	}
	
	return permissions, rows.Err()
}

func (r *PermissionRepository) HasPermission(userID int, permissionName string) (bool, error) {
	query := `
		SELECT COUNT(*) > 0
		FROM permissions p
		INNER JOIN role_permissions rp ON p.id = rp.permission_id
		INNER JOIN user_roles ur ON rp.role_id = ur.role_id
		WHERE ur.user_id = $1 AND p.name = $2
	`
	
	var hasPermission bool
	err := r.db.QueryRow(query, userID, permissionName).Scan(&hasPermission)
	return hasPermission, err
}

