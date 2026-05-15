CREATE EXTENSION IF NOT EXISTS vector;

-- Users table: SSO-linked accounts via Google/GitHub
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    provider TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_provider_provider_id_key ON users (provider, provider_id);

-- Context Books: metadata-only containers for pages
CREATE TABLE IF NOT EXISTS context_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_context_books_user_id ON context_books(user_id);
CREATE INDEX IF NOT EXISTS idx_context_books_tags ON context_books USING GIN(tags);

-- Context Book Pages: content + 1024-dim embeddings (voyage-4)
CREATE TABLE IF NOT EXISTS context_book_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES context_books(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    page_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1024) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_book_page_index ON context_book_pages (book_id, page_index);
CREATE INDEX IF NOT EXISTS idx_context_book_pages_book_id ON context_book_pages(book_id);
CREATE INDEX IF NOT EXISTS idx_context_book_pages_user_id ON context_book_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_context_book_pages_embedding ON context_book_pages
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- OAuth Clients: registered MCP clients (Dynamic Client Registration, RFC 7591)
CREATE TABLE IF NOT EXISTS oauth_clients (
    client_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    redirect_uris TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OAuth Authorization Codes: short-lived PKCE codes
CREATE TABLE IF NOT EXISTS oauth_codes (
    code TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    redirect_uri TEXT,
    code_challenge TEXT NOT NULL,
    code_challenge_method TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OAuth Access Tokens: SHA-256 hashed Bearer tokens (cb_tok_ prefix)
CREATE TABLE IF NOT EXISTS oauth_tokens (
    token TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    last_used_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_client_user ON oauth_tokens(client_id, user_id);

-- OAuth Refresh Tokens: rotating refresh tokens (cb_refresh_ prefix)
CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
    token TEXT PRIMARY KEY,
    access_token_hash TEXT NOT NULL UNIQUE REFERENCES oauth_tokens(token) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES oauth_clients(client_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_access_hash ON oauth_refresh_tokens(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON oauth_refresh_tokens(user_id);