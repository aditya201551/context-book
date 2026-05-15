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
	"github.com/contextbook/internal/auth"
	ctxbridge "github.com/contextbook/internal/context"
	"github.com/contextbook/internal/db"
	"github.com/contextbook/internal/embedding"
	"github.com/contextbook/internal/logger"
	mcpServer "github.com/contextbook/internal/mcp"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		slog.Info("Shutting down MCP server...")
		cancel()
	}()

	cfg, err := config.Load()
	if err != nil {
		slog.Error("Failed to load config", "error", err)
		os.Exit(1)
	}

	logger.Setup(cfg.Env)

	database, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("Cannot connect to postgres", "error", err)
		os.Exit(1)
	}
	defer database.Close()

	embedClient := embedding.NewVoyageClient(cfg.VoyageAPIKey, cfg.VoyageModel)
	ctxSvc := ctxbridge.NewService(database, embedClient)
	srv := mcpServer.NewServer(ctxSvc)
	h := auth.NewHandlers(database, cfg)

	handler := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server { return srv.MCPServer }, &mcp.StreamableHTTPOptions{
		Stateless:                  true,
		DisableLocalhostProtection: true,
	})

	mux := http.NewServeMux()

	// 1. PUBLIC ROUTES (No Auth Required)
	mux.HandleFunc("/.well-known/oauth-protected-resource", h.HandleProtectedResource)
	mux.HandleFunc("/.well-known/oauth-authorization-server", h.HandleWellKnown)

	// 2. PROTECTED ROUTES (Requires Bearer Token)
	mcpMux := http.NewServeMux()
	mcpMux.Handle("/mcp", handler)
	mcpMux.Handle("/", handler)

	// Apply auth middleware only to the MCP tool routes
	protectedMcpMux := auth.Middleware(database, cfg, mcpMux)

	// Mount protected routes to the main mux
	mux.Handle("/mcp", protectedMcpMux)
	mux.Handle("/", protectedMcpMux)

	httpSrv := &http.Server{
		Addr:    ":" + cfg.MCPPort,
		Handler: logger.HttpMiddleware(mux),
	}

	go func() {
		slog.Info("MCP Server listening", "port", cfg.MCPPort)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("listen error", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("Shutting down MCP HTTP server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()

	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		slog.Error("Server forced to shutdown", "error", err)
		os.Exit(1)
	}

	slog.Info("MCP Server disconnected.")
}
