package mcp

import (
	"context"
	"encoding/json"

	ctxbridge "github.com/contextbook/internal/context"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type ListBooksParams struct {
	Limit  *int `json:"limit,omitempty" jsonschema:"Maximum number of books to return. Defaults to 20."`
	Offset *int `json:"offset,omitempty" jsonschema:"Number of books to skip for pagination. Defaults to 0."`
}

type ListBooksBook struct {
	BookID     string   `json:"book_id" jsonschema:"UUID of the book."`
	Title      string   `json:"title" jsonschema:"Title of the book."`
	Source     string   `json:"source" jsonschema:"Source that created the book (e.g. client name)."`
	Tags       []string `json:"tags" jsonschema:"Tags associated with the book."`
	CreatedAt  string   `json:"created_at" jsonschema:"ISO 8601 timestamp when the book was created."`
	UpdatedAt  string   `json:"updated_at" jsonschema:"ISO 8601 timestamp when the book was last updated."`
	PageCount  int      `json:"page_count" jsonschema:"Number of pages in the book."`
	TokenCount int      `json:"token_count" jsonschema:"Total token count across all pages."`
	Preview    string   `json:"preview" jsonschema:"Short preview of the first page content."`
}

type ListBooksOutput struct {
	Status string          `json:"status" jsonschema:"Result status, always 'success' on success."`
	Total  int             `json:"total" jsonschema:"Total number of books the user owns."`
	Limit  int             `json:"limit" jsonschema:"Maximum number of books returned in this response."`
	Offset int             `json:"offset" jsonschema:"Pagination offset used for this response."`
	Books  []ListBooksBook `json:"books" jsonschema:"List of book metadata objects."`
}

func (s *Server) handleListBooks(ctx context.Context, req *mcp.CallToolRequest, args ListBooksParams) (*mcp.CallToolResult, ListBooksOutput, error) {
	userID, err := extractUserID(ctx)
	if err != nil {
		return nil, ListBooksOutput{}, err
	}

	limit := 20
	if args.Limit != nil {
		limit = *args.Limit
	}
	offset := 0
	if args.Offset != nil {
		offset = *args.Offset
	}

	resp, listErr := s.ctxSvc.ListBooks(ctx, userID, ctxbridge.ListRequest{
		Limit:   limit,
		Offset:  offset,
		OrderBy: "updated_at",
	})
	if listErr != nil {
		errBytes, _ := json.Marshal(map[string]string{"error": "Failed to list books: " + listErr.Error()})
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{&mcp.TextContent{Text: string(errBytes)}},
		}, ListBooksOutput{}, nil
	}

	books := make([]ListBooksBook, len(resp.Books))
	for i, b := range resp.Books {
		books[i] = ListBooksBook{
			BookID:     b.ID,
			Title:      b.Title,
			Source:     b.Source,
			Tags:       b.Tags,
			CreatedAt:  b.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:  b.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
			PageCount:  b.PageCount,
			TokenCount: b.TokenCount,
			Preview:    b.Preview,
		}
	}

	return nil, ListBooksOutput{
		Status: "success",
		Total:  resp.Total,
		Limit:  limit,
		Offset: offset,
		Books:  books,
	}, nil
}
