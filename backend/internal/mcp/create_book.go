package mcp

import (
	"context"
	"encoding/json"

	"github.com/contextbook/internal/auth"
	ctxbridge "github.com/contextbook/internal/context"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type CreateOrUpdateBookParams struct {
	BookID *string  `json:"book_id,omitempty"`
	Title  string   `json:"title"`
	Tags   []string `json:"tags,omitempty"`
}

func (s *Server) handleCreateOrUpdateBook(ctx context.Context, req *mcp.CallToolRequest, args CreateOrUpdateBookParams) (*mcp.CallToolResult, any, error) {
	userID, err := extractUserID(ctx)
	if err != nil {
		return nil, nil, err
	}

	// Use the OAuth client name as the source (set by auth middleware from oauth_clients table).
	// Falls back to "mcp" if no client name is available.
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
		}, nil, nil
	}

	result := map[string]interface{}{
		"status":  "success",
		"book_id": resp.BookID,
	}

	if resp.Updated {
		result["action"] = "updated"
		result["note"] = "Book metadata updated successfully."
	} else {
		result["action"] = "created"
		result["created_at"] = resp.CreatedAt.Format("2006-01-02T15:04:05Z07:00")
		if args.BookID != nil && *args.BookID != "" {
			result["note"] = "Provided book_id was not found; a new book was created. Please update your stored book_id."
		} else {
			result["note"] = "Please store this book_id in your memory for future page operations on this Book."
		}
	}

	resultBytes, _ := json.Marshal(result)
	return &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{Text: string(resultBytes)}},
	}, nil, nil
}
