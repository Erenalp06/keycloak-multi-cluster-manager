package service

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/repository/postgres"
)

type AuthService struct {
	userRepo    *postgres.UserRepository
	appRoleRepo *postgres.AppRoleRepository
	jwtSecret   []byte
}

func NewAuthService(userRepo *postgres.UserRepository, appRoleRepo *postgres.AppRoleRepository) *AuthService {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "your-secret-key-change-in-production" // Default secret, should be set via env
	}
	return &AuthService{
		userRepo:    userRepo,
		appRoleRepo: appRoleRepo,
		jwtSecret:   []byte(secret),
	}
}

func (s *AuthService) Register(req *domain.RegisterRequest) (*domain.AuthResponse, error) {
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

	// Create user with default role
	user := &domain.User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         domain.RoleUser, // New users are always 'user' role
	}

	err = s.userRepo.Create(user)
	if err != nil {
		return nil, err
	}

	// Assign default role to user
	err = s.assignDefaultRole(user.ID, user.Role)
	if err != nil {
		// Log error but don't fail registration
		// The role can be assigned later manually
	}

	// Generate JWT token
	token, err := s.generateToken(user.ID, user.Username)
	if err != nil {
		return nil, err
	}

	// Clear password hash from response
	user.PasswordHash = ""

	return &domain.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (s *AuthService) assignDefaultRole(userID int, roleName string) error {
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

func (s *AuthService) Login(req *domain.LoginRequest) (*domain.AuthResponse, error) {
	// Get user by username
	user, err := s.userRepo.GetByUsername(req.Username)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid username or password")
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid username or password")
	}

	// Generate JWT token
	token, err := s.generateToken(user.ID, user.Username)
	if err != nil {
		return nil, err
	}

	// Clear password hash from response
	user.PasswordHash = ""

	return &domain.AuthResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (s *AuthService) ValidateToken(tokenString string) (*domain.User, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userID := int(claims["user_id"].(float64))

		user, err := s.userRepo.GetByID(userID)
		if err != nil {
			return nil, err
		}
		if user == nil {
			return nil, errors.New("user not found")
		}

		// Clear password hash
		user.PasswordHash = ""
		return user, nil
	}

	return nil, errors.New("invalid token")
}

func (s *AuthService) generateToken(userID int, username string) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  userID,
		"username": username,
		"exp":      time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

