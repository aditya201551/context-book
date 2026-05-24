# ContextBook — Frontend Features & Working

> Document describing everything the frontend does and how it works. No design scheme is prescribed here.

---

## 1. Overview

The frontend is a single-page React application that serves three distinct audiences:
- **Unauthenticated visitors** → see a marketing landing page.
- **Authenticated users** → manage their "ContextBook" library (dashboard, library, settings).
- **AI clients / agents** → connect via OAuth 2.0 + MCP (the `/authorize` consent screen).

It talks to two backend servers:
- **REST API** (`:8080`) — sessions, CRUD, search, OAuth.
- **MCP Server** (`:8081`) — exposed to AI clients; the frontend only displays its URL.

---

## 2. Routes & Entry Points

| Route | Access | What It Does |
|-------|--------|--------------|
| `/` | Public | Marketing landing page. |
| `/login` | Public | OAuth sign-in with Google or GitHub. |
| `/authorize` | Session required | OAuth 2.0 consent screen — user approves/denies an MCP client’s request to access their library. |
| `/dashboard` | Session | Overview of the user’s library, stats, recent activity, connected clients. |
| `/library` | Session | Browse, filter, sort, and search all books/contexts. |
| `/settings` | Session | Profile, MCP installation guides, connected AI client management. |
| `/search` | Session | Redirects to the ⌘K command palette. |

Unauthenticated users hitting a protected route are redirected to `/login?next=<url>`.
Authenticated users hitting `/login` are bounced to `/dashboard`.

---

## 3. Authentication System

### Browser Session
- User clicks "Continue with Google/GitHub" → backend redirects → OAuth callback → HMAC-signed session cookie (7-day expiry).
- All `/api/*` requests carry `credentials: 'include'`.
- Session validation happens at app mount (`api.me()`). If it fails, the app falls back to the landing page.

### OAuth 2.0 Consent (`/authorize`)
- An AI client initiates OAuth PKCE flow.
- User lands on `/authorize?key=<pkce_key>`.
- Frontend fetches client info from `/api/oauth/authorize-info`.
- User sees client name, redirect URI, and client ID, then chooses **Approve** (form POST to `/api/oauth/authorize-approve`) or **Deny** (POST to `/api/oauth/authorize-deny`).

---

## 4. Dashboard

**Purpose:** Give the user an at-a-glance summary of their library and quick entry points.

**Features:**
- **Greeting** — time-of-day aware (Morning/Afternoon/Evening) using the user’s display name.
- **Quick Actions** — New context, Semantic search, Browse library, Import (placeholder).
- **Stats Strip** — Total contexts, source breakdown (with percentage bars), number of connected MCP clients.
- **Recent Activity** — Last 5 updated contexts with source glyph, title, top tags, and relative timestamp.
- **Popular Tags** — Top 12 tags sized by frequency; clicking a tag filters the library by that tag.
- **Connected AI Clients** — List of MCP clients (Claude, Cursor, etc.) with active/revoked status and last-seen time.
- **MCP Endpoint Hint** — Shows the MCP server URL for quick copy.
- **Empty State** — Custom illustration and CTA buttons when the library has no entries.

---

## 5. Library (Browse)

**Purpose:** The main place to explore, filter, and organize the user’s knowledge.

**Features:**
- **Cluster Strip** — Visual tag clusters (user-defined groups). Each cluster shows a constellation icon sized by member count. Clicking toggles all its tags in the active filter. Clusters can be created, edited, and deleted via a modal form.
- **Filter Bar** — Source filter chips (e.g., manual, Claude, Cursor); active tag chips with remove buttons; a "Clear all" button.
- **Sort** — Recent, Title A–Z, Largest (by token count).
- **View Modes** — 3 layouts:
  - **Cards** — Grid of contextual cards with title, tags, source, token count, and preview.
  - **Rows** — Full-row items with metadata.
  - **Compact** — Dense table-like list with index, source glyph, title, tags, updated time, tokens.
