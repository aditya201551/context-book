CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_context_books_title_trgm ON context_books USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_context_book_pages_content_trgm ON context_book_pages USING gin(content gin_trgm_ops);
