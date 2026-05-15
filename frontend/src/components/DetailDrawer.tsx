import { useState, useEffect, useRef } from 'react';
import type { Book } from '../types';
import { getSource, fmtDate, ctxTokens } from '../lib/utils';
import { api } from '../lib/api';
import Icon from './Icon';

function PageBlock({ page, i, forceExpand }: { page: { page_index: number; content: string }; i: number; forceExpand?: boolean }) {
  const [expanded, setExpanded] = useState(forceExpand || false);
  const [copied, setCopied] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const tok = Math.ceil(page.content.length / 4);
  const lines = page.content.split('\n');
  const preview = lines.slice(0, 3).join('\n');
  const hasMore = lines.length > 3;

  useEffect(() => {
    if (forceExpand && blockRef.current) {
      setExpanded(true);
      setTimeout(() => blockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    }
  }, [forceExpand]);

  const handleCopyPage = () => {
    navigator.clipboard.writeText(page.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <div ref={blockRef} className={`chunk-block ${expanded ? 'chunk-expanded' : ''} ${forceExpand ? 'chunk-focused' : ''}`}>
      <div className="chunk-head">
        <span className="chunk-idx mono">page_{String(page.page_index).padStart(2,'0')}</span>
        <span className="chunk-tok mono">~{tok} tok</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <button
            className="chunk-copy-btn"
            onClick={handleCopyPage}
            title="Copy page"
          >
            {copied ? <><Icon name="check" size={11} /> Copied</> : <><Icon name="copy" size={11} /> Copy</>}
          </button>
          {hasMore && (
            <button className="chunk-expand-btn" onClick={() => setExpanded(e => !e)}>
              {expanded
                ? <><Icon name="arrUp" size={11} stroke={2}/> Collapse</>
                : <><Icon name="arrDn" size={11} stroke={2}/> Expand</>}
            </button>
          )}
        </div>
      </div>
      <div className="chunk-content">
        {(expanded ? page.content : preview).split('\n').map((line, li) => {
          if (!line.trim()) return <div key={li} className="dc-spacer"/>;
          if (line.startsWith('Module ') && line.includes(':')) return <div key={li} className="chunk-module-head">{line}</div>;
          if (line.startsWith('- ') || line.startsWith('• ')) return <div key={li} className="dc-bullet">{line.slice(2)}</div>;
          return <p key={li}>{line}</p>;
        })}
        {!expanded && hasMore && (
          <button className="chunk-read-more" onClick={() => setExpanded(true)}>
            +{lines.length - 3} more lines — click to expand
          </button>
        )}
      </div>
    </div>
  );
}

interface RelatedResult {
  book_id: string;
  title: string;
  tags: string[];
  source: string;
  score: number;
}

interface DetailDrawerProps {
  book: Book | null;
  focusPageIndex?: number;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (book: Book) => void;
  onOpenBook: (bookId: string) => void;
}

export default function DetailDrawer({ book, focusPageIndex, onClose, onEdit, onDelete, onOpenBook }: DetailDrawerProps) {
  const [related, setRelated] = useState<RelatedResult[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (!book) { setRelated([]); return; }
    setLoadingRelated(true);
    api.get(`/api/books/${book.book_id}/related`)
      .then((data: any) => setRelated(data.books || []))
      .catch(() => setRelated([]))
      .finally(() => setLoadingRelated(false));
  }, [book?.book_id]);

  if (!book) return null;

  const s = getSource(book.source);
  const srcClass = book.source === 'claude' ? 'src-claude' : book.source === 'cursor' ? 'src-cursor' : 'src-manual';
  const tokens = ctxTokens({ pages: book.pages || [] });

  const handleCopy = () => {
    const parts: string[] = [];
    parts.push(`# ${book.title}`);
    if (book.tags.length) parts.push(`Tags: ${book.tags.map(t => `#${t}`).join(' ')}`);
    parts.push('');
    (book.pages || []).forEach((p, i) => {
      parts.push(`## Page ${String(p.page_index).padStart(2, '0')}`);
      parts.push('');
      parts.push(p.content);
      if (i < (book.pages || []).length - 1) parts.push('');
    });
    navigator.clipboard.writeText(parts.join('\n'));
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={e => e.stopPropagation()}>
        <header className="drawer-head">
          <div className="drawer-head-meta">
            <span className={`src-badge ${srcClass}`} data-glyph={s.glyph}>
              <span className="src-badge-label">{s.label}</span>
            </span>
            <span className="drawer-time mono">Updated {fmtDate(book.updated_at)}</span>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={16}/></button>
        </header>

        <h1 className="drawer-title">{book.title}</h1>

        <div className="drawer-tags">
          {book.tags.map(t => <span key={t} className="tag">#{t}</span>)}
          <button className="tag tag-add"><Icon name="plus" size={10} stroke={2.5}/> add</button>
        </div>

        <div className="drawer-meta-grid">
          <div><span className="meta-k">Source</span><span className="meta-v">{s.label}</span></div>
          <div><span className="meta-k">Created</span><span className="meta-v">{fmtDate(book.created_at)}</span></div>
          <div><span className="meta-k">Pages</span><span className="meta-v mono">{book.pages?.length || 0}</span></div>
          <div><span className="meta-k">~Tokens</span><span className="meta-v mono">{tokens.toLocaleString()}</span></div>
          <div style={{gridColumn:'1/-1'}}><span className="meta-k">ID</span><span className="meta-v mono" style={{fontSize:11}}>{book.book_id}</span></div>
        </div>

        <div className="drawer-actions">
          <button className="btn btn-primary" onClick={onEdit}><Icon name="edit" size={13}/> Edit</button>
          <button className="btn" onClick={handleCopy}><Icon name="copy" size={13}/> Copy</button>
          <button className="btn btn-danger" onClick={() => onDelete(book)}><Icon name="trash" size={13}/> Delete</button>
        </div>

        <div className="drawer-chunks">
          {(book.pages || []).map((page, i) => (
            <PageBlock key={page.id || i} page={page} i={i} forceExpand={focusPageIndex === page.page_index} />
          ))}
        </div>

      <div className="drawer-related">
        <div className="drawer-related-title">
          <Icon name="sparkle" size={13}/>
          Semantically related
        </div>
        {loadingRelated && <div className="empty-hint mono">Loading…</div>}
        {!loadingRelated && related.length === 0 && (
          <div className="empty-hint">No similar books found yet.</div>
        )}
        {related.map(r => (
          <div
            key={r.book_id}
            className="related-row"
            onClick={() => { onClose(); onOpenBook(r.book_id); }}
          >
            <span className="related-pct mono">{Math.round(r.score * 100)}%</span>
            <span className="related-title">{r.title}</span>
            <span className="related-tags mono">{r.tags.slice(0,2).map(t => '#'+t).join(' ')}</span>
          </div>
        ))}
      </div>
      </aside>
    </div>
  );
}
