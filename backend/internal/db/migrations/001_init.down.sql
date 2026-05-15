DROP INDEX IF EXISTS idx_refresh_tokens_user_id;
DROP INDEX IF EXISTS idx_refresh_tokens_access_hash;
DROP INDEX IF EXISTS idx_oauth_tokens_client_user;
DROP INDEX IF EXISTS idx_oauth_tokens_user_id;
DROP INDEX IF EXISTS idx_context_book_pages_embedding;
DROP INDEX IF EXISTS idx_context_book_pages_user_id;
DROP INDEX IF EXISTS idx_context_book_pages_book_id;
DROP INDEX IF EXISTS unique_book_page_index;
DROP INDEX IF EXISTS idx_context_books_tags;
DROP INDEX IF EXISTS idx_context_books_user_id;
DROP INDEX IF EXISTS users_provider_provider_id_key;

DROP TABLE IF EXISTS oauth_refresh_tokens;
DROP TABLE IF EXISTS oauth_tokens;
DROP TABLE IF EXISTS oauth_codes;
DROP TABLE IF EXISTS oauth_clients;
DROP TABLE IF EXISTS context_book_pages;
DROP TABLE IF EXISTS context_books;
DROP TABLE IF EXISTS users;

DROP EXTENSION IF EXISTS vector;