- **Search Query** — Client-side text search over titles and tags.
- **Empty States** — Different messaging for "library empty" vs "no matches for filters".

---

## 6. Context Creation & Editing

**Purpose:** Add or modify a book (a collection of pages) in the library.

**Features:**
- **Multi-page editor** — A book contains one or more pages. Each page is a markdown-friendly textarea.
- **Auto-save drafts** — Unsaved new books are persisted to `localStorage` (debounced 800ms). Auto-save does not run in edit mode.
- **Tag input** — Inline tag chips; tags are added on Enter/Comma/Blur.
- **Token estimate** — Real-time `~tokens` count (chars / 4).
- **Edit mode** — When opened from a detail drawer, pre-fills existing title, tags, and pages. On save, diffs pages: updates changed ones, inserts new ones, leaves unchanged ones untouched.
- **Keyboard** — Escape closes the drawer without saving.

---

## 7. Detail Drawer (Book View)

**Purpose:** Deep-dive into a single context without leaving the current page.

**Features:**
- **Metadata** — Source badge, creation/update dates, page count, token count, book ID.
- **Tags** — Displayed as chips with an "add" placeholder.
- **Page Blocks** — Each page shows:
  - Page index and token count.
  - Copy-to-clipboard for individual pages.
  - Expand/collapse for multi-line content (preview first 3 lines, click to expand).
  - Markdown-aware rendering (headings, bullets).
- **Related Books** — Fetched from `/api/books/{id}/related` using semantic similarity scores. Each result shows a match percentage and navigates to that book on click.
- **Actions** — Edit (opens the create/edit drawer), Copy entire book to clipboard, Delete (with toast confirmation).
- **Focus Page** — If opened from search with a specific page index, that page auto-expands and scrolls into view.

---

## 8. Command Palette (⌘K Search)

**Purpose:** Global semantic search and command dispatch.

**Features:**
- **Activation** — `⌘K`, `Ctrl+K`, or `/` key when not in a text field.
- **Semantic Search** — Queries are sent to `POST /api/search` (debounced 350ms). Backend embeds the query via Voyage AI and returns cosine-similar pages from pgvector.
- **Results** — For each match: source glyph, book title, content preview, page index, relevance score bar, and top tags.
- **Quick Actions** — New context, Import, Switch view (cards/rows/compact), Switch theme (midnight/slate), Navigate (dashboard/library/settings).
- **Recent Contexts** — When the palette opens with an empty query, shows the 6 most recent contexts (pinned first).
- **Keyboard Navigation** — `↑`/`↓` to navigate, `Enter` to select, `Esc` to close. Scrolls selected item into view automatically.

---

## 9. Settings

**Purpose:** Manage user profile, installation guides, and connected AI clients.

**Sub-tabs:**

### General
- **Display name** — Editable text field; PATCH `/api/me`.
- **Sign out** — Logs out and redirects to `/login`.
- **Social links** — GitHub and LinkedIn icons.

### Installation
- Shows the MCP endpoint URL with a copy button.
- **Cursor IDE** — One-click deep-link install (`cursor://anysphere.cursor-deeplink/mcp/install...`).
- **Claude Desktop** — Download `.mcpb` bundle (placeholder).
- **Claude Web** — Step-by-step guide for adding a custom connector at claude.ai.
- **Other clients** — Explains that any MCP-compliant client can connect using the endpoint.

### Connected Clients
- Lists all MCP clients registered by the user.
- Each card shows: client name, inferred source (Claude/Cursor/manual), active/revoked status, last-seen time.
- **Revoke** — Revokes tokens for a client (client must re-authorize).
- **Delete** — Permanently removes the client registration and all tokens.
- **Confirmation modal** — Danger-colored action with explanatory text before destructive operations.

---

## 10. Sidebar

