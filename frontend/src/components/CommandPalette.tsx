import { useState, useEffect, useRef, useMemo } from 'react';
import type { BookSummary, RankedPage } from '../types';
import { getSource } from '../lib/utils';
import { api } from '../lib/api';
import Icon from './Icon';

interface Action {
  id: string; label: string; hint?: string; kind: string;
}

const ACTIONS: Action[] = [
  { id: 'new', label: 'New context', hint: 'Create a new context manually', kind: 'action' },
  { id: 'import', label: 'Import from JSON', hint: 'Bulk import contexts', kind: 'action' },
  { id: 'view-cards', label: 'Switch view: Cards', kind: 'action' },
  { id: 'view-rows', label: 'Switch view: Rows', kind: 'action' },
  { id: 'view-compact', label: 'Switch view: Compact', kind: 'action' },
  { id: 'theme-midnight', label: 'Theme: Midnight', kind: 'action' },
  { id: 'theme-slate', label: 'Theme: Slate', kind: 'action' },
  { id: 'nav-dashboard', label: 'Go to Dashboard', kind: 'nav' },
  { id: 'nav-library', label: 'Go to Library', kind: 'nav' },
  { id: 'nav-settings', label: 'Go to Settings', kind: 'nav' },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  books: BookSummary[];
  onOpenBook: (book: BookSummary) => void;
  onOpenPage?: (bookId: string, pageIndex: number) => void;
  onAction: (id: string) => void;
}

