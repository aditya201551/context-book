package mcp

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"

	"github.com/contextbook/internal/auth"
	ctxbridge "github.com/contextbook/internal/context"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

//go:embed instructions.md
var instructionsDoc string

type Server struct {
	MCPServer *mcp.Server
	ctxSvc    *ctxbridge.Service
}

func NewServer(ctxSvc *ctxbridge.Service) *Server {
	s := mcp.NewServer(&mcp.Implementation{
		Name:    "ContextBook",
		Version: "2.0.0",
	}, nil)

	srv := &Server{
		MCPServer: s,
		ctxSvc:    ctxSvc,
	}

	srv.registerTools()
	srv.registerResources()
	return srv
}

func (s *Server) registerTools() {
	mcp.AddTool(s.MCPServer, &mcp.Tool{
		Name:        "create_or_update_book",
		Description: "Create a new Book or update an existing one. All fields (title, source, tags) are required. If book_id is omitted a new book is created and the new book_id is returned. If book_id is provided and exists, its metadata is replaced atomically. If book_id is provided but not found, a new book is created and a note is included in the response. Store the returned book_id in memory for future page operations.",
	}, s.handleCreateOrUpdateBook)

	mcp.AddTool(s.MCPServer, &mcp.Tool{
		Name:        "insert_page",
		Description: "Insert a page of text (≤1000 words) into a Book. Each page is an atomic, semantically meaningful chunk. Maintains retrieval quality via meaningful splitting and overlap.",
	}, s.handleInsertPage)

	mcp.AddTool(s.MCPServer, &mcp.Tool{
		Name:        "update_page",
		Description: "Update a specific page within a Book using its book_id and page_index. Max content size: 1000 words.",
	}, s.handleUpdatePage)

	mcp.AddTool(s.MCPServer, &mcp.Tool{
		Name:        "delete_page",
		Description: "Permanently remove a page from a Book using its book_id and page_index. Note: Page indices will not be re-indexed after deletion (gaps are normal).",
	}, s.handleDeletePage)

	mcp.AddTool(s.MCPServer, &mcp.Tool{
		Name:        "list_books",
		Description: "List available Books. Returns metadata including book_id, title, and tags.",
	}, s.handleListBooks)

	mcp.AddTool(s.MCPServer, &mcp.Tool{
		Name:        "get_book",
		Description: "Retrieve all pages of a Book in order by its book_id.",
	}, s.handleGetBook)

	mcp.AddTool(s.MCPServer, &mcp.Tool{
		Name:        "search_pages",
		Description: "Perform semantic search across all Books using a natural language query. Returns matching pages with their book_id and page_index.",
	}, s.handleSearchPages)

	mcp.AddTool(s.MCPServer, &mcp.Tool{
		Name:        "readme",
		Description: "Returns the ContextBook usage guide. Call this once at the start of a session if you have not already loaded the instructions.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, _ struct{}) (*mcp.CallToolResult, any, error) {
		resultBytes, _ := json.Marshal(map[string]string{
			"content": instructionsDoc,
			"note":    "Load this guide into your memory now and do not call readme again this session.",
		})
		return &mcp.CallToolResult{
			Content: []mcp.Content{&mcp.TextContent{Text: string(resultBytes)}},
		}, nil, nil
	})
}

func (s *Server) registerResources() {
	s.MCPServer.AddResource(&mcp.Resource{
		Name:        "README",
		Description: "A guide for AI agents on how to use ContextBook tools and the Knowledge Hierarchy.",
		URI:         "contextbook://instructions",
		MIMEType:    "text/markdown",
	}, func(ctx context.Context, request *mcp.ReadResourceRequest) (*mcp.ReadResourceResult, error) {
		return &mcp.ReadResourceResult{
			Contents: []*mcp.ResourceContents{
				{
					URI:      request.Params.URI,
					MIMEType: "text/markdown",
					Text:     instructionsDoc,
				},
			},
		}, nil
	})
}

func extractUserID(ctx context.Context) (string, error) {
	userID, ok := auth.CheckAuth(ctx)
	if !ok {
		return "", fmt.Errorf("unauthorized: no user in context")
	}
	return userID, nil
}
