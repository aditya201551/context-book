import { useState, useCallback } from 'react';

interface Token {
  t: string;
  v: string;
}

interface Cap {
  name: string;
  desc: string;
  glyph: string;
  file: string;
  code: (Token[])[];
}

const CAPS: Cap[] = [
  {
    name: 'push_context',
    desc: 'Store compressed insights with metadata, tags, and source attribution. Embeddings happen locally.',
    glyph: '↑',
    file: 'examples/push.go',
    code: [
      [{ t: 'tk-com', v: '// Persist a decision so future agents can recall it.' }],
      [{ t: 'tk-com', v: '// Compressed insights, not raw logs.' }],
      [],
      [{ t: 'tk-kw', v: 'ctx, _ := ' }, { t: 'tk-fn', v: 'bridge.PushContext' }, { t: 'tk-pun', v: '(' }, { t: 'tk-prop', v: 'ctx' }, { t: 'tk-pun', v: ', ' }, { t: '',  v: 'cb.Insight' }, { t: 'tk-pun', v: '{' }],
      [{ t: 'tk-prop', v: '    Title:  ' }, { t: 'tk-str', v: '"pgvector HNSW tuning — m=16, ef=64"' }, { t: 'tk-pun', v: ',' }],
      [{ t: 'tk-prop', v: '    Source: ' }, { t: 'tk-str', v: '"cursor"' }, { t: 'tk-pun', v: ',' }],
      [{ t: 'tk-prop', v: '    Tags:   ' }, { t: 'tk-pun', v: '[]' }, { t: 'tk-kw', v: 'string' }, { t: 'tk-pun', v: '{' }, { t: 'tk-str', v: '"postgres"' }, { t: 'tk-pun', v: ', ' }, { t: 'tk-str', v: '"embeddings"' }, { t: 'tk-pun', v: '},' }],
      [{ t: 'tk-prop', v: '    Chunks: ' }, { t: 'tk-pun', v: '[]' }, { t: '', v: 'cb.Chunk' }, { t: 'tk-pun', v: '{' }],
      [{ t: 'tk-pun', v: '        {' }, { t: 'tk-prop', v: 'Content' }, { t: 'tk-pun', v: ': ' }, { t: 'tk-str', v: '"recall@10 = 0.952, p50 = 8ms"' }, { t: 'tk-pun', v: '},' }],
      [{ t: 'tk-pun', v: '    },' }],
      [{ t: 'tk-pun', v: '})' }],
    ],
  },
  {
    name: 'pull_context',
    desc: 'Retrieve by intent, not keyword. The query is embedded and matched semantically across every vault you have access to.',
    glyph: '↓',
    file: 'examples/pull.go',
    code: [
      [{ t: 'tk-com', v: '// Ask in plain English. Get back the relevant memory.' }],
      [],
      [{ t: 'tk-kw', v: 'hits, _ := ' }, { t: 'tk-fn', v: 'bridge.PullContext' }, { t: 'tk-pun', v: '(' }, { t: 'tk-prop', v: 'ctx' }, { t: 'tk-pun', v: ', ' }, { t: '', v: 'cb.Query' }, { t: 'tk-pun', v: '{' }],
      [{ t: 'tk-prop', v: '    Intent: ' }, { t: 'tk-str', v: '"what did we decide about pagination?"' }, { t: 'tk-pun', v: ',' }],
      [{ t: 'tk-prop', v: '    Limit:  ' }, { t: 'tk-fn', v: '5' }, { t: 'tk-pun', v: ',' }],
      [{ t: 'tk-pun', v: '})' }],
      [],
      [{ t: 'tk-com', v: '// → "cursor vs offset pagination"   · 0.91' }],
      [{ t: 'tk-com', v: '// → "OAuth PKCE — implementation"      · 0.34' }],
      [{ t: 'tk-com', v: '// → "intermittent 502s on /api/search"   · 0.28' }],
    ],
  },
  {
    name: 'list_contexts',
    desc: 'Discover every vault available to this agent, with metadata for routing decisions.',
    glyph: '◫',
    file: 'examples/list.sh',
    code: [
      [{ t: 'tk-com', v: '# Through the MCP protocol — any compatible client works.' }],
      [],
      [{ t: 'tk-kw', v: '$ ' }, { t: 'tk-fn', v: 'bridge' }, { t: '', v: ' list-contexts ' }, { t: 'tk-prop', v: '--source claude' }],
      [],
      [{ t: 'tk-com', v: '#  context_id     title                       chunks  updated' }],
      [{ t: 'tk-com', v: '#  -------------  --------------------------  ------  -------' }],
      [{ t: 'tk-com', v: '#  2ca29f4e…      ContextBook — System     5       2d ago' }],
      [{ t: 'tk-com', v: '#  a1b2c3d4…      pgvector HNSW tuning        2       4d ago' }],
      [{ t: 'tk-com', v: '#  a1b2c3d5…      Attention Is All You Need   2       6d ago' }],
    ],
  },
  {
    name: 'forget',
    desc: 'Lifecycle is first-class. Drop a chunk, a context, or an entire vault — selectively or by policy.',
    glyph: '×',
    file: 'examples/forget.go',
    code: [
      [{ t: 'tk-com', v: '// Memory is a feature only when forgetting is too.' }],
      [],
      [{ t: 'tk-kw', v: '_ = ' }, { t: 'tk-fn', v: 'bridge.Forget' }, { t: 'tk-pun', v: '(' }, { t: 'tk-prop', v: 'ctx' }, { t: 'tk-pun', v: ', ' }, { t: '', v: 'cb.Selector' }, { t: 'tk-pun', v: '{' }],
      [{ t: 'tk-prop', v: '    Tags:      ' }, { t: 'tk-pun', v: '[]' }, { t: 'tk-kw', v: 'string' }, { t: 'tk-pun', v: '{' }, { t: 'tk-str', v: '"deprecated"' }, { t: 'tk-pun', v: '},' }],
      [{ t: 'tk-prop', v: '    OlderThan: ' }, { t: '', v: 'time.Now().Add' }, { t: 'tk-pun', v: '(-' }, { t: '', v: 'time.Hour' }, { t: 'tk-pun', v: ' * ' }, { t: 'tk-fn', v: '24' }, { t: 'tk-pun', v: ' * ' }, { t: 'tk-fn', v: '90' }, { t: 'tk-pun', v: '),' }],
      [{ t: 'tk-pun', v: '})' }],
    ],
  },
];