**Purpose:** Persistent navigation and quick filtering.

**Features:**
- **Brand** — App name and tagline.
- **Navigation** — Dashboard, Library (with total count badge), Settings.
- **Connected Sources** — Dynamically populated from the user’s books. Each source shows its glyph, label, and count. Clicking toggles a source filter and navigates to the library.
- **User Chip** — Avatar initial, display name/email, provider. Clicking navigates to Settings.
- **Collapsed mode support** — Icons-only view (currently not the default).

---

## 11. Themes & Customization

**Purpose:** Let users adjust the look and feel.

**Customizable Properties:**
- **Theme** — `midnight` (default) or `slate` (alters background, panel, border, text colors).
- **Accent** — `amber`, `violet`, `green`, `coral`, `cyan` (affects buttons, highlights, focus rings).
- **Density** — `compact`, `comfortable` (default), `roomy` (affects padding/gap in CSS custom properties).
- **Default View** — Preferred library layout (cards/rows/compact).
- **Persistence** — All preferences stored in `localStorage` under `cb_tweaks`.
- **Empty Mode** — A debug/toggle mode that synthetically shows zero data without deleting real data.

---

## 12. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Toggle Command Palette |
| `/` | Open Command Palette (when not in input) |
| `N` (when no modal open) | Open New Context drawer |
| `Escape` | Close palette / Close drawer / Close create form (in that priority order) |

---

## 13. Data Model (Frontend Perspective)

### Book / Context
```
book_id   : string (UUID)
title     : string
source    : string  (e.g., 'manual', 'claude', 'cursor')
tags      : string[]
created_at: ISO string
updated_at: ISO string
pages?    : PageRow[]
```

### Page
```
id          : string
book_id     : string
page_index  : number (0-based)
content     : string (markdown-friendly)
token_count : number
created_at  : ISO string
updated_at  : ISO string
```

### BookSummary (used in lists)
```
book_id    : string
title      : string
source     : string
tags       : string[]
created_at : ISO string
updated_at : ISO string
page_count : number
token_count: number
preview    : string
```

### RankedPage (search result)
```
page_index : number
book_id    : string
title      : string
content    : string
source     : string
tags       : string[]
score      : number (0–1 cosine similarity)
stored_at  : ISO string
```

### User
```
id           : string
email        : string
display_name : string
provider     : string ('google' | 'github')
```

### UserCluster
```
id         : string
name       : string
tags       : string[]
color      : string (e.g., 'rose', 'sky', 'emerald')
sort_order : number
created_at : ISO string
```

### ClientInfo (connected MCP client)
```
client_id     : string
name          : string
last_used_at  : ISO string | null
created_at    : ISO string
active        : boolean
```

---

## 14. API Surface (Frontend Calls)

All calls use native `fetch` with `credentials: 'include'` (cookie auth).

### Auth
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/me` | GET | Current user profile |
| `/api/me` | PATCH | Update display name |
| `/api/auth/logout` | POST | Clear session |

### Books
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/books` | GET | List books (paginated, sortable) |
| `/api/books` | POST | Create a new book |
| `/api/books/{id}` | GET | Get full book with pages |
| `/api/books/{id}` | PUT | Update book metadata |
| `/api/books/{id}` | DELETE | Delete book |
| `/api/books/{id}/pages` | POST | Insert a page |
| `/api/books/{id}/pages/{idx}` | PUT | Update page content |
| `/api/books/{id}/pages/{idx}` | DELETE | Delete a page |
| `/api/books/{id}/related` | GET | Semantically related books |

### Search
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/search` | POST | Semantic search (query → embedding → cosine similarity) |
| `/api/search/suggest` | GET | Trigram text suggestions |

### Clusters
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/clusters` | GET | List tag clusters |
| `/api/clusters` | POST | Create cluster |
| `/api/clusters/{id}` | PUT | Update cluster |
| `/api/clusters/{id}` | DELETE | Delete cluster |

