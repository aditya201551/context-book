package context

import (
	"context"
	"fmt"
	"time"

	"github.com/contextbook/internal/db"
	"github.com/pgvector/pgvector-go"
)

type Embedder interface {
	CreateEmbedding(ctx context.Context, text, inputType string) ([]float32, int, error)
	CreateEmbeddingsBatch(ctx context.Context, texts []string, inputType string) ([][]float32, error)
}

type Service struct {
	db       *db.DB
	embedder Embedder
}

func NewService(database *db.DB, embedClient Embedder) *Service {
	return &Service{
		db:       database,
		embedder: embedClient,
	}
}

type ListRequest struct {
	Limit   int    `json:"limit"`
	Offset  int    `json:"offset"`
	OrderBy string `json:"order_by"`
}

type ListResponse struct {
	Books []db.BookSummary `json:"books"`
	Total int              `json:"total"`
}

func (s *Service) ListBooks(ctx context.Context, userID string, req ListRequest) (*ListResponse, error) {
	if req.Limit <= 0 {
		req.Limit = 20
	}
	if req.Limit > 100 {
		req.Limit = 100
	}
	if req.Offset < 0 {
		req.Offset = 0
	}

	books, total, err := s.db.ListBooks(ctx, userID, req.Limit, req.Offset, req.OrderBy)
	if err != nil {
		return nil, fmt.Errorf("failed to list books: %w", err)
	}

	return &ListResponse{Books: books, Total: total}, nil
}

type GetBookRequest struct {
	BookID string `json:"book_id"`
}

type Page struct {
	PageIndex int       `json:"page_index"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type GetBookResponse struct {
	BookID    string    `json:"book_id"`
	Title     string    `json:"title"`
	Source    string    `json:"source"`
	Tags      []string  `json:"tags"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Pages     []Page    `json:"pages"`
}

func (s *Service) GetBook(ctx context.Context, userID string, req GetBookRequest) (*GetBookResponse, error) {
	if req.BookID == "" {
		return nil, fmt.Errorf("book_id is required")
	}

	meta, err := s.db.GetBook(ctx, req.BookID, userID)
	if err != nil {
		return nil, fmt.Errorf("book not found: %w", err)
	}

	rows, err := s.db.GetPagesByBookID(ctx, req.BookID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch pages: %w", err)
	}

	pages := make([]Page, 0, len(rows))
	for _, p := range rows {
		pages = append(pages, Page{
			PageIndex: p.PageIndex,
			Content:   p.Content,
			CreatedAt: p.CreatedAt,
			UpdatedAt: p.UpdatedAt,
		})
	}

	return &GetBookResponse{
		BookID:    meta.ID,
		Title:     meta.Title,
		Source:    meta.Source,
		Tags:      meta.Tags,
		CreatedAt: meta.CreatedAt,
		UpdatedAt: meta.UpdatedAt,
		Pages:     pages,
	}, nil
}

type UpdatePageRequest struct {
	BookID    string `json:"book_id"`
	PageIndex int    `json:"page_index"`
	Content   string `json:"content"`
}

type UpdatePageResponse struct {
	BookID    string    `json:"book_id"`
	PageIndex int       `json:"page_index"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *Service) UpdatePage(ctx context.Context, userID string, req UpdatePageRequest) (*UpdatePageResponse, error) {
	if req.BookID == "" {
		return nil, fmt.Errorf("book_id is required")
	}
	if req.Content == "" {
		return nil, fmt.Errorf("content is required")
	}

	embeddingVec, tokenCount, err := s.embedder.CreateEmbedding(ctx, req.Content, "document")
	if err != nil {
		return nil, fmt.Errorf("failed to embed content: %w", err)
	}

	if err := s.db.UpdatePage(ctx, req.BookID, req.PageIndex, userID, req.Content, tokenCount, pgvector.NewVector(embeddingVec)); err != nil {
		return nil, fmt.Errorf("failed to update page: %w", err)
	}

	return &UpdatePageResponse{
		BookID:    req.BookID,
		PageIndex: req.PageIndex,
		UpdatedAt: time.Now(),
	}, nil
}

func (s *Service) DeletePage(ctx context.Context, userID, bookID string, pageIndex int) error {
	if bookID == "" {
		return fmt.Errorf("book_id is required")
	}
	return s.db.DeletePage(ctx, bookID, pageIndex, userID)
}
