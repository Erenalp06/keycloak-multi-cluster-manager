package postgres

import (
	"database/sql"
	"keycloak-multi-manage/internal/domain"
	"time"
)

type AppRoleRepository struct {
	db *sql.DB
}

func NewAppRoleRepository(db *sql.DB) *AppRoleRepository {
	return &AppRoleRepository{db: db}
}

func (r *AppRoleRepository) Create(role *domain.AppRole) error {
	query := `
		INSERT INTO roles (name, description, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	
	now := time.Now()
	err := r.db.QueryRow(
		query,
		role.Name,
		role.Description,
		now,
		now,
	).Scan(&role.ID)
	
	if err != nil {
		return err
	}
	
	role.CreatedAt = now
	role.UpdatedAt = now
	
	// Add permissions if provided
	if len(role.Permissions) > 0 {
		err = r.setRolePermissions(role.ID, role.Permissions)
		if err != nil {
			return err
		}
	}
	
	return nil
}

func (r *AppRoleRepository) GetAll() ([]*domain.AppRole, error) {
	query := `
		SELECT id, name, description, created_at, updated_at
		FROM roles
		ORDER BY name
	`
	
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var roles []*domain.AppRole
	for rows.Next() {
		role := &domain.AppRole{}
		err := rows.Scan(
			&role.ID,
			&role.Name,
			&role.Description,
			&role.CreatedAt,
			&role.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		
		// Load permissions for this role
		permissions, err := r.getRolePermissions(role.ID)
		if err != nil {
			return nil, err
		}
		role.Permissions = permissions
		
		roles = append(roles, role)
	}
	
	return roles, rows.Err()
}

func (r *AppRoleRepository) GetByID(id int) (*domain.AppRole, error) {
	query := `
		SELECT id, name, description, created_at, updated_at
		FROM roles
		WHERE id = $1
	`
	
	role := &domain.AppRole{}
	err := r.db.QueryRow(query, id).Scan(
		&role.ID,
		&role.Name,
		&role.Description,
		&role.CreatedAt,
		&role.UpdatedAt,
	)
	
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	
	// Load permissions
	permissions, err := r.getRolePermissions(role.ID)
	if err != nil {
		return nil, err
	}
	role.Permissions = permissions
	
	return role, nil
}

func (r *AppRoleRepository) GetByUserID(userID int) ([]*domain.AppRole, error) {
	query := `
		SELECT r.id, r.name, r.description, r.created_at, r.updated_at
		FROM roles r
		INNER JOIN user_roles ur ON r.id = ur.role_id
		WHERE ur.user_id = $1
		ORDER BY r.name
	`
	
	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var roles []*domain.AppRole
	for rows.Next() {
		role := &domain.AppRole{}
		err := rows.Scan(
			&role.ID,
			&role.Name,
			&role.Description,
			&role.CreatedAt,
			&role.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		
		// Load permissions
		permissions, err := r.getRolePermissions(role.ID)
		if err != nil {
			return nil, err
		}
		role.Permissions = permissions
		
		roles = append(roles, role)
	}
	
	return roles, rows.Err()
}

func (r *AppRoleRepository) Update(role *domain.AppRole) error {
	query := `
		UPDATE roles 
		SET name = $1, description = $2, updated_at = $3
		WHERE id = $4
	`
	
	now := time.Now()
	_, err := r.db.Exec(
		query,
		role.Name,
		role.Description,
		now,
		role.ID,
	)
	
	if err != nil {
		return err
	}
	
	role.UpdatedAt = now
	
	// Update permissions if provided
	if role.Permissions != nil {
		err = r.setRolePermissions(role.ID, role.Permissions)
		if err != nil {
			return err
		}
	}
	
	return nil
}

func (r *AppRoleRepository) Delete(id int) error {
	query := `DELETE FROM roles WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *AppRoleRepository) AssignRolesToUser(userID int, roleIDs []int) error {
	// Remove existing roles
	_, err := r.db.Exec("DELETE FROM user_roles WHERE user_id = $1", userID)
	if err != nil {
		return err
	}
	
	// Add new roles
	if len(roleIDs) > 0 {
		query := `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`
		stmt, err := r.db.Prepare(query)
		if err != nil {
			return err
		}
		defer stmt.Close()
		
		for _, roleID := range roleIDs {
			_, err = stmt.Exec(userID, roleID)
			if err != nil {
				return err
			}
		}
	}
	
	return nil
}

func (r *AppRoleRepository) getRolePermissions(roleID int) ([]domain.Permission, error) {
	query := `
		SELECT p.id, p.name, p.description, p.created_at
		FROM permissions p
		INNER JOIN role_permissions rp ON p.id = rp.permission_id
		WHERE rp.role_id = $1
		ORDER BY p.name
	`
	
	rows, err := r.db.Query(query, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var permissions []domain.Permission
	for rows.Next() {
		permission := domain.Permission{}
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

func (r *AppRoleRepository) setRolePermissions(roleID int, permissions []domain.Permission) error {
	// Remove existing permissions
	_, err := r.db.Exec("DELETE FROM role_permissions WHERE role_id = $1", roleID)
	if err != nil {
		return err
	}
	
	// Add new permissions
	if len(permissions) > 0 {
		query := `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`
		stmt, err := r.db.Prepare(query)
		if err != nil {
			return err
		}
		defer stmt.Close()
		
		for _, permission := range permissions {
			_, err = stmt.Exec(roleID, permission.ID)
			if err != nil {
				return err
			}
		}
	}
	
	return nil
}

