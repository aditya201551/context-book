package mcp

import (
	"context"
	"encoding/json"

	ctxbridge "github.com/contextbook/internal/context"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type ListBooksParams struct {
	Limit  *int `json:"limit"`
	Offset *int `json:"offset"`
}

func (s *Server) handleListBooks(ctx context.Context, req *mcp.CallToolRequest, args ListBooksParams) (*mcp.CallToolResult, any, error) {
	userID, err := extractUserID(ctx)
	if err != nil {
		return nil, nil, err
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
		}, nil, nil
	}

	resultBytes, _ := json.Marshal(map[string]interface{}{
		"status": "success",
		"total":  resp.Total,
		"limit":  limit,
		"offset": offset,
		"books":  resp.Books,
	})

	return &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{Text: string(resultBytes)}},
	}, nil, nil
}
