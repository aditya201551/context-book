package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
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

	mux.HandleFunc("GET /healthz", handleHealthz)

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

	distPath := findDistPath()
	var rootHandler http.Handler = mux
	if distPath != "" {
		slog.Info("Serving frontend SPA from", "path", distPath)
		rootHandler = spaHandler(distPath, mux)
	} else {
		slog.Info("No frontend dist found, running API-only mode")
		mux.HandleFunc("/login", notFoundHandler)
		mux.HandleFunc("/logout", notFoundHandler)
		mux.HandleFunc("/dashboard", notFoundHandler)
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			slog.Warn("Not found", "path", r.URL.Path)
			http.NotFound(w, r)
		})
	}

	httpSrv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: logger.HttpMiddleware(rootHandler),
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

func handleHealthz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func notFoundHandler(w http.ResponseWriter, r *http.Request) {
	http.Error(w, "UI not found. Please use the API endpoints.", http.StatusNotFound)
}

func isAPIRoute(path string) bool {
	return strings.HasPrefix(path, "/api/") ||
		strings.HasPrefix(path, "/auth/") ||
		strings.HasPrefix(path, "/token") ||
		strings.HasPrefix(path, "/register") ||
		strings.HasPrefix(path, "/revoke") ||
		strings.HasPrefix(path, "/authorize") ||
		strings.HasPrefix(path, "/.well-known/") ||
		strings.HasPrefix(path, "/debug/") ||
		strings.HasPrefix(path, "/healthz")
}

func findDistPath() string {
	if p := os.Getenv("FRONTEND_DIST"); p != "" {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	candidates := []string{"frontend/dist", "../frontend/dist"}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}
	return ""
}

func spaHandler(distPath string, apiMux http.Handler) http.Handler {
	fileServer := http.FileServer(http.Dir(distPath))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isAPIRoute(r.URL.Path) {
			apiMux.ServeHTTP(w, r)
			return
		}
		fPath := filepath.Join(distPath, filepath.Clean("/"+r.URL.Path))
		info, err := os.Stat(fPath)
		if os.IsNotExist(err) || err != nil || info.IsDir() {
			r.URL.Path = "/"
		}
		fileServer.ServeHTTP(w, r)
	})
}
