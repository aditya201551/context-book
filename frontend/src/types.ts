export interface PageRow {
  id: string;
  book_id: string;
  page_index: number;
  content: string;
  token_count: number;
  created_at: string;
  updated_at: string;
}

export interface Book {
  book_id: string;
  title: string;
  source: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  pages?: PageRow[];
}

export interface BookSummary {
  book_id: string;
  title: string;
  source: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  page_count: number;
  token_count: number;
  preview: string;
}

export interface RankedPage {
  page_index: number;
  book_id: string;
  title: string;
  content: string;
  source: string;
  tags: string[];
  score: number;
  stored_at: string;
}

export interface User {
  id: string;
  email: string;
  display_name: string;
  provider: string;
}

export interface TokenInfo {
  token_hash: string;
  token_preview: string;
  client_id: string;
  created_at: string;
  last_used_at: string;
  expires_at: string;
}

export interface ClientInfo {
  client_id: string;
  name: string;
  last_used_at: string;
  created_at: string;
}

export interface ListBooksResponse {
  books: BookSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface SearchResponse {
  results: RankedPage[];
}

export type SourceKey = 'claude' | 'cursor' | 'user' | 'manual';

export interface SourceDef {
  label: string;
  glyph: string;
}

export type ViewMode = 'cards' | 'rows' | 'compact';
export type Density = 'compact' | 'comfortable' | 'roomy';

export interface Tweaks {
  accent: 'amber' | 'violet' | 'green' | 'coral' | 'cyan';
  theme: 'midnight' | 'slate';
  density: Density;
  defaultView: ViewMode;
  showClusters: boolean;
  showShortcuts: boolean;
  emptyMode?: boolean;
}

export interface SuggestionResult {
  book_id: string;
  title: string;
  source: string;
  tags: string[];
  score: number;
}

export interface UserCluster {
  id: string;
  name: string;
  tags: string[];
  color: string;
  sort_order: number;
  created_at: string;
}
