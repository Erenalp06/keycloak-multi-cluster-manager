package service

import (
	"log"
	"golang.org/x/crypto/bcrypt"
	"keycloak-multi-manage/internal/domain"
	"keycloak-multi-manage/internal/repository/postgres"
)

// InitDefaultAdmin creates the default admin user if it doesn't exist
func InitDefaultAdmin(userRepo *postgres.UserRepository) error {
	// Check if admin user already exists
	existingAdmin, err := userRepo.GetByUsername("admin")
	if err != nil {
		return err
	}
	
	if existingAdmin != nil {
		log.Println("Default admin user already exists")
		return nil
	}
	
	// Hash default password: admin123
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	
	// Create admin user
	adminUser := &domain.User{
		Username:     "admin",
		Email:        "admin@keycloak-multi-manage.local",
		PasswordHash: string(hashedPassword),
		Role:         domain.RoleAdmin,
	}
	
	err = userRepo.Create(adminUser)
	if err != nil {
		return err
	}
	
	log.Println("Default admin user created successfully")
	log.Println("Username: admin")
	log.Println("Password: admin123")
	log.Println("⚠️  Please change the default password after first login!")
	
	return nil
}

