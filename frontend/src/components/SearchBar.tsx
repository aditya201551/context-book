import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { getSource } from '../lib/utils';
import Icon from './Icon';
import type { SuggestionResult } from '../types';

interface SearchBarProps {
  onOpenBook: (bookId: string) => void;
}

export default function SearchBar({ onOpenBook }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.searchSuggest(q.trim(), 8);
      setSuggestions(res);
      setActiveIndex(-1);
      setOpen(res.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 150);
  };

  const selectSuggestion = (s: SuggestionResult) => {
    setQuery(s.title);
    setSuggestions([]);
    setOpen(false);
    navigate('/library');
    onOpenBook(s.book_id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && e.key !== 'Escape') return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => {
        const next = Math.min(i + 1, suggestions.length - 1);
        listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => {
        const next = Math.max(i - 1, -1);
        listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        selectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!inputRef.current?.contains(target) && !listRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    if (open) window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div className="searchbar-wrap">
      <div className="searchbar" onClick={() => inputRef.current?.focus()}>
        <Icon name="search" size={13} />
        <input
          ref={inputRef}
          placeholder="Filter by title, tag, content…"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-activedescendant={activeIndex >= 0 ? `suggest-${activeIndex}` : undefined}
        />
        <span className="kbd">/</span>
      </div>

      {open && (
        <div
          id="search-suggestions"
          ref={listRef}
          className="search-dropdown"
          role="listbox"
        >
          {loading && suggestions.length === 0 && (
            <div className="search-dropdown-empty">Searching…</div>
          )}
          {!loading && suggestions.length === 0 && (
            <div className="search-dropdown-empty">No results</div>
          )}
          {suggestions.map((s, i) => {
            const src = getSource(s.source);
            const isActive = i === activeIndex;
            return (
              <div
                key={s.book_id}
                id={`suggest-${i}`}
                role="option"
                aria-selected={isActive}
                className={`search-dropdown-item ${isActive ? 'active' : ''}`}
                onClick={() => selectSuggestion(s)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className={`compact-src src-${s.source === 'claude' ? 'claude' : s.source === 'cursor' ? 'cursor' : 'manual'}`}>{src.glyph}</span>
                <div className="search-dropdown-text">
                  <div className="search-dropdown-title">{s.title}</div>
                  <div className="search-dropdown-meta mono">
                    {s.tags.slice(0, 3).map(t => `#${t}`).join(' ')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
