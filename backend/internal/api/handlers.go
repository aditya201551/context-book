package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/contextbook/config"
	"github.com/contextbook/internal/auth"
	ctxbridge "github.com/contextbook/internal/context"
	"github.com/contextbook/internal/db"
)

type Handler struct {
	db     *db.DB
	cfg    *config.Config
	ctxSvc *ctxbridge.Service
	authH  *auth.Handlers
}

func NewHandlers(database *db.DB, cfg *config.Config, ctxSvc *ctxbridge.Service, authH *auth.Handlers) *Handler {
	return &Handler{db: database, cfg: cfg, ctxSvc: ctxSvc, authH: authH}
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// GET /api/me
func (h *Handler) HandleMe(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.db.GetUserByID(r.Context(), userID)
	if err != nil {
		slog.Error("Failed to get user", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to get user")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"id":           user.ID,
		"email":        user.Email,
		"display_name": user.DisplayName,
		"provider":     user.Provider,
	})
}

// PATCH /api/me
func (h *Handler) HandleUpdateMe(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body struct {
		DisplayName string `json:"display_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	if err := h.db.UpdateUserDisplayName(r.Context(), userID, body.DisplayName); err != nil {
		slog.Error("Failed to update user", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to update user")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"updated": "true"})
}

// GET /api/books
func (h *Handler) HandleListBooks(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	limit := 20
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	offset := 0
	if v := r.URL.Query().Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}
	sort := r.URL.Query().Get("sort")
	if sort == "" {
		sort = "updated_at"
	}

	resp, err := h.ctxSvc.ListBooks(r.Context(), userID, ctxbridge.ListRequest{
		Limit:   limit,
		Offset:  offset,
		OrderBy: sort,
	})
	if err != nil {
		slog.Error("Failed to list books", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to list books")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"books":  resp.Books,
		"total":  resp.Total,
		"limit":  limit,
		"offset": offset,
	})
}

// POST /api/books
func (h *Handler) HandleCreateBook(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		Title  string   `json:"title"`
		Source string   `json:"source"`
		Tags   []string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	resp, err := h.ctxSvc.CreateBook(r.Context(), userID, ctxbridge.CreateBookRequest{
		Title:  req.Title,
		Source: req.Source,
		Tags:   req.Tags,
	})
	if err != nil {
		slog.Error("Failed to create book", "error", err)
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"book_id":    resp.BookID,
		"created_at": resp.CreatedAt,
	})
}

// GET /api/books/{id}
func (h *Handler) HandleGetBook(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	bookID := r.PathValue("id")
	if bookID == "" {
		writeError(w, http.StatusBadRequest, "book_id is required")
		return
	}

	resp, err := h.ctxSvc.GetBook(r.Context(), userID, ctxbridge.GetBookRequest{BookID: bookID})
	if err != nil {
		slog.Error("Failed to get book", "error", err)
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

// PUT /api/books/{id}
func (h *Handler) HandleUpdateBook(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPut {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	bookID := r.PathValue("id")
	if bookID == "" {
		writeError(w, http.StatusBadRequest, "book_id is required")
		return
	}

	var req struct {
		Title  string   `json:"title"`
		Source string   `json:"source"`
		Tags   []string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	resp, err := h.ctxSvc.UpsertBook(r.Context(), userID, ctxbridge.UpsertBookRequest{
		BookID: &bookID,
		Title:  req.Title,
		Source: req.Source,
		Tags:   req.Tags,
	})
	if err != nil {
		slog.Error("Failed to update book", "error", err)
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"book_id": resp.BookID,
		"updated": resp.Updated,
	})
}

// DELETE /api/books/{id}
func (h *Handler) HandleDeleteBook(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodDelete {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	bookID := r.PathValue("id")
	if bookID == "" {
		writeError(w, http.StatusBadRequest, "book_id is required")
		return
	}

	if err := h.db.DeleteBook(r.Context(), bookID, userID); err != nil {
		slog.Error("Failed to delete book", "error", err)
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// POST /api/books/{id}/pages
func (h *Handler) HandleInsertPage(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	bookID := r.PathValue("id")
	if bookID == "" {
		writeError(w, http.StatusBadRequest, "book_id is required")
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	resp, err := h.ctxSvc.InsertPage(r.Context(), userID, ctxbridge.InsertPageRequest{
		BookID:  bookID,
		Content: req.Content,
	})
	if err != nil {
		slog.Error("Failed to insert page", "error", err)
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"page_id":    resp.PageID,
		"page_index": resp.PageIndex,
		"stored_at":  resp.StoredAt,
	})
}

// PUT /api/books/{id}/pages/{index}
func (h *Handler) HandleUpdatePage(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPut {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	bookID := r.PathValue("id")
	if bookID == "" {
		writeError(w, http.StatusBadRequest, "book_id is required")
		return
	}
	pageIndexStr := r.PathValue("index")
	if pageIndexStr == "" {
		writeError(w, http.StatusBadRequest, "page_index is required")
		return
	}
	pageIndex, err := strconv.Atoi(pageIndexStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid page_index")
		return
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	resp, err := h.ctxSvc.UpdatePage(r.Context(), userID, ctxbridge.UpdatePageRequest{
		BookID:    bookID,
		PageIndex: pageIndex,
		Content:   req.Content,
	})
	if err != nil {
		slog.Error("Failed to update page", "error", err)
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"book_id":    resp.BookID,
		"page_index": resp.PageIndex,
		"updated_at": resp.UpdatedAt,
	})
}

// DELETE /api/books/{id}/pages/{index}
func (h *Handler) HandleDeletePage(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodDelete {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	bookID := r.PathValue("id")
	if bookID == "" {
		writeError(w, http.StatusBadRequest, "book_id is required")
		return
	}
	pageIndexStr := r.PathValue("index")
	if pageIndexStr == "" {
		writeError(w, http.StatusBadRequest, "page_index is required")
		return
	}
	pageIndex, err := strconv.Atoi(pageIndexStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid page_index")
		return
	}

	if err := h.ctxSvc.DeletePage(r.Context(), userID, bookID, pageIndex); err != nil {
		slog.Error("Failed to delete page", "error", err)
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GET /api/clients
func (h *Handler) HandleListClients(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	clients, err := h.db.ListClients(r.Context(), userID)
	if err != nil {
		slog.Error("Failed to list clients", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to list clients")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"clients": clients,
	})
}

// DELETE /api/clients/{id}
func (h *Handler) HandleDeleteClient(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodDelete {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	clientID := r.PathValue("id")
	if clientID == "" {
		writeError(w, http.StatusBadRequest, "client_id is required")
		return
	}

	if err := h.db.RevokeAllTokensForClient(r.Context(), clientID, userID); err != nil {
		slog.Error("Failed to revoke client tokens", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to disconnect client")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// POST /api/search
func (h *Handler) HandleSearch(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		Query string   `json:"query"`
		Tags  []string `json:"tags"`
		Limit int      `json:"limit"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	if req.Limit <= 0 {
		req.Limit = 10
	}

	results, err := h.ctxSvc.SearchPages(r.Context(), userID, ctxbridge.SearchPagesRequest{
		Query: req.Query,
		Tags:  req.Tags,
		Limit: req.Limit,
	})
	if err != nil {
		slog.Error("Search failed", "error", err)
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"results": results,
	})
}

// GET /api/search/suggest
func (h *Handler) HandleSearchSuggestions(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	q := r.URL.Query().Get("q")
	if q == "" {
		writeJSON(w, http.StatusOK, map[string]interface{}{"suggestions": []any{}})
		return
	}

	results, err := h.db.SearchSuggestions(r.Context(), userID, q, 8)
	if err != nil {
		slog.Error("Suggestions failed", "error", err)
		writeError(w, http.StatusInternalServerError, "Search failed")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"suggestions": results,
	})
}

