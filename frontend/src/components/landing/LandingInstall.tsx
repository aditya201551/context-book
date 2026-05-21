import { useState } from 'react';
import CopyBtn from '../CopyBtn';

const MCP_URL = (import.meta.env.VITE_MCP_URL as string) || 'https://context-book-mcp-production.up.railway.app/mcp';

interface Step {
  text: string;
  copy?: string;
}

interface ClientConfig {
  id: string;
  label: string;
  type: 'command' | 'deeplink' | 'bundle' | 'steps';
  command?: string;
  steps?: { cmd: string; note?: string }[];
  walkthrough?: Step[];
  deeplink?: string;
  fallback?: string;
  meta?: string;
  fineprint?: string;
}

const cursorConfig = btoa(JSON.stringify({ url: MCP_URL }));
const cursorDeeplink = `cursor://anysphere.cursor-deeplink/mcp/install?name=context-book&config=${cursorConfig}`;

const CLIENTS: ClientConfig[] = [
  {
    id: 'claude-ai',
    label: 'Claude.ai',
    type: 'steps',
    walkthrough: [
      { text: 'Open Claude (claude.ai) → Settings → Connectors' },
      { text: 'Click "Add custom connector"' },
      { text: `Paste your MCP URL: ${MCP_URL}`, copy: MCP_URL },
      { text: 'Sign in with your ContextBook account when prompted' },
      { text: 'Authorize the connector — done.' },
    ],
    fineprint: 'Available on Claude Pro, Team, and Enterprise plans.',
  },
  {
    id: 'claude-code',
    label: 'Claude Code',
    type: 'command',
    command: `claude mcp add --transport http contextBook ${MCP_URL}`,
  },
  {
    id: 'claude-desktop',
    label: 'Claude Desktop',
    type: 'bundle',
    meta: 'contextbook-1.0.0.mcpb · 2.4 MB',
    fineprint: 'Requires Claude Desktop 0.9+. Bundle is signed and verified at install time.',
  },
  {
    id: 'codex',
    label: 'Codex',
    type: 'command',
    steps: [
      { cmd: `codex mcp add context-book --url ${MCP_URL}` },
      { cmd: 'codex mcp login context-book', note: 'Step 1 auto-detects OAuth and opens the browser for login. Step 2 is provided for manual login if needed.' },
    ],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    type: 'deeplink',
    deeplink: cursorDeeplink,
    fallback: JSON.stringify({ mcpServers: { contextbook: { url: MCP_URL } } }, null, 2),
  },
];

export default function LandingInstall() {
  const [active, setActive] = useState<string>('claude-ai');
  const selected = CLIENTS.find((c) => c.id === active) ?? null;

  return (
    <section className="section" id="integrations">
      <div className="section-hd reveal">
        <div className="section-greek">Praxis · the doing</div>
        <h2 className="section-title">
          Install once.<br/>
          <em>Speak everything.</em>
        </h2>
        <p className="section-sub">
          Pick your client below to see the one-line installation.
        </p>
      </div>

      <div className="install-command-area reveal">
        {selected ? (
          <>
            {selected.type === 'command' && selected.command && (
              <div className="code-panel">
                <div className="code-head">
                  <span className="code-file">{selected.label}</span>
                  <CopyBtn text={selected.command} />
                </div>
                <div className="code-body">
                  <pre>
                    <div className="code-line">
                      <span className="tk-kw">$ </span>
                      <span className="tk-str">{selected.command}</span>
                    </div>
                  </pre>
                </div>
              </div>
            )}

            {selected.type === 'command' && selected.steps && (
              <div className="code-panel">
                <div className="code-head">
                  <span className="code-file">{selected.label}</span>
                  <CopyBtn text={selected.steps.map(s => s.cmd).join('\n')} />
                </div>
                <div className="code-body">
                  <pre>
                    {selected.steps.map((step, i) => (
                      <div key={i}>
                        <div className="code-line" style={{ marginTop: i > 0 ? 10 : 0 }}>
                          <span className="tk-kw">$ </span>
                          <span className="tk-str">{step.cmd}</span>
                        </div>
                        {step.note && (
                          <div className="code-line">
                            <span className="tk-com">{step.note}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </pre>
                </div>
              </div>
            )}

            {selected.type === 'bundle' && (
              <div className="code-panel">
                <div className="code-head">
                  <span className="code-file">{selected.label}</span>
                  <span className="term-meta">{selected.meta}</span>
                </div>
                <div className="code-body">
                  <p className="install-card-body" style={{ marginBottom: 16 }}>
                    Download the signed MCP bundle and double-click to install. Claude Desktop will register the server and request authorization on first use.
                  </p>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: 13, padding: '10px 18px' }}
                      onClick={() => alert('Coming soon')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download .mcpb
                    </button>
                    <span className="term-meta">Coming soon</span>
                  </div>
                  {selected.fineprint && (
                    <div className="term-meta" style={{ marginTop: 12 }}>{selected.fineprint}</div>
                  )}
                </div>
              </div>
            )}

            {selected.type === 'steps' && (
              <div className="code-panel">
                <div className="code-head">
                  <span className="code-file">{selected.label}</span>
                </div>
                <div className="code-body">
                  <p className="install-card-body" style={{ marginBottom: 16 }}>
                    Claude on the web supports MCP via the Connectors UI. Follow the steps below — your endpoint URL is pre-filled and ready to paste.
                  </p>
                  <ol style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selected.walkthrough?.map((s, i) => (
                      <li key={i} style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.6 }}>
                        <span style={{ color: 'var(--text-dim)' }}>{s.text}</span>
                        {s.copy && <CopyBtn text={s.copy} style={{ marginLeft: 6, verticalAlign: 'middle' }} />}
                      </li>
                    ))}
                  </ol>
                  {selected.fineprint && (
                    <div className="term-meta" style={{ marginTop: 14 }}>{selected.fineprint}</div>
                  )}
                </div>
              </div>
            )}

            {selected.type === 'deeplink' && (
              <div className="code-panel">
                <div className="code-head">
                  <span className="code-file">{selected.label}</span>
                  <CopyBtn text={selected.deeplink!} />
                </div>
                <div className="code-body">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <a
                      className="btn btn-primary"
                      href={selected.deeplink}
                      style={{ fontSize: 13, padding: '10px 18px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                      Add to {selected.label}
                    </a>
                    <span className="term-meta">One-click install via deep link</span>
                  </div>
                  {selected.fallback && (
                    <>
                      <div className="term-divider" style={{ margin: '16px 0' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div className="term-meta">Manual fallback config:</div>
                        <CopyBtn text={selected.fallback} />
                      </div>
                      <pre style={{ fontSize: 12, lineHeight: 1.6 }}>
                        {selected.fallback.split('\n').map((line, i) => (
                          <div key={i} className="code-line">
                            <span className="tk-pun">{line}</span>
                          </div>
                        ))}
                      </pre>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="install-placeholder">
            <div className="install-placeholder-text">
              Select a client below to reveal the installation command
            </div>
          </div>
        )}
      </div>

      <div className="install-compat reveal reveal-delay-1">
        <div className="install-compat-label">Clients ·</div>
        <div className="install-compat-list">
          {CLIENTS.map((c) => (
            <button
              key={c.id}
              className={`install-client-pill ${active === c.id ? 'active' : ''}`}
              onClick={() => setActive(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
