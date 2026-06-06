import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Book } from '../types';
import { getSource, fmtDate, ctxTokens } from '../lib/utils';
import { useFocusTrap } from '../lib/useFocusTrap';
import { api } from '../lib/api';
import Icon from './Icon';

function PageBlock({ page, i, forceExpand, bookId, onPageUpdated }: {
  page: { page_index: number; content: string };
  i: number;
  forceExpand?: boolean;
  bookId: string;
  onPageUpdated: (pageIndex: number, content: string) => void;
}) {
  const [expanded, setExpanded] = useState(forceExpand || false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(page.content);
  const [saving, setSaving] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tok = Math.ceil(page.content.length / 4);

  useEffect(() => {
    if (forceExpand && blockRef.current) {
      setExpanded(true);
      setTimeout(() => blockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
    }
  }, [forceExpand]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  const handleCopyPage = () => {
    navigator.clipboard.writeText(page.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  };

  const handleEdit = () => {
    setDraft(page.content);
    setEditing(true);
    setExpanded(true);
  };

  const handleCancel = () => {
    setDraft(page.content);
    setEditing(false);
  };

  const handleSave = async () => {
    if (draft === page.content) { setEditing(false); return; }
    setSaving(true);
    try {
      await api.updatePage(bookId, page.page_index, draft);
      onPageUpdated(page.page_index, draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={blockRef} className={`chunk-block ${expanded ? 'chunk-expanded' : ''} ${forceExpand ? 'chunk-focused' : ''}`}>
      <div className="chunk-head">
        <span className="chunk-idx mono">page_{String(page.page_index).padStart(2,'0')}</span>
        <span className="chunk-tok mono">~{tok} tok</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          {!editing && (
            <>
              <button className="chunk-copy-btn" onClick={handleCopyPage} title="Copy page">
                {copied ? <><Icon name="check" size={11} /> Copied</> : <><Icon name="copy" size={11} /> Copy</>}
              </button>
              <button className="chunk-expand-btn" onClick={handleEdit} title="Edit page">
                <Icon name="edit" size={11} /> Edit
              </button>
            </>
          )}
          {editing && (
            <>
              <button className="chunk-copy-btn" onClick={handleCancel} disabled={saving}>
                <Icon name="close" size={11} /> Cancel
              </button>
              <button className="chunk-expand-btn" onClick={handleSave} disabled={saving}>
                <Icon name="check" size={11} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
          {!editing && (
            <button className="chunk-expand-btn" onClick={() => setExpanded(e => !e)}>
              {expanded
                ? <><Icon name="arrUp" size={11} stroke={2}/> Collapse</>
                : <><Icon name="arrDn" size={11} stroke={2}/> Expand</>}
            </button>
          )}
        </div>
      </div>
      <div className="chunk-content">
        {editing ? (
          <textarea
            ref={textareaRef}
            className="chunk-edit-textarea"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={Math.max(6, draft.split('\n').length + 2)}
            spellCheck={false}
          />
        ) : (
          <div className="chunk-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {expanded ? page.content : page.content.split('\n').slice(0, 3).join('\n')}
            </ReactMarkdown>
            {!expanded && page.content.split('\n').length > 3 && (
              <button className="chunk-read-more" onClick={() => setExpanded(true)}>
                +{page.content.split('\n').length - 3} more lines — click to expand
              </button>
            )}
          </div>
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
  const [pages, setPages] = useState(book?.pages || []);
  const trapRef = useFocusTrap(!!book);

  useEffect(() => { setPages(book?.pages || []); }, [book?.book_id]);

  const handlePageUpdated = (pageIndex: number, content: string) => {
    setPages(prev => prev.map(p => p.page_index === pageIndex ? { ...p, content } : p));
  };

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
    pages.forEach((p, i) => {
      parts.push(`## Page ${String(p.page_index).padStart(2, '0')}`);
      parts.push('');
      parts.push(p.content);
      if (i < pages.length - 1) parts.push('');
    });
    navigator.clipboard.writeText(parts.join('\n'));
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside ref={trapRef} role="dialog" aria-modal="true" aria-label={book.title} className="drawer" onClick={e => e.stopPropagation()}>
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
          {pages.map((page, i) => (
            <PageBlock key={page.id || i} page={page} i={i} forceExpand={focusPageIndex === page.page_index} bookId={book.book_id} onPageUpdated={handlePageUpdated} />
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
