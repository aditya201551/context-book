package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	ctxbridge "github.com/contextbook/internal/context"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type InsertPageParams struct {
	BookID  string `json:"book_id"`
	Content string `json:"content"`
}

func (s *Server) handleInsertPage(ctx context.Context, req *mcp.CallToolRequest, args InsertPageParams) (*mcp.CallToolResult, any, error) {
	wordCount := len(strings.Fields(args.Content))
	if wordCount > 1000 {
		errBytes, _ := json.Marshal(map[string]string{
			"error": fmt.Sprintf("content exceeds the 1000-word hard limit (current: %d words). please split the content into modular pages as per the instructions guide.", wordCount),
		})
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{&mcp.TextContent{Text: string(errBytes)}},
		}, nil, nil
	}

	userID, err := extractUserID(ctx)
	if err != nil {
		return nil, nil, err
	}

	resp, svcErr := s.ctxSvc.InsertPage(ctx, userID, ctxbridge.InsertPageRequest{
		BookID:  args.BookID,
		Content: args.Content,
	})
	if svcErr != nil {
		errBytes, _ := json.Marshal(map[string]string{"error": "Failed to insert page: " + svcErr.Error()})
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{&mcp.TextContent{Text: string(errBytes)}},
		}, nil, nil
	}

	resultBytes, _ := json.Marshal(map[string]interface{}{
		"status":     "success",
		"page_index": resp.PageIndex,
		"stored_at":  resp.StoredAt.Format("2006-01-02T15:04:05Z07:00"),
	})
	return &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{Text: string(resultBytes)}},
	}, nil, nil
}
