# ContextBook — Usage Guide for AI Agents

Welcome to ContextBook! This MCP server gives you persistent semantic memory. You can store, retrieve, and search information organized as **Books** (containers) and **Pages** (content chunks).

## Tools Reference

| Tool | Purpose |
| ------ | --------- |
| `create_or_update_book` | Create a new Book or update metadata on an existing one |
| `insert_page` | Push a page (≤1000 words) into a Book; embeds immediately |
| `update_page` | Replace a page's content by `book_id` + `page_index`; re-embeds |
| `delete_page` | Remove a page by `book_id` + `page_index` (indices not re-numbered) |
| `list_books` | Paginated list of Book metadata (no page content) |
| `get_book` | Retrieve all pages of a Book ordered by `page_index` |
| `search_pages` | Semantic search across all Books; optional tag filter |
| `readme` | Returns this guide (call once per session) |

## Knowledge Hierarchy

- **Book** — A metadata container for a topic (title, source, tags). Created with `create_or_update_book`.
- **Page** — An atomic content chunk inside a Book. Each page gets a 1024-dim embedding via Voyage AI for semantic search.

Pages are addressed by **composite key**: `book_id` (UUID) + `page_index` (integer, 0-based). You must provide **both** when updating or deleting a page.

## Workflow

### 1. Start a Session

Call `readme` once at the start of a session to load these instructions. You do not need to call it again.

### 2. Storing New Information

1. Call `create_or_update_book` with a descriptive `title`, `source`, and `tags`. **`title` and `source` are required.** `tags` is optional and defaults to `[]`. Store the returned `book_id`.
   - Omit `book_id` → creates a new Book.
   - Provide `book_id` → updates that Book's metadata (title, source, tags). If the ID doesn't exist, a new Book is created and a note is included in the response.
2. Call `insert_page` with the `book_id` and `content` (≤1000 words). The response returns the assigned `page_index`.
   - Split large content into meaningful, modular pages. Include some text overlap between consecutive pages to preserve semantic boundaries.
   - Every insertion triggers an immediate embedding, making the page searchable right away.

### 3. Searching & Retrieving

- **`search_pages`** — Pass a `query` (natural language) and optionally `tags` to filter results. Returns matching pages with `book_id`, `page_index`, and parent Book metadata. Default limit is 5, max 20.
- **`get_book`** — When a search returns a page snippet and you need surrounding context, pass the `book_id` to get all pages in order.
- **`list_books`** — Browse what's stored (metadata only, no content). Supports `limit` (default 20) and `offset` (default 0).

### 4. Modifying Stored Information

- **`update_page`** — Pass `book_id`, `page_index`, and new `content`. The content is re-embedded automatically. Subject to the same 1000-word limit.
- **`delete_page`** — Pass `book_id` and `page_index`. **Indices are not re-numbered after deletion.** Deleting page `1` from `[0, 1, 2]` leaves `[0, 2]`. Gaps are normal and expected.

## Best Practices

1. **Use descriptive tags** — Tags like `["kubernetes", "devops"]` dramatically improve `search_pages` filtering.
2. **Book first, then pages** — Always create the Book before inserting pages. Do not `insert_page` into an old Book unless the user explicitly asks.
3. **Store the `book_id`** — You need the `book_id` for every page operation. Keep it in memory after `create_or_update_book` returns it.
4. **Chunk wisely** — Each page should be a self-contained, meaningful unit. Overlapping text between consecutive pages preserves retrieval quality.
