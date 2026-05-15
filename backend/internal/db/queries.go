package db

import (
	"context"
	"fmt"
	"time"

	"github.com/pgvector/pgvector-go"
)

// SuggestionResult is a book matched by trigram similarity for the search bar dropdown.
type SuggestionResult struct {
	BookID string   `json:"book_id"`
	Title  string   `json:"title"`
	Source string   `json:"source"`
	Tags   []string `json:"tags"`
	Score  float32  `json:"score"`
}

func (db *DB) SearchSuggestions(ctx context.Context, userID string, query string, limit int) ([]SuggestionResult, error) {
	if limit <= 0 {
		limit = 8
	}
	q := `
		WITH matches AS (
			SELECT
				b.id AS book_id,
				b.title,
				b.source,
				b.tags,
				similarity(b.title, $2) AS title_score,
				MAX(similarity(p.content, $2)) AS content_score
			FROM context_books b
			LEFT JOIN context_book_pages p ON p.book_id = b.id AND p.user_id = b.user_id
			WHERE b.user_id = $1
			  AND (b.title % $2 OR p.content % $2)
			GROUP BY b.id, b.title, b.source, b.tags
		)
		SELECT book_id, title, source, tags, GREATEST(title_score, content_score) AS score
		FROM matches
		ORDER BY score DESC
		LIMIT $3
	`
	rows, err := db.Pool.Query(ctx, q, userID, query, limit)
	if err != nil {
		return nil, fmt.Errorf("suggestion query failed: %w", err)
	}
	defer rows.Close()

	var results []SuggestionResult
	for rows.Next() {
		var r SuggestionResult
		if err := rows.Scan(&r.BookID, &r.Title, &r.Source, &r.Tags, &r.Score); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

// Book holds book metadata only (no page content).
type Book struct {
	ID        string    `json:"book_id"`
	UserID    string    `json:"user_id"`
	Title     string    `json:"title"`
	Source    string    `json:"source"`
	Tags      []string  `json:"tags"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// PageRow is a single page row returned from the DB.
type PageRow struct {
	ID         string    `json:"id"`
	BookID     string    `json:"book_id"`
	PageIndex  int       `json:"page_index"`
	Content    string    `json:"content"`
	TokenCount int       `json:"token_count"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// RankedPage is a page result with its parent book metadata, used by search_pages.
type RankedPage struct {
	PageID    string    `json:"page_id"`
	PageIndex int       `json:"page_index"`
	Content   string    `json:"content"`
	BookID    string    `json:"book_id"`
	Title     string    `json:"title"`
	Source    string    `json:"source"`
	Tags      []string  `json:"tags"`
	CreatedAt time.Time `json:"created_at"`
	Score     float32   `json:"score"`
}

// BookSummary is used by list_books.
type BookSummary struct {
	ID         string    `json:"book_id"`
	Title      string    `json:"title"`
	Source     string    `json:"source"`
	Tags       []string  `json:"tags"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	PageCount  int       `json:"page_count"`
	TokenCount int       `json:"token_count"`
	Preview    string    `json:"preview"`
}

func (db *DB) ListBooks(ctx context.Context, userID string, limit, offset int, orderBy string) ([]BookSummary, int, error) {
	countQuery := `SELECT COUNT(*) FROM context_books WHERE user_id = $1`
	var total int
	if err := db.Pool.QueryRow(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count books: %w", err)
	}

	var orderClause string
	switch orderBy {
	case "created_at":
		orderClause = "ORDER BY created_at DESC"
	case "title":
		orderClause = "ORDER BY title ASC"
	default:
		orderClause = "ORDER BY updated_at DESC"
	}

	query := fmt.Sprintf(`
		SELECT
			b.id, b.title, b.source, b.tags, b.created_at, b.updated_at,
			COALESCE(p.page_count, 0),
			COALESCE(p.token_count, 0),
			COALESCE(p.preview, '')
		FROM context_books b
		LEFT JOIN LATERAL (
			SELECT
				COUNT(*) AS page_count,
				COALESCE(SUM(token_count), 0) AS token_count,
				LEFT(MAX(content) FILTER (WHERE page_index = 0), 200) AS preview
			FROM context_book_pages
			WHERE book_id = b.id AND user_id = b.user_id
		) p ON true
		WHERE b.user_id = $1
		%s
		LIMIT $2 OFFSET $3
	`, orderClause)
	rows, err := db.Pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list books: %w", err)
	}
	defer rows.Close()

	var results []BookSummary
	for rows.Next() {
		var b BookSummary
		if err := rows.Scan(&b.ID, &b.Title, &b.Source, &b.Tags, &b.CreatedAt, &b.UpdatedAt, &b.PageCount, &b.TokenCount, &b.Preview); err != nil {
			return nil, 0, err
		}
		results = append(results, b)
	}
	return results, total, nil
}

func (db *DB) GetBook(ctx context.Context, bookID, userID string) (*Book, error) {
	query := `
		SELECT id, user_id, title, source, tags, created_at, updated_at
		FROM context_books
		WHERE id = $1 AND user_id = $2
	`
	var b Book
	err := db.Pool.QueryRow(ctx, query, bookID, userID).Scan(
		&b.ID, &b.UserID, &b.Title, &b.Source, &b.Tags, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("book not found: %w", err)
	}
	return &b, nil
}

func (db *DB) GetPagesByBookID(ctx context.Context, bookID, userID string) ([]PageRow, error) {
	query := `
		SELECT id, book_id, page_index, content, token_count, created_at, updated_at
		FROM context_book_pages
		WHERE book_id = $1 AND user_id = $2
		ORDER BY page_index ASC
	`
	rows, err := db.Pool.Query(ctx, query, bookID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch pages: %w", err)
	}
	defer rows.Close()

	var pages []PageRow
	for rows.Next() {
		var p PageRow
		if err := rows.Scan(&p.ID, &p.BookID, &p.PageIndex, &p.Content, &p.TokenCount, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		pages = append(pages, p)
	}
	return pages, nil
}

// UpdateBook replaces the metadata of an existing book. Returns false if no
// row was matched (book doesn't exist or belongs to a different user).
func (db *DB) UpdateBook(ctx context.Context, bookID, userID, title, source string, tags []string) (bool, error) {
	query := `
		UPDATE context_books
		SET title = $3, source = $4, tags = $5, updated_at = now()
		WHERE id = $1 AND user_id = $2
	`
	result, err := db.Pool.Exec(ctx, query, bookID, userID, title, source, tags)
	if err != nil {
		return false, fmt.Errorf("failed to update book: %w", err)
	}
	return result.RowsAffected() > 0, nil
}

func (db *DB) CreateBook(ctx context.Context, userID, title, source string, tags []string) (string, error) {
	query := `
		INSERT INTO context_books (user_id, title, source, tags)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	var id string
	err := db.Pool.QueryRow(ctx, query, userID, title, source, tags).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("failed to create book: %w", err)
	}
	return id, nil
}

func (db *DB) DeleteBook(ctx context.Context, bookID, userID string) error {
	if _, err := db.Pool.Exec(ctx, `DELETE FROM context_book_pages WHERE book_id = $1`, bookID); err != nil {
		return fmt.Errorf("failed to delete pages: %w", err)
	}
	result, err := db.Pool.Exec(ctx, `DELETE FROM context_books WHERE id = $1 AND user_id = $2`, bookID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete book: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("book not found or not owned by user")
	}
	return nil
}

// InsertPage inserts a single atomic page, assigning page_index atomically, and returns the new page ID and its index.
func (db *DB) InsertPage(ctx context.Context, bookID, userID string, content string, tokenCount int, embedding pgvector.Vector) (string, int, error) {
	query := `
		INSERT INTO context_book_pages (book_id, user_id, page_index, content, token_count, embedding)
		VALUES ($1, $2,
			(SELECT COALESCE(MAX(page_index) + 1, 0) FROM context_book_pages WHERE book_id = $1 AND user_id = $2),
			$3, $4, $5)
		RETURNING id, page_index
	`
	var id string
	var index int
	err := db.Pool.QueryRow(ctx, query, bookID, userID, content, tokenCount, embedding).Scan(&id, &index)
	if err != nil {
		return "", 0, fmt.Errorf("failed to insert page: %w", err)
	}
	return id, index, nil
}

func (db *DB) UpdatePage(ctx context.Context, bookID string, pageIndex int, userID, content string, tokenCount int, embedding pgvector.Vector) error {
	query := `
		UPDATE context_book_pages
		SET content = $1, token_count = $2, embedding = $3, updated_at = now()
		WHERE book_id = $4 AND page_index = $5 AND user_id = $6
	`
	result, err := db.Pool.Exec(ctx, query, content, tokenCount, embedding, bookID, pageIndex, userID)
	if err != nil {
		return fmt.Errorf("failed to update page: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("page not found or not owned by user")
	}
	return nil
}

func (db *DB) DeletePage(ctx context.Context, bookID string, pageIndex int, userID string) error {
	query := `DELETE FROM context_book_pages WHERE book_id = $1 AND page_index = $2 AND user_id = $3`
	result, err := db.Pool.Exec(ctx, query, bookID, pageIndex, userID)
	if err != nil {
		return fmt.Errorf("failed to delete page: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("page not found or not owned by user")
	}
	return nil
}

func (db *DB) DeletePagesByBookID(ctx context.Context, bookID string) error {
	query := `DELETE FROM context_book_pages WHERE book_id = $1`
	_, err := db.Pool.Exec(ctx, query, bookID)
	return err
}

// RelatedBook is a semantically similar book result.
type RelatedBook struct {
	BookID    string    `json:"book_id"`
	Title     string    `json:"title"`
	Tags      []string  `json:"tags"`
	Source    string    `json:"source"`
	Score     float32   `json:"score"`
	CreatedAt time.Time `json:"created_at"`
}

// GetRelatedBooks finds the top N semantically similar books by comparing
// the average page embedding of the source book against pages in other books.
func (db *DB) GetRelatedBooks(ctx context.Context, bookID, userID string, limit int) ([]RelatedBook, error) {
	if limit <= 0 {
		limit = 3
	}
	query := `
		WITH target_avg AS (
			SELECT AVG(embedding)::vector AS avg_emb
			FROM context_book_pages
			WHERE book_id = $1 AND user_id = $2
		),
		page_scores AS (
			SELECT
				p.book_id,
				1 - (p.embedding <=> (SELECT avg_emb FROM target_avg)) AS score
			FROM context_book_pages p
			WHERE p.user_id = $2 AND p.book_id != $1
			ORDER BY p.embedding <=> (SELECT avg_emb FROM target_avg)
			LIMIT $3 * 10
		)
		SELECT b.id, b.title, b.tags, b.source, COALESCE(MAX(ps.score), 0) AS score, b.created_at
		FROM context_books b
		JOIN page_scores ps ON ps.book_id = b.id
		GROUP BY b.id, b.title, b.tags, b.source, b.created_at
		ORDER BY COALESCE(MAX(ps.score), 0) DESC
		LIMIT $3
	`
	rows, err := db.Pool.Query(ctx, query, bookID, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("related query failed: %w", err)
	}
	defer rows.Close()

	var results []RelatedBook
	for rows.Next() {
		var r RelatedBook
		if err := rows.Scan(&r.BookID, &r.Title, &r.Tags, &r.Source, &r.Score, &r.CreatedAt); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}

func (db *DB) SearchPages(ctx context.Context, userID string, queryEmbedding pgvector.Vector, tags []string, limit int) ([]RankedPage, error) {
	tagFilter := ""
	var args []interface{}
	args = append(args, userID, queryEmbedding, limit)

	if len(tags) > 0 {
		tagFilter = `AND b.tags @> $4::text[]`
		args = append(args, tags)
	}

	query := fmt.Sprintf(`
		WITH ranked_pages AS (
			SELECT id AS page_id, book_id, page_index, content, 1 - (embedding <=> $2) AS score
			FROM context_book_pages
			WHERE user_id = $1
			ORDER BY embedding <=> $2
			LIMIT $3
		)
		SELECT rp.page_id, rp.page_index, rp.content, b.id, b.title, b.source, b.tags, b.created_at, rp.score
		FROM context_books b
		JOIN ranked_pages rp ON b.id = rp.book_id
		WHERE b.user_id = $1 %s
		ORDER BY rp.score DESC
		LIMIT $3
	`, tagFilter)

	rows, err := db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("search query failed: %w", err)
	}
	defer rows.Close()

	var results []RankedPage
	for rows.Next() {
		var rp RankedPage
		err := rows.Scan(
			&rp.PageID, &rp.PageIndex, &rp.Content, &rp.BookID, &rp.Title, &rp.Source, &rp.Tags, &rp.CreatedAt, &rp.Score,
		)
		if err != nil {
			return nil, err
		}
		results = append(results, rp)
	}
	return results, nil
}