export default function CommandPalette({ open, onClose, books, onOpenBook, onOpenPage, onAction }: CommandPaletteProps) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RankedPage[]>([]);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const debouncedQ = useDebounce(q.trim(), 350);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setQ('');
      setSel(0);
      setResults([]);
      setError('');
      setLoading(false);
    }
  }, [open]);

  // Real semantic search via backend
  useEffect(() => {
    if (!debouncedQ) {
      setResults([]);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    api.search(debouncedQ, [], 10)
      .then(data => {
        setResults(data.results || []);
      })
      .catch(err => {
        setError(err.message || 'Search failed');
        setResults([]);
      })
      .finally(() => setLoading(false));
  }, [debouncedQ]);

  const actions = useMemo(() => {
    if (!q.trim()) return ACTIONS.slice(0, 4);
    const qlc = q.toLowerCase();
    return ACTIONS
      .map(a => ({ ...a, _score: (a.label.toLowerCase().includes(qlc) ? 1 : 0) + (a.hint?.toLowerCase().includes(qlc) ? 0.5 : 0) }))
      .filter((a: any) => a._score > 0)
      .sort((a: any, b: any) => b._score - a._score);
  }, [q]);

  const flat = useMemo(() => {
    const items: { kind: 'action' | 'book'; data: any }[] = [];
    actions.forEach(a => items.push({ kind: 'action', data: a }));
    results.forEach(r => items.push({ kind: 'book', data: r }));
    return items;
  }, [actions, results]);

  useEffect(() => { setSel(0); }, [q, results.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, flat.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
		else if (e.key === 'Enter') {
			e.preventDefault();
			const item = flat[sel];
			if (!item) return;
			if (item.kind === 'action') { onAction(item.data.id); onClose(); }
			else {
				const r = item.data as RankedPage;
				if (onOpenPage) {
					onOpenPage(r.book_id, r.page_index);
				} else {
					const synthetic: BookSummary = {
						book_id: r.book_id,
						title: r.title,
						source: r.source,
						tags: r.tags || [],
						created_at: r.stored_at,
						updated_at: r.stored_at,
						page_count: 0,
						token_count: 0,
						preview: r.content.slice(0, 200),
					};
					onOpenBook(synthetic);
				}
				onClose();
			}
		}
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flat, sel, onClose, onAction, onOpenBook]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${sel}"]`);
    if (!el) return;
    const parent = listRef.current;
    const elTop = (el as HTMLElement).offsetTop;
    const elBot = elTop + (el as HTMLElement).offsetHeight;
    if (elTop < parent.scrollTop) parent.scrollTop = elTop - 4;
    else if (elBot > parent.scrollTop + parent.clientHeight) parent.scrollTop = elBot - parent.clientHeight + 4;
  }, [sel]);

  if (!open) return null;

  let idx = -1;
  const recentBooks = books.filter(b => b.tags?.includes('pinned')).concat(books.filter(b => !b.tags?.includes('pinned'))).slice(0, 6);

  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk" onClick={e => e.stopPropagation()}>
        <div className="cmdk-head">
          <div className="cmdk-search">
            <Icon name="sparkle" size={16} />
            <input ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Ask anything, or type a command…"
              spellCheck={false}
              autoComplete="off" />
            {loading && (
              <span className="cmdk-meter">
                <span className="cmdk-meter-dot pulsing" />
                embedding query…
              </span>
            )}
            {!loading && q && !error && (
              <span className="cmdk-meter">
                <span className="cmdk-meter-dot" />
                {results.length} results
              </span>
            )}
          </div>
        </div>

        <div className="cmdk-body" ref={listRef}>
          {actions.length > 0 && (
            <div className="cmdk-section">
              <div className="cmdk-section-title">{q ? 'Actions' : 'Quick actions'}</div>
              {actions.map((a: any) => {
                idx++;
                const i = idx;
                return (
                  <div key={a.id}
                    data-idx={i}
                    className={`cmdk-item cmdk-action ${sel === i ? 'selected' : ''}`}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => { onAction(a.id); onClose(); }}>
                    <span className="cmdk-item-icon action-icon"><Icon name={a.id === 'new' ? 'plus' : a.id === 'import' ? 'import' : 'chev'} size={14}/></span>
                    <span className="cmdk-item-label">{a.label}</span>
                    {a.hint && <span className="cmdk-item-hint">{a.hint}</span>}
                    {sel === i && <span className="cmdk-enter"><Icon name="enter" size={11}/></span>}
                  </div>
                );
              })}
            </div>
          )}

          {!q.trim() && recentBooks.length > 0 && (
            <div className="cmdk-section">
              <div className="cmdk-section-title">Recent contexts</div>
              {recentBooks.map((c: any) => {
                idx++;
                const i = idx;
                return (
                  <div key={c.book_id}
                    data-idx={i}
                    className={`cmdk-item cmdk-ctx ${sel === i ? 'selected' : ''}`}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => { onOpenBook(c); onClose(); }}>
                    <span className={`cmdk-item-icon ${c.source === 'claude' ? 'src-claude' : c.source === 'cursor' ? 'src-cursor' : 'src-manual'}`}>{getSource(c.source).glyph}</span>
                    <div className="cmdk-ctx-main">
                      <div className="cmdk-ctx-title">{c.title}</div>
                      <div className="cmdk-ctx-preview">{c.tags?.slice(0,3).join(', ') || ''}</div>
                    </div>
                    <div className="cmdk-ctx-meta">
                      <span className="cmdk-tags mono">{c.tags?.slice(0,2).map((t: string) => `#${t}`).join(' ') || ''}</span>
                    </div>
                    {sel === i && <span className="cmdk-enter"><Icon name="enter" size={11}/></span>}
                  </div>
                );
              })}
            </div>
          )}

          {q.trim() && (
            <div className="cmdk-section">
              <div className="cmdk-section-title">
                {loading ? 'Searching…' : error ? 'Search error' : results.length === 0 ? 'No matches' : 'Semantically similar pages'}
              </div>
              {error && <div className="empty-hint" style={{padding: 12}}>{error}</div>}
              {!loading && !error && results.length === 0 && (
                <div className="empty-state" style={{padding: 20}}>
                  <div className="empty-state-title">No matches</div>
                  <div className="empty-hint">Try rephrasing — semantic search works on meaning, not just keywords.</div>
                </div>
              )}
              {results.map((r: RankedPage) => {
                idx++;
                const i = idx;
                const preview = r.content.replace(/^Module \d+:\s*/i, '').slice(0, 80);
                return (
                  <div key={`${r.book_id}-${r.page_index}`}
                    data-idx={i}
                    className={`cmdk-item cmdk-ctx ${sel === i ? 'selected' : ''}`}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => {
                      if (onOpenPage) {
                        onOpenPage(r.book_id, r.page_index);
                      } else {
                        const synthetic: BookSummary = {
                          book_id: r.book_id,
                          title: r.title,
                          source: r.source,
                          tags: r.tags || [],
                          created_at: r.stored_at,
                          updated_at: r.stored_at,
                          page_count: 0,
                          token_count: 0,
                          preview: r.content.slice(0, 200),
                        };
                        onOpenBook(synthetic);
                      }
                      onClose();
                    }}>
                    <span className={`cmdk-item-icon ${r.source === 'claude' ? 'src-claude' : r.source === 'cursor' ? 'src-cursor' : 'src-manual'}`}>{getSource(r.source).glyph}</span>
                    <div className="cmdk-ctx-main">
                      <div className="cmdk-ctx-title">{r.title}</div>
                      <div className="cmdk-ctx-preview">{preview}</div>
                    </div>
                    <div className="cmdk-ctx-meta">
                      <span className="cmdk-page-badge mono">page_{String(r.page_index).padStart(2,'0')}</span>
                      <span className="cmdk-relevance">
                        <span className="cmdk-rel-bar"><span style={{ width: `${Math.round(r.score * 100)}%` }}/></span>
                        <span className="mono">{Math.round(r.score * 100)}%</span>
                      </span>
                      <span className="cmdk-tags mono">{r.tags?.slice(0,2).map(t => `#${t}`).join(' ') || ''}</span>
                    </div>
                    {sel === i && <span className="cmdk-enter"><Icon name="enter" size={11}/></span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="cmdk-foot">
          <div className="cmdk-foot-hints">
            <span><span className="kbd-sm">↑</span><span className="kbd-sm">↓</span> navigate</span>
            <span><span className="kbd-sm">↵</span> select</span>
            <span><span className="kbd-sm">esc</span> close</span>
          </div>
          <div className="cmdk-foot-right">
            <span className="pulse-dot"/> pgvector · cosine similarity
          </div>
        </div>
      </div>
    </div>
  );
}
