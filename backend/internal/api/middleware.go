package api

import "net/http"

// authedHandler is a route handler that runs only after the shared preamble
// (CORS, OPTIONS, method, session) has passed. userID is the authenticated user.
type authedHandler func(w http.ResponseWriter, r *http.Request, userID string)

// protected wraps an authedHandler with the preamble every API route shares:
// CORS headers, OPTIONS short-circuit, method enforcement, and session auth.
// This replaces the ~18 lines that were copy-pasted into every handler.
func (h *Handler) protected(method string, fn authedHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h.authH.SetCORSHeaders(w, r)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if r.Method != method {
			writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
			return
		}
		userID := h.authH.UserFromSession(r)
		if userID == "" {
			writeError(w, http.StatusUnauthorized, "Unauthorized")
			return
		}
		fn(w, r, userID)
	}
}
