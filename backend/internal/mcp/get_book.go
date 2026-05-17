package mcp

import (
	"context"
	"encoding/json"

	ctxbridge "github.com/contextbook/internal/context"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type GetBookParams struct {
	BookID string `json:"book_id" jsonschema:"UUID of the book to retrieve."`
}

type GetBookPage struct {
	PageIndex int    `json:"page_index" jsonschema:"Zero-based index of the page."`
	Content   string `json:"content" jsonschema:"Text content of the page."`
	CreatedAt string `json:"created_at" jsonschema:"ISO 8601 timestamp when the page was created."`
	UpdatedAt string `json:"updated_at" jsonschema:"ISO 8601 timestamp when the page was last updated."`
}

type GetBookOutput struct {
	Status    string        `json:"status" jsonschema:"Result status, always 'success' on success."`
	BookID    string        `json:"book_id" jsonschema:"UUID of the book."`
	Title     string        `json:"title" jsonschema:"Title of the book."`
	Source    string        `json:"source" jsonschema:"Source that created the book."`
	Tags      []string      `json:"tags" jsonschema:"Tags associated with the book."`
	CreatedAt string        `json:"created_at" jsonschema:"ISO 8601 timestamp when the book was created."`
	UpdatedAt string        `json:"updated_at" jsonschema:"ISO 8601 timestamp when the book was last updated."`
	Pages     []GetBookPage `json:"pages" jsonschema:"Ordered list of all pages in the book."`
}

func (s *Server) handleGetBook(ctx context.Context, req *mcp.CallToolRequest, args GetBookParams) (*mcp.CallToolResult, GetBookOutput, error) {
	userID, err := extractUserID(ctx)
	if err != nil {
		return nil, GetBookOutput{}, err
	}

	resp, svcErr := s.ctxSvc.GetBook(ctx, userID, ctxbridge.GetBookRequest{
		BookID: args.BookID,
	})
	if svcErr != nil {
		errBytes, _ := json.Marshal(map[string]string{"error": "Failed to get book: " + svcErr.Error()})
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{&mcp.TextContent{Text: string(errBytes)}},
		}, GetBookOutput{}, nil
	}

	pages := make([]GetBookPage, len(resp.Pages))
	for i, p := range resp.Pages {
		pages[i] = GetBookPage{
			PageIndex: p.PageIndex,
			Content:   p.Content,
			CreatedAt: p.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt: p.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	return nil, GetBookOutput{
		Status:    "success",
		BookID:    resp.BookID,
		Title:     resp.Title,
		Source:    resp.Source,
		Tags:      resp.Tags,
		CreatedAt: resp.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt: resp.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		Pages:     pages,
	}, nil
}
