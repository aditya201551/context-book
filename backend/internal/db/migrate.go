package db

import (
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func RunMigrations(databaseURL string) error {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return fmt.Errorf("failed to open db for migrations: %w", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		return fmt.Errorf("failed to ping db for migrations: %w", err)
	}

	var p string
	if envPath := os.Getenv("MIGRATIONS_PATH"); envPath != "" {
		p = envPath
	} else {
		_, b, _, _ := runtime.Caller(0)
		basepath := filepath.Dir(b)
		p = filepath.Join(basepath, "migrations")
	}
	if runtime.GOOS == "windows" {
		p = filepath.ToSlash(p)
	}
	migrationsPath := "file://" + p

	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create postgres migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(migrationsPath, "postgres", driver)
	if err != nil {
		return fmt.Errorf("failed to initialize migrate instance: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	if err == migrate.ErrNoChange {
		slog.Info("Database schema is up to date (no changes)")
	} else {
		slog.Info("Database migrations applied successfully")
	}

	return nil
}
