package mcp

import (
	"context"
	"encoding/json"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type DeletePageParams struct {
	BookID    string `json:"book_id" jsonschema:"UUID of the book containing the page to delete."`
	PageIndex int    `json:"page_index" jsonschema:"Zero-based index of the page to remove."`
}

func (s *Server) handleDeletePage(ctx context.Context, req *mcp.CallToolRequest, args DeletePageParams) (*mcp.CallToolResult, any, error) {
	userID, err := extractUserID(ctx)
	if err != nil {
		return nil, nil, err
	}

	if err := s.ctxSvc.DeletePage(ctx, userID, args.BookID, args.PageIndex); err != nil {
		errBytes, _ := json.Marshal(map[string]string{"error": "Failed to delete page: " + err.Error()})
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{&mcp.TextContent{Text: string(errBytes)}},
		}, nil, nil
	}

	resultBytes, _ := json.Marshal(map[string]interface{}{
		"status":     "success",
		"book_id":    args.BookID,
		"page_index": args.PageIndex,
	})
	return &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{Text: string(resultBytes)}},
	}, nil, nil
}
