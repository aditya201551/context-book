package mcp

import (
	"context"
	"encoding/json"

	"github.com/contextbook/internal/auth"
	ctxbridge "github.com/contextbook/internal/context"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type CreateOrUpdateBookParams struct {
	BookID *string  `json:"book_id,omitempty" jsonschema:"UUID of an existing book to update. Omit to create a new book."`
	Title  string   `json:"title" jsonschema:"Short descriptive title of the book. Required."`
	Tags   []string `json:"tags,omitempty" jsonschema:"Optional list of tags to categorize the book (e.g. ['go', 'backend'])."`
}

type CreateOrUpdateBookOutput struct {
	Status    string `json:"status" jsonschema:"Result status, always 'success' on success."`
	BookID    string `json:"book_id" jsonschema:"UUID of the created or updated book."`
	Action    string `json:"action" jsonschema:"Either 'created' or 'updated'."`
	CreatedAt string `json:"created_at,omitempty" jsonschema:"ISO 8601 timestamp when the book was created. Only set on create."`
	Note      string `json:"note" jsonschema:"Human-readable advice about the result (e.g. store the book_id)."`
}

func (s *Server) handleCreateOrUpdateBook(ctx context.Context, req *mcp.CallToolRequest, args CreateOrUpdateBookParams) (*mcp.CallToolResult, CreateOrUpdateBookOutput, error) {
	userID, err := extractUserID(ctx)
	if err != nil {
		return nil, CreateOrUpdateBookOutput{}, err
	}

	source := auth.GetClientName(ctx)
	if source == "" {
		source = "mcp"
	}

	resp, svcErr := s.ctxSvc.UpsertBook(ctx, userID, ctxbridge.UpsertBookRequest{
		BookID: args.BookID,
		Title:  args.Title,
		Source: source,
		Tags:   args.Tags,
	})
	if svcErr != nil {
		errBytes, _ := json.Marshal(map[string]string{"error": svcErr.Error()})
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{&mcp.TextContent{Text: string(errBytes)}},
		}, CreateOrUpdateBookOutput{}, nil
	}

	out := CreateOrUpdateBookOutput{
		Status: "success",
		BookID: resp.BookID,
	}

	if resp.Updated {
		out.Action = "updated"
		out.Note = "Book metadata updated successfully."
	} else {
		out.Action = "created"
		out.CreatedAt = resp.CreatedAt.Format("2006-01-02T15:04:05Z07:00")
		if args.BookID != nil && *args.BookID != "" {
			out.Note = "Provided book_id was not found; a new book was created. Please update your stored book_id."
		} else {
			out.Note = "Please store this book_id in your memory for future page operations on this Book."
		}
	}

	return nil, out, nil
}
