import { useState, useEffect } from 'react';
import type { ClientInfo } from '../types';
import { api } from '../lib/api';
import { useToast } from '../lib/useToast';
import Icon from './Icon';
import { timeAgo, getSource } from '../lib/utils';
import CopyBtn from './CopyBtn';

const SETTINGS_NAV = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'install', label: 'Installation', icon: 'import' },
  { id: 'clients', label: 'Connected clients', icon: 'link' },
];

function ConfirmModal({ title, body, danger, onConfirm, onCancel }: { title: string; body: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label={title} className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-body">{body}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function inferSourceKey(clientId: string, name: string): string {
  const hay = (clientId + ' ' + name).toLowerCase();
  if (hay.includes('claude')) return 'claude';
  if (hay.includes('cursor')) return 'cursor';
  return 'manual';
}

function ClientsTab() {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { toast, showToast } = useToast();
  const [acting, setActing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ clientID: string; name: string; action: 'revoke' | 'delete' } | null>(null);

  const refreshClients = () => {
    api.clients()
      .then(data => setClients(data.clients))
      .catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    api.clients()
      .then(data => {
        if (cancelled) return;
        setClients(data.clients);
        setLoading(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load clients');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleRevoke = async (clientID: string, clientName: string) => {
    setActing(clientID);
    try {
      await api.revokeClient(clientID);
      showToast(`Access revoked for "${clientName}"`);
      refreshClients();
      setExpanded(null);
    } catch (err: any) {
      showToast(err?.message || 'Failed to revoke access');
    } finally {
      setActing(null);
      setConfirm(null);
    }
  };

  const handleDelete = async (clientID: string, clientName: string) => {
    setActing(clientID);
    try {
      await api.disconnectClient(clientID);
      setClients(prev => prev.filter(c => c.client_id !== clientID));
      setExpanded(null);
      showToast(`"${clientName}" deleted`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete client');
    } finally {
      setActing(null);
      setConfirm(null);
    }
  };

  const MCP_URL = (import.meta.env.VITE_MCP_URL as string) || 'http://localhost:8081/mcp';

  return (
    <div className="settings-tab-content">
      <div className="settings-section-head">
        <div>
          <h2 className="settings-section-title">Connected clients</h2>
          <p className="settings-section-sub">AI clients that access your context library via MCP. Revoke access or delete the client entirely.</p>
        </div>
        <div className="settings-endpoint-badge">
          <Icon name="link" size={12} />
          <span className="mono">{MCP_URL.replace(/^https?:\/\//, '')}</span>
          <CopyBtn text={MCP_URL} />
        </div>
      </div>

      {loading && <div className="empty-hint mono">Loading clients…</div>}
      {error && <div className="empty-hint mono" style={{ color: '#d6706b' }}>{error}</div>}

      {!loading && !error && (
        <div className="clients-list">
          {clients.length === 0 && (
            <div className="empty-hint mono">No connected clients yet. Install an MCP client to get started.</div>
          )}
          {clients.map((c) => {
            const key = inferSourceKey(c.client_id, c.name);
            const src = getSource(key);
            const isExpired = !c.active;
            return (
              <div key={c.client_id} className={`client-card ${expanded === c.client_id ? 'expanded' : ''}`}>
                <div className="client-card-main" onClick={() => setExpanded(expanded === c.client_id ? null : c.client_id)}>
                  <div className="client-card-left">
                    <span className={`compact-src src-${key}`}>{src.glyph}</span>
                    <div className="client-info">
                      <div className="client-name">{c.name}</div>
                      <div className="client-meta mono">
                        <span className={`conn-status conn-${isExpired ? 'auth-required' : 'active'}`}>● {isExpired ? 'revoked' : 'active'}</span>
                        <span>·</span>
                        <span>{c.last_used_at ? `last seen ${timeAgo(c.last_used_at)}` : 'never used'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="client-card-right" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {!isExpired && (
                      <button
                        className="btn btn-sm btn-ghost"
                        disabled={acting === c.client_id}
                        onClick={(e) => { e.stopPropagation(); setConfirm({ clientID: c.client_id, name: c.name, action: 'revoke' }); }}
                      >
                        Revoke
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-ghost-danger"
                      disabled={acting === c.client_id}
                      onClick={(e) => { e.stopPropagation(); setConfirm({ clientID: c.client_id, name: c.name, action: 'delete' }); }}
                    >
                      {acting === c.client_id ? '…' : <Icon name="trash" size={12} />}
                    </button>
                    <span style={{ transform: expanded === c.client_id ? 'rotate(90deg)' : '', transition: 'transform 0.15s', color: 'var(--text-muted)', flexShrink: 0 }}>
                      <Icon name="chev" size={13} />
                    </span>
                  </div>
                </div>

                {expanded === c.client_id && (
                  <div className="client-detail">
                    <div className="client-detail-grid">
                      <div className="detail-block">
                        <div className="detail-label">Authorized</div>
                        <div className="detail-val mono">{new Date(c.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="detail-block">
                        <div className="detail-label">Last used</div>
                        <div className="detail-val mono">{c.last_used_at ? timeAgo(c.last_used_at) : '—'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.action === 'delete' ? `Delete "${confirm.name}"?` : `Revoke access for "${confirm.name}"?`}
          body={confirm.action === 'delete'
            ? `This will permanently delete the "${confirm.name}" client registration and all its tokens across every user. This cannot be undone.`
            : `The app must re-authorize via OAuth to reconnect. The client registration itself is not deleted.`}
          danger={confirm.action === 'delete'}
          onConfirm={() => confirm.action === 'delete'
            ? handleDelete(confirm.clientID, confirm.name)
            : handleRevoke(confirm.clientID, confirm.name)}
          onCancel={() => setConfirm(null)} />
      )}

      {toast && <div className="settings-toast"><Icon name="check" size={12} /> {toast}</div>}
    </div>
  );
}

// -------- General tab --------
function GeneralTab() {
  const [displayName, setDisplayName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.me()
      .then(user => {
        if (cancelled) return;
        const name = user?.display_name || user?.email?.split('@')[0] || '';
        setDisplayName(name);
        setOriginalName(name);
        setLoading(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load profile');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateMe({ display_name: displayName.trim() });
      setOriginalName(displayName.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = displayName.trim() !== originalName;

  return (
    <div className="settings-tab-content">
      <div className="settings-section-head">
        <div>
          <h2 className="settings-section-title">General</h2>
          <p className="settings-section-sub">Basic preferences and MCP server configuration.</p>
        </div>
      </div>
      <div className="general-form">
        {loading && <div className="empty-hint mono">Loading profile…</div>}
        {!loading && (
          <>
            <div className="form-row">
              <label className="form-label">Display name</label>
              <input
                className="form-input"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && hasChanges && !saving) save(); }}
                style={{ maxWidth: 280 }}
                disabled={saving}
                placeholder="Your display name"
              />
            </div>
            {error && <div className="empty-hint" style={{ color: '#d6706b', fontSize: 12, marginTop: -8 }}>{error}</div>}
            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={save}
                disabled={saving || !hasChanges}
              >
                {saving ? 'Saving…' : saved ? <><Icon name="check" size={13} /> Saved</> : 'Save changes'}
              </button>
              <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={async () => { try { await api.logout(); } catch {} window.location.href = '/login'; }}>
                <Icon name="logout" size={13} /> Sign out
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <a
                href="https://github.com/aditya201551/context-book"
                target="_blank"
                rel="noreferrer"
                aria-label="View ContextBook on GitHub"
                title="View on GitHub"
                style={{ display: 'inline-flex', color: 'var(--text-dim)', transition: 'color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                </svg>
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// -------- Installation tab --------
function InstallTab() {
  const { toast, showToast } = useToast();

  const MCP_URL = (import.meta.env.VITE_MCP_URL as string) || 'http://localhost:8081/mcp';
  const cursorConfig = btoa(JSON.stringify({ url: MCP_URL }));
  const cursorDeeplink = `cursor://anysphere.cursor-deeplink/mcp/install?name=context-book&config=${cursorConfig}`;
  const claudeWebSteps = [
    'Open Claude (claude.ai) → Settings → Connectors',
    'Click "Add custom connector"',
    `Paste your MCP URL: ${MCP_URL}`,
    'Sign in with your ContextBook account when prompted',
    'Authorize the connector — done.'
  ];

  return (
    <div className="settings-tab-content">
      <div className="settings-section-head">
        <div>
          <h2 className="settings-section-title">Installation</h2>
          <p className="settings-section-sub">Connect ContextBook to your AI clients. Pick your client below — each method takes under a minute.</p>
        </div>
        <div className="settings-endpoint-badge">
          <Icon name="link" size={12} />
          <span className="mono">{MCP_URL}</span>
          <CopyBtn text={MCP_URL} />
        </div>
      </div>

      <div className="install-grid">
        <div className="install-card">
          <div className="install-card-head">
            <span className="compact-src src-cursor" style={{width:36,height:36,fontSize:15,borderRadius:8}}>{getSource('cursor').glyph}</span>
            <div style={{flex:1, minWidth:0}}>
              <div className="install-card-title">Cursor IDE</div>
              <div className="install-card-sub">One-click install via deep link</div>
            </div>
            <span className="install-badge">Recommended</span>
          </div>
          <p className="install-card-body">
            Cursor handles MCP installation natively. Click below — Cursor will open and prompt you to confirm the install with the endpoint pre-filled.
          </p>
          <div className="install-actions">
            <a className="btn btn-primary install-btn" href={cursorDeeplink}>
              <Icon name="sparkle" size={13}/> Add to Cursor
            </a>
            <CopyBtn text={cursorDeeplink} style={{padding:'7px 12px', fontSize: 11}}/>
          </div>
          <div className="install-fineprint mono">
            Requires Cursor 0.42+. Falls back to manual config if the deep link doesn't open.
          </div>
        </div>

        <div className="install-card">
          <div className="install-card-head">
            <span className="compact-src src-claude" style={{width:36,height:36,fontSize:15,borderRadius:8}}>{getSource('claude').glyph}</span>
            <div style={{flex:1, minWidth:0}}>
              <div className="install-card-title">Claude Desktop</div>
              <div className="install-card-sub">Download the .mcpb bundle</div>
            </div>
          </div>
          <p className="install-card-body">
            Download the signed MCP bundle and double-click to install. Claude Desktop will register the server and request authorization on first use.
          </p>
          <div className="install-actions">
            <button className="btn btn-primary install-btn" onClick={() => showToast('Coming soon')}>
              <Icon name="arrDn" size={13}/> Download .mcpb
            </button>
            <span className="install-meta mono">contextbook-1.0.0.mcpb · 2.4 MB</span>
          </div>
          <div className="install-fineprint mono">
            Requires Claude Desktop 0.9+. Bundle is signed and verified at install time.
          </div>
        </div>

        <div className="install-card install-card-wide">
          <div className="install-card-head">
            <span className="compact-src src-claude" style={{width:36,height:36,fontSize:15,borderRadius:8}}>{getSource('claude').glyph}</span>
            <div style={{flex:1, minWidth:0}}>
              <div className="install-card-title">Claude Web (claude.ai)</div>
              <div className="install-card-sub">Add as a custom connector</div>
            </div>
          </div>
          <p className="install-card-body">
            Claude on the web supports MCP via the Connectors UI. Follow the steps below — your endpoint URL is pre-filled and ready to paste.
          </p>
          <ol className="install-steps">
            {claudeWebSteps.map((s, i) => (
              <li key={i} className="install-step">
                <span className="install-step-text">{s}</span>
                {s.includes(MCP_URL) && <CopyBtn text={MCP_URL} />}
              </li>
            ))}
          </ol>
          <div className="install-fineprint mono">
            Available on Claude Pro, Team, and Enterprise plans.
          </div>
        </div>
      </div>

      <div className="install-help">
        <Icon name="sparkle" size={13}/>
        <div>
          <div style={{fontWeight:600, color:'var(--text)', fontSize:13}}>Other clients?</div>
          <div style={{fontSize:12, color:'var(--text-dim)', marginTop:4, lineHeight:1.6}}>
            Any MCP-compliant client can connect using the endpoint above. Point your client at <span className="mono" style={{color:'var(--text)'}}>{MCP_URL}</span> and complete the OAuth flow when prompted.
          </div>
        </div>
      </div>
      {toast && <div className="settings-toast"><Icon name="check" size={12} /> {toast}</div>}
    </div>
  );
}

// -------- Settings shell --------
export default function Settings() {
  const [tab, setTab] = useState(() => localStorage.getItem('cb_settings_tab') || 'clients');
  const navTo = (t: string) => { setTab(t); localStorage.setItem('cb_settings_tab', t); };

  return (
    <div className="settings-shell">
      <div className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Manage your MCP clients, API tokens, and preferences.</p>
        </div>
      </div>
      <div className="settings-layout">
        <nav className="settings-subnav">
          {SETTINGS_NAV.map(n => (
            <button key={n.id} className={`settings-nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => navTo(n.id)}>
              <Icon name={n.icon} size={14} />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="settings-main">
          {tab === 'general' && <GeneralTab />}
          {tab === 'install' && <InstallTab />}
          {tab === 'clients' && <ClientsTab />}
        </div>
      </div>
    </div>
  );
}
