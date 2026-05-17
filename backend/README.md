# ContextBook — Backend

The backend is two Go binaries sharing a PostgreSQL database:

| Binary | Port | Purpose |
|--------|------|---------|
| `cmd/api` | `:8080` | REST API, OAuth 2.0, session management, SPA hosting |
| `cmd/mcp` | `:8081` | MCP tool server for AI agents, Bearer token auth |

## Quick Start

```bash
# 1. Set up PostgreSQL with pgvector + pg_trgm
createdb contextbook_db
psql -d contextbook_db -c "CREATE EXTENSION vector; CREATE EXTENSION pg_trgm;"

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, API_KEY_SALT, VOYAGE_API_KEY

# 3. Run both servers
go run ./cmd/api/main.go    # API + dashboard
go run ./cmd/mcp/main.go    # MCP tools
```

Migrations run automatically on API server startup.

## Configuration

All config is via environment variables (loaded from `.env` with `godotenv`).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `API_KEY_SALT` | **Yes** | — | HMAC secret for session cookies |
| `VOYAGE_API_KEY` | **Yes** | — | Voyage AI API key |
| `PORT` | No | `8080` | API server port |
| `MCP_PORT` | No | `8081` | MCP server port |
| `ENV` | No | `development` | Runtime environment |
| `PUBLIC_URL` | No | `http://localhost:8080` | Advertised OAuth resource URL |
| `FRONTEND_URL` | No | `http://localhost:5173` | CORS origin + OAuth redirect target |
| `COOKIE_DOMAIN` | No | — | Session cookie domain (production) |
| `VOYAGE_MODEL` | No | `voyage-4` | Embedding model name |
| `VOYAGE_DIMENSION` | No | `1024` | Embedding vector dimension |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | No | — | |
| `GITHUB_CLIENT_ID` | No | — | GitHub OAuth credentials |
| `GITHUB_CLIENT_SECRET` | No | — | |

> Changing `VOYAGE_MODEL` requires a model that outputs exactly `VOYAGE_DIMENSION` dimensions. Switching to a different dimension requires a database migration.

## REST API (`:8080`)

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/auth/google` | Public | Initiate Google SSO |
| `GET` | `/auth/google/callback` | Public | Google OAuth callback |
| `GET` | `/auth/github` | Public | Initiate GitHub SSO |
| `GET` | `/auth/github/callback` | Public | GitHub OAuth callback |
| `POST` | `/api/auth/logout` | Session | Clear session cookie |
| `GET` | `/api/me` | Session | Current user profile |
| `PATCH` | `/api/me` | Session | Update display name |

### Books & Pages

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/books` | List books (paginated, sortable) |
| `POST` | `/api/books` | Create a new book |
| `GET` | `/api/books/{id}` | Get book with all pages |
| `PUT` | `/api/books/{id}` | Update book metadata |
| `DELETE` | `/api/books/{id}` | Delete a book |
| `POST` | `/api/books/{id}/pages` | Insert a new page |
| `PUT` | `/api/books/{id}/pages/{index}` | Update page content |
| `DELETE` | `/api/books/{id}/pages/{index}` | Delete a page |

### Search

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/search` | Semantic search (query → embedding → cosine similarity) |
| `GET` | `/api/search/suggest` | Trigram text search suggestions |
| `GET` | `/api/books/{id}/related` | Semantically related books |

### Clusters

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/clusters` | List user tag clusters |
| `POST` | `/api/clusters` | Create a cluster |
| `PUT` | `/api/clusters/{id}` | Update a cluster |
| `DELETE` | `/api/clusters/{id}` | Delete a cluster |

