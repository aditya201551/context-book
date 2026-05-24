package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                        string
	MCPPort                     string
	Env                         string
	DatabaseURL                 string
	VoyageAPIKey                string
	VoyageModel                 string
	VoyageDimension             int
	APIKeySalt                  string
	PublicURL                   string
	FrontendURL                 string
	CookieDomain                string
	GoogleClientID              string
	GoogleClientSecret          string
	GitHubClientID              string
	GitHubClientSecret          string
	ConstellationMinBooks       int
	ConstellationEdgeThreshold  float64
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	// Parse VoyageDimension with fallback to 1024
	voyageDimStr := getEnvOrDefault("VOYAGE_DIMENSION", "1024")
	voyageDim, err := strconv.Atoi(voyageDimStr)
	if err != nil {
		voyageDim = 1024 // Default to 1024 if parsing fails
	}

	cfg := &Config{
		Port:               getEnvOrDefault("PORT", "8080"),
		MCPPort:            getEnvOrDefault("MCP_PORT", "8080"),
		Env:                getEnvOrDefault("ENV", "development"),
		DatabaseURL:        getEnv("DATABASE_URL"),
		VoyageAPIKey:       getEnv("VOYAGE_API_KEY"),
		VoyageModel:        getEnvOrDefault("VOYAGE_MODEL", "voyage-4"),
		VoyageDimension:    voyageDim,
		APIKeySalt:         getEnv("API_KEY_SALT"),
		CookieDomain:       getEnv("COOKIE_DOMAIN"),
		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET"),
		GitHubClientID:     getEnv("GITHUB_CLIENT_ID"),
		GitHubClientSecret: getEnv("GITHUB_CLIENT_SECRET"),
	}

	cfg.PublicURL = getEnvOrDefault("PUBLIC_URL", "http://localhost:"+cfg.Port)
	cfg.FrontendURL = getEnvOrDefault("FRONTEND_URL", "http://localhost:5173")

	constellationMinStr := getEnvOrDefault("CONSTELLATION_MIN_BOOKS", "5")
	constellationMin, err := strconv.Atoi(constellationMinStr)
	if err != nil {
		constellationMin = 5
	}
	cfg.ConstellationMinBooks = constellationMin

	constellationThresholdStr := getEnvOrDefault("CONSTELLATION_EDGE_THRESHOLD", "0.6")
	constellationThreshold, err := strconv.ParseFloat(constellationThresholdStr, 64)
	if err != nil || constellationThreshold < 0 || constellationThreshold > 1 {
		constellationThreshold = 0.6
	}
	cfg.ConstellationEdgeThreshold = constellationThreshold

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.APIKeySalt == "" {
		return nil, fmt.Errorf("API_KEY_SALT is required")
	}

	return cfg, nil
}

func getEnv(key string) string {
	return os.Getenv(key)
}

func getEnvOrDefault(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
