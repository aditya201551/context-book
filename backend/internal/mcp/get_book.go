package mcp

import (
	"context"
	"encoding/json"

	ctxbridge "github.com/contextbook/internal/context"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type GetBookParams struct {
	BookID string `json:"book_id"`
}

func (s *Server) handleGetBook(ctx context.Context, req *mcp.CallToolRequest, args GetBookParams) (*mcp.CallToolResult, any, error) {
	userID, err := extractUserID(ctx)
	if err != nil {
		return nil, nil, err
	}

	resp, svcErr := s.ctxSvc.GetBook(ctx, userID, ctxbridge.GetBookRequest{
		BookID: args.BookID,
	})
	if svcErr != nil {
		errBytes, _ := json.Marshal(map[string]string{"error": "Failed to get book: " + svcErr.Error()})
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{&mcp.TextContent{Text: string(errBytes)}},
		}, nil, nil
	}

	resultBytes, _ := json.Marshal(map[string]interface{}{
		"status": "success",
		"book":   resp,
	})
	return &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{Text: string(resultBytes)}},
	}, nil, nil
}
