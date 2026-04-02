package database

import (
	"context"
	"log"

	"lifecompass-backend/config"

	"github.com/redis/go-redis/v9"
)

var RDB *redis.Client
var Ctx = context.Background()

func ConnectRedis(cfg *config.Config) {
	opts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Fatalf("Failed to parse Redis URL: %v", err)
	}

	RDB = redis.NewClient(opts)

	if err := RDB.Ping(Ctx).Err(); err != nil {
		log.Printf("Warning: Failed to connect to Redis: %v. Caching will be disabled.", err)
		RDB = nil
		return
	}

	log.Println("Redis connected successfully")
}