### OAuth 2.0 / MCP Client Management

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/register` | Dynamic Client Registration (RFC 7591) |
| `GET` | `/authorize` | OAuth authorize screen |
| `POST` | `/token` | Exchange auth code for tokens (PKCE) |
| `POST` | `/token/refresh` | Rotate refresh token |
| `POST` | `/revoke` | Token self-revocation (RFC 7009) |
| `GET` | `/.well-known/oauth-authorization-server` | RFC 8414 metadata |
| `GET` | `/.well-known/oauth-protected-resource` | RFC 9728 metadata |
| `GET` | `/api/oauth/authorize-info` | Consent screen data |
| `POST` | `/api/oauth/authorize-approve` | Approve OAuth request |
| `POST` | `/api/oauth/authorize-deny` | Deny OAuth request |
| `GET` | `/api/clients` | List connected MCP clients |
| `DELETE` | `/api/clients/{id}` | Disconnect a client |
| `GET` | `/api/tokens` | List active tokens |
| `POST` | `/api/tokens/revoke` | Revoke a specific token |

## MCP Server (`:8081`)

Exposes 8 MCP tools via the StreamableHTTP protocol. All requests require a valid Bearer token.

| Tool | Annotations | Description |
|------|------------|-------------|
| `book_create_or_update` | `idempotent`, `!destructive` | Create or update a Book |
| `book_list` | `readOnly`, `idempotent` | Paginated book metadata |
| `book_get` | `readOnly`, `idempotent` | Retrieve all pages of a Book |
| `page_insert` | `!idempotent`, `!destructive` | Insert a page (≤1000 words), embed immediately |
| `page_update` | `idempotent`, `!destructive` | Replace page content, re-embed |
| `page_delete` | `idempotent`, **destructive** | Remove a page permanently |
| `page_search` | `readOnly`, `idempotent` | Semantic search across all Books |
| `readme` | `readOnly`, `idempotent` | Usage guide (call once per session) |

All tools declare typed `inputSchema` and `outputSchema` via the MCP Go SDK. Tool names follow `entity_operation` dot-notation grouping (`book_*`, `page_*`).

## Auth Flows

### Browser Session (Dashboard)

1. Click "Continue with Google/GitHub" → OAuth callback → HMAC-SHA256 signed session cookie (7-day expiry)
2. Dashboard uses session cookie for all `/api/*` requests

### Bearer Token (MCP)

1. AI client calls `POST /register` → gets `client_id` (RFC 7591)
2. Client initiates OAuth 2.0 PKCE → user approves on `/authorize`
3. Auth code exchanged at `POST /token` → Bearer token (`cb_tok_` prefix, SHA-256 hashed in DB)
4. MCP server validates on each tool call, injects `userID` into context
5. Tokens expire in 30 days; refresh tokens (`cb_refresh_` prefix) rotate on use

## Database Schema

Migrations run on startup (files in `internal/db/migrations/`).

| Table | Purpose |
|-------|---------|
| `users` | SSO-linked accounts (Google/GitHub) |
| `context_books` | Book metadata — title, source, tags[] |
| `context_book_pages` | Page content + `vector(1024)` embedding + HNSW index + `token_count` |
| `user_clusters` | User-defined tag groups |
| `oauth_clients` | Registered MCP clients (RFC 7591) |
| `oauth_codes` | Short-lived PKCE authorization codes |
| `oauth_tokens` | SHA-256 hashed Bearer tokens |
| `oauth_refresh_tokens` | Rotating refresh tokens |
| `oauth_auth_requests` | OAuth authorize request state |

## Architecture

```
internal/
  api/          REST handlers + route registration
  auth/         OAuth 2.0 PKCE, SSO, session cookies, Bearer middleware
  context/      Book/Page business logic + embedding orchestration
  db/           pgx/v5 queries, migrations, connection pool
  embedding/    Voyage AI embedding client (single + batch)
  logger/       slog setup + HTTP access logging
  mcp/          MCP tool handlers + server registration
  config/       Environment variable loading
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `pgx/v5` | PostgreSQL driver (pgxpool) |
| `pgvector-go` | pgvector Go binding for vector similarity |
| `golang-migrate` | Database schema migrations |
| `go-sdk/mcp` | Official MCP Go SDK (StreamableHTTP) |
| `voyageai` | Voyage AI embedding API client |
| `golang.org/x/oauth2` | Google/GitHub OAuth2 |
