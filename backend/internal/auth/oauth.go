package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/contextbook/internal/db"
)

// dcrWindow tracks registration attempts per IP for rate limiting.
type dcrWindow struct {
	mu          sync.Mutex
	count       int
	windowStart time.Time
}

var dcrLimiter sync.Map // key: IP string → *dcrWindow

const MaxTokensPerClient = 10 // Maximum tokens per client-user pair (sliding window)

func dcrAllowed(ip string) bool {
	const maxPerHour = 1000
	// exempt localhost since all MCP clients connect from the same machine during dev
	if ip == "127.0.0.1" || ip == "::1" || ip == "localhost" {
		return true
	}
	now := time.Now()
	val, _ := dcrLimiter.LoadOrStore(ip, &dcrWindow{windowStart: now})
	w := val.(*dcrWindow)
	w.mu.Lock()
	defer w.mu.Unlock()
	if now.Sub(w.windowStart) > time.Hour {
		w.count = 0
		w.windowStart = now
	}
	if w.count >= maxPerHour {
		return false
	}
	w.count++
	return true
}

func (h *Handlers) setCORSHeaders(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", h.Cfg.FrontendURL)
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Vary", "Origin")
}

// RFC 8414 Authorization Server Metadata
func (h *Handlers) HandleWellKnown(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	metadata := map[string]interface{}{
		"issuer":                           h.Cfg.PublicURL,
		"authorization_endpoint":           h.Cfg.PublicURL + "/authorize",
		"token_endpoint":                   h.Cfg.PublicURL + "/token",
		"registration_endpoint":            h.Cfg.PublicURL + "/register",
		"response_types_supported":         []string{"code"},
		"grant_types_supported":            []string{"authorization_code", "refresh_token"},
		"code_challenge_methods_supported": []string{"S256"},
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metadata)
}

// RFC 9728 Protected Resource Metadata
func (h *Handlers) HandleProtectedResource(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	scheme := "http"
	if r.Header.Get("X-Forwarded-Proto") == "https" || r.TLS != nil {
		scheme = "https"
	}
	resourceURL := scheme + "://" + r.Host

	metadata := map[string]interface{}{
		"resource":              resourceURL,               // This identifies the resource server dynamically (e.g., localhost:8081 for MCP)
		"authorization_servers": []string{h.Cfg.PublicURL}, // The auth server is still the API server
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metadata)
}

// Dynamic Client Registration (DCR)
type RegisterRequest struct {
	ClientName   string   `json:"client_name"`
	RedirectURIs []string `json:"redirect_uris"`
}

type RegisterResponse struct {
	ClientID     string   `json:"client_id"`
	ClientName   string   `json:"client_name"`
	RedirectURIs []string `json:"redirect_uris"`
}

func (h *Handlers) HandleRegister(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method_not_allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		ip = r.RemoteAddr
	}
	if !dcrAllowed(ip) {
		w.Header().Set("Retry-After", "3600")
		http.Error(w, `{"error":"rate_limited"}`, http.StatusTooManyRequests)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid_request"}`, http.StatusBadRequest)
		return
	}

	if len(req.RedirectURIs) == 0 {
		http.Error(w, `{"error":"invalid_redirect_uri","error_description":"Missing redirect_uris"}`, http.StatusBadRequest)
		return
	}

	randPart, err := generateRandomString(12)
	if err != nil {
		http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
		return
	}
	clientID := "cb_client_" + randPart
	name := req.ClientName
	if name == "" {
		name = "Dynamic Client"
	}

	err = h.DB.CreateOAuthClient(r.Context(), clientID, name, req.RedirectURIs)
	if err != nil {
		http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
		return
	}

	resp := RegisterResponse{
		ClientID:     clientID,
		ClientName:   name,
		RedirectURIs: req.RedirectURIs,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

// HandleAuthorize is the main entry point from the MCP client.
// It stores OAuth params server-side and redirects to the React UI with a short-lived key.
func (h *Handlers) HandleAuthorize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method_not_allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// If a key or error param is present, this is already a frontend URL that
	// somehow reached the API server. Redirect to the frontend directly.
	key := r.URL.Query().Get("key")
	errorParam := r.URL.Query().Get("error")
	if key != "" || errorParam != "" {
		slog.Info("Authorize request with key/error param, redirecting to frontend", "key", key, "error", errorParam)
		http.Redirect(w, r, h.Cfg.FrontendURL+r.URL.Path+"?"+r.URL.RawQuery, http.StatusSeeOther)
		return
	}

	clientID := r.URL.Query().Get("client_id")
	redirectURI := r.URL.Query().Get("redirect_uri")
	codeChallenge := r.URL.Query().Get("code_challenge")
	codeChallengeMethod := r.URL.Query().Get("code_challenge_method")
	state := r.URL.Query().Get("state")

	slog.Info("Authorize request", "client_id", clientID, "redirect_uri", redirectURI, "has_code_challenge", codeChallenge != "", "state_len", len(state))

	if clientID == "" {
		slog.Warn("Authorize request missing client_id", "path", r.URL.String(), "query", r.URL.RawQuery)
		http.Redirect(w, r, h.Cfg.FrontendURL+"/authorize?error=missing_client_id", http.StatusSeeOther)
		return
	}

	authKey, err := generateRandomString(16)
	if err != nil {
		http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
		return
	}

	authReq := db.OAuthAuthRequest{
		Key:                 authKey,
		ClientID:            clientID,
		RedirectURI:         redirectURI,
		CodeChallenge:       codeChallenge,
		CodeChallengeMethod: codeChallengeMethod,
		State:               state,
		ExpiresAt:           time.Now().Add(10 * time.Minute),
	}
	if err := h.DB.CreateAuthRequest(r.Context(), authReq); err != nil {
		slog.Error("Failed to create auth request", "error", err)
		http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
		return
	}

	redirectURL := h.Cfg.FrontendURL + "/authorize?key=" + authKey
	slog.Info("Authorize redirect", "key", authKey, "redirect_url", redirectURL)
	http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

// HandleAuthorizeInfo returns client metadata for the React Authorize page.
// It reads OAuth params from the stored auth request using the key.
func (h *Handlers) HandleAuthorizeInfo(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	key := r.URL.Query().Get("key")

	userID := h.userFromSession(r)
	if userID == "" {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	if key == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid_request", "error_description": "key is required"})
		return
	}

	authReq, err := h.DB.GetAuthRequest(r.Context(), key)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid_request", "error_description": "authorization request not found or expired"})
		return
	}

	client, err := h.DB.GetOAuthClient(r.Context(), authReq.ClientID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid_client", "error_description": "client not registered on this server"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"key":                   key,
		"client_id":             authReq.ClientID,
		"client_name":           client.Name,
		"redirect_uri":          authReq.RedirectURI,
		"code_challenge":        authReq.CodeChallenge,
		"code_challenge_method": authReq.CodeChallengeMethod,
		"state":                 authReq.State,
	})
}

