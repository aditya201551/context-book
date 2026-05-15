import { useState, useMemo, useEffect } from 'react';
import type { BookSummary, UserCluster } from '../types';
import { getSource } from '../lib/utils';
import { api } from '../lib/api';
import Icon from './Icon';
import ContextCard from './ContextCard';
import ContextRow from './ContextRow';
import ContextCompactRow from './ContextCompactRow';
import EmptyState, { IllSearchEmpty } from './EmptyState';
import ClusterForm from './ClusterForm';

interface LibraryProps {
  books: BookSummary[];
  total: number;
  view: 'cards' | 'rows' | 'compact';
  onViewChange: (v: 'cards' | 'rows' | 'compact') => void;
  sort: string;
  onSortChange: (s: string) => void;
  query: string;
  onQueryChange: (q: string) => void;
  onOpenBook: (book: BookSummary) => void;
  density: string;
  activeTags: string[];
  onToggleTag: (tag: string) => void;
  activeSource?: string | null;
  onSourceFilter?: (src: string | null) => void;
}

export default function Library({
  books, total, view, onViewChange, sort, onSortChange, query, onQueryChange,
  onOpenBook, density, activeTags, onToggleTag, activeSource, onSourceFilter
}: LibraryProps) {
  const [clusters, setClusters] = useState<UserCluster[]>([]);
  const [loadingClusters, setLoadingClusters] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<UserCluster | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    api.clusters()
      .then((data: any) => { setClusters(data.clusters || []); setLoadingClusters(false); })
      .catch(() => setLoadingClusters(false));
  }, []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    books.forEach(b => b.tags.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [books]);

  const clusterCounts = useMemo(() => {
    const map = new Map<string, number>();
    clusters.forEach(c => {
      const count = books.filter(b => c.tags.some(t => b.tags.includes(t))).length;
      map.set(c.id, count);
    });
    return map;
  }, [clusters, books]);

  const availableSources = useMemo(() => {
    const set = new Set<string>();
    books.forEach(b => set.add(b.source));
    return Array.from(set).sort();
  }, [books]);

  const filtered = useMemo(() => {
    let list = [...books];
    if (activeSource) list = list.filter(b => b.source === activeSource);
    if (activeTags.length) list = list.filter(b => activeTags.some(t => b.tags.includes(t)));
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.tags.some(t => t.includes(q))
      );
    }
    if (sort === 'recent') list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    if (sort === 'alpha') list.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'size') list.sort((a, b) => b.token_count - a.token_count);
    return list;
  }, [books, activeSource, activeTags, query, sort]);

  const handleCreate = async (data: { name: string; tags: string[]; color: string }) => {
    setFormError(null);
    try {
      const c = await api.createCluster(data);
      setClusters(prev => [...prev, c]);
      setFormOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create cluster');
    }
  };

  const handleUpdate = async (data: { name: string; tags: string[]; color: string }) => {
    if (!editingCluster) return;
    setFormError(null);
    try {
      await api.updateCluster(editingCluster.id, data);
      setClusters(prev => prev.map(c => c.id === editingCluster.id ? { ...c, ...data } : c));
      setEditingCluster(null);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update cluster');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCluster(id);
      setClusters(prev => prev.filter(c => c.id !== id));
      setEditingCluster(null);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to delete cluster');
    }
  };

  const toggleClusterTags = (c: UserCluster) => {
    const anyActive = c.tags.some(t => activeTags.includes(t));
    if (anyActive) {
      c.tags.forEach(t => { if (activeTags.includes(t)) onToggleTag(t); });
    } else {
      c.tags.forEach(t => { if (!activeTags.includes(t)) onToggleTag(t); });
    }
  };

  return (
    <div className="library-wrap">
      <div className="page-head">
        <div>
          <h1 className="page-title">
            Library
            <span className="page-title-count">{filtered.length} of {total}</span>
          </h1>
          <p className="page-sub">Your cross-platform AI context — pushed from Claude, Cursor, and wherever you work.</p>
        </div>
        <div className="page-head-actions">
          <div className="sort-dd">
            <span>Sort:</span>
            <select value={sort} onChange={e => onSortChange(e.target.value)}>
              <option value="recent">Recent</option>
              <option value="alpha">Title A–Z</option>
              <option value="size">Largest</option>
            </select>
          </div>
          <div className="view-switcher">
            {(['cards', 'rows', 'compact'] as const).map(k => (
              <button key={k} className={view === k ? 'active' : ''} onClick={() => onViewChange(k)} title={k}>
                <Icon name={k} size={13} stroke={2} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {books.length > 0 && (
        <div className="cluster-strip">
          {clusters.filter(c => (clusterCounts.get(c.id) || 0) > 0).map(c => {
            const anyActive = c.tags.some(t => activeTags.includes(t));
            const count = clusterCounts.get(c.id) || 0;
            return (
              <button key={c.id}
                className={`cluster ${anyActive ? 'active' : ''} cl-${c.color}`}
                onClick={() => toggleClusterTags(c)}
              >
                <span className="cluster-glyph">
                  <svg width="28" height="28" viewBox="0 0 28 28">
                    {Array.from({ length: Math.min(count + 3, 8) }).map((_, i) => {
                      const a = (i / 8) * Math.PI * 2;
                      const r = 7 + (i % 3) * 2.5;
                      const cx = 14 + Math.cos(a) * r;
                      const cy = 14 + Math.sin(a) * r;
                      return <circle key={i} cx={cx} cy={cy} r={i === 0 ? 3 : 1.6} fill="currentColor" opacity={i === 0 ? 1 : 0.55 - i*0.05} />;
                    })}
                  </svg>
                </span>
                <div className="cluster-meta">
                  <div className="cluster-name">{c.name}</div>
                  <div className="cluster-count">{count} contexts · {c.tags.length} tags</div>
                </div>
                <span
                  className="cluster-edit-icon"
                  onClick={e => { e.stopPropagation(); setEditingCluster(c); }}
                  title="Edit cluster"
                >
                  <Icon name="settings" size={11} />
                </span>
              </button>
            );
          })}

          <button className="cluster cluster-new" onClick={() => setFormOpen(true)}>
            <span className="cluster-glyph"><Icon name="plus" size={14} stroke={2.5} /></span>
            <div className="cluster-meta">
              <div className="cluster-name">New cluster</div>
              <div className="cluster-count">Group your tags</div>
            </div>
          </button>
        </div>
      )}

      {(formOpen || editingCluster) && (
        <div className="cluster-form-overlay" onClick={() => { setFormOpen(false); setEditingCluster(null); }}>
          <div className="cluster-form-wrap" onClick={e => e.stopPropagation()}>
            {formError && <div className="empty-hint" style={{ color: '#d6706b', fontSize: 12, marginBottom: 8 }}>{formError}</div>}
            <ClusterForm
              allTags={allTags}
              initial={editingCluster || undefined}
              clusterCount={clusters.length}
              onSave={editingCluster ? handleUpdate : handleCreate}
              onCancel={() => { setFormOpen(false); setEditingCluster(null); setFormError(null); }}
              onDelete={editingCluster ? () => handleDelete(editingCluster.id) : undefined}
            />
          </div>
        </div>
      )}

      <div className="filter-bar">
        <span className="filter-label">FILTER</span>
        <div className="filter-bar-chips">
          {availableSources.map(k => {
            const s = getSource(k);
            return (
              <button key={k}
                className={`filter-chip ${activeSource === k ? 'active' : ''}`}
                onClick={() => onSourceFilter?.(activeSource === k ? null : k)}
              >
                <span className={`source-dot src-${k}`} style={{width:14,height:14,fontSize:8}}>{s.glyph}</span>
                {s.label}
              </button>
            );
          })}
          {activeTags.map(t => (
            <button key={t} className="filter-chip active" onClick={() => onToggleTag(t)}>
              #{t}
              <span className="icon-btn" style={{ width: 14, height: 14 }}><Icon name="close" size={9} stroke={2.5} /></span>
            </button>
          ))}
          {(activeTags.length > 0 || activeSource) && (
            <button className="filter-chip" onClick={() => { onSourceFilter?.(null); activeTags.forEach(onToggleTag); }}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state-stretch">
          <EmptyState
            illustration={<IllSearchEmpty />}
            greek="ΑΠΟΡΙΑ · No match"
            title={<>The shelves bear no <em>such scroll</em></>}
            sub={books.length === 0
              ? "Your library is empty. Add your first context to begin building a memory across AI clients."
              : "No contexts match these filters. Try clearing them or broadening your query."}
            actions={
              books.length === 0 ? (
                <button className="btn btn-primary" onClick={() => { /* new book */ }}>
                  <Icon name="plus" size={13} stroke={2.5}/> Add first context
                </button>
              ) : (
                <button className="btn" onClick={() => { onSourceFilter?.(null); activeTags.forEach(onToggleTag); onQueryChange(''); }}>
                  Clear all filters
                </button>
              )
            }
          />
        </div>
      ) : view === 'cards' ? (
        <div className="ctx-grid">
          {filtered.map(b => <ContextCard key={b.book_id} book={b} onOpen={onOpenBook} density={density} />)}
        </div>
      ) : view === 'rows' ? (
        <div className="ctx-rows">
          {filtered.map(b => <ContextRow key={b.book_id} book={b} onOpen={onOpenBook} />)}
        </div>
      ) : (
        <div className="ctx-compact-wrap">
          <div className="ctx-compact-head">
            <span>#</span><span>Src</span><span>Title</span><span>Tags</span><span style={{textAlign:'right'}}>Updated</span><span style={{textAlign:'right'}}>Tokens</span>
          </div>
          {filtered.map((b, i) => <ContextCompactRow key={b.book_id} book={b} onOpen={onOpenBook} index={i} />)}
        </div>
      )}
    </div>
  );
}
