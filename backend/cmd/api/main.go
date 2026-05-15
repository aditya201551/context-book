package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/contextbook/config"
	"github.com/contextbook/internal/api"
	"github.com/contextbook/internal/auth"
	ctxbridge "github.com/contextbook/internal/context"
	"github.com/contextbook/internal/db"
	"github.com/contextbook/internal/embedding"
	"github.com/contextbook/internal/logger"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		slog.Info("Shutting down API server...")
		cancel()
	}()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("Failed to load config", "error", err)
		os.Exit(1)
	}

	logger.Setup(cfg.Env)

	// API server runs migrations
	if err := db.RunMigrations(cfg.DatabaseURL); err != nil {
		slog.Error("Migration failed", "error", err)
		os.Exit(1)
	}

	database, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("Cannot connect to postgres", "error", err)
		os.Exit(1)
	}
	defer database.Close()

	h := auth.NewHandlers(database, cfg)

	embedClient := embedding.NewVoyageClient(cfg.VoyageAPIKey, cfg.VoyageModel)
	ctxService := ctxbridge.NewService(database, embedClient)
	apiHandlers := api.NewHandlers(database, cfg, ctxService, h)

	mux := http.NewServeMux()

	mux.HandleFunc("/token", h.HandleToken)
	mux.HandleFunc("/token/refresh", h.HandleTokenRefresh)
	mux.HandleFunc("/register", h.HandleRegister)
	mux.HandleFunc("/authorize", h.HandleAuthorize)
	mux.HandleFunc("/api/oauth/authorize-info", h.HandleAuthorizeInfo)
	mux.HandleFunc("/api/oauth/authorize-approve", h.HandleAuthorizeApprove)
	mux.HandleFunc("/api/oauth/authorize-deny", h.HandleAuthorizeDeny)
	mux.HandleFunc("/.well-known/oauth-authorization-server", h.HandleWellKnown)
	mux.HandleFunc("/.well-known/oauth-protected-resource", h.HandleProtectedResource)
	mux.HandleFunc("/revoke", h.HandleRevoke)
	mux.HandleFunc("/api/tokens", h.HandleTokenList)
	mux.HandleFunc("/api/tokens/revoke", h.HandleTokenRevoke)
	mux.HandleFunc("/debug/token-verify", h.HandleDebugTokenVerify)
	mux.HandleFunc("/auth/google", h.HandleGoogleLogin)
	mux.HandleFunc("/auth/google/callback", h.HandleGoogleCallback)
	mux.HandleFunc("/auth/github", h.HandleGitHubLogin)
	mux.HandleFunc("/auth/github/callback", h.HandleGitHubCallback)
	mux.HandleFunc("/api/auth/logout", h.HandleFormLogout)

	apiHandlers.RegisterRoutes(mux)

	// Catch-all for undefined UI routes
	mux.HandleFunc("/login", notFoundHandler)
	mux.HandleFunc("/logout", notFoundHandler)
	mux.HandleFunc("/dashboard", notFoundHandler)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		slog.Warn("Not found", "path", r.URL.Path)
		http.NotFound(w, r)
	})

	httpSrv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: logger.HttpMiddleware(mux),
	}

	go func() {
		slog.Info("API Server listening", "port", cfg.Port)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("listen error", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("Shutting down API HTTP server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		slog.Error("Server forced to shutdown", "error", err)
		os.Exit(1)
	}

	slog.Info("API Server disconnected.")
}

func notFoundHandler(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "UI not found. Please use the API endpoints.", http.StatusNotFound)
}