// HandleAuthorizeApprove handles the consent submission.
// It reads OAuth params from the stored auth request using the key.
func (h *Handlers) HandleAuthorizeApprove(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method_not_allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := h.userFromSession(r)
	if userID == "" {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, `{"error":"invalid_request"}`, http.StatusBadRequest)
		return
	}

	key := r.FormValue("key")
	if key == "" {
		http.Error(w, `{"error":"invalid_request","error_description":"key is required"}`, http.StatusBadRequest)
		return
	}

	authReq, err := h.DB.GetAuthRequest(r.Context(), key)
	if err != nil {
		http.Error(w, `{"error":"invalid_request","error_description":"authorization request not found or expired"}`, http.StatusBadRequest)
		return
	}

	_ = h.DB.DeleteAuthRequest(r.Context(), key)

	clientID := authReq.ClientID
	redirectURI := authReq.RedirectURI
	codeChallenge := authReq.CodeChallenge
	codeChallengeMethod := authReq.CodeChallengeMethod
	state := authReq.State

	client, err := h.DB.GetOAuthClient(r.Context(), clientID)
	if err != nil {
		http.Error(w, `{"error":"invalid_client"}`, http.StatusBadRequest)
		return
	}

	code, err := generateRandomString(16)
	if err != nil {
		http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
		return
	}

	oauthCode := db.OAuthCode{
		Code:                code,
		ClientID:            client.ClientID,
		UserID:              userID,
		RedirectURI:         redirectURI,
		CodeChallenge:       codeChallenge,
		CodeChallengeMethod: codeChallengeMethod,
		ExpiresAt:           time.Now().Add(5 * time.Minute),
	}

	if err = h.DB.CreateOAuthCode(r.Context(), oauthCode); err != nil {
		http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
		return
	}

	if redirectURI == "" {
		w.Write([]byte(fmt.Sprintf("Authorization successful. Code: %s", code)))
		return
	}

	u, err := url.Parse(redirectURI)
	if err != nil {
		http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
		return
	}
	q := u.Query()
	q.Set("code", code)
	if state != "" {
		q.Set("state", state)
	}
	u.RawQuery = q.Encode()

	http.Redirect(w, r, u.String(), http.StatusSeeOther)
}

