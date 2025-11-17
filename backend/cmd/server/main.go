package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"keycloak-multi-manage/internal/handler"
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
	
	// Initialize services
	clusterService := service.NewClusterService(clusterRepo)
	roleService := service.NewRoleService(clusterRepo)
	diffService := service.NewDiffService(roleService, clusterService)
	syncService := service.NewSyncService(clusterRepo)
	
	// Initialize handlers
	clusterHandler := handler.NewClusterHandler(clusterService)
	roleHandler := handler.NewRoleHandler(roleService)
	diffHandler := handler.NewDiffHandler(diffService)
	syncHandler := handler.NewSyncHandler(syncService)
	
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
		AllowHeaders: "Origin,Content-Type,Accept",
	}))
	
	// Routes
	api := app.Group("/api")
	
	// Cluster routes
	clusters := api.Group("/clusters")
	clusters.Get("/", clusterHandler.GetAll)
	clusters.Post("/", clusterHandler.Create)
	clusters.Get("/:id", clusterHandler.GetByID)
	clusters.Put("/:id", clusterHandler.Update)
	clusters.Delete("/:id", clusterHandler.Delete)
	clusters.Get("/:id/health", clusterHandler.HealthCheck)
	clusters.Get("/:id/metrics", clusterHandler.GetMetrics)
	clusters.Get("/:id/clients", clusterHandler.GetClients)
	clusters.Get("/:id/clients/details", clusterHandler.GetClientDetails)
	clusters.Get("/:id/users", clusterHandler.GetUsers)
	clusters.Get("/:id/users/details", clusterHandler.GetUserDetails)
	clusters.Get("/:id/groups", clusterHandler.GetGroups)
	clusters.Get("/:id/groups/details", clusterHandler.GetGroupDetails)
	
	// Role routes
	roles := api.Group("/roles")
	roles.Get("/cluster/:id", roleHandler.GetRoles)
	
	// Diff routes
	diff := api.Group("/diff")
	diff.Get("/roles", diffHandler.GetRoleDiff)
	diff.Get("/clients", diffHandler.GetClientDiff)
	diff.Get("/groups", diffHandler.GetGroupDiff)
	diff.Get("/users", diffHandler.GetUserDiff)
	
	// Sync routes
	sync := api.Group("/sync")
	sync.Post("/role", syncHandler.SyncRole)
	sync.Post("/client", syncHandler.SyncClient)
	sync.Post("/group", syncHandler.SyncGroup)
	sync.Post("/user", syncHandler.SyncUser)
	
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

