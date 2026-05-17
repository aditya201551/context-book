package mcp

import (
	"context"
	"encoding/json"

	ctxbridge "github.com/contextbook/internal/context"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type SearchPagesParams struct {
	Query string   `json:"query" jsonschema:"Natural language search query (e.g. 'how to handle retries in Go')."`
	Tags  []string `json:"tags,omitempty" jsonschema:"Optional list of tags to filter results by."`
	Limit *int     `json:"limit,omitempty" jsonschema:"Maximum number of results to return. Defaults to 5, max 20."`
}

type SearchPagesResult struct {
	PageIndex int      `json:"page_index" jsonschema:"Zero-based index of the matching page."`
	BookID    string   `json:"book_id" jsonschema:"UUID of the book containing the page."`
	Title     string   `json:"title" jsonschema:"Title of the parent book."`
	Content   string   `json:"content" jsonschema:"Text content of the matching page."`
	Source    string   `json:"source" jsonschema:"Source that created the book."`
	Tags      []string `json:"tags" jsonschema:"Tags associated with the book."`
	Score     float32  `json:"score" jsonschema:"Cosine similarity score (0-1, higher is more relevant)."`
	StoredAt  string   `json:"stored_at" jsonschema:"ISO 8601 timestamp when the page was stored."`
}

type SearchPagesOutput struct {
	Status  string              `json:"status" jsonschema:"Result status, always 'success' on success."`
	Results []SearchPagesResult `json:"results" jsonschema:"Ranked list of matching pages."`
}

func (s *Server) handleSearchPages(ctx context.Context, req *mcp.CallToolRequest, args SearchPagesParams) (*mcp.CallToolResult, SearchPagesOutput, error) {
	userID, err := extractUserID(ctx)
	if err != nil {
		return nil, SearchPagesOutput{}, err
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
		}, SearchPagesOutput{}, nil
	}

	outResults := make([]SearchPagesResult, len(results))
	for i, r := range results {
		outResults[i] = SearchPagesResult{
			PageIndex: r.PageIndex,
			BookID:    r.BookID,
			Title:     r.Title,
			Content:   r.Content,
			Source:    r.Source,
			Tags:      r.Tags,
			Score:     r.Score,
			StoredAt:  r.StoredAt.Format("2006-01-02T15:04:05Z07:00"),
		}
	}

	return nil, SearchPagesOutput{
		Status:  "success",
		Results: outResults,
	}, nil
}
