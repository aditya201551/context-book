package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/contextbook/config"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func googleOAuthConfig(cfg *config.Config) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     cfg.GoogleClientID,
		ClientSecret: cfg.GoogleClientSecret,
		RedirectURL:  cfg.PublicURL + "/auth/google/callback",
		Scopes: []string{
			"openid",
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}
}

// HandleGoogleLogin redirects the user to Google's OAuth consent page.
// The `next` query param (e.g. the /authorize URL) is embedded in the state
// so the callback can restore the full redirect chain.
func (h *Handlers) HandleGoogleLogin(w http.ResponseWriter, r *http.Request) {
	next := r.URL.Query().Get("next")
	if next == "" {
		next = h.Cfg.FrontendURL + "/dashboard"
	} else if strings.HasPrefix(next, "/") {
		// Relative path from the frontend — make it absolute so the callback
		// redirects to the frontend host, not the API host.
		next = h.Cfg.FrontendURL + next
	}

	// Generate a CSRF token and store it in a short-lived cookie.
	csrf, err := generateRandomString(16)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	isProd := h.Cfg.Env != "development"
	http.SetCookie(w, &http.Cookie{
		Name:     "google_oauth_state",
		Value:    csrf,
		Path:     "/",
		HttpOnly: true,
		Secure:   isProd,
		MaxAge:   300, // 5 minutes — enough for the round-trip
		SameSite: http.SameSiteLaxMode,
	})

	// Encode both csrf and next into the state param so the callback can
	// validate CSRF and know where to redirect after login.
	state := csrf + "|" + next

	oauthCfg := googleOAuthConfig(h.Cfg)
	url := oauthCfg.AuthCodeURL(state, oauth2.AccessTypeOnline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// HandleGoogleCallback receives the code from Google, validates state,
// fetches the user profile, upserts the user, sets the session, then
// redirects to the original destination.
func (h *Handlers) HandleGoogleCallback(w http.ResponseWriter, r *http.Request) {
	state := r.URL.Query().Get("state")
	code := r.URL.Query().Get("code")
	errParam := r.URL.Query().Get("error")

	if errParam != "" {
		slog.Warn("Google OAuth error", "error", errParam)
		http.Redirect(w, r, h.Cfg.FrontendURL+"/login?error="+errParam, http.StatusTemporaryRedirect)
		return
	}

	// Validate CSRF
	stateCookie, err := r.Cookie("google_oauth_state")
	if err != nil || !strings.HasPrefix(state, stateCookie.Value+"|") {
		slog.Warn("Google OAuth state mismatch")
		http.Error(w, "invalid state", http.StatusBadRequest)
		return
	}

	// Clear the state cookie
	http.SetCookie(w, &http.Cookie{
		Name:    "google_oauth_state",
		Value:   "",
		Path:    "/",
		MaxAge:  -1,
		Expires: time.Unix(0, 0),
	})

	// Extract the next URL from state (everything after the first "|")
	next := state[len(stateCookie.Value)+1:]
	if next == "" {
		next = h.Cfg.FrontendURL + "/dashboard"
	}

	// Exchange code for tokens
	oauthCfg := googleOAuthConfig(h.Cfg)
	token, err := oauthCfg.Exchange(context.Background(), code)
	if err != nil {
		slog.Error("Google token exchange failed", "error", err)
		http.Redirect(w, r, h.Cfg.FrontendURL+"/login?error=token_exchange_failed", http.StatusTemporaryRedirect)
		return
	}

	// Fetch user info from Google
	userInfo, err := fetchGoogleUserInfo(token.AccessToken)
	if err != nil {
		slog.Error("Failed to fetch Google user info", "error", err)
		http.Redirect(w, r, h.Cfg.FrontendURL+"/login?error=userinfo_failed", http.StatusTemporaryRedirect)
		return
	}

	// Upsert user in our DB
	user, err := h.DB.UpsertUserByProvider(r.Context(), "google", userInfo.Sub, userInfo.Email, userInfo.Name)
	if err != nil {
		slog.Error("Failed to upsert Google user", "error", err)
		http.Redirect(w, r, h.Cfg.FrontendURL+"/login?error=db_error", http.StatusTemporaryRedirect)
		return
	}

	slog.Info("Google login successful", "user_id", user.ID, "email", user.Email)

	// Set our session cookie
	h.setSession(w, user.ID)

	http.Redirect(w, r, next, http.StatusTemporaryRedirect)
}

type googleUserInfo struct {
	Sub   string `json:"sub"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

func fetchGoogleUserInfo(accessToken string) (*googleUserInfo, error) {
	req, err := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v3/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("userinfo returned %d", resp.StatusCode)
	}

	var info googleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}
	if info.Sub == "" {
		return nil, fmt.Errorf("userinfo missing sub")
	}
	return &info, nil
}
