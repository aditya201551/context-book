package mcp

import (
	"context"
	"encoding/json"

	ctxbridge "github.com/contextbook/internal/context"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type SearchPagesParams struct {
	Query string   `json:"query"`
	Tags  []string `json:"tags,omitempty"`
	Limit *int     `json:"limit"`
}

func (s *Server) handleSearchPages(ctx context.Context, req *mcp.CallToolRequest, args SearchPagesParams) (*mcp.CallToolResult, any, error) {
	userID, err := extractUserID(ctx)
	if err != nil {
		return nil, nil, err
	}

	limit := 5
	if args.Limit != nil {
		limit = *args.Limit
	}

	results, searchErr := s.ctxSvc.SearchPages(ctx, userID, ctxbridge.SearchPagesRequest{
		Query: args.Query,
		Tags:  args.Tags,
		Limit: limit,
	})
	if searchErr != nil {
		errBytes, _ := json.Marshal(map[string]string{"error": "Failed to search pages: " + searchErr.Error()})
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{&mcp.TextContent{Text: string(errBytes)}},
		}, nil, nil
	}

	if len(results) == 0 {
		emptyBytes, _ := json.Marshal(map[string]interface{}{"status": "success", "results": []interface{}{}})
		return &mcp.CallToolResult{
			Content: []mcp.Content{&mcp.TextContent{Text: string(emptyBytes)}},
		}, nil, nil
	}

	resultBytes, _ := json.Marshal(map[string]interface{}{
		"status":  "success",
		"results": results,
	})
	return &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{Text: string(resultBytes)}},
	}, nil, nil
}
