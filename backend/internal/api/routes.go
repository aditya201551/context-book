package api

import "net/http"

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/me", h.HandleMe)
	mux.HandleFunc("PATCH /api/me", h.HandleUpdateMe)
	mux.HandleFunc("GET /api/books", h.HandleListBooks)
	mux.HandleFunc("POST /api/books", h.HandleCreateBook)
	mux.HandleFunc("GET /api/books/{id}", h.HandleGetBook)
	mux.HandleFunc("GET /api/books/{id}/related", h.HandleGetRelatedBooks)
	mux.HandleFunc("PUT /api/books/{id}", h.HandleUpdateBook)
	mux.HandleFunc("DELETE /api/books/{id}", h.HandleDeleteBook)
	mux.HandleFunc("POST /api/books/{id}/pages", h.HandleInsertPage)
	mux.HandleFunc("PUT /api/books/{id}/pages/{index}", h.HandleUpdatePage)
	mux.HandleFunc("DELETE /api/books/{id}/pages/{index}", h.HandleDeletePage)
	mux.HandleFunc("POST /api/search", h.HandleSearch)
	mux.HandleFunc("GET /api/search/suggest", h.HandleSearchSuggestions)
	mux.HandleFunc("GET /api/clients", h.HandleListClients)
	mux.HandleFunc("DELETE /api/clients/{id}", h.HandleDeleteClient)
	mux.HandleFunc("GET /api/clusters", h.HandleListClusters)
	mux.HandleFunc("POST /api/clusters", h.HandleCreateCluster)
	mux.HandleFunc("PUT /api/clusters/{id}", h.HandleUpdateCluster)
	mux.HandleFunc("DELETE /api/clusters/{id}", h.HandleDeleteCluster)
}
