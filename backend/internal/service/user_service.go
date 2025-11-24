package service

import (
	"errors"
	"golang.org/x/crypto/bcrypt"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/repository/postgres"
)

type UserService struct {
	userRepo    *postgres.UserRepository
	appRoleRepo *postgres.AppRoleRepository
}

func NewUserService(userRepo *postgres.UserRepository, appRoleRepo *postgres.AppRoleRepository) *UserService {
	return &UserService{
		userRepo:    userRepo,
		appRoleRepo: appRoleRepo,
	}
}

func (s *UserService) GetAllUsers() ([]*domain.User, error) {
	users, err := s.userRepo.GetAll()
	if err != nil {
		return nil, err
	}
	
	// Clear password hashes from response
	for _, user := range users {
		user.PasswordHash = ""
	}
	
	return users, nil
}

func (s *UserService) CreateUser(req *domain.CreateUserRequest) (*domain.User, error) {
	// Check if username already exists
	existingUser, err := s.userRepo.GetByUsername(req.Username)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("username already exists")
	}

	// Check if email already exists
	existingEmail, err := s.userRepo.GetByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if existingEmail != nil {
		return nil, errors.New("email already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Validate role
	role := req.Role
	if role != domain.RoleAdmin && role != domain.RoleUser {
		role = domain.RoleUser
	}

	// Create user
	user := &domain.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         role,
	}

	err = s.userRepo.Create(user)
	if err != nil {
		return nil, err
	}

	// Assign default role to user
	err = s.assignDefaultRole(user.ID, role)
	if err != nil {
		// Log error but don't fail user creation
		// The role can be assigned later manually
	}

	// Clear password hash from response
	user.PasswordHash = ""
	return user, nil
}

func (s *UserService) assignDefaultRole(userID int, roleName string) error {
	// Get the role by name
	allRoles, err := s.appRoleRepo.GetAll()
	if err != nil {
		return err
	}

	var targetRole *domain.AppRole
	for _, role := range allRoles {
		if role.Name == roleName {
			targetRole = role
			break
		}
	}

	if targetRole == nil {
		return errors.New("role not found")
	}

	// Assign role to user
	return s.appRoleRepo.AssignRolesToUser(userID, []int{targetRole.ID})
}

func (s *UserService) UpdateUser(id int, req *domain.UpdateUserRequest) (*domain.User, error) {
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	// Check if username is being changed and if it already exists
	if req.Username != "" && req.Username != user.Username {
		existingUser, err := s.userRepo.GetByUsername(req.Username)
		if err != nil {
			return nil, err
		}
		if existingUser != nil {
			return nil, errors.New("username already exists")
		}
		user.Username = req.Username
	}

	// Check if email is being changed and if it already exists
	if req.Email != "" && req.Email != user.Email {
		existingEmail, err := s.userRepo.GetByEmail(req.Email)
		if err != nil {
			return nil, err
		}
		if existingEmail != nil {
			return nil, errors.New("email already exists")
		}
		user.Email = req.Email
	}

	// Update role if provided
	if req.Role != "" {
		if req.Role != domain.RoleAdmin && req.Role != domain.RoleUser {
			return nil, errors.New("invalid role")
		}
		user.Role = req.Role
	}

	// Update password if provided
	if req.Password != "" {
		if len(req.Password) < 6 {
			return nil, errors.New("password must be at least 6 characters")
		}
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return nil, err
		}
		err = s.userRepo.UpdatePassword(id, string(hashedPassword))
		if err != nil {
			return nil, err
		}
	}

	err = s.userRepo.Update(user)
	if err != nil {
		return nil, err
	}

	// Clear password hash from response
	user.PasswordHash = ""
	return user, nil
}

func (s *UserService) DeleteUser(id int) error {
	user, err := s.userRepo.GetByID(id)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}
	
	return s.userRepo.Delete(id)
}

