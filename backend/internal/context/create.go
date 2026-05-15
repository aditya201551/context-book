package context

import (
	"context"
	"fmt"
	"time"
)

type CreateBookRequest struct {
	Title  string   `json:"title"`
	Source string   `json:"source"`
	Tags   []string `json:"tags"`
}

type CreateBookResponse struct {
	BookID    string    `json:"book_id"`
	CreatedAt time.Time `json:"created_at"`
}

func (s *Service) CreateBook(ctx context.Context, userID string, req CreateBookRequest) (*CreateBookResponse, error) {
	if req.Title == "" {
		return nil, fmt.Errorf("title is required")
	}
	if req.Tags == nil {
		req.Tags = []string{}
	}

	bookID, err := s.db.CreateBook(ctx, userID, req.Title, req.Source, req.Tags)
	if err != nil {
		return nil, fmt.Errorf("failed to create book: %w", err)
	}

	return &CreateBookResponse{
		BookID:    bookID,
		CreatedAt: time.Now(),
	}, nil
}

// UpsertBookRequest is used by create_or_update_book.
// BookID is optional — when provided the existing book is updated; when absent a new book is created.
type UpsertBookRequest struct {
	BookID *string  `json:"book_id,omitempty"`
	Title  string   `json:"title"`
	Source string   `json:"source"`
	Tags   []string `json:"tags"`
}

type UpsertBookResponse struct {
	BookID    string    `json:"book_id"`
	Updated   bool      `json:"updated"`   // true = existing book updated, false = new book created
	CreatedAt time.Time `json:"created_at"` // set only on create
}

func (s *Service) UpsertBook(ctx context.Context, userID string, req UpsertBookRequest) (*UpsertBookResponse, error) {
	if req.Title == "" {
		return nil, fmt.Errorf("title is required")
	}
	if req.Tags == nil {
		req.Tags = []string{}
	}

	if req.BookID != nil && *req.BookID != "" {
		matched, err := s.db.UpdateBook(ctx, *req.BookID, userID, req.Title, req.Source, req.Tags)
		if err != nil {
			return nil, fmt.Errorf("failed to update book: %w", err)
		}
		if matched {
			return &UpsertBookResponse{BookID: *req.BookID, Updated: true}, nil
		}
		// book_id was provided but not found — fall through to create
	}

	bookID, err := s.db.CreateBook(ctx, userID, req.Title, req.Source, req.Tags)
	if err != nil {
		return nil, fmt.Errorf("failed to create book: %w", err)
	}
	return &UpsertBookResponse{BookID: bookID, Updated: false, CreatedAt: time.Now()}, nil
}
