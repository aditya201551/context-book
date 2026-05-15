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
	"golang.org/x/oauth2/github"
)

func githubOAuthConfig(cfg *config.Config) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     cfg.GitHubClientID,
		ClientSecret: cfg.GitHubClientSecret,
		RedirectURL:  cfg.PublicURL + "/auth/github/callback",
		Scopes:       []string{"read:user", "user:email"},
		Endpoint:     github.Endpoint,
	}
}

func (h *Handlers) HandleGitHubLogin(w http.ResponseWriter, r *http.Request) {
	next := r.URL.Query().Get("next")
	if next == "" {
		next = h.Cfg.FrontendURL + "/dashboard"
	} else if strings.HasPrefix(next, "/") {
		next = h.Cfg.FrontendURL + next
	}

	csrf, err := generateRandomString(16)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	isProd := h.Cfg.Env != "development"
	http.SetCookie(w, &http.Cookie{
		Name:     "github_oauth_state",
		Value:    csrf,
		Path:     "/",
		HttpOnly: true,
		Secure:   isProd,
		MaxAge:   300,
		SameSite: http.SameSiteLaxMode,
	})

	state := csrf + "|" + next
	oauthCfg := githubOAuthConfig(h.Cfg)
	url := oauthCfg.AuthCodeURL(state, oauth2.AccessTypeOnline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func (h *Handlers) HandleGitHubCallback(w http.ResponseWriter, r *http.Request) {
	state := r.URL.Query().Get("state")
	code := r.URL.Query().Get("code")
	errParam := r.URL.Query().Get("error")

	if errParam != "" {
		slog.Warn("GitHub OAuth error", "error", errParam)
		http.Redirect(w, r, h.Cfg.FrontendURL+"/login?error="+errParam, http.StatusTemporaryRedirect)
		return
	}

	stateCookie, err := r.Cookie("github_oauth_state")
	if err != nil || !strings.HasPrefix(state, stateCookie.Value+"|") {
		slog.Warn("GitHub OAuth state mismatch")
		http.Error(w, "invalid state", http.StatusBadRequest)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:    "github_oauth_state",
		Value:   "",
		Path:    "/",
		MaxAge:  -1,
		Expires: time.Unix(0, 0),
	})

	next := state[len(stateCookie.Value)+1:]
	if next == "" {
		next = h.Cfg.FrontendURL + "/dashboard"
	}

	oauthCfg := githubOAuthConfig(h.Cfg)
	token, err := oauthCfg.Exchange(context.Background(), code)
	if err != nil {
		slog.Error("GitHub token exchange failed", "error", err)
		http.Redirect(w, r, h.Cfg.FrontendURL+"/login?error=token_exchange_failed", http.StatusTemporaryRedirect)
		return
	}

	userInfo, err := fetchGitHubUserInfo(token.AccessToken)
	if err != nil {
		slog.Error("Failed to fetch GitHub user info", "error", err)
		http.Redirect(w, r, h.Cfg.FrontendURL+"/login?error=userinfo_failed", http.StatusTemporaryRedirect)
		return
	}

	user, err := h.DB.UpsertUserByProvider(r.Context(), "github", userInfo.ID, userInfo.Email, userInfo.Name)
	if err != nil {
		slog.Error("Failed to upsert GitHub user", "error", err)
		http.Redirect(w, r, h.Cfg.FrontendURL+"/login?error=db_error", http.StatusTemporaryRedirect)
		return
	}

	slog.Info("GitHub login successful", "user_id", user.ID, "email", user.Email)
	h.setSession(w, user.ID)
	http.Redirect(w, r, next, http.StatusTemporaryRedirect)
}

type githubUserInfo struct {
	ID    string `json:"node_id"` // stable string ID
	Login string `json:"login"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func fetchGitHubUserInfo(accessToken string) (*githubUserInfo, error) {
	req, err := http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github user API returned %d", resp.StatusCode)
	}

	var info githubUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}
	if info.ID == "" {
		return nil, fmt.Errorf("github user info missing node_id")
	}

	// GitHub doesn't always expose email in the user endpoint (privacy setting).
	// Fall back to the /user/emails endpoint to get the primary verified email.
	if info.Email == "" {
		info.Email, err = fetchGitHubPrimaryEmail(accessToken)
		if err != nil {
			return nil, err
		}
	}

	// Use login as display name fallback if Name is blank.
	if info.Name == "" {
		info.Name = info.Login
	}

	return &info, nil
}

type githubEmail struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
}

func fetchGitHubPrimaryEmail(accessToken string) (string, error) {
	req, err := http.NewRequest("GET", "https://api.github.com/user/emails", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github emails API returned %d", resp.StatusCode)
	}

	var emails []githubEmail
	if err := json.NewDecoder(resp.Body).Decode(&emails); err != nil {
		return "", err
	}

	for _, e := range emails {
		if e.Primary && e.Verified {
			return e.Email, nil
		}
	}
	return "", fmt.Errorf("no primary verified email found on GitHub account")
}
