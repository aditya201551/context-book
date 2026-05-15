package auth

import (
	"context"

	"github.com/contextbook/internal/db"
)

// Storage is the subset of db.DB used by the HTTP/UI handlers.
// Defining it as an interface lets tests supply a fake without a real database.
type Storage interface {
	UpsertUserByProvider(ctx context.Context, provider, providerID, email, displayName string) (*db.User, error)
	GetUserByID(ctx context.Context, id string) (*db.User, error)
	CountContexts(ctx context.Context, userID string) (int, error)
	ListTokens(ctx context.Context, userID string) ([]db.OAuthToken, error)
	ListTokensWithMask(ctx context.Context, userID string) ([]db.TokenInfo, error)
	ValidateTokenAndGetUser(ctx context.Context, token string) (string, error)
	GetAllValidTokens(ctx context.Context) ([]db.OAuthToken, error)
	UpdateTokenLastUsed(ctx context.Context, tokenHash string) error
	CountTokensForClient(ctx context.Context, clientID, userID string) (int, error)
	GetOldestTokenForClient(ctx context.Context, clientID, userID string) (string, error)

	CreateOAuthClient(ctx context.Context, clientID, name string, redirectURIs []string) error
	GetOAuthClient(ctx context.Context, clientID string) (*db.OAuthClient, error)
	CreateOAuthCode(ctx context.Context, code db.OAuthCode) error
	GetOAuthCode(ctx context.Context, code string) (*db.OAuthCode, error)
	DeleteOAuthCode(ctx context.Context, code string) error
	CreateOAuthToken(ctx context.Context, token db.OAuthToken) error
	CreateOAuthTokenWithRefresh(ctx context.Context, accessToken, refreshToken db.OAuthToken, refresh db.OAuthRefreshToken) error
	GetRefreshToken(ctx context.Context, token string) (*db.OAuthRefreshToken, error)
	DeleteRefreshToken(ctx context.Context, token string) error
	RotateRefreshToken(ctx context.Context, oldRefreshToken string, newRefresh db.OAuthRefreshToken) error
	RevokeToken(ctx context.Context, storedToken, userID string) error
	RevokeOAuthToken(ctx context.Context, token string) error

	CreateAuthRequest(ctx context.Context, req db.OAuthAuthRequest) error
	GetAuthRequest(ctx context.Context, key string) (*db.OAuthAuthRequest, error)
	DeleteAuthRequest(ctx context.Context, key string) error
}
