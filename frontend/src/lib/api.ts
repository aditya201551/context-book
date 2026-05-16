import type { ListBooksResponse, SearchResponse, Book, BookSummary, RankedPage } from '../types';

const BASE = (import.meta.env.VITE_API_URL as string) ?? '';

function normalizeBook(b: any): Book {
  return { ...b, tags: b.tags || [], pages: b.pages || [] };
}

function normalizeBookSummary(b: any): BookSummary {
  return { ...b, tags: b.tags || [] };
}

async function handleResponse(resp: Response): Promise<any> {
  if (!resp.ok) {
    let data: any = {};
    try { data = await resp.json(); } catch {}
    throw new Error(data.error || `Request failed (${resp.status})`);
  }
  return resp.json().catch(() => ({}));
}

export const api = {
  async get(url: string) {
    const resp = await fetch(BASE + url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    return handleResponse(resp);
  },
  async post(url: string, body: unknown) {
    const resp = await fetch(BASE + url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse(resp);
  },
  async put(url: string, body: unknown) {
    const resp = await fetch(BASE + url, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse(resp);
  },
  async patch(url: string, body: unknown) {
    const resp = await fetch(BASE + url, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse(resp);
  },
  async del(url: string) {
    const resp = await fetch(BASE + url, {
      method: 'DELETE',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    return handleResponse(resp);
  },

  me: () => api.get('/api/me'),
  updateMe: (body: { display_name: string }) => api.patch('/api/me', body),

  listBooks: async (params?: { limit?: number; offset?: number; sort?: string }): Promise<ListBooksResponse> => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    if (params?.sort) qs.set('sort', params.sort);
    const data = await api.get(`/api/books?${qs.toString()}`);
    return { ...data, books: (data.books || []).map(normalizeBookSummary) };
  },

  createBook: (title: string, tags: string[]): Promise<Book> =>
    api.post('/api/books', { title, tags }),

  getBook: async (id: string): Promise<Book> => {
    const data = await api.get(`/api/books/${id}`);
    return normalizeBook(data);
  },

  updateBook: (id: string, title: string, tags: string[]): Promise<{ book_id: string; updated: boolean }> =>
    api.put(`/api/books/${id}`, { title, tags }),

  deleteBook: (id: string): Promise<void> => api.del(`/api/books/${id}`).then(() => undefined),

  insertPage: (bookID: string, content: string): Promise<{ page_id: string; page_index: number; stored_at: string }> =>
    api.post(`/api/books/${bookID}/pages`, { content }),

  updatePage: (bookID: string, pageIndex: number, content: string): Promise<{ book_id: string; page_index: number; updated_at: string }> =>
    api.put(`/api/books/${bookID}/pages/${pageIndex}`, { content }),

  deletePage: (bookID: string, pageIndex: number): Promise<void> =>
    api.del(`/api/books/${bookID}/pages/${pageIndex}`).then(() => undefined),

  search: async (query: string, tags?: string[], limit?: number): Promise<SearchResponse> => {
    const data = await api.post('/api/search', { query, tags: tags || [], limit: limit || 10 });
    return { results: (data.results || []).map((r: any) => ({ ...r, tags: r.tags || [] })) };
  },
  searchSuggest: async (q: string, limit = 8) => {
    const data = await api.get(`/api/search/suggest?q=${encodeURIComponent(q)}&limit=${limit}`);
    return data.suggestions || [];
  },

  tokens: () => api.get('/api/tokens'),
  revokeToken: (tokenHash: string) => api.post('/api/tokens/revoke', { token_hash: tokenHash }),
  logout: () => api.post('/api/auth/logout', {}),
  clients: () => api.get('/api/clients'),
  disconnectClient: (clientID: string) => api.del(`/api/clients/${clientID}`),
  clusters: () => api.get('/api/clusters'),
  createCluster: (body: { name: string; tags: string[]; color: string }) => api.post('/api/clusters', body),
  updateCluster: (id: string, body: { name: string; tags: string[]; color: string }) => api.put(`/api/clusters/${id}`, body),
  deleteCluster: (id: string) => api.del(`/api/clusters/${id}`),
};
