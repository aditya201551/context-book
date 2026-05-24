package api

import "net/http"

func (h *Handler) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/me", h.protected(http.MethodGet, h.HandleMe))
	mux.HandleFunc("PATCH /api/me", h.protected(http.MethodPatch, h.HandleUpdateMe))
	mux.HandleFunc("GET /api/books", h.protected(http.MethodGet, h.HandleListBooks))
	mux.HandleFunc("POST /api/books", h.protected(http.MethodPost, h.HandleCreateBook))
	mux.HandleFunc("GET /api/books/{id}", h.protected(http.MethodGet, h.HandleGetBook))
	mux.HandleFunc("GET /api/books/{id}/related", h.protected(http.MethodGet, h.HandleGetRelatedBooks))
	mux.HandleFunc("PUT /api/books/{id}", h.protected(http.MethodPut, h.HandleUpdateBook))
	mux.HandleFunc("DELETE /api/books/{id}", h.protected(http.MethodDelete, h.HandleDeleteBook))
	mux.HandleFunc("POST /api/books/{id}/pages", h.protected(http.MethodPost, h.HandleInsertPage))
	mux.HandleFunc("PUT /api/books/{id}/pages/{index}", h.protected(http.MethodPut, h.HandleUpdatePage))
	mux.HandleFunc("DELETE /api/books/{id}/pages/{index}", h.protected(http.MethodDelete, h.HandleDeletePage))
	mux.HandleFunc("POST /api/search", h.protected(http.MethodPost, h.HandleSearch))
	mux.HandleFunc("GET /api/search/suggest", h.protected(http.MethodGet, h.HandleSearchSuggestions))
	mux.HandleFunc("GET /api/clients", h.protected(http.MethodGet, h.HandleListClients))
	mux.HandleFunc("DELETE /api/clients/{id}", h.protected(http.MethodDelete, h.HandleDeleteClient))
	mux.HandleFunc("DELETE /api/clients/{id}/tokens", h.protected(http.MethodDelete, h.HandleDeauthorizeClient))
	mux.HandleFunc("GET /api/clusters", h.protected(http.MethodGet, h.HandleListClusters))
	mux.HandleFunc("POST /api/clusters", h.protected(http.MethodPost, h.HandleCreateCluster))
	mux.HandleFunc("PUT /api/clusters/{id}", h.protected(http.MethodPut, h.HandleUpdateCluster))
	mux.HandleFunc("DELETE /api/clusters/{id}", h.protected(http.MethodDelete, h.HandleDeleteCluster))
	mux.HandleFunc("GET /api/constellation", h.protected(http.MethodGet, h.HandleConstellation))
}
