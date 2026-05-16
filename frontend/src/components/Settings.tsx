import { useState, useEffect } from 'react';
import type { TokenInfo } from '../types';
import { api } from '../lib/api';
import Icon from './Icon';
import { timeAgo, getSource } from '../lib/utils';
import CopyBtn from './CopyBtn';

const SETTINGS_NAV = [
  { id: 'general', label: 'General', icon: 'settings' },
  { id: 'install', label: 'Installation', icon: 'import' },
  { id: 'clients', label: 'Connected clients', icon: 'link' },
];

const SCOPE_COLORS: Record<string, string> = { read: '#6ba4d6', write: '#d6a46b', delete: '#d6706b' };

function ScopePill({ scope }: { scope: string }) {
  const c = SCOPE_COLORS[scope] || '#999';
  return (
    <span className="scope-pill" style={{ background: c + '22', color: c, borderColor: c + '55' }}>
      {scope}
    </span>
  );
}

function ConfirmModal({ title, body, danger, onConfirm, onCancel }: { title: string; body: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
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

// -------- Clients tab --------
function ClientsTab() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const refreshClients = () => {
    api.clients()
      .then((data: any) => setClients(data.clients || []))
      .catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    api.clients()
      .then((data: any) => {
        if (cancelled) return;
        setClients(data.clients || []);
        setLoading(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message || 'Failed to load clients');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleDisconnect = async (clientID: string, clientName: string) => {
    setDisconnecting(clientID);
    try {
      await api.disconnectClient(clientID);
      setClients(prev => prev.filter(c => c.client_id !== clientID));
      setExpanded(null);
      showToast(`"${clientName || clientID}" disconnected`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to disconnect');
    } finally {
      setDisconnecting(null);
      setConfirm(null);
    }
  };

  const inferSourceKey = (clientId: string, name: string): string => {
    const hay = (clientId + ' ' + name).toLowerCase();
    if (hay.includes('claude')) return 'claude';
    if (hay.includes('cursor')) return 'cursor';
    return 'manual';
  };

  const MCP_URL = (import.meta.env.VITE_MCP_URL as string) || 'http://localhost:8081/mcp';

  return (
    <div className="settings-tab-content">
      <div className="settings-section-head">
        <div>
          <h2 className="settings-section-title">Connected clients</h2>
          <p className="settings-section-sub">AI clients that access your context library via MCP. Disconnect any client at any time.</p>
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
            return (
              <div key={c.client_id} className={`client-card ${expanded === c.client_id ? 'expanded' : ''}`}>
                <div className="client-card-main" onClick={() => setExpanded(expanded === c.client_id ? null : c.client_id)}>
                  <div className="client-card-left">
                    <span className={`compact-src src-${key}`}>{src.glyph}</span>
                    <div className="client-info">
                      <div className="client-name">{c.name || c.client_id}</div>
                      <div className="client-meta mono">
                        <span className="conn-status conn-active">● active</span>
                        <span>·</span>
                        <span>last seen {timeAgo(c.last_used_at || c.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="client-card-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      className="btn btn-sm btn-ghost-danger"
                      disabled={disconnecting === c.client_id}
                      onClick={(e) => { e.stopPropagation(); setConfirm({ id: c.client_id, name: c.name || c.client_id }); }}
                    >
                      {disconnecting === c.client_id ? '…' : <Icon name="trash" size={12} />}
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
                        <div className="detail-label">Client ID</div>
                        <div className="detail-val mono">{c.client_id}</div>
                      </div>
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
          title="Disconnect client"
          body={`"${confirm.name}" will lose access immediately. They must re-authorize via OAuth to reconnect.`}
          danger
          onConfirm={() => handleDisconnect(confirm.id, confirm.name)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {toast && <div className="settings-toast"><Icon name="check" size={12} /> {toast}</div>}
    </div>
  );
}

// -------- Tokens tab (as Authorized apps) --------
function TokensTab() {
  const [apps, setApps] = useState<any[]>([
    { id: 'o1', name: 'Zapier', icon: 'Z', color: '#FF4A00', scopes: ['read'], authorizedAt: '2024-11-15T09:00:00Z', lastUsed: '2025-01-15T08:00:00Z', status: 'active', desc: 'Automation workflows' },
    { id: 'o2', name: 'Notion Integration', icon: 'N', color: '#e0e0e2', scopes: ['read', 'write'], authorizedAt: '2024-12-01T14:00:00Z', lastUsed: '2025-01-14T20:00:00Z', status: 'active', desc: 'Sync contexts to Notion pages' },
    { id: 'o3', name: 'Linear', icon: 'L', color: '#5E6AD2', scopes: ['read'], authorizedAt: '2025-01-05T10:00:00Z', lastUsed: '2025-01-13T12:00:00Z', status: 'active', desc: 'Attach contexts to issues' },
    { id: 'o4', name: 'Slack App', icon: 'S', color: '#4A154B', scopes: ['read', 'write', 'delete'], authorizedAt: '2024-10-20T08:00:00Z', lastUsed: '2024-12-28T17:00:00Z', status: 'revoked', desc: 'Push contexts via slash commands' },
  ]);
  const [confirm, setConfirm] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2600); };
  const revoke = (id: string) => { setApps(as => as.map(a => a.id === id ? { ...a, status: 'revoked' } : a)); setConfirm(null); showToast('Access revoked'); };
  const remove = (id: string) => { setApps(as => as.filter(a => a.id !== id)); setConfirm(null); showToast('App removed'); };
  const reauthorize = (id: string) => { setApps(as => as.map(a => a.id === id ? { ...a, status: 'active', lastUsed: new Date().toISOString() } : a)); showToast('App re-authorized'); };

  const active = apps.filter(a => a.status === 'active');
  const revoked = apps.filter(a => a.status === 'revoked');

  return (
    <div className="settings-tab-content">
      <div className="settings-section-head">
        <div>
          <h2 className="settings-section-title">Authorized apps</h2>
          <p className="settings-section-sub">Third-party apps that have been granted access to your context library via OAuth. Revoking removes their access immediately — they must re-authorize to reconnect.</p>
        </div>
      </div>

      <div className="oauth-info-bar">
        <Icon name="sparkle" size={13} />
        <span>Access is granted through the OAuth 2.0 flow. Apps request scopes during authorization; you approve them. No tokens are issued manually.</span>
      </div>

      {active.length > 0 && (
        <>
          <div className="oauth-group-label">Active</div>
          <div className="oauth-list">
            {active.map(a => (
              <div key={a.id} className="oauth-row">
                <div className="oauth-app-icon" style={{ background: a.color + '22', color: a.color, borderColor: a.color + '44' }}>{a.icon}</div>
                <div className="oauth-main">
                  <div className="oauth-name">{a.name}</div>
                  <div className="oauth-desc">{a.desc}</div>
                  <div className="oauth-meta mono">
                    <span>authorized {new Date(a.authorizedAt).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>last used {timeAgo(a.lastUsed)}</span>
                  </div>
                  <div className="token-scopes-row" style={{ marginTop: 8 }}>
                    {a.scopes.map((s: string) => <ScopePill key={s} scope={s} />)}
                  </div>
                </div>
                <div className="oauth-actions">
                  <button className="btn btn-sm btn-ghost-danger" onClick={() => setConfirm({ id: a.id, name: a.name, type: 'revoke' })}>
                    Revoke access
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {revoked.length > 0 && (
        <>
          <div className="oauth-group-label" style={{ marginTop: 20 }}>Revoked</div>
          <div className="oauth-list">
            {revoked.map(a => (
              <div key={a.id} className="oauth-row oauth-row-revoked">
                <div className="oauth-app-icon" style={{ background: 'var(--raised)', color: 'var(--text-muted)', borderColor: 'var(--border-soft)' }}>{a.icon}</div>
                <div className="oauth-main">
                  <div className="oauth-name" style={{ color: 'var(--text-dim)' }}>{a.name}</div>
                  <div className="oauth-desc">{a.desc}</div>
                  <div className="oauth-meta mono">
                    <span style={{ color: '#d6706b' }}>● revoked</span>
                    <span>·</span>
                    <span>was authorized {new Date(a.authorizedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="oauth-actions">
                  <button className="btn btn-sm btn-ghost" onClick={() => reauthorize(a.id)}>Re-authorize</button>
                  <button className="btn btn-sm btn-ghost-danger" onClick={() => setConfirm({ id: a.id, name: a.name, type: 'remove' })}>
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {apps.length === 0 && <div className="empty-hint mono">No apps authorized yet. Apps connect via the OAuth flow.</div>}

      {confirm?.type === 'revoke' && (
        <ConfirmModal title="Revoke access"
          body={`"${confirm.name}" will lose access immediately. They must re-authorize via OAuth to reconnect.`}
          danger onConfirm={() => revoke(confirm.id)} onCancel={() => setConfirm(null)} />
      )}
      {confirm?.type === 'remove' && (
        <ConfirmModal title="Remove app"
          body={`Permanently remove "${confirm.name}" from your authorized apps?`}
          danger onConfirm={() => remove(confirm.id)} onCancel={() => setConfirm(null)} />
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
      .then((user: any) => {
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
          </>
        )}
      </div>
    </div>
  );
}

// -------- Installation tab --------
function InstallTab() {
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const MCP_URL = (import.meta.env.VITE_MCP_URL as string) || 'http://localhost:8081/mcp';
  const cursorConfig = btoa(JSON.stringify({ url: MCP_URL }));
  const cursorDeeplink = `cursor://anysphere.cursor-deeplink/mcp/install?name=context-book&config=${cursorConfig}`;
  const claudeWebSteps = [
    'Open Claude (claude.ai) → Settings → Connectors',
    'Click "Add custom connector"',
    `Paste your MCP URL: ${MCP_URL}`,
    'Sign in with your ContextBridge account when prompted',
    'Authorize the connector — done.'
  ];

  return (
    <div className="settings-tab-content">
      <div className="settings-section-head">
        <div>
          <h2 className="settings-section-title">Installation</h2>
          <p className="settings-section-sub">Connect ContextBridge to your AI clients. Pick your client below — each method takes under a minute.</p>
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
            <span className="install-meta mono">contextbridge-1.0.0.mcpb · 2.4 MB</span>
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
