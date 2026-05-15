import type { BookSummary } from '../types';
import { getSource, timeAgo, ctxUpdated } from '../lib/utils';

interface ContextCompactRowProps {
  book: BookSummary;
  onOpen: (book: BookSummary) => void;
  index: number;
}

export default function ContextCompactRow({ book, onOpen, index }: ContextCompactRowProps) {
  const s = getSource(book.source);
  const srcClass = book.source === 'claude' ? 'src-claude' : book.source === 'cursor' ? 'src-cursor' : 'src-manual';
  return (
    <div className="ctx-compact" onClick={() => onOpen(book)}>
      <span className="compact-idx mono">{String(index + 1).padStart(2, '0')}</span>
      <span className={`compact-src ${srcClass}`}>{s.glyph}</span>
      <span className="compact-title">{book.title}</span>
      <span className="compact-tags">{book.tags.slice(0,3).map(t => `#${t}`).join(' ')}</span>
      <span className="compact-time mono">{timeAgo(ctxUpdated(book))}</span>
      <span className="compact-tok mono">{book.page_count}pg</span>
    </div>
  );
}
