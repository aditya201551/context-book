import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import type { BookSummary, Book, Tweaks } from './types';
import { api } from './lib/api';
import { ACCENTS, THEMES, TWEAK_DEFAULTS } from './lib/utils';
import Sidebar from './components/Sidebar';
import Icon from './components/Icon';
import Dashboard from './components/Dashboard';
import Library from './components/Library';
import Settings from './components/Settings';
import DetailDrawer from './components/DetailDrawer';
import CreateForm from './components/CreateForm';
import CommandPalette from './components/CommandPalette';
import TweaksPanel from './components/TweaksPanel';
import LoginPage from './components/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import SearchBar from './components/SearchBar';

const AUTHORIZE = () => {
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [isDenying, setIsDenying] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const errorParam = params.get('error');
    if (errorParam === 'missing_client_id') { setError('Invalid authorization request: missing client ID.'); return; }
    const key = params.get('key');
    if (!key) { setError('Missing authorization key.'); return; }
    const fetchInfo = () => {
      api.me()
        .then(() => api.get('/api/oauth/authorize-info?key=' + encodeURIComponent(key)))
        .then(setClientInfo)
        .catch((err: any) => {
          if (err.message === 'Unauthorized' || err.message === 'Request Failed (401)') {
            window.location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search);
            return;
          }
          setError(err.message || 'Failed to load');
        });
    };
    fetchInfo();
  }, [location.search]);

  const handleApprove = () => {
    setIsApproving(true);
    const key = new URLSearchParams(location.search).get('key') || '';
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/oauth/authorize-approve';
    const input = document.createElement('input');
    input.type = 'hidden'; input.name = 'key'; input.value = key;
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  };

  const handleDeny = async () => {
    const key = new URLSearchParams(location.search).get('key') || '';
    if (!key) { navigate('/dashboard'); return; }
    setIsDenying(true);
    try {
      const res = await fetch('/api/oauth/authorize-deny', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'include',
        body: new URLSearchParams({ key }),
      });
      if (!res.ok) { navigate('/dashboard'); return; }
      const data = await res.json();
      const redirect = data?.redirect || '/dashboard';
      if (redirect.startsWith('http')) window.location.href = redirect;
      else navigate(redirect);
    } catch {
      navigate('/dashboard');
    } finally {
      setIsDenying(false);
    }
  };

  if (error) return (
    <div className="authorize-page">
      <div className="empty-state"><div className="empty-state-title">{error}</div></div>
    </div>
  );
  if (!clientInfo) return (
    <div className="authorize-page">
      <div style={{ color: 'var(--text-muted)' }}>Loading…</div>
    </div>
  );

  return (
    <div className="authorize-page">
      <div className="authorize-shell">
        {/* brand header */}
        <div className="authorize-brand">
          <div className="brand-mark" style={{ width: 28, height: 28 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="13" rx="7" ry="8" stroke="currentColor" strokeWidth="1.4"/>
              <circle cx="9" cy="11" r="2.2" fill="currentColor"/>
              <circle cx="15" cy="11" r="2.2" fill="currentColor"/>
              <circle cx="9" cy="11" r="0.9" fill="#0c0b0a"/>
              <circle cx="15" cy="11" r="0.9" fill="#0c0b0a"/>
              <path d="M11 14 L12 15.5 L13 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M5 7 L7 9 M19 7 L17 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="brand-name" style={{ fontSize: 16 }}>ContextBook</span>
        </div>

        {/* main card */}
        <div className="authorize-card">
          {/* icon row */}
          <div className="authorize-icon-row">
            <div className="authorize-client-icon">
              <Icon name="cards" size={18} />
            </div>
            <div className="authorize-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
            <div className="authorize-cb-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <ellipse cx="12" cy="13" rx="7" ry="8" stroke="currentColor" strokeWidth="1.4"/>
                <circle cx="9" cy="11" r="2.2" fill="currentColor"/>
                <circle cx="15" cy="11" r="2.2" fill="currentColor"/>
                <circle cx="9" cy="11" r="0.9" fill="#0c0b0a"/>
                <circle cx="15" cy="11" r="0.9" fill="#0c0b0a"/>
                <path d="M11 14 L12 15.5 L13 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <path d="M5 7 L7 9 M19 7 L17 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          {/* title */}
          <h1 className="authorize-title">
            <em>{clientInfo.client_name}</em> wants to access your library
          </h1>
          <p className="authorize-sub">
            Review the permissions below before granting access to your ContextBook contexts and memory.
          </p>

          {/* info rows */}
          <div className="authorize-info">
            <div className="authorize-info-row">
              <div className="authorize-info-icon">
                <Icon name="cards" size={14} />
              </div>
              <div className="authorize-info-text">
                <div className="authorize-info-label">Client</div>
                <div className="authorize-info-value">{clientInfo.client_name} · {clientInfo.client_version || 'v2.1.0'}</div>
              </div>
            </div>
            <div className="authorize-info-row">
              <div className="authorize-info-icon">
                <Icon name="link" size={14} />
              </div>
              <div className="authorize-info-text">
                <div className="authorize-info-label">Redirect URI</div>
                <div className="authorize-info-value mono">{clientInfo.redirect_uri}</div>
              </div>
            </div>
            <div className="authorize-info-row">
              <div className="authorize-info-icon">
                <Icon name="tag" size={14} />
              </div>
              <div className="authorize-info-text">
                <div className="authorize-info-label">Client ID</div>
                <div className="authorize-info-value mono">{clientInfo.client_id}</div>
              </div>
            </div>
          </div>

          {/* actions */}
          <div className="authorize-actions">
            <button className="authorize-btn approve" onClick={handleApprove} disabled={isApproving || isDenying}>
              {isApproving ? 'Approving…' : 'Approve access'}
            </button>
            <button className="authorize-btn deny" onClick={handleDeny} disabled={isApproving || isDenying}>
              {isDenying ? 'Denying…' : 'Deny'}
            </button>
          </div>

          <p className="authorize-footer">
            You can revoke access anytime in <a href="/settings">Settings → Connected apps</a>
          </p>
        </div>
      </div>
    </div>
  );
};

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const [books, setBooks] = useState<BookSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [tweaks, setTweaks] = useState<Tweaks>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('cb_tweaks') || '{}');
      return { ...TWEAK_DEFAULTS, ...raw };
    } catch { return { ...TWEAK_DEFAULTS }; }
  });
  const [route, setRoute] = useState('dashboard');
  const [view, setView] = useState<'dashboard' | 'library' | 'settings' | 'search'>('dashboard');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [openBook, setOpenBook] = useState<Book | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync route state with URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/library') { setRoute('library'); setView('library'); }
    else if (path === '/settings') { setRoute('settings'); setView('settings'); }
    else if (path === '/search') { setRoute('search'); setView('search'); }
    else { setRoute('dashboard'); setView('dashboard'); }
  }, [location.pathname]);

  // Persist route and view
  useEffect(() => { localStorage.setItem('cb_route', route); }, [route]);
  useEffect(() => { localStorage.setItem('cb_view', view); }, [view]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  // Apply theme
  useEffect(() => {
    const t = THEMES[tweaks.theme] || THEMES.midnight;
    const a = ACCENTS[tweaks.accent] || ACCENTS.amber;
    const r = document.documentElement.style;
    r.setProperty('--bg', t.bg);
    r.setProperty('--panel', t.panel);
    r.setProperty('--raised', t.raised);
    r.setProperty('--border', t.border);
    r.setProperty('--border-soft', t.borderSoft);
    r.setProperty('--text', t.text);
    r.setProperty('--text-dim', t.textDim);
    r.setProperty('--text-muted', t.textMuted);
    r.setProperty('--hover', t.hover);
    r.setProperty('--accent', a.solid);
    r.setProperty('--accent-soft', a.soft);
    r.setProperty('--accent-ring', a.ring);
    r.setProperty('--accent-text', a.text);
    r.setProperty('--density-gap', tweaks.density === 'compact' ? '8px' : tweaks.density === 'roomy' ? '20px' : '14px');
    localStorage.setItem('cb_tweaks', JSON.stringify(tweaks));
  }, [tweaks]);

  // Fetch books
  const refreshBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listBooks({ limit: 1000 });
      setBooks(data.books);
      setTotal(data.total);
    } catch { setBooks([]); setTotal(0); }
    setLoading(false);
  }, []);

  // Auth check
  useEffect(() => {
    const path = location.pathname;
    api.me()
      .then(() => { setIsAuthenticated(true); setAuthChecked(true); })
      .catch(() => {
        setIsAuthenticated(false);
        setAuthChecked(true);
        if (path !== '/login' && path !== '/authorize') {
          window.location.href = '/login?next=' + encodeURIComponent(path + location.search + location.hash);
        }
      });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshBooks();
  }, [isAuthenticated, refreshBooks]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      const inField = tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdkOpen(v => !v); }
      else if (e.key === '/' && !inField && !cmdkOpen) { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === 'n' && !inField && !cmdkOpen && !openBook && !createOpen) { setCreateOpen(true); }
      else if (e.key === 'Escape') {
        if (cmdkOpen) setCmdkOpen(false);
        else if (openBook) setOpenBook(null);
        else if (createOpen) setCreateOpen(false);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [cmdkOpen, openBook, createOpen]);

  const counts = useMemo(() => {
    const bySource: Record<string, number> = {};
    for (const b of books) bySource[b.source] = (bySource[b.source] || 0) + 1;
    return { total: books.length, bySource };
  }, [books]);

  const handleNav = useCallback((id: string) => {
    setRoute(id);
    if (id === 'dashboard') navigate('/dashboard');
    else if (id === 'library') navigate('/library');
    else if (id === 'settings') navigate('/settings');
  }, [navigate]);

  const handleAction = useCallback((id: string) => {
    if (id === 'new') setCreateOpen(true);
    else if (id.startsWith('view-')) setTweaks(p => ({ ...p, defaultView: id.slice(5) as any }));
    else if (id.startsWith('theme-')) setTweaks(p => ({ ...p, theme: id.slice(6) as any }));
    else if (id.startsWith('nav-')) handleNav(id.slice(4));
  }, [handleNav]);

  const [editingBook, setEditingBook] = useState<Book | null>(null);

  const handleSave = useCallback(async (data: { title: string; tags: string[]; pages: string[]; source: string; bookId?: string }) => {
    try {
      if (data.bookId) {
        // EDIT mode
        await api.updateBook(data.bookId, data.title, data.source, data.tags);
        const currentBook = await api.getBook(data.bookId);
        const currentPages = currentBook.pages || [];
        // Update existing pages
        for (let i = 0; i < Math.min(data.pages.length, currentPages.length); i++) {
          if (data.pages[i] !== currentPages[i].content) {
            await api.updatePage(data.bookId, currentPages[i].page_index, data.pages[i]);
          }
        }
        // Insert new pages
        for (let i = currentPages.length; i < data.pages.length; i++) {
          if (data.pages[i].trim()) {
            await api.insertPage(data.bookId, data.pages[i]);
          }
        }
        showToast('Context updated');
      } else {
        // CREATE mode
        const book = await api.createBook(data.title, data.source, data.tags);
        for (const page of data.pages) {
          if (page.trim()) {
            await api.insertPage(book.book_id, page);
          }
        }
        showToast('Context saved · embedded in 124ms');
      }
      const result = await api.listBooks({ limit: 1000 });
      setBooks(result.books);
      setTotal(result.total);
      setEditingBook(null);
    } catch (err: any) { showToast(err.message || 'Failed to save'); }
  }, [showToast]);

  const handleDelete = useCallback(async (book: Book) => {
    try {
      await api.deleteBook(book.book_id);
      setOpenBook(null);
      refreshBooks();
      showToast(`Deleted "${book.title.slice(0,32)}…"`);
    } catch (err: any) { showToast(err.message || 'Failed to delete'); }
  }, [refreshBooks, showToast]);

  const [focusPageIndex, setFocusPageIndex] = useState(-1);

  const handleOpenBook = useCallback(async (summary: BookSummary) => {
    try {
      const book = await api.getBook(summary.book_id);
      setOpenBook(book);
      setFocusPageIndex(-1);
    } catch { showToast('Failed to load book'); }
  }, [showToast]);

  const handleOpenBookById = useCallback(async (bookId: string, pageIndex?: number) => {
    try {
      const book = await api.getBook(bookId);
      setOpenBook(book);
      setFocusPageIndex(pageIndex ?? -1);
    } catch { showToast('Failed to load book'); }
  }, [showToast]);

  const toggleTag = useCallback((t: string) => {
    setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }, []);



  // Empty-mode preview: synthetically present zero data without losing real data
  const visibleBooks = tweaks.emptyMode ? [] : books;
  const visibleCounts = tweaks.emptyMode ? { total: 0, bySource: {} } : counts;

  if (!authChecked) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
      Loading...
    </div>
  );

  const path = location.pathname;

  if (path === '/login') return <LoginPage />;

  if (!isAuthenticated) { window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname + window.location.search + window.location.hash); return null; }

  return (
    <div className="app">
      <Sidebar
        active={route}
        counts={visibleCounts}
        onNavigate={handleNav}
        collapsed={false}
        activeSource={activeSource}
        onSourceFilter={(src) => { setActiveSource(src); if (src) { navigate('/library'); setRoute('library'); setView('library'); } }}
      />

      <div className="main">
        <div className="topbar">
          <div className="topbar-title">
            <span>ContextBook</span>
            <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>/</span>
            <span className="topbar-title-crumb" style={{ textTransform: 'capitalize' }}>{route}</span>
          </div>
          <div className="topbar-spacer" />
          <SearchBar onOpenBook={(bookId) => { setQuery(''); navigate('/library'); setRoute('library'); setView('library'); handleOpenBookById(bookId); }} />
          <button className="btn btn-ghost" onClick={() => setCmdkOpen(true)}>
            <Icon name="sparkle" size={13} /> Ask
            <span className="kbd" style={{ marginLeft: 4 }}>⌘K</span>
          </button>
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={13} stroke={2.5} /> New
          </button>
        </div>

        <div className="content">
          {route === 'dashboard' && (
            <Dashboard
              books={visibleBooks}
              counts={visibleCounts}
              onOpenBook={handleOpenBook}
              onNewBook={() => setCreateOpen(true)}
              onOpenCmdk={() => setCmdkOpen(true)}
              onNavTo={handleNav}
              toggleTag={toggleTag}
              activeTags={activeTags}
            />
          )}
          {route === 'library' && (
            <Library
              books={visibleBooks}
              total={visibleCounts.total}
              view={tweaks.defaultView}
              onViewChange={(v) => setTweaks(p => ({ ...p, defaultView: v }))}
              sort={sort}
              onSortChange={setSort}
              query={query}
              onQueryChange={setQuery}
              onOpenBook={handleOpenBook}
              density={tweaks.density}
              activeTags={activeTags}
              onToggleTag={toggleTag}
              activeSource={activeSource}
              onSourceFilter={setActiveSource}
            />
          )}
          {route === 'settings' && <Settings />}
          {route === 'search' && (
            <div className="empty-state">
              <div className="empty-state-title">Semantic search lives in ⌘K</div>
              <div>We chose command-palette style for speed. Press <span className="kbd">⌘K</span> now.</div>
            </div>
          )}
        </div>
      </div>

      <CommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        books={visibleBooks}
        onOpenBook={handleOpenBook}
        onOpenPage={(bookId, pageIndex) => handleOpenBookById(bookId, pageIndex)}
        onAction={handleAction}
      />

      <DetailDrawer
        book={openBook}
        focusPageIndex={focusPageIndex}
        onClose={() => { setOpenBook(null); setFocusPageIndex(-1); }}
        onEdit={() => { setOpenBook(null); setEditingBook(openBook); setCreateOpen(true); }}
        onDelete={handleDelete}
        onOpenBook={handleOpenBookById}
      />

      <CreateForm
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditingBook(null); }}
        onSave={handleSave}
        initial={editingBook ? {
          title: editingBook.title,
          tags: editingBook.tags,
          pages: (editingBook.pages || []).map(p => p.content),
          source: editingBook.source,
          book_id: editingBook.book_id,
        } : null}
      />

      {tweaksOpen && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} onClose={() => setTweaksOpen(false)} />}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--panel)', border: '1px solid var(--border)',
          padding: '10px 16px', borderRadius: 8, fontSize: 12.5,
          color: 'var(--text)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          zIndex: 80, display: 'flex', alignItems: 'center', gap: 8
        }}>
          <Icon name="check" size={13} /> {toast}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/authorize" element={<AUTHORIZE />} />
        <Route path="*" element={<ErrorBoundary><AppShell /></ErrorBoundary>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
