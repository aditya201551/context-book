package context

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/pgvector/pgvector-go"
)

type InsertPageRequest struct {
	BookID  string `json:"book_id"`
	Content string `json:"content"`
}

type InsertPageResponse struct {
	PageID    string    `json:"page_id"`
	PageIndex int       `json:"page_index"`
	StoredAt  time.Time `json:"stored_at"`
}

func (s *Service) InsertPage(ctx context.Context, userID string, req InsertPageRequest) (*InsertPageResponse, error) {
	if req.BookID == "" {
		return nil, fmt.Errorf("book_id is required")
	}
	if req.Content == "" {
		return nil, fmt.Errorf("content is required")
	}

	if _, err := s.db.GetBook(ctx, req.BookID, userID); err != nil {
		return nil, fmt.Errorf("book not found or not owned by user: %w", err)
	}

	embeddingVec, tokenCount, err := s.embedder.CreateEmbedding(ctx, req.Content, "document")
	if err != nil {
		return nil, fmt.Errorf("failed to embed content: %w", err)
	}

	pageID, index, err := s.db.InsertPage(ctx, req.BookID, userID, req.Content, tokenCount, pgvector.NewVector(embeddingVec))
	if err != nil {
		return nil, fmt.Errorf("failed to store page: %w", err)
	}

	s.refreshAvgEmbedding(ctx, req.BookID)

	return &InsertPageResponse{
		PageID:    pageID,
		PageIndex: index,
		StoredAt:  time.Now(),
	}, nil
}

func (s *Service) refreshAvgEmbedding(ctx context.Context, bookID string) {
	if err := s.db.RefreshAvgEmbedding(ctx, bookID); err != nil {
		slog.Error("failed to refresh avg_embedding", "book_id", bookID, "error", err)
	}
}
