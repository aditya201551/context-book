import type { BookSummary } from '../types';
import { getSource, timeAgo, ctxUpdated } from '../lib/utils';
import Icon from './Icon';

interface ContextRowProps {
  book: BookSummary;
  onOpen: (book: BookSummary) => void;
}

export default function ContextRow({ book, onOpen }: ContextRowProps) {
  const s = getSource(book.source);
  const srcClass = book.source === 'claude' ? 'src-claude' : book.source === 'cursor' ? 'src-cursor' : 'src-manual';
  const preview = book.preview || '';
  return (
    <div className="ctx-row" onClick={() => onOpen(book)}>
      <span className={`src-badge ${srcClass}`} data-glyph={s.glyph}>
        <span className="src-badge-label">{s.label}</span>
      </span>
      <div className="ctx-row-main">
        <div className="ctx-row-title">{book.title}</div>
        <div className="ctx-row-preview">{preview}</div>
      </div>
      <div className="ctx-row-tags">
        {book.tags.slice(0, 3).map(t => <span key={t} className="tag tag-sm">#{t}</span>)}
      </div>
      <div className="ctx-row-time mono">{timeAgo(ctxUpdated(book))}</div>
      <div className="ctx-row-tokens mono">{book.page_count}pg · {(book.token_count/1000).toFixed(1)}k</div>
    </div>
  );
}