// GET /api/books/{id}/related
func (h *Handler) HandleGetRelatedBooks(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id is required")
		return
	}

	books, err := h.db.GetRelatedBooks(r.Context(), id, userID, 3)
	if err != nil {
		slog.Error("Failed to get related books", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load related books")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"books": books,
	})
}

func (h *Handler) HandleListClusters(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	clusters, err := h.db.ListUserClusters(r.Context(), userID)
	if err != nil {
		slog.Error("Failed to list clusters", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to load clusters")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"clusters": clusters,
	})
}

// POST /api/clusters
func (h *Handler) HandleCreateCluster(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		Name  string   `json:"name"`
		Tags  []string `json:"tags"`
		Color string   `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	cluster, err := h.db.CreateUserCluster(r.Context(), userID, req.Name, req.Tags, req.Color)
	if err != nil {
		slog.Error("Failed to create cluster", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to create cluster")
		return
	}

	writeJSON(w, http.StatusCreated, cluster)
}

// PUT /api/clusters/{id}
func (h *Handler) HandleUpdateCluster(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPut {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id is required")
		return
	}

	var req struct {
		Name  string   `json:"name"`
		Tags  []string `json:"tags"`
		Color string   `json:"color"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	if err := h.db.UpdateUserCluster(r.Context(), id, userID, req.Name, req.Tags, req.Color); err != nil {
		slog.Error("Failed to update cluster", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to update cluster")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"updated": "true"})
}

// DELETE /api/clusters/{id}
func (h *Handler) HandleDeleteCluster(w http.ResponseWriter, r *http.Request) {
	h.authH.SetCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodDelete {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	userID := h.authH.UserFromSession(r)
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id is required")
		return
	}

	if err := h.db.DeleteUserCluster(r.Context(), id, userID); err != nil {
		slog.Error("Failed to delete cluster", "error", err)
		writeError(w, http.StatusInternalServerError, "Failed to delete cluster")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
