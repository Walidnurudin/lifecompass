package main

import (
	"log"

	"lifecompass-backend/config"
	"lifecompass-backend/database"
	"lifecompass-backend/middleware"
	"lifecompass-backend/routes"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env file if present (ignored silently in production)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	cfg := config.Load()

	// Set JWT secret
	middleware.SetJWTSecret(cfg.JWTSecret)

	// Connect to database
	database.Connect(cfg)

	// Setup router
	r := routes.SetupRouter()

	log.Printf("Server starting on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
