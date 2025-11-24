package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"keycloak-multi-manage/internal/handler"
	"keycloak-multi-manage/internal/middleware"
	"keycloak-multi-manage/internal/repository/postgres"
	"keycloak-multi-manage/internal/service"
	"keycloak-multi-manage/pkg/database"
)

func main() {
	// Connect to database
	db, err := database.NewPostgresConnection()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	
	// Initialize repositories
	clusterRepo := postgres.NewClusterRepository(db)
	userRepo := postgres.NewUserRepository(db)
	permissionRepo := postgres.NewPermissionRepository(db)
	appRoleRepo := postgres.NewAppRoleRepository(db)
	
	// Initialize default admin user if it doesn't exist
	if err := service.InitDefaultAdmin(userRepo); err != nil {
		log.Printf("Warning: Failed to initialize default admin user: %v", err)
	}
	
	// Initialize services
	clusterService := service.NewClusterService(clusterRepo)
	roleService := service.NewRoleService(clusterRepo)
	diffService := service.NewDiffService(roleService, clusterService)
	syncService := service.NewSyncService(clusterRepo)
	exportImportService := service.NewExportImportService(clusterRepo)
	authService := service.NewAuthService(userRepo, appRoleRepo)
	userService := service.NewUserService(userRepo, appRoleRepo)
	appRoleService := service.NewAppRoleService(appRoleRepo, permissionRepo)
	
	// Initialize handlers
	clusterHandler := handler.NewClusterHandler(clusterService)
	roleHandler := handler.NewRoleHandler(roleService)
	diffHandler := handler.NewDiffHandler(diffService)
	syncHandler := handler.NewSyncHandler(syncService)
	exportImportHandler := handler.NewExportImportHandler(exportImportService)
	authHandler := handler.NewAuthHandler(authService)
	userHandler := handler.NewUserHandler(userService)
	appRoleHandler := handler.NewAppRoleHandler(appRoleService)
	
	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})
	
	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin,Content-Type,Accept,Authorization",
	}))
	
	// Routes
	api := app.Group("/api")
	
	// Auth routes (public)
	auth := api.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)
	auth.Get("/me", middleware.AuthMiddleware(authService), authHandler.Me)
	
	// Protected routes
	protected := api.Group("", middleware.AuthMiddleware(authService))
	
	// Cluster routes with permission checks
	clusters := protected.Group("/clusters")
	clusters.Get("/", middleware.PermissionMiddleware(appRoleService, "view_clusters"), clusterHandler.GetAll)
	clusters.Get("/:id", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), clusterHandler.GetByID)
	clusters.Get("/:id/health", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), clusterHandler.HealthCheck)
	clusters.Get("/:id/metrics", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), clusterHandler.GetMetrics)
	clusters.Get("/:id/prometheus-metrics", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), clusterHandler.GetPrometheusMetrics)
	clusters.Get("/:id/rbac-analysis", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), clusterHandler.GetRBACAnalysis)
	clusters.Get("/:id/server-info", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), clusterHandler.GetServerInfo)
	clusters.Post("/:id/user-token", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), clusterHandler.GetUserToken)
	clusters.Get("/:id/clients", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), clusterHandler.GetClients)
	clusters.Get("/:id/clients/details", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), clusterHandler.GetClientDetails)
	clusters.Get("/:id/users", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), clusterHandler.GetUsers)
	clusters.Get("/:id/users/details", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), clusterHandler.GetUserDetails)
	clusters.Get("/:id/groups", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), clusterHandler.GetGroups)
	clusters.Get("/:id/groups/details", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), clusterHandler.GetGroupDetails)
	
	// Admin-only cluster operations
	adminClusters := protected.Group("/clusters", middleware.PermissionMiddleware(appRoleService, "manage_roles"))
	adminClusters.Post("/", middleware.PermissionMiddleware(appRoleService, "create_cluster"), clusterHandler.Create)
	adminClusters.Put("/:id", middleware.PermissionMiddleware(appRoleService, "update_cluster"), clusterHandler.Update)
	adminClusters.Delete("/:id", middleware.PermissionMiddleware(appRoleService, "delete_cluster"), clusterHandler.Delete)
	
	// Role routes
	roles := protected.Group("/roles")
	roles.Get("/cluster/:id", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), roleHandler.GetRoles)
	
	// Diff routes
	diff := protected.Group("/diff", middleware.PermissionMiddleware(appRoleService, "view_diff"))
	diff.Get("/roles", diffHandler.GetRoleDiff)
	diff.Get("/clients", diffHandler.GetClientDiff)
	diff.Get("/groups", diffHandler.GetGroupDiff)
	diff.Get("/users", diffHandler.GetUserDiff)
	
	// Sync routes
	sync := protected.Group("/sync", middleware.PermissionMiddleware(appRoleService, "sync_items"))
	sync.Post("/role", syncHandler.SyncRole)
	sync.Post("/client", syncHandler.SyncClient)
	sync.Post("/group", syncHandler.SyncGroup)
	sync.Post("/user", syncHandler.SyncUser)
	
	// Export/Import routes
	exportImport := protected.Group("/export-import")
	exportImport.Get("/clusters/:id/realm/export", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), exportImportHandler.ExportRealm)
	exportImport.Post("/clusters/:id/realm/import", middleware.PermissionMiddleware(appRoleService, "sync_items"), exportImportHandler.ImportRealm)
	exportImport.Get("/clusters/:id/users/export", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), exportImportHandler.ExportUsers)
	exportImport.Post("/clusters/:id/users/import", middleware.PermissionMiddleware(appRoleService, "sync_items"), exportImportHandler.ImportUsers)
	exportImport.Get("/clusters/:id/clients/export", middleware.PermissionMiddleware(appRoleService, "view_cluster_detail"), exportImportHandler.ExportClients)
	exportImport.Post("/clusters/:id/clients/import", middleware.PermissionMiddleware(appRoleService, "sync_items"), exportImportHandler.ImportClients)
	
	// User management routes (admin only)
	adminUsers := protected.Group("/users", middleware.AdminMiddleware(appRoleService))
	adminUsers.Get("/", userHandler.GetAll)
	adminUsers.Post("/", userHandler.Create)
	adminUsers.Put("/:id", userHandler.Update)
	adminUsers.Delete("/:id", userHandler.Delete)
	
	// Role management routes (admin only)
	adminRoles := protected.Group("/app-roles", middleware.AdminMiddleware(appRoleService))
	adminRoles.Get("/", appRoleHandler.GetAllRoles)
	adminRoles.Get("/permissions", appRoleHandler.GetAllPermissions)
	adminRoles.Get("/:id", appRoleHandler.GetRoleByID)
	adminRoles.Post("/", appRoleHandler.CreateRole)
	adminRoles.Put("/:id", appRoleHandler.UpdateRole)
	adminRoles.Delete("/:id", appRoleHandler.DeleteRole)
	adminRoles.Post("/users/:user_id/assign", appRoleHandler.AssignRolesToUser)
	adminRoles.Get("/users/:user_id", appRoleHandler.GetUserRoles)
	
	// Start server
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}
	
	log.Printf("Server starting on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

