package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	ctxbridge "github.com/contextbook/internal/context"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type UpdatePageParams struct {
	BookID     string `json:"book_id"`
	PageIndex  int    `json:"page_index"`
	Content    string `json:"content"`
}

func (s *Server) handleUpdatePage(ctx context.Context, req *mcp.CallToolRequest, args UpdatePageParams) (*mcp.CallToolResult, any, error) {
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

	resp, svcErr := s.ctxSvc.UpdatePage(ctx, userID, ctxbridge.UpdatePageRequest{
		BookID:    args.BookID,
		PageIndex: args.PageIndex,
		Content:   args.Content,
	})
	if svcErr != nil {
		errBytes, _ := json.Marshal(map[string]string{"error": "Failed to update page: " + svcErr.Error()})
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{&mcp.TextContent{Text: string(errBytes)}},
		}, nil, nil
	}

	resultBytes, _ := json.Marshal(map[string]interface{}{
		"status":     "success",
		"book_id":    resp.BookID,
		"page_index": resp.PageIndex,
		"updated_at": resp.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	})
	return &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{Text: string(resultBytes)}},
	}, nil, nil
}
