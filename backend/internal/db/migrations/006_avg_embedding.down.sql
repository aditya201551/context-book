DROP INDEX IF EXISTS idx_context_books_avg_embedding;
ALTER TABLE context_books DROP COLUMN IF EXISTS avg_embedding;