### OAuth / Clients
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/oauth/authorize-info` | GET | Consent screen data |
| `/api/oauth/authorize-approve` | POST | Approve OAuth request |
| `/api/oauth/authorize-deny` | POST | Deny OAuth request |
| `/api/clients` | GET | List connected MCP clients |
| `/api/clients/{id}` | DELETE | Disconnect a client |
| `/api/tokens` | GET | List active tokens |
| `/api/tokens/revoke` | POST | Revoke a token |

---

## 15. Key Workflows

### Add a New Context
1. User clicks **New context** (or presses `N`).
2. Create drawer slides in.
3. User fills title, tags (chips), and one or more pages (markdown-friendly textareas).
4. Draft auto-saves to `localStorage` every 800ms.
5. On save, frontend calls `POST /api/books` → then `POST /api/books/{id}/pages` for each non-empty page.
6. Backend embeds each page via Voyage AI and stores vectors in PostgreSQL.
7. Library refreshes; toast confirms save.

### Edit an Existing Context
1. User opens a book from the library or search.
2. Clicks **Edit** in the detail drawer.
3. Create drawer opens pre-filled.
4. On save, frontend diffs pages: updates changed pages via PUT, inserts new ones via POST.
5. Backend re-embeds updated pages.

### Semantic Search
1. User presses `⌘K` or `/`.
2. Types a query (e.g., "architecture decisions from March").
3. Debounced query sent to `POST /api/search`.
4. Backend embeds query, runs cosine similarity against `context_book_pages` vectors via pgvector.
5. Results ranked by score appear in the palette.
6. User selects a result → opens detail drawer focused on the matched page.

### Connect an AI Client (e.g., Cursor)
1. User goes to **Settings → Installation**.
2. Clicks "Add to Cursor" deep link.
3. Cursor opens with MCP URL pre-filled.
4. Cursor initiates OAuth PKCE → user lands on `/authorize`.
5. User approves → Cursor receives Bearer token.
6. Cursor can now call MCP tools (e.g., `page_search`, `book_get`) scoped to that user.

### Revoke an AI Client
1. User goes to **Settings → Connected clients**.
2. Clicks **Revoke** on a client.
3. Confirmation modal explains the effect.
4. Frontend calls `POST /api/tokens/revoke`.
5. Client’s tokens invalidated; status changes to "revoked".

---

## 16. State Ownership

No external state library. The root component (`AppShell`) owns all state:

| State | Description |
|-------|-------------|
| `books[]` | Full library data |
| `isAuthenticated` | Auth gating |
| `tweaks` | UI theme/accent/density preferences (persisted) |
| `route / view` | Current navigation |
| `cmdkOpen` | Command palette visibility |
| `openBook` | Currently opened detail drawer book |
| `createOpen` | Create/edit drawer visibility |
| `tweaksOpen` | Theme panel visibility |
| `activeTags[]` | Active tag filters in library |
| `activeSource` | Active source filter in library |
| `editingBook` | Book being edited (passed to CreateForm) |
| `focusPageIndex` | Specific page to scroll-to on drawer open |

State flows down via props. `refreshBooks()` is memoized with `useCallback` and passed to children that mutate data.

---

## 17. Empty States

Custom illustrations and copy exist for:
- Empty library (new user onboarding).
- No recent activity.
- No tags yet.
- No search results.
- No connected clients.
- No matching filters.

---

## 18. Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Framework | React 19 |
| Router | React Router DOM 7 |
| Build Tool | Vite 8 |
| Language | TypeScript 5.6 (strict) |
| Styling | Pure CSS (custom properties) — no Tailwind, no CSS-in-JS |
| Icons | Custom `<Icon>` component with 34 inline SVGs |
| API | Native `fetch` (no Axios, no React Query) |
| State | React built-in (useState, useEffect, useCallback, useMemo, useRef) |

