package postgres

import (
	"database/sql"
	"keycloak-multi-manage/internal/domain"
	"time"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *domain.User) error {
	query := `
		INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`
	
	now := time.Now()
	role := user.Role
	if role == "" {
		role = domain.RoleUser
	}
	
	err := r.db.QueryRow(
		query,
		user.Username,
		user.Email,
		user.PasswordHash,
		role,
		now,
		now,
	).Scan(&user.ID)
	
	if err != nil {
		return err
	}
	
	user.CreatedAt = now
	user.UpdatedAt = now
	return nil
}

func (r *UserRepository) GetByUsername(username string) (*domain.User, error) {
	query := `
		SELECT id, username, email, password_hash, role, created_at, updated_at
		FROM users
		WHERE username = $1
	`
	
	user := &domain.User{}
	err := r.db.QueryRow(query, username).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	
	return user, nil
}

func (r *UserRepository) GetByEmail(email string) (*domain.User, error) {
	query := `
		SELECT id, username, email, password_hash, role, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	
	user := &domain.User{}
	err := r.db.QueryRow(query, email).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	
	return user, nil
}

func (r *UserRepository) GetByID(id int) (*domain.User, error) {
	query := `
		SELECT id, username, email, password_hash, role, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	
	user := &domain.User{}
	err := r.db.QueryRow(query, id).Scan(
		&user.ID,
		&user.Username,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	
	return user, nil
}

func (r *UserRepository) GetAll() ([]*domain.User, error) {
	query := `
		SELECT id, username, email, password_hash, role, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
	`
	
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	var users []*domain.User
	for rows.Next() {
		user := &domain.User{}
		err := rows.Scan(
			&user.ID,
			&user.Username,
			&user.Email,
			&user.PasswordHash,
			&user.Role,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	
	return users, rows.Err()
}

func (r *UserRepository) Update(user *domain.User) error {
	query := `
		UPDATE users 
		SET username = $1, email = $2, role = $3, updated_at = $4
		WHERE id = $5
	`
	
	now := time.Now()
	_, err := r.db.Exec(
		query,
		user.Username,
		user.Email,
		user.Role,
		now,
		user.ID,
	)
	
	if err != nil {
		return err
	}
	
	user.UpdatedAt = now
	return nil
}

func (r *UserRepository) UpdatePassword(userID int, passwordHash string) error {
	query := `
		UPDATE users 
		SET password_hash = $1, updated_at = $2
		WHERE id = $3
	`
	
	now := time.Now()
	_, err := r.db.Exec(query, passwordHash, now, userID)
	return err
}

func (r *UserRepository) Delete(id int) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

