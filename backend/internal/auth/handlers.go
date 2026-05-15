package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/contextbook/config"
	"github.com/contextbook/internal/db"
)

// DebugTokenRequest for the debug verification endpoint
type DebugTokenRequest struct {
	Token string `json:"token"`
}

// DebugTokenResponse for the debug verification endpoint
type DebugTokenResponse struct {
	Valid         bool     `json:"valid"`
	ReceivedToken string   `json:"received_token"`
	ComputedHash  string   `json:"computed_hash"`
	UserID        string   `json:"user_id,omitempty"`
	Error         string   `json:"error,omitempty"`
	AllTokensInDB []string `json:"all_valid_token_hashes_in_db,omitempty"`
}

type Handlers struct {
	DB  Storage
	Cfg *config.Config
}

func NewHandlers(database Storage, cfg *config.Config) *Handlers {
	return &Handlers{DB: database, Cfg: cfg}
}

// --- Session helpers ---

// computeSessionMAC returns a base64url HMAC-SHA256 of the userID signed with the salt.
// This prevents cookie forgery — tampered userIDs won't match the stored MAC.
func computeSessionMAC(salt, userID string) string {
	mac := hmac.New(sha256.New, []byte(salt))
	mac.Write([]byte(userID))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func (h *Handlers) userFromSession(r *http.Request) string {
	cookie, err := r.Cookie("session_user_id")
	if err != nil {
		slog.Info("No session cookie", "path", r.URL.Path, "host", r.Host)
		return ""
	}
	idx := strings.LastIndex(cookie.Value, ".")
	if idx < 0 {
		slog.Info("Invalid session cookie format", "path", r.URL.Path)
		return ""
	}
	mac, userID := cookie.Value[:idx], cookie.Value[idx+1:]
	if mac == "" || userID == "" {
		slog.Info("Empty mac or userID in session cookie", "path", r.URL.Path)
		return ""
	}
	expected := computeSessionMAC(h.Cfg.APIKeySalt, userID)
	if !hmac.Equal([]byte(mac), []byte(expected)) {
		slog.Info("Session cookie MAC mismatch", "path", r.URL.Path, "userID", userID)
		return ""
	}
	return userID
}

func (h *Handlers) setSession(w http.ResponseWriter, userID string) {
	isProd := h.Cfg.Env != "development"
	cookie := &http.Cookie{
		Name:     "session_user_id",
		Value:    computeSessionMAC(h.Cfg.APIKeySalt, userID) + "." + userID,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   isProd,
		MaxAge:   7 * 24 * 60 * 60,
		Expires:  time.Now().Add(7 * 24 * time.Hour),
	}
	if h.Cfg.CookieDomain != "" {
		cookie.Domain = h.Cfg.CookieDomain
	}
	slog.Info("Setting session cookie", "userID", userID, "domain", cookie.Domain, "secure", cookie.Secure, "sameSite", cookie.SameSite)
	http.SetCookie(w, cookie)
}

func (h *Handlers) clearSession(w http.ResponseWriter) {
	isProd := h.Cfg.Env != "development"
	cookie := &http.Cookie{
		Name:     "session_user_id",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   isProd,
		Expires:  time.Unix(0, 0),
	}
	if h.Cfg.CookieDomain != "" {
		cookie.Domain = h.Cfg.CookieDomain
	}
	http.SetCookie(w, cookie)
}

func (h *Handlers) UserFromSession(r *http.Request) string {
	return h.userFromSession(r)
}

func (h *Handlers) SetCORSHeaders(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w, r)
}

// --- Route Handlers ---

func (h *Handlers) HandleRevoke(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", 405)
		return
	}

	// RFC 7009 path: API clients self-revoke by presenting their Bearer token.
	// Per RFC 7009 §2.2, always return 200 — even for invalid/already-revoked tokens.
	if bearerToken := ExtractBearer(r.Header.Get("Authorization")); bearerToken != "" {
		_ = h.DB.RevokeOAuthToken(r.Context(), bearerToken)
		w.WriteHeader(http.StatusOK)
		return
	}

	// Standard response if no token found in header
	http.Error(w, "missing token", 400)
}

// HandleDebugTokenVerify is a debug endpoint to verify token details without auth middleware
func (h *Handlers) HandleDebugTokenVerify(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "Method not allowed. Use POST with JSON body",
		})
		return
	}

	// Get token from body
	var req struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Also try form data
		if err := r.ParseForm(); err == nil {
			req.Token = r.FormValue("token")
		}
	}

	// Also check Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		req.Token = ExtractBearer(authHeader)
	}

	if req.Token == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": "No token provided. Send in JSON body {\"token\":\"...\"} or Authorization header",
		})
		return
	}

	// Compute hash of provided token
	hashSum := sha256.Sum256([]byte(req.Token))
	computedHash := hex.EncodeToString(hashSum[:])

	slog.Info("[DEBUG-verify] Token verification requested",
		"received_token_full", req.Token,
		"computed_hash", computedHash)

	// Try to validate
	userID, err := h.DB.ValidateTokenAndGetUser(r.Context(), req.Token)

	// Get all tokens from DB for comparison
	allTokens, _ := h.DB.GetAllValidTokens(r.Context())
	var tokenHashes []string
	for _, t := range allTokens {
		tokenHashes = append(tokenHashes, t.Token)
	}

	resp := map[string]interface{}{
		"received_token":               req.Token,
		"received_token_length":        len(req.Token),
		"computed_hash":                computedHash,
		"valid":                        err == nil,
		"user_id":                      userID,
		"all_valid_token_hashes_in_db": tokenHashes,
	}

	if err != nil {
		resp["error"] = err.Error()
	}

	json.NewEncoder(w).Encode(resp)
}

