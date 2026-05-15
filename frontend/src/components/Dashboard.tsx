import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BookSummary, User } from '../types';
import { api } from '../lib/api';
import { getSource, timeAgo } from '../lib/utils';
import Icon from './Icon';
import CopyBtn from './CopyBtn';
import EmptyState, { IllPlinth, IllHourglass, IllScroll } from './EmptyState';

interface DashboardProps {
  books: BookSummary[];
  counts: { total: number; bySource: Record<string, number> };
  onOpenBook: (book: BookSummary) => void;
  onNewBook: () => void;
  onOpenCmdk: () => void;
  onNavTo: (id: string) => void;
  toggleTag: (tag: string) => void;
  activeTags: string[];
}

export default function Dashboard({ books, counts, onOpenBook, onNewBook, onOpenCmdk, onNavTo, toggleTag, activeTags }: DashboardProps) {
  const navigate = useNavigate();
  const MCP_URL = (import.meta.env.VITE_MCP_URL as string) || 'http://localhost:8081/mcp';
  const isEmpty = books.length === 0;
  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  useEffect(() => {
    api.me().then(setUser).catch(() => {});
    api.clients().then((data: any) => setClients(data.clients || [])).catch(() => {});
  }, []);

  const firstName = user?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  const recent = useMemo(() => {
    return [...books].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5);
  }, [books]);

  const popularTags = useMemo(() => {
    const c: Record<string, number> = {};
    books.forEach(b => b.tags.forEach(t => { c[t] = (c[t] || 0) + 1; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [books]);

  const sourceMix = useMemo(() => {
    const total = books.length || 1;
    return Object.entries(counts.bySource).map(([k, v]) => ({ key: k, count: v, pct: (v / total) * 100 }));
  }, [books, counts]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Morning' : now.getHours() < 18 ? 'Afternoon' : 'Evening';

  // Connected clients derived from real api data
  const activeClients = clients.filter((c: any) => c.active);
  const clientCount = activeClients.length;
  const topTwoClients = activeClients.slice(0, 2).map((c: any) => c.name || c.client_id);
  const extraClientCount = Math.max(0, activeClients.length - 2);

  if (isEmpty) {
    return (
      <div className="dashboard">
        <div className="page-head">
          <div>
            <div className="page-greek">ΑΡΧΗ · Beginning</div>
            <h1 className="page-title">Welcome, <em>{firstName}</em></h1>
            <p className="page-sub">Your library awaits its first scroll.</p>
          </div>
        </div>

        <EmptyState
          illustration={<IllPlinth />}
          greek="ΤΑΒΟΥΛΑ ΡΑΣΑ · A blank slate"
          title={<>The pedestal stands <em>empty</em></>}
          sub="Begin your memory across AI clients. Add a context manually, connect Claude or Cursor via MCP, or import existing notes."
          actions={
            <>
              <button className="btn btn-primary" onClick={onNewBook}>
                <Icon name="plus" size={13} stroke={2.5} /> New context
              </button>
              <button className="btn" onClick={onOpenCmdk}>
                <Icon name="sparkle" size={13} /> Try semantic search
              </button>
              <button className="btn" onClick={() => { localStorage.setItem('cb_settings_tab', 'install'); onNavTo('settings'); }}>
                <Icon name="link" size={13} /> Connect AI client
              </button>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-head">
        <div>
          <div className="page-greek">ΜΝΗΜΗ · Memory</div>
          <h1 className="page-title">{greeting}, <em>{firstName}</em></h1>
          <p className="page-sub">
            <span className="pulse-dot" /> {clientCount} MCP client{clientCount !== 1 ? 's' : ''} connected · last push <span className="mono">{recent[0] ? timeAgo(recent[0].updated_at) : '—'}</span>
          </p>
        </div>
      </div>

      <div className="quick-actions">
        <button className="qa-card qa-primary" onClick={onNewBook}>
          <div className="qa-icon"><Icon name="plus" size={16} stroke={2.5} /></div>
          <div className="qa-text">
            <div className="qa-title">New context</div>
            <div className="qa-hint">Manual entry · <span className="kbd-sm">N</span></div>
          </div>
        </button>
        <button className="qa-card" onClick={onOpenCmdk}>
          <div className="qa-icon"><Icon name="sparkle" size={16} /></div>
          <div className="qa-text">
            <div className="qa-title">Semantic search</div>
            <div className="qa-hint">Ask anything · <span className="kbd-sm">⌘K</span></div>
          </div>
        </button>
        <button className="qa-card" onClick={() => onNavTo('library')}>
          <div className="qa-icon"><Icon name="library" size={16} /></div>
          <div className="qa-text">
            <div className="qa-title">Browse library</div>
            <div className="qa-hint mono">{counts.total} contexts</div>
          </div>
        </button>
        <button className="qa-card" onClick={() => showToast('Coming soon')}>
          <div className="qa-icon"><Icon name="import" size={16} /></div>
          <div className="qa-text">
            <div className="qa-title">Import</div>
            <div className="qa-hint">JSON or CSV</div>
          </div>
        </button>
      </div>

      <div className="stats-strip stats-strip-3">
        <div className="stat">
          <div className="stat-k">Contexts</div>
          <div className="stat-v mono">{counts.total}</div>
        </div>
        <div className="stat">
          <div className="stat-k">Sources</div>
          <div className="stat-v">
            <div className="stat-sources">
              {sourceMix.map(s => (
                <div key={s.key} className="stat-src-bar">
                  <div className={`src-bar-fill src-${s.key === 'user' || s.key === 'manual' ? 'manual' : s.key}`} style={{ width: `${s.pct}%` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="stat-delta">
            {sourceMix.map((s, i) => (
              <span key={s.key}>{i > 0 && ' · '}<span className="mono">{getSource(s.key).label} {s.count}</span></span>
            ))}
          </div>
        </div>
        <div className="stat">
          <div className="stat-k">Connected</div>
          <div className="stat-v mono">{clientCount}</div>
          <div className="stat-delta">
            {topTwoClients.join(' · ')}
            {extraClientCount > 0 && ` · +${extraClientCount}`}
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <section className="dash-card dash-recent">
          <header className="dash-card-head">
            <h2 className="dash-card-title"><Icon name="clock" size={13} /> Recent</h2>
            <button className="link-btn" onClick={() => onNavTo('library')}>View all <Icon name="chev" size={11} /></button>
          </header>
          {recent.length === 0 ? (
            <EmptyState
              compact
              illustration={<IllHourglass />}
              greek="ΧΡΟΝΟΣ · Time"
              title="No recent activity"
              sub="Your most recent contexts will surface here."
            />
          ) : (
            <div className="recent-list">
              {recent.map(c => {
                const srcClass = c.source === 'claude' ? 'src-claude' : c.source === 'cursor' ? 'src-cursor' : 'src-manual';
                return (
                  <div key={c.book_id} className="recent-row" onClick={() => onOpenBook(c)}>
                    <span className={`compact-src ${srcClass}`}>{getSource(c.source).glyph}</span>
                    <div className="recent-main">
                      <div className="recent-title">{c.title}</div>
                      <div className="recent-tags mono">{c.tags.slice(0, 3).map(t => `#${t}`).join(' ')}</div>
                    </div>
                    <div className="recent-time mono">{timeAgo(c.updated_at)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="dash-card dash-tags">
          <header className="dash-card-head">
            <h2 className="dash-card-title"><Icon name="tag" size={13} /> Popular tags</h2>
            <span className="dash-head-hint mono">click to filter</span>
          </header>
          {popularTags.length === 0 ? (
            <EmptyState
              compact
              illustration={<IllScroll />}
              greek="ΟΝΟΜΑΤΑ · Names"
              title="No tags yet"
              sub="Tag your contexts to build a constellation of themes."
            />
          ) : (
            <div className="tag-cloud">
              {popularTags.map(([t, n]) => {
                const weight = Math.min(1, n / 4);
                return (
                  <button key={t}
                    className={`tag-cloud-item ${activeTags.includes(t) ? 'active' : ''}`}
                    style={{ fontSize: `${11 + weight * 4}px` }}
                    onClick={() => { toggleTag(t); onNavTo('library'); }}
                  >
                    #{t}
                    <span className="tag-count mono">{n}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="dash-card dash-conn">
          <header className="dash-card-head">
            <h2 className="dash-card-title"><Icon name="link" size={13} /> Connected AI clients</h2>
            <button className="link-btn" onClick={() => { localStorage.setItem('cb_settings_tab', 'clients'); onNavTo('settings'); }}>Manage <Icon name="chev" size={11} /></button>
          </header>
          <div className="conn-list">
            {clients.length === 0 ? (
              <div className="empty-hint mono">No connected clients yet.</div>
            ) : (
              clients.map((c: any) => {
                const key = (c.client_id + ' ' + c.name).toLowerCase().includes('claude') ? 'claude' :
                            (c.client_id + ' ' + c.name).toLowerCase().includes('cursor') ? 'cursor' : 'manual';
                return (
                  <div key={c.client_id} className="conn-row">
                    <span className={`compact-src src-${key}`}>{getSource(key).glyph}</span>
                    <div className="conn-main">
                      <div className="conn-label">{c.name || c.client_id}</div>
                      <div className="conn-meta mono">
                        <span className={`conn-status conn-${c.active ? 'active' : 'auth-required'}`}>● {c.active ? 'active' : 'auth required'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="conn-hint mono">
            <Icon name="sparkle" size={11} />
            MCP endpoint · <span style={{ color: 'var(--text)' }}>{MCP_URL}</span>
            <CopyBtn text={MCP_URL} />
          </div>
        </section>
      </div>
      {toast && <div className="settings-toast"><Icon name="check" size={12} /> {toast}</div>}
    </div>
  );
}
