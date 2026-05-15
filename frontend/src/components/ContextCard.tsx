import type { BookSummary } from '../types';
import { getSource, timeAgo, ctxUpdated } from '../lib/utils';
import Icon from './Icon';

interface ContextCardProps {
  book: BookSummary;
  onOpen: (book: BookSummary) => void;
  density?: string;
}

export default function ContextCard({ book, onOpen, density = 'comfortable' }: ContextCardProps) {
  const source = getSource(book.source);
  const srcClass = book.source === 'claude' ? 'src-claude' : book.source === 'cursor' ? 'src-cursor' : 'src-manual';
  const preview = book.preview || '';
  const updated = ctxUpdated(book);
  const tokens = book.token_count;

  return (
    <article className={`ctx-card density-${density}`} onClick={() => onOpen(book)}>
      <header className="ctx-card-head">
        <div className="ctx-card-meta">
          <span className={`src-badge ${srcClass}`} data-glyph={source.glyph}>
            <span className="src-badge-label">{source.label}</span>
          </span>
          <span className="ctx-time"><Icon name="clock" size={11} stroke={2}/>{timeAgo(updated)}</span>
        </div>
      </header>

      <h3 className="ctx-title">{book.title}</h3>
      <p className="ctx-preview">{preview}</p>

      <footer className="ctx-card-foot">
        <div className="ctx-tags">
          {book.tags.slice(0, 3).map(t => <span key={t} className="tag">#{t}</span>)}
          {book.tags.length > 3 && <span className="tag tag-more">+{book.tags.length - 3}</span>}
        </div>
        <div className="ctx-footer-right">
          <span className="ctx-chunk-badge"><Icon name="library" size={10} stroke={2}/>{book.page_count}</span>
          <span className="ctx-tokens mono">~{(tokens/1000).toFixed(1)}k tok</span>
        </div>
      </footer>
    </article>
  );
}
