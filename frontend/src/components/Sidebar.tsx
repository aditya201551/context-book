import { useState, useEffect, useMemo } from 'react';
import type { BookSummary, User } from '../types';
import { getSource, SOURCES } from '../lib/utils';
import { api } from '../lib/api';
import Icon from './Icon';

interface SidebarProps {
  active: string;
  counts: { total: number; bySource: Record<string, number> };
  onNavigate: (id: string) => void;
  collapsed?: boolean;
  activeSource?: string | null;
  onSourceFilter?: (src: string | null) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
  { id: 'library', icon: 'library', label: 'Library' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
];

export default function Sidebar({ active, counts, onNavigate, collapsed = false, activeSource, onSourceFilter }: SidebarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [books, setBooks] = useState<BookSummary[]>([]);

  useEffect(() => {
    api.listBooks({ limit: 1000 }).then((res) => {
      setBooks(res.books);
    }).catch(() => {});
    api.me().then(setUser).catch(() => {});
  }, []);

  const sources = useMemo(() => {
    const keys = Array.from(new Set(books.map(b => b.source)));
    return keys.map(k => ({ key: k, def: getSource(k), count: counts.bySource[k] || 0 }));
  }, [books, counts]);

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    window.location.href = '/login';
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand">
        <div className="brand-mark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <ellipse cx="12" cy="13" rx="7" ry="8" stroke="currentColor" strokeWidth="1.4"/>
            <circle cx="9" cy="11" r="2.2" fill="currentColor"/>
            <circle cx="15" cy="11" r="2.2" fill="currentColor"/>
            <circle cx="9" cy="11" r="0.9" fill="#0c0b0a"/>
            <circle cx="15" cy="11" r="0.9" fill="#0c0b0a"/>
            <path d="M11 14 L12 15.5 L13 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M5 7 L7 9 M19 7 L17 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        {!collapsed && (
          <div>
            <div className="brand-name">ContextBook</div>
            <div className="brand-tag">Mnemosyne</div>
          </div>
        )}
      </div>

      <nav className="nav">
        {NAV_ITEMS.map(it => (
          <button key={it.id}
            className={`nav-item ${active === it.id ? 'active' : ''}`}
            onClick={() => onNavigate(it.id)}>
            <span className="nav-icon"><Icon name={it.icon} size={16} /></span>
            {!collapsed && <>
              <span className="nav-label">{it.label}</span>
              {it.id === 'library' && counts.total > 0 && <span className="nav-count">{counts.total}</span>}
            </>}
          </button>
        ))}
      </nav>

      {!collapsed && (
        <>
          <div className="nav-section-title">Connected sources</div>
          <div className="sources-list">
            {sources.map(s => (
              <div key={s.key}
                className={`source-row source-row-btn ${activeSource === s.key ? 'source-row-active' : ''}`}
                onClick={() => onSourceFilter?.(activeSource === s.key ? null : s.key)}
                title={`Filter by ${s.def.label}`}>
                <span className={`source-dot src-${s.key === 'user' || s.key === 'manual' ? 'manual' : s.key}`}>{s.def.glyph}</span>
                <span className="source-name">{s.def.label}</span>
                <span className="source-count">{s.count}</span>
                {activeSource === s.key && <span className="source-active-dot"/>}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sidebar-foot">
        <div
          className={`user-chip ${active === 'settings' ? 'user-chip-active' : ''}`}
          onClick={() => onNavigate('settings')}
          title="Settings"
        >
          <div className="avatar">{(user?.display_name || user?.email || 'A').charAt(0)}</div>
          {!collapsed && <>
            <div className="user-meta">
              <div className="user-name">{user?.display_name || user?.email || 'User'}</div>
              <div className="user-plan">{user?.provider || 'Local'}</div>
            </div>
            <span className="user-settings-icon" title="Settings"><Icon name="settings" size={13}/></span>
          </>}
        </div>
      </div>
    </aside>
  );
}