function CodePanel({ cap }: { cap: Cap }) {
  const handleCopy = useCallback(() => {
    const text = cap.code.map((line) => line.map((t) => t.v).join('')).join('\n');
    navigator.clipboard.writeText(text);
  }, [cap]);

  return (
    <div className="reveal reveal-delay-1">
      <div className="code-panel">
        <div className="code-head">
          <span className="code-file">{cap.file}</span>
          <button className="code-copy" onClick={handleCopy}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            copy
          </button>
        </div>
        <div className="code-body">
          <pre>
            {cap.code.map((line, i) => (
              <div key={i} className="code-line">
                {line.length === 0
                  ? '\u00A0'
                  : line.map((tok, j) => (
                      <span key={j} className={tok.t}>{tok.v}</span>
                    ))}
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function LandingCapabilities() {
  const [active, setActive] = useState(0);
  const cur = CAPS[active];

  return (
    <section className="section" id="capabilities">
      <div className="section-hd reveal">
        <div className="section-greek">Logos · the verbs of memory</div>
        <h2 className="section-title">
          Four verbs.<br/>
          <em>Every memory operation.</em>
        </h2>
        <p className="section-sub">
          ContextBook exposes a tiny surface area through MCP. Push compressed insights up,
          pull them back by intent, list what's available, forget what no longer serves.
        </p>
      </div>

      <div className="cap-layout">
        <div className="cap-tabs reveal">
          {CAPS.map((c, i) => (
            <button
              key={c.name}
              className={`cap-tab ${i === active ? 'active' : ''}`}
              onClick={() => setActive(i)}
            >
              <span className="cap-tab-glyph">{c.glyph}</span>
              <span className="cap-tab-text">
                <div className="cap-tab-name"><em>{c.name}</em></div>
                <div className="cap-tab-desc">{c.desc}</div>
              </span>
            </button>
          ))}
        </div>
        <CodePanel cap={cur} />
      </div>
    </section>
  );
}
