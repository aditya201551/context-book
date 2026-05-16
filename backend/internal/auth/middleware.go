package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/contextbook/config"
	"github.com/contextbook/internal/db"
)

// hashToken computes SHA256 hash of token (same logic as in db package)
func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

type contextKey string

const UserIDKey contextKey = "user_id"

func isMCPSSEEndpoint(path string) bool {
	return path == "/mcp" || path == "/mcp/" || strings.HasPrefix(path, "/mcp/")
}

func sendSSEAuthError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(status)
	fmt.Fprintf(w, "event: error\ndata: %s\n\n", message)
}

// Middleware validates OAuth 2.0 Bearer tokens and handles PRM discovery
func Middleware(database *db.DB, cfg *config.Config, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		scheme := "http"
		if r.Header.Get("X-Forwarded-Proto") == "https" || r.TLS != nil {
			scheme = "https"
		}

		authServerURL := cfg.PublicURL                                              // The API Server where authorization happens (8080)
		prmURL := scheme + "://" + r.Host + "/.well-known/oauth-protected-resource" // The Resource Server (this server, e.g. 8081)
		wwwAuthHeader := `Bearer realm="ContextBook", authorization_uri="` + authServerURL + `/authorize", resource_metadata="` + prmURL + `"`

		// Add CORS headers for web-based MCP connectors (like Claude Web)
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		// The client must be able to read WWW-Authenticate to discover the OAuth endpoints
		w.Header().Set("Access-Control-Expose-Headers", "WWW-Authenticate")

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			w.Header().Set("WWW-Authenticate", wwwAuthHeader)
			if isMCPSSEEndpoint(r.URL.Path) {
				sendSSEAuthError(w, http.StatusUnauthorized, "Unauthorized: Missing Authorization header")
				return
			}
			http.Error(w, "Unauthorized: Missing Authorization header", http.StatusUnauthorized)
			return
		}

		token := ExtractBearer(authHeader)
		if token == "" {
			w.Header().Set("WWW-Authenticate", wwwAuthHeader+`, error="invalid_request"`)
			if isMCPSSEEndpoint(r.URL.Path) {
				sendSSEAuthError(w, http.StatusUnauthorized, "Unauthorized: Invalid Authorization header format")
				return
			}
			http.Error(w, "Unauthorized: Invalid Authorization header format", http.StatusUnauthorized)
			return
		}

		userID, err := database.ValidateTokenAndGetUser(r.Context(), token)
		if err != nil {
			slog.Warn("token validation failed", "error", err)
			w.Header().Set("WWW-Authenticate", wwwAuthHeader+`, error="invalid_token"`)
			if isMCPSSEEndpoint(r.URL.Path) {
				sendSSEAuthError(w, http.StatusUnauthorized, "Unauthorized: Invalid or expired token")
				return
			}
			http.Error(w, "Unauthorized: Invalid or expired token", http.StatusUnauthorized)
			return
		}

		// Update last_used_at asynchronously (don't block the request)
		go func(tokenStr string) {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := database.UpdateTokenLastUsed(ctx, hashToken(tokenStr)); err != nil {
				slog.Debug("Failed to update token last_used_at", "error", err)
			}
		}(token)

		// Inject user_id into request context
		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func CheckAuth(ctx context.Context) (string, bool) {
	val, ok := ctx.Value(UserIDKey).(string)
	if !ok || val == "" {
		return "", false
	}
	return val, true
}

func ExtractBearer(authHeader string) string {
	if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
		return authHeader[7:]
	}
	return ""
}
