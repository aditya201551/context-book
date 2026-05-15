package context

import (
	"context"
	"fmt"
	"time"

	"github.com/pgvector/pgvector-go"
)

type SearchPagesRequest struct {
	Query string   `json:"query"`
	Tags  []string `json:"tags"`
	Limit int      `json:"limit"`
}

type RankedPageResult struct {
	PageIndex int       `json:"page_index"`
	BookID    string    `json:"book_id"`
	Title     string    `json:"title"`
	Content   string    `json:"content"`
	Source    string    `json:"source"`
	Tags      []string  `json:"tags"`
	Score     float32   `json:"score"`
	StoredAt  time.Time `json:"stored_at"`
}

func (s *Service) SearchPages(ctx context.Context, userID string, req SearchPagesRequest) ([]RankedPageResult, error) {
	if req.Query == "" {
		return nil, fmt.Errorf("query is required")
	}

	if req.Limit <= 0 {
		req.Limit = 5
	}
	if req.Limit > 20 {
		req.Limit = 20
	}

	queryVectorData, _, err := s.embedder.CreateEmbedding(ctx, req.Query, "query")
	if err != nil {
		return nil, fmt.Errorf("failed to embed query: %w", err)
	}
	queryVector := pgvector.NewVector(queryVectorData)

	ranked, err := s.db.SearchPages(ctx, userID, queryVector, req.Tags, req.Limit)
	if err != nil {
		return nil, fmt.Errorf("search failed: %w", err)
	}

	var results []RankedPageResult
	for _, r := range ranked {
		results = append(results, RankedPageResult{
			PageIndex: r.PageIndex,
			BookID:    r.BookID,
			Title:     r.Title,
			Content:   r.Content,
			Source:    r.Source,
			Tags:      r.Tags,
			Score:     r.Score,
			StoredAt:  r.CreatedAt,
		})
	}

	return results, nil
}
