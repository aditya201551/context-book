import type { ListBooksResponse, SearchResponse, Book, BookSummary, User, TokenInfo, ClientInfo, UserCluster, ConstellationBook } from '../types';

const BASE = (import.meta.env.VITE_API_URL as string) ?? '';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

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
    throw new ApiError(data.error || `Request failed (${resp.status})`, resp.status);
  }
  return resp.json().catch(() => ({}));
}

// Dedupe concurrent identical GETs: while a request for `url` is in flight,
// callers share the same promise. Cleared on settle, so data is never stale.
const inFlightGets = new Map<string, Promise<any>>();

export const api = {
  get(url: string): Promise<any> {
    const existing = inFlightGets.get(url);
    if (existing) return existing;
    const p = (async () => {
      const resp = await fetch(BASE + url, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      return handleResponse(resp);
    })().finally(() => inFlightGets.delete(url));
    inFlightGets.set(url, p);
    return p;
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

  me: async (): Promise<User> => {
    const data = await api.get('/api/me');
    return { id: data.id, email: data.email, display_name: data.display_name, provider: data.provider };
  },
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

  tokens: async (): Promise<{ tokens: TokenInfo[] }> => {
    const data = await api.get('/api/tokens');
    return { tokens: (data.tokens || []) as TokenInfo[] };
  },
  revokeToken: (tokenHash: string) => api.post('/api/tokens/revoke', { token_hash: tokenHash }),
  logout: () => api.post('/api/auth/logout', {}),
  clients: async (): Promise<{ clients: ClientInfo[] }> => {
    const data = await api.get('/api/clients');
    return { clients: (data.clients || []) as ClientInfo[] };
  },
  disconnectClient: (clientID: string) => api.del(`/api/clients/${clientID}`),
  revokeClient: (clientID: string) => api.del(`/api/clients/${clientID}/tokens`),
  clusters: async (): Promise<{ clusters: UserCluster[] }> => {
    const data = await api.get('/api/clusters');
    return { clusters: (data.clusters || []) as UserCluster[] };
  },
  createCluster: (body: { name: string; tags: string[]; color: string }) => api.post('/api/clusters', body),
  updateCluster: (id: string, body: { name: string; tags: string[]; color: string }) => api.put(`/api/clusters/${id}`, body),
  deleteCluster: (id: string) => api.del(`/api/clusters/${id}`),
  constellation: async (): Promise<{ books: ConstellationBook[]; minimum_required?: number; current_count?: number; edge_threshold_floor?: number }> => {
    const data = await api.get('/api/constellation');
    const books = (data.books || []).map((b: any) => ({ ...b, tags: b.tags || [] })) as ConstellationBook[];
    return {
      books,
      minimum_required: data.minimum_required,
      current_count: data.current_count,
      edge_threshold_floor: data.edge_threshold_floor,
    };
  },
};
