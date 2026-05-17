# ContextBook — Frontend

A Vite + React 19 + TypeScript single-page app for managing your ContextBook library, viewing AI client connections, and performing semantic search.

## Quick Start

```bash
cd frontend
npm install
cp ../.env.example .env   # Edit VITE_API_URL and VITE_MCP_URL if needed
npm run dev                # http://localhost:5173
```

The dev server proxies `/api/*` and auth routes to the backend at `:8080`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `''` (same-origin) | Backend API base URL |
| `VITE_MCP_URL` | `http://localhost:8081/mcp` | MCP endpoint URL shown in settings |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19.2 |
| Router | React Router DOM 7 |
| Build | Vite 8 |
| Language | TypeScript 5.6 (strict) |
| Styling | Pure CSS (custom properties — no Tailwind, no CSS-in-JS) |
| Icons | Custom `<Icon>` component (34 inline SVGs) |
| API | Native `fetch` with `credentials: 'include'` |

## Routes

| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| `/login` | `LoginPage` | Public | Google + GitHub OAuth buttons |
| `/authorize` | Inline | Public → Session | OAuth 2.0 consent screen for MCP clients |
| `/dashboard` | `Dashboard` | Session | Stats, recent books, popular tags, connected clients |
| `/library` | `Library` | Session | Browse books — clusters, filters, sort, view modes |
| `/settings` | `Settings` | Session | Profile, connected clients, installation info |
| `/search` | `SearchBar` redirect | Session | Redirects to ⌘K command palette |

Unauthenticated users are redirected to `/login?next=<original-url>`.

## Key Components

| Component | Purpose |
|-----------|---------|
| `App.tsx` | Root: BrowserRouter, routes, `AppShell` (central state owner) |
| `Dashboard.tsx` | Stats cards, quick actions, recent books, popular tags, AI clients |
| `Library.tsx` | Cluster strip, source filter, sort, view mode switcher |
| `DetailDrawer.tsx` | Book detail slide-over — pages, related books, copy, edit, delete |
| `CreateForm.tsx` | Multi-page editor with draft auto-save to `localStorage` |
| `CommandPalette.tsx` | ⌘K semantic search via `POST /api/search` |
| `Settings.tsx` | General (display name), Clients (list + disconnect), Installation (MCP URL copy) |
| `SearchBar.tsx` | Trigram suggestion dropdown with keyboard navigation |
| `Sidebar.tsx` | Brand, nav items, source filters, user info |
| `LoginPage.tsx` | OAuth login (Google + GitHub), Greek temple SVG |
| `ClusterForm.tsx` | Create/edit tag cluster modal |
| `ErrorBoundary.tsx` | React error boundary with reload option |

## Design System

All styles live in `src/styles.css` (~2600 lines) using CSS custom properties.

| Property | Options |
|----------|---------|
| Theme | `midnight` (default), `slate` |
| Accent | `amber` (default), `violet`, `green`, `coral`, `cyan` |
| Density | `compact`, `comfortable` (default), `roomy` |
| Typography | Inter (sans), JetBrains Mono (mono), Cormorant Garamond (decorative) |
| Background | `#0c0b0a` (dark) |

UI preferences persist in `localStorage` under the `cb_tweaks` key.

## State Management

No external state library. `AppShell` in `App.tsx` owns all state:

- `books[]` — book library data
- `isAuthenticated` — auth gating
- `tweaks` — UI preferences (persisted to `localStorage`)
- `route / view` — current navigation
- `cmdkOpen / openBook / createOpen / tweaksOpen` — modal/panel open states
- `activeTags / activeSource` — library filters
- `editingBook / focusPageIndex` — edit context

State flows down via props. `refreshBooks()` is memoized with `useCallback` and passed where needed.

## API Client (`src/lib/api.ts`)

Hand-rolled `fetch` wrapper — no Axios, no SWR, no React Query.

| Group | Methods |
|-------|---------|
| Auth | `me()`, `updateMe()`, `logout()` |
| Books | `listBooks()`, `createBook()`, `getBook()`, `updateBook()`, `deleteBook()` |
| Pages | `insertPage()`, `updatePage()`, `deletePage()` |
| Search | `search(query, tags?, limit?)`, `searchSuggest(q, limit?)` |
| Related | `getRelatedBooks(id)` |
| OAuth | `getAuthorizeInfo()`, `authorizeApprove()`, `authorizeDeny()` |
| Tokens/Clients | `tokens()`, `revokeToken()`, `clients()`, `disconnectClient()` |
| Clusters | `clusters()`, `createCluster()`, `updateCluster()`, `deleteCluster()` |

Auth is cookie-based (`credentials: 'include'` on all requests).

## Development

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Type-check + production build
npm run lint      # ESLint
npm run preview   # Preview production build locally
```

## Project Structure

```
src/
  main.tsx                  Entry point
  App.tsx                   Router + AppShell (central state)
  styles.css                Full design system (CSS custom properties)
  types.ts                  Shared TypeScript interfaces
  lib/
    api.ts                  HTTP API client
    utils.ts                Theme constants, formatters, scoring
  components/
    Dashboard.tsx           Home view
    Library.tsx             Book library
    LoginPage.tsx           OAuth login
    Settings.tsx             Settings tabs
    Sidebar.tsx             Navigation sidebar
    DetailDrawer.tsx        Book detail slide-over
    CreateForm.tsx           Create/edit book form
    CommandPalette.tsx       ⌘K search
    SearchBar.tsx            Type-ahead search
    ContextCard.tsx          Card view
    ContextRow.tsx            Row view
    ContextCompactRow.tsx    Compact row view
    ClusterForm.tsx          Cluster create/edit modal
    EmptyState.tsx            Empty state illustrations
    CopyBtn.tsx               Clipboard copy button
    ErrorBoundary.tsx         Error boundary
    Icon.tsx                  SVG icon component (34 icons)
    TweaksPanel.tsx           Theme/accent/density settings
```

## Contributing

1. Make changes in a feature branch
2. Run `npm run lint` and `npm run build` before committing
3. Open a Pull Request
