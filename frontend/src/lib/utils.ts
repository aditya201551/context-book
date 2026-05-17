export const TWEAK_DEFAULTS = {
  accent: 'amber' as const,
  theme: 'midnight' as const,
  density: 'comfortable' as const,
  defaultView: 'cards' as const,
  showClusters: true,
  emptyMode: false,
};

export const ACCENTS: Record<string, { solid: string; soft: string; ring: string; text: string }> = {
  amber:   { solid: '#e8b765', soft: 'rgba(232,183,101,0.12)', ring: 'rgba(232,183,101,0.35)', text: '#f0c678' },
  violet:  { solid: '#a78bfa', soft: 'rgba(167,139,250,0.12)', ring: 'rgba(167,139,250,0.35)', text: '#b6a1fb' },
  green:   { solid: '#7dd88f', soft: 'rgba(125,216,143,0.12)', ring: 'rgba(125,216,143,0.35)', text: '#8fe39f' },
  coral:   { solid: '#ff8c7a', soft: 'rgba(255,140,122,0.12)', ring: 'rgba(255,140,122,0.35)', text: '#ff9d8d' },
  cyan:    { solid: '#6ec9d6', soft: 'rgba(110,201,214,0.12)', ring: 'rgba(110,201,214,0.35)', text: '#82d4e0' },
};

export const THEMES: Record<string, Record<string, string>> = {
  midnight: {
    bg: '#0c0c0e', panel: '#141416', raised: '#1a1a1d', border: '#232328', borderSoft: '#1c1c20',
    text: '#e8e8ea', textDim: '#9a9a9f', textMuted: '#66666b', hover: '#1d1d21',
  },
  slate: {
    bg: '#0e1014', panel: '#151820', raised: '#1c2029', border: '#252a36', borderSoft: '#1d222d',
    text: '#e6e8ed', textDim: '#8e93a0', textMuted: '#5a5f6b', hover: '#1f232d',
  },
};

export const SOURCES: Record<string, { label: string; glyph: string }> = {
  claude: { label: 'Claude', glyph: 'Cl' },
  cursor: { label: 'Cursor', glyph: 'Cu' },
  user:   { label: 'Manual', glyph: 'Me' },
  manual: { label: 'Manual', glyph: 'Me' },
};

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400 / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getSource(src?: string): { label: string; glyph: string } {
  return SOURCES[src || ''] || { label: src || 'Unknown', glyph: (src || '?').slice(0, 2).toUpperCase() };
}

export function ctxTokens(book: { pages?: { content: string; token_count?: number }[] }): number {
  if (!book.pages) return 0;
  return book.pages.reduce((sum, p) => {
    if (typeof p.token_count === 'number') return sum + p.token_count;
    return sum + Math.ceil(p.content.length / 4);
  }, 0);
}

export function ctxUpdated(book: { updated_at?: string; created_at?: string }): string {
  return book.updated_at || book.created_at || new Date().toISOString();
}
