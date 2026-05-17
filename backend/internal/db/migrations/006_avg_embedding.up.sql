ALTER TABLE context_books ADD COLUMN IF NOT EXISTS avg_embedding vector(1024);

CREATE INDEX IF NOT EXISTS idx_context_books_avg_embedding ON context_books USING hnsw (avg_embedding vector_cosine_ops);

-- Backfill avg_embedding from existing page embeddings
UPDATE context_books b
SET avg_embedding = sub.avg_emb
FROM (
    SELECT book_id, AVG(embedding)::vector AS avg_emb
    FROM context_book_pages
    GROUP BY book_id
) sub
WHERE b.id = sub.book_id AND b.avg_embedding IS NULL;