// HandleFormLogout clears the session cookie
func (h *Handlers) HandleFormLogout(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	h.clearSession(w)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"message":  "Logout successful",
		"redirect": "/login",
	})
}

// --- Token Management Endpoints ---

// HandleTokenList returns masked token list for the authenticated user
func (h *Handlers) HandleTokenList(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	userID := h.userFromSession(r)
	if userID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	tokens, err := h.DB.ListTokensWithMask(r.Context(), userID)
	if err != nil {
		slog.Error("Failed to list tokens", "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to list tokens"})
		return
	}

	// Mask the token hashes for UI display
	var maskedTokens []map[string]interface{}
	for _, t := range tokens {
		maskedTokens = append(maskedTokens, map[string]interface{}{
			"token_hash":    t.TokenHash,
			"token_preview": maskTokenHash(t.TokenHash),
			"client_id":     t.ClientID,
			"created_at":    t.CreatedAt,
			"last_used_at":  t.LastUsedAt,
			"expires_at":    t.ExpiresAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"tokens": maskedTokens,
	})
}

// HandleTokenRevoke revokes a specific token by its hash
func (h *Handlers) HandleTokenRevoke(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	userID := h.userFromSession(r)
	if userID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	// Accept both JSON and form-data
	var tokenHash string
	if r.Header.Get("Content-Type") == "application/json" {
		var req struct {
			TokenHash string `json:"token_hash"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid JSON"})
			return
		}
		tokenHash = req.TokenHash
	} else {
		if err := r.ParseForm(); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid form data"})
			return
		}
		tokenHash = r.FormValue("token_hash")
	}

	if tokenHash == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "token_hash is required"})
		return
	}

	if err := h.DB.RevokeToken(r.Context(), tokenHash, userID); err != nil {
		slog.Error("Failed to revoke token", "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to revoke token"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Token revoked successfully",
	})
}

// HandleTokenRefresh exchanges a refresh token for a new access token
func (h *Handlers) HandleTokenRefresh(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	if err := r.ParseForm(); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid form data"})
		return
	}

	refreshToken := r.FormValue("refresh_token")
	if refreshToken == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "refresh_token is required"})
		return
	}

	// Validate the refresh token
	refreshData, err := h.DB.GetRefreshToken(r.Context(), refreshToken)
	if err != nil {
		slog.Warn("Invalid refresh token", "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid or expired refresh token"})
		return
	}

	// Generate new access token
	randTok, _ := generateRandomString(24)
	newAccessToken := "cb_tok_" + randTok
	accessTokenRecord := db.OAuthToken{
		Token:     newAccessToken,
		ClientID:  refreshData.ClientID,
		UserID:    refreshData.UserID,
		ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
	}

	// Generate new refresh token (rotation for security)
	randRefresh, _ := generateRandomString(32)
	newRefreshToken := "cb_refresh_" + randRefresh
	refreshTokenRecord := db.OAuthToken{
		Token:     newRefreshToken,
		ClientID:  refreshData.ClientID,
		UserID:    refreshData.UserID,
		ExpiresAt: time.Now().Add(90 * 24 * time.Hour), // Refresh tokens live longer
	}

	refreshRecord := db.OAuthRefreshToken{
		Token:           newRefreshToken,
		AccessTokenHash: "", // Will be set after access token is created
		ClientID:        refreshData.ClientID,
		UserID:          refreshData.UserID,
		ExpiresAt:       time.Now().Add(90 * 24 * time.Hour),
	}

	// Store both tokens atomically
	if err := h.DB.CreateOAuthTokenWithRefresh(r.Context(), accessTokenRecord, refreshTokenRecord, refreshRecord); err != nil {
		slog.Error("Failed to create new tokens", "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create new tokens"})
		return
	}

	// Delete old refresh token
	_ = h.DB.DeleteRefreshToken(r.Context(), refreshToken)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token":  newAccessToken,
		"token_type":    "Bearer",
		"expires_in":    30 * 24 * 3600,
		"refresh_token": newRefreshToken,
	})
}

// maskTokenHash creates a masked preview of a token hash for UI display
func maskTokenHash(hash string) string {
	if len(hash) < 12 {
		return "****"
	}
	return hash[:8] + "****" + hash[len(hash)-8:]
}
