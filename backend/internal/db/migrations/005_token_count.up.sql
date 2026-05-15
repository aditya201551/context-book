-- Add token_count to context_book_pages for real per-page token counts from embedding API
ALTER TABLE context_book_pages ADD COLUMN IF NOT EXISTS token_count INT NOT NULL DEFAULT 0;

-- Backfill existing rows with a rough estimate (CEIL(LENGTH(content) / 4.0))
UPDATE context_book_pages SET token_count = CEIL(LENGTH(content) / 4.0)::int WHERE token_count = 0;
