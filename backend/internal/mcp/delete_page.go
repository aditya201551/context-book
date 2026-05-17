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

type DeletePageOutput struct {
	Status    string `json:"status" jsonschema:"Result status, always 'success' on success."`
	BookID    string `json:"book_id" jsonschema:"UUID of the book the deleted page belonged to."`
	PageIndex int    `json:"page_index" jsonschema:"Zero-based index of the deleted page."`
}

func (s *Server) handleDeletePage(ctx context.Context, req *mcp.CallToolRequest, args DeletePageParams) (*mcp.CallToolResult, DeletePageOutput, error) {
	userID, err := extractUserID(ctx)
	if err != nil {
		return nil, DeletePageOutput{}, err
	}

	if err := s.ctxSvc.DeletePage(ctx, userID, args.BookID, args.PageIndex); err != nil {
		errBytes, _ := json.Marshal(map[string]string{"error": "Failed to delete page: " + err.Error()})
		return &mcp.CallToolResult{
			IsError: true,
			Content: []mcp.Content{&mcp.TextContent{Text: string(errBytes)}},
		}, DeletePageOutput{}, nil
	}

	return nil, DeletePageOutput{
		Status:    "success",
		BookID:    args.BookID,
		PageIndex: args.PageIndex,
	}, nil
}
