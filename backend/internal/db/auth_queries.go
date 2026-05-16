package db

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

type User struct {
	ID          string
	Email       string
	DisplayName string
	Provider    string
	ProviderID  string
}

type OAuthClient struct {
	ClientID     string
	Name         string
	RedirectURIs []string
}

type OAuthCode struct {
	Code                string
	ClientID            string
	UserID              string
	RedirectURI         string
	CodeChallenge       string
	CodeChallengeMethod string
	ExpiresAt           time.Time
}

type OAuthToken struct {
	Token      string
	ClientID   string
	UserID     string
	ExpiresAt  time.Time
	LastUsedAt time.Time
	CreatedAt  time.Time
}

type OAuthRefreshToken struct {
	Token           string
	AccessTokenHash string
	ClientID        string
	UserID          string
	ExpiresAt       time.Time
	CreatedAt       time.Time
}

// TokenInfo is used for listing tokens in the UI (masked)
type TokenInfo struct {
	TokenHash  string    `json:"token_hash"`
	ClientID   string    `json:"client_id"`
	CreatedAt  time.Time `json:"created_at"`
	LastUsedAt time.Time `json:"last_used_at"`
	ExpiresAt  time.Time `json:"expires_at"`
}

// UpsertUserByProvider creates a user if they don't exist, or returns the existing one.
func (db *DB) UpsertUserByProvider(ctx context.Context, provider, providerID, email, displayName string) (*User, error) {
	query := `
		INSERT INTO users (provider, provider_id, email, display_name)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (provider, provider_id) DO UPDATE
			SET email = EXCLUDED.email,
			    display_name = EXCLUDED.display_name
		RETURNING id, email, display_name, provider, provider_id
	`
	var u User
	err := db.Pool.QueryRow(ctx, query, provider, providerID, email, displayName).
		Scan(&u.ID, &u.Email, &u.DisplayName, &u.Provider, &u.ProviderID)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (db *DB) GetOAuthClient(ctx context.Context, clientID string) (*OAuthClient, error) {
	query := `SELECT client_id, name, redirect_uris FROM oauth_clients WHERE client_id = $1`
	var c OAuthClient
	err := db.Pool.QueryRow(ctx, query, clientID).Scan(&c.ClientID, &c.Name, &c.RedirectURIs)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (db *DB) CreateOAuthClient(ctx context.Context, clientID, name string, redirectURIs []string) error {
	query := `INSERT INTO oauth_clients (client_id, name, redirect_uris) VALUES ($1, $2, $3)`
	_, err := db.Pool.Exec(ctx, query, clientID, name, redirectURIs)
	return err
}

func (db *DB) GetUserByID(ctx context.Context, id string) (*User, error) {
	query := `SELECT id, email, display_name, provider, provider_id FROM users WHERE id = $1`
	var u User
	err := db.Pool.QueryRow(ctx, query, id).Scan(&u.ID, &u.Email, &u.DisplayName, &u.Provider, &u.ProviderID)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (db *DB) UpdateUserDisplayName(ctx context.Context, id, displayName string) error {
	query := `UPDATE users SET display_name = $1 WHERE id = $2`
	_, err := db.Pool.Exec(ctx, query, displayName, id)
	return err
}

func (db *DB) CountContexts(ctx context.Context, userID string) (int, error) {
	query := `SELECT COUNT(*) FROM context_books WHERE user_id = $1`
	var count int
	err := db.Pool.QueryRow(ctx, query, userID).Scan(&count)
	return count, err
}

func (db *DB) ListTokens(ctx context.Context, userID string) ([]OAuthToken, error) {
	query := `SELECT token, client_id, expires_at, last_used_at, created_at FROM oauth_tokens WHERE user_id = $1 AND expires_at > now()`
	rows, err := db.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []OAuthToken
	for rows.Next() {
		var t OAuthToken
		if err := rows.Scan(&t.Token, &t.ClientID, &t.ExpiresAt, &t.LastUsedAt, &t.CreatedAt); err != nil {
			return nil, err
		}
		tokens = append(tokens, t)
	}
	return tokens, nil
}

// ListTokensWithMask returns token info for UI display with masked tokens
func (db *DB) ListTokensWithMask(ctx context.Context, userID string) ([]TokenInfo, error) {
	query := `
		SELECT token, client_id, created_at, last_used_at, expires_at 
		FROM oauth_tokens 
		WHERE user_id = $1 AND expires_at > now()
		ORDER BY created_at DESC
	`
	rows, err := db.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []TokenInfo
	for rows.Next() {
		var t TokenInfo
		if err := rows.Scan(&t.TokenHash, &t.ClientID, &t.CreatedAt, &t.LastUsedAt, &t.ExpiresAt); err != nil {
			return nil, err
		}
		tokens = append(tokens, t)
	}
	return tokens, nil
}

// UpdateTokenLastUsed updates the last_used_at timestamp
func (db *DB) UpdateTokenLastUsed(ctx context.Context, tokenHash string) error {
	query := `UPDATE oauth_tokens SET last_used_at = now() WHERE token = $1`
	_, err := db.Pool.Exec(ctx, query, tokenHash)
	return err
}

// ClientRecord is used for listing OAuth clients for a user.
type ClientRecord struct {
	ClientID   string    `json:"client_id"`
	Name       string    `json:"name"`
	LastUsedAt time.Time `json:"last_used_at"`
	CreatedAt  time.Time `json:"created_at"`
	Active     bool      `json:"active"`
}

// ListClients returns distinct OAuth clients for a user (including those with
// expired tokens). The Active flag is true when at least one token is unexpired.
func (db *DB) ListClients(ctx context.Context, userID string) ([]ClientRecord, error) {
	query := `
		SELECT t.client_id,
		       COALESCE(MAX(c.name), t.client_id) as name,
		       MAX(t.last_used_at) as last_used_at,
		       MIN(t.created_at) as created_at,
		       BOOL_OR(t.expires_at > now()) as active
		FROM oauth_tokens t
		LEFT JOIN oauth_clients c ON c.client_id = t.client_id
		WHERE t.user_id = $1
		GROUP BY t.client_id
		ORDER BY last_used_at DESC NULLS LAST
	`
	rows, err := db.Pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clients []ClientRecord
	for rows.Next() {
		var rec ClientRecord
		if err := rows.Scan(&rec.ClientID, &rec.Name, &rec.LastUsedAt, &rec.CreatedAt, &rec.Active); err != nil {
			return nil, err
		}
		clients = append(clients, rec)
	}
	return clients, nil
}

// CountTokensForClient returns the number of active tokens for a client-user pair
func (db *DB) CountTokensForClient(ctx context.Context, clientID, userID string) (int, error) {
	query := `
		SELECT COUNT(*) FROM oauth_tokens 
		WHERE client_id = $1 AND user_id = $2 AND expires_at > now()
	`
	var count int
	err := db.Pool.QueryRow(ctx, query, clientID, userID).Scan(&count)
	return count, err
}

// GetOldestTokenForClient returns the oldest token for a client-user pair (for sliding window)
func (db *DB) GetOldestTokenForClient(ctx context.Context, clientID, userID string) (string, error) {
	query := `
		SELECT token FROM oauth_tokens 
		WHERE client_id = $1 AND user_id = $2 AND expires_at > now()
		ORDER BY created_at ASC 
		LIMIT 1
	`
	var tokenHash string
	err := db.Pool.QueryRow(ctx, query, clientID, userID).Scan(&tokenHash)
	return tokenHash, err
}

// CreateOAuthTokenWithRefresh creates both access and refresh tokens
func (db *DB) CreateOAuthTokenWithRefresh(ctx context.Context, accessToken, refreshToken OAuthToken, refresh OAuthRefreshToken) error {
	// Start transaction
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Insert access token
	accessHash := hashToken(accessToken.Token)
	_, err = tx.Exec(ctx, `
		INSERT INTO oauth_tokens (token, client_id, user_id, expires_at, last_used_at, created_at)
		VALUES ($1, $2, $3, $4, now(), now())
	`, accessHash, accessToken.ClientID, accessToken.UserID, accessToken.ExpiresAt)
	if err != nil {
		return err
	}

	// Insert refresh token
	refreshHash := hashToken(refreshToken.Token)
	_, err = tx.Exec(ctx, `
		INSERT INTO oauth_refresh_tokens (token, access_token_hash, client_id, user_id, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5, now())
	`, refreshHash, accessHash, refresh.ClientID, refresh.UserID, refresh.ExpiresAt)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// GetRefreshToken validates a refresh token and returns its data
func (db *DB) GetRefreshToken(ctx context.Context, token string) (*OAuthRefreshToken, error) {
	query := `
		SELECT token, access_token_hash, client_id, user_id, expires_at, created_at
		FROM oauth_refresh_tokens
		WHERE token = $1 AND expires_at > now()
	`
	h := hashToken(token)
	var rt OAuthRefreshToken
	err := db.Pool.QueryRow(ctx, query, h).Scan(
		&rt.Token, &rt.AccessTokenHash, &rt.ClientID, &rt.UserID, &rt.ExpiresAt, &rt.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &rt, nil
}

// DeleteRefreshToken removes a refresh token
func (db *DB) DeleteRefreshToken(ctx context.Context, token string) error {
	query := `DELETE FROM oauth_refresh_tokens WHERE token = $1`
	_, err := db.Pool.Exec(ctx, query, hashToken(token))
	return err
}

// RotateRefreshToken atomically deletes old refresh token and creates new one
func (db *DB) RotateRefreshToken(ctx context.Context, oldRefreshToken string, newRefresh OAuthRefreshToken) error {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Delete old refresh token
	_, err = tx.Exec(ctx, `DELETE FROM oauth_refresh_tokens WHERE token = $1`, hashToken(oldRefreshToken))
	if err != nil {
		return err
	}

	// Insert new refresh token
	newHash := hashToken(newRefresh.Token)
	_, err = tx.Exec(ctx, `
		INSERT INTO oauth_refresh_tokens (token, access_token_hash, client_id, user_id, expires_at, created_at)
		VALUES ($1, $2, $3, $4, $5, now())
	`, newHash, newRefresh.AccessTokenHash, newRefresh.ClientID, newRefresh.UserID, newRefresh.ExpiresAt)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (db *DB) CreateOAuthCode(ctx context.Context, code OAuthCode) error {
	query := `
		INSERT INTO oauth_codes (code, client_id, user_id, redirect_uri, code_challenge, code_challenge_method, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := db.Pool.Exec(ctx, query, code.Code, code.ClientID, code.UserID, code.RedirectURI, code.CodeChallenge, code.CodeChallengeMethod, code.ExpiresAt)
	return err
}

func (db *DB) GetOAuthCode(ctx context.Context, code string) (*OAuthCode, error) {
	query := `
		SELECT code, client_id, user_id, redirect_uri, code_challenge, code_challenge_method, expires_at 
		FROM oauth_codes WHERE code = $1
	`
	var c OAuthCode
	err := db.Pool.QueryRow(ctx, query, code).Scan(&c.Code, &c.ClientID, &c.UserID, &c.RedirectURI, &c.CodeChallenge, &c.CodeChallengeMethod, &c.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (db *DB) DeleteOAuthCode(ctx context.Context, code string) error {
	query := `DELETE FROM oauth_codes WHERE code = $1`
	_, err := db.Pool.Exec(ctx, query, code)
	return err
}

func (db *DB) CreateOAuthToken(ctx context.Context, token OAuthToken) error {
	query := `
		INSERT INTO oauth_tokens (token, client_id, user_id, expires_at)
		VALUES ($1, $2, $3, $4)
	`
	_, err := db.Pool.Exec(ctx, query, hashToken(token.Token), token.ClientID, token.UserID, token.ExpiresAt)
	return err
}

func (db *DB) ValidateTokenAndGetUser(ctx context.Context, token string) (string, error) {
	query := `
		SELECT user_id FROM oauth_tokens
		WHERE token = $1 AND expires_at > now()
	`
	var userID string
	err := db.Pool.QueryRow(ctx, query, hashToken(token)).Scan(&userID)
	if err != nil {
		return "", fmt.Errorf("invalid or expired token")
	}
	return userID, nil
}

func (db *DB) ValidateTokenAndGetUserAndClient(ctx context.Context, token string) (userID string, clientName string, err error) {
	query := `
		SELECT t.user_id, COALESCE(c.name, t.client_id)
		FROM oauth_tokens t
		LEFT JOIN oauth_clients c ON c.client_id = t.client_id
		WHERE t.token = $1 AND t.expires_at > now()
	`
	err = db.Pool.QueryRow(ctx, query, hashToken(token)).Scan(&userID, &clientName)
	if err != nil {
		return "", "", fmt.Errorf("invalid or expired token")
	}
	return userID, clientName, nil
}

// RevokeToken removes a token by its stored hash value and owner — used by the web UI
// dashboard where ListTokens already returned the hash.
func (db *DB) RevokeToken(ctx context.Context, storedToken, userID string) error {
	_, err := db.Pool.Exec(ctx,
		`DELETE FROM oauth_tokens WHERE token = $1 AND user_id = $2`,
		storedToken, userID)
	return err
}

// RevokeOAuthToken removes a token by its plain (unhashed) value — used by RFC 7009
// self-revocation where the API client presents the raw bearer token it was issued.
func (db *DB) RevokeOAuthToken(ctx context.Context, token string) error {
	_, err := db.Pool.Exec(ctx,
		`DELETE FROM oauth_tokens WHERE token = $1`,
		hashToken(token))
	return err
}

type OAuthAuthRequest struct {
	Key                 string
	ClientID            string
	RedirectURI         string
	CodeChallenge       string
	CodeChallengeMethod string
	State               string
	ExpiresAt           time.Time
	CreatedAt           time.Time
}

func (db *DB) CreateAuthRequest(ctx context.Context, req OAuthAuthRequest) error {
	query := `
		INSERT INTO oauth_auth_requests (key, client_id, redirect_uri, code_challenge, code_challenge_method, state, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := db.Pool.Exec(ctx, query, req.Key, req.ClientID, req.RedirectURI, req.CodeChallenge, req.CodeChallengeMethod, req.State, req.ExpiresAt)
	return err
}

func (db *DB) GetAuthRequest(ctx context.Context, key string) (*OAuthAuthRequest, error) {
	query := `
		SELECT key, client_id, redirect_uri, code_challenge, code_challenge_method, state, expires_at, created_at
		FROM oauth_auth_requests WHERE key = $1 AND expires_at > now()
	`
	var req OAuthAuthRequest
	err := db.Pool.QueryRow(ctx, query, key).Scan(&req.Key, &req.ClientID, &req.RedirectURI, &req.CodeChallenge, &req.CodeChallengeMethod, &req.State, &req.ExpiresAt, &req.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &req, nil
}

func (db *DB) DeleteAuthRequest(ctx context.Context, key string) error {
	_, err := db.Pool.Exec(ctx, `DELETE FROM oauth_auth_requests WHERE key = $1`, key)
	return err
}

// RevokeAllTokensForClient deletes all tokens for a client-user pair,
// forcing the client to re-authorize.
func (db *DB) RevokeAllTokensForClient(ctx context.Context, clientID, userID string) error {
	_, err := db.Pool.Exec(ctx,
		`DELETE FROM oauth_tokens WHERE client_id = $1 AND user_id = $2`,
		clientID, userID)
	return err
}

// DEBUG: GetAllValidTokens returns all non-expired tokens for debugging
func (db *DB) GetAllValidTokens(ctx context.Context) ([]OAuthToken, error) {
	query := `SELECT token, client_id, user_id, expires_at FROM oauth_tokens WHERE expires_at > now()`
	rows, err := db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []OAuthToken
	for rows.Next() {
		var t OAuthToken
		if err := rows.Scan(&t.Token, &t.ClientID, &t.UserID, &t.ExpiresAt); err != nil {
			return nil, err
		}
		tokens = append(tokens, t)
	}
	return tokens, nil
}
