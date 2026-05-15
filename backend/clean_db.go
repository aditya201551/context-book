package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	_ = godotenv.Load()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://contextbook:admin@localhost:5433/contextbook_db?sslmode=disable"
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("failed to open db: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping db: %v", err)
	}

	statements := []string{
		"DROP TABLE IF EXISTS oauth_refresh_tokens CASCADE",
		"DROP TABLE IF EXISTS oauth_tokens CASCADE",
		"DROP TABLE IF EXISTS oauth_codes CASCADE",
		"DROP TABLE IF EXISTS oauth_clients CASCADE",
		"DROP TABLE IF EXISTS context_book_pages CASCADE",
		"DROP TABLE IF EXISTS context_books CASCADE",
		"DROP TABLE IF EXISTS users CASCADE",
		"DROP EXTENSION IF EXISTS vector CASCADE",
		"DROP TABLE IF EXISTS schema_migrations",
	}

	for _, s := range statements {
		fmt.Printf("Executing: %s\n", s)
		if _, err := db.Exec(s); err != nil {
			log.Printf("warning: %v", err)
		}
	}

	fmt.Println("Database cleaned. Restart the API server to re-run migrations.")
}
