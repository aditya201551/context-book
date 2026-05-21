import React from 'react';

const LAYERS = [
  {
    num: 'I',
    roman: 'Memoria recens',
    name: 'Short-term',
    nameEm: 'short-term',
    desc: 'Lives in the agent runtime — chat window, scratchpad, the last few turns. Volatile, fast, scoped to a single conversation.',
    meta: [
      ['scope', 'session'],
      ['ttl',   'minutes — hours'],
      ['where', 'LangGraph / agent runtime'],
    ],
  },
  {
    num: 'II',
    roman: 'Memoria media',
    name: 'Working memory',
    nameEm: 'working memory',
    desc: 'ContextBook\'s home. Compressed session summaries, recent decisions, and the contextual chunks an agent needs to keep working tomorrow.',
    meta: [
      ['scope', 'project / topic'],
      ['ttl',   'days — weeks'],
      ['where', 'ContextBook · pgvector'],
    ],
  },
  {
    num: 'III',
    roman: 'Memoria perennis',
    name: 'Long-term',
    nameEm: 'long-term',
    desc: 'Durable insights, patterns, profiles. What you and your agents have actually learned, distilled and indexed by intent for semantic recall.',
    meta: [
      ['scope', 'identity / org'],
      ['ttl',   'permanent'],
      ['where', 'ContextBook · curated'],
    ],
  },
];

function FlowDiagram() {
  return (
    <svg className="arch-flow-svg reveal" viewBox="0 0 900 80" width="900" height="80">
      <defs>
        <linearGradient id="flow-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#8a6a3a" stopOpacity="0"/>
          <stop offset="20%" stopColor="#8a6a3a" stopOpacity="0.5"/>
          <stop offset="80%" stopColor="#e8b765" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#e8b765" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <line x1="40" y1="40" x2="860" y2="40" stroke="url(#flow-line)" strokeWidth="1" />
      {/* labels */}
      <text x="150" y="20" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10"
            fill="#6a624f" letterSpacing="2">SHORT-TERM</text>
      <text x="450" y="20" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10"
            fill="#e8b765" letterSpacing="2">CONTEXTBOOK</text>
      <text x="750" y="20" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10"
            fill="#6a624f" letterSpacing="2">LONG-TERM</text>
      {/* small particle dots flowing */}
      <circle r="3" fill="#e8b765" opacity="0.85">
        <animate attributeName="cx" from="60" to="840" dur="6s" repeatCount="indefinite"/>
        <animate attributeName="cy" values="40;40" dur="6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;1;1;0" dur="6s" repeatCount="indefinite"/>
      </circle>
      <circle r="2" fill="#e8b765" opacity="0.7">
        <animate attributeName="cx" from="60" to="840" dur="6s" begin="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;1;1;0" dur="6s" begin="2s" repeatCount="indefinite"/>
      </circle>
      <circle r="2.5" fill="#e8b765" opacity="0.75">
        <animate attributeName="cx" from="60" to="840" dur="6s" begin="4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;1;1;0" dur="6s" begin="4s" repeatCount="indefinite"/>
      </circle>
      {/* nodes */}
      <circle cx="150" cy="40" r="6" fill="#1a1814" stroke="#8a6a3a" strokeWidth="1.2"/>
      <circle cx="450" cy="40" r="9" fill="#e8b765" stroke="#e8b765"/>
      <circle cx="450" cy="40" r="14" fill="none" stroke="#e8b765" strokeWidth="0.8" opacity="0.4">
        <animate attributeName="r" values="14;22;14" dur="2.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.5;0;0.5" dur="2.6s" repeatCount="indefinite"/>
      </circle>
      <circle cx="750" cy="40" r="6" fill="#1a1814" stroke="#8a6a3a" strokeWidth="1.2"/>
      <text x="450" y="68" textAnchor="middle" fontFamily="var(--font-serif)"
            fontStyle="italic" fontSize="14" fill="#9a907c">pull · push · forget</text>
    </svg>
  );
}

export default function LandingArchitecture() {
  return (
    <section className="section" id="how">
      <div className="section-hd reveal">
        <div className="section-greek">Tres memoriae · the three memories</div>
        <h2 className="section-title">
          Three layers of memory,<br/>
          <em>one bridge between them.</em>
        </h2>
        <p className="section-sub">
          Brains don't have a single store of memory and neither should agents.
          ContextBook sits in the middle — the part that turns yesterday's scratchpad
          into tomorrow's context.
        </p>
      </div>

      <div className="arch-grid">
        {LAYERS.map((l, i) => (
          <div key={l.num} className={`arch-card reveal reveal-delay-${i + 1}`}>
            <div className="arch-roman">{l.roman}</div>
            <div className="arch-num serif">{l.num}</div>
            <h3 className="arch-name">
              <em>{l.nameEm}</em>
            </h3>
            <p className="arch-desc">{l.desc}</p>
            <div className="arch-meta">
              {l.meta.map(([k, v]) => (
                <div key={k}><span className="k">{k}</span>{v}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <FlowDiagram />
    </section>
  );
}