// HandleAuthorizeDeny handles the user denying authorization.
// It deletes the stored auth request and returns the redirect URL
// so the frontend can notify the client (via custom protocol or web redirect)
// and then navigate the user to the dashboard.
func (h *Handlers) HandleAuthorizeDeny(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method_not_allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	userID := h.userFromSession(r)
	if userID == "" {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, `{"error":"invalid_request"}`, http.StatusBadRequest)
		return
	}

	key := r.FormValue("key")
	if key == "" {
		http.Error(w, `{"error":"invalid_request","error_description":"key is required"}`, http.StatusBadRequest)
		return
	}

	authReq, err := h.DB.GetAuthRequest(r.Context(), key)
	if err != nil {
		http.Error(w, `{"error":"invalid_request","error_description":"authorization request not found or expired"}`, http.StatusBadRequest)
		return
	}

	_ = h.DB.DeleteAuthRequest(r.Context(), key)

	redirectURI := authReq.RedirectURI
	state := authReq.State

	w.Header().Set("Content-Type", "application/json")

	if redirectURI == "" {
		json.NewEncoder(w).Encode(map[string]string{"redirect": "/dashboard"})
		return
	}

	u, err := url.Parse(redirectURI)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]string{"redirect": "/dashboard"})
		return
	}

	q := u.Query()
	q.Set("error", "access_denied")
	q.Set("error_description", "The user denied the authorization request")
	if state != "" {
		q.Set("state", state)
	}
	u.RawQuery = q.Encode()

	json.NewEncoder(w).Encode(map[string]string{"redirect": u.String()})
}

func (h *Handlers) HandleToken(w http.ResponseWriter, r *http.Request) {
	h.setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := r.ParseForm()
	if err != nil {
		http.Error(w, `{"error":"invalid_request"}`, http.StatusBadRequest)
		return
	}

	grantType := r.FormValue("grant_type")
	code := r.FormValue("code")
	codeVerifier := r.FormValue("code_verifier")

	// Extract client_id from Basic Auth (RFC 6749 §2.3.1) or form body
	clientID, _, _ := r.BasicAuth()
	if clientID == "" {
		clientID = r.FormValue("client_id")
	}

	if grantType == "refresh_token" {
		h.HandleTokenRefresh(w, r)
		return
	}

	if grantType != "authorization_code" {
		http.Error(w, `{"error":"unsupported_grant_type"}`, http.StatusBadRequest)
		return
	}

	authCode, err := h.DB.GetOAuthCode(r.Context(), code)
	if err != nil || authCode.ExpiresAt.Before(time.Now()) {
		http.Error(w, `{"error":"invalid_grant"}`, http.StatusBadRequest)
		return
	}

	// PKCE
	h_pkce := sha256.New()
	h_pkce.Write([]byte(codeVerifier))
	hashed := base64.RawURLEncoding.EncodeToString(h_pkce.Sum(nil))
	if hashed != authCode.CodeChallenge {
		http.Error(w, `{"error":"invalid_grant","error_description":"PKCE mismatch"}`, http.StatusBadRequest)
		return
	}

	_ = h.DB.DeleteOAuthCode(r.Context(), code)

	// Sliding window: check token count for this client-user pair
	tokenCount, err := h.DB.CountTokensForClient(r.Context(), clientID, authCode.UserID)
	if err != nil {
		slog.Error("Failed to count tokens", "error", err)
		http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
		return
	}

	// If at limit, revoke the oldest token (sliding window)
	if tokenCount >= MaxTokensPerClient {
		oldestToken, err := h.DB.GetOldestTokenForClient(r.Context(), clientID, authCode.UserID)
		if err == nil && oldestToken != "" {
			if revokeErr := h.DB.RevokeToken(r.Context(), oldestToken, authCode.UserID); revokeErr != nil {
				slog.Warn("Failed to revoke oldest token", "error", revokeErr)
			}
			slog.Info("Sliding window: revoked oldest token", "client_id", clientID, "user_id", authCode.UserID)
		}
	}

	// Generate new access token
	randTok, _ := generateRandomString(24)
	accessToken := "cb_tok_" + randTok

	// Generate refresh token
	randRefresh, _ := generateRandomString(32)
	refreshToken := "cb_refresh_" + randRefresh

	accessTokenRecord := db.OAuthToken{
		Token:     accessToken,
		ClientID:  clientID,
		UserID:    authCode.UserID,
		ExpiresAt: time.Now().Add(30 * 24 * time.Hour),
	}

	refreshTokenRecord := db.OAuthToken{
		Token:     refreshToken,
		ClientID:  clientID,
		UserID:    authCode.UserID,
		ExpiresAt: time.Now().Add(90 * 24 * time.Hour), // Refresh tokens last longer
	}

	refreshRecord := db.OAuthRefreshToken{
		Token:           refreshToken,
		AccessTokenHash: "", // Will be set during creation
		ClientID:        clientID,
		UserID:          authCode.UserID,
		ExpiresAt:       time.Now().Add(90 * 24 * time.Hour),
	}

	// Store both tokens atomically
	if err := h.DB.CreateOAuthTokenWithRefresh(r.Context(), accessTokenRecord, refreshTokenRecord, refreshRecord); err != nil {
		slog.Error("Failed to create tokens", "error", err)
		http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token":  accessToken,
		"token_type":    "Bearer",
		"expires_in":    30 * 24 * 3600,
		"refresh_token": refreshToken,
	})
}

func generateRandomString(n int) (string, error) {
	bytes := make([]byte, n)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
