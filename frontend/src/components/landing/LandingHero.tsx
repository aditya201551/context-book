function HeroEyebrow() {
  return (
    <div className="hero-eyebrow">
      <span className="dot"></span>
      <span>Mnemosyne &middot; Memory layer for MCP</span>
    </div>
  );
}

function FloatingFragments() {
  const items = [
    { text: 'ctx_2ca29f4e · system-design', x: '2%',  y: '14%', delay: 0,   inner: true },
    { text: 'recall@10 = 0.952',           x: '86%', y: '20%', delay: 1.5, inner: false },
    { text: 'tag: distributed-systems',    x: '1%',  y: '62%', delay: 3,   inner: false },
    { text: 'Voyage AI · 1024d',           x: '88%', y: '60%', delay: 2,   inner: true },
    { text: 'pull_context(intent="…")',    x: '6%',  y: '88%', delay: 4,   inner: false },
    { text: '14 vaults · 38 chunks',       x: '80%', y: '86%', delay: 0.7, inner: true },
  ];
  return (
    <>
      {items.map((it, i) => (
        <div
          key={i}
          className={`fragment mono ${it.inner ? 'frag-inner' : ''}`}
          style={{ left: it.x, top: it.y, animationDelay: `${it.delay}s` }}
        >
          {it.text}
        </div>
      ))}
    </>
  );
}

function HeroTemple() {
  return (
    <div className="hero-temple-wrap">
      <svg className="hero-temple" viewBox="0 0 900 520" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="h-marble" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a342a" />
            <stop offset="50%" stopColor="#2a261f" />
            <stop offset="100%" stopColor="#1c1a16" />
          </linearGradient>
          <linearGradient id="h-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8b765" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#8a6a3a" stopOpacity="0.4" />
          </linearGradient>
          <radialGradient id="h-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e8b765" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#e8b765" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="h-light" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#e8b765" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#e8b765" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* halo */}
        <rect width="900" height="520" fill="url(#h-halo)" />

        {/* light shafts between columns */}
        <g opacity="0.7">
          <polygon points="180,140 240,140 320,460 140,460" fill="url(#h-light)" />
          <polygon points="420,140 480,140 520,460 380,460" fill="url(#h-light)" />
          <polygon points="660,140 720,140 760,460 620,460" fill="url(#h-light)" />
        </g>

        {/* constellation behind */}
        <g opacity="0.45" stroke="#8a7a5a" strokeWidth="0.6" fill="none">
          <line x1="80" y1="50" x2="180" y2="30" />
          <line x1="180" y1="30" x2="280" y2="60" />
          <line x1="280" y1="60" x2="360" y2="35" />
          <line x1="560" y1="40" x2="680" y2="70" />
          <line x1="680" y1="70" x2="780" y2="40" />
          <line x1="680" y1="70" x2="720" y2="120" />
        </g>
        <g fill="#e8b765" opacity="0.9">
          <circle cx="80" cy="50" r="1.5" />
          <circle cx="180" cy="30" r="2" />
          <circle cx="280" cy="60" r="1.4" />
          <circle cx="360" cy="35" r="1.7" />
          <circle cx="560" cy="40" r="1.5" />
          <circle cx="680" cy="70" r="2.3" />
          <circle cx="780" cy="40" r="1.4" />
          <circle cx="720" cy="120" r="1.3" />
          <circle cx="60" cy="120" r="1.4" />
          <circle cx="840" cy="200" r="1.2" />
        </g>

        {/* pediment */}
        <path d="M 120 140 L 450 80 L 780 140 Z" fill="url(#h-marble)" stroke="url(#h-gold)" strokeWidth="0.8" />
        <circle cx="450" cy="116" r="9" fill="none" stroke="#e8b765" strokeWidth="1" opacity="0.7" />
        <circle cx="450" cy="116" r="3" fill="#e8b765" opacity="0.75" />
        {/* laurel branches */}
        <g stroke="#8a6a3a" strokeWidth="0.9" fill="none" opacity="0.7">
          <path d="M 432 116 Q 414 110 400 122" />
          <path d="M 468 116 Q 486 110 500 122" />
          <ellipse cx="414" cy="113" rx="3.5" ry="1.6" transform="rotate(-25 414 113)" fill="#8a6a3a" opacity="0.55" />
          <ellipse cx="408" cy="118" rx="3.5" ry="1.6" transform="rotate(15 408 118)" fill="#8a6a3a" opacity="0.55" />
          <ellipse cx="486" cy="113" rx="3.5" ry="1.6" transform="rotate(25 486 113)" fill="#8a6a3a" opacity="0.55" />
          <ellipse cx="492" cy="118" rx="3.5" ry="1.6" transform="rotate(-15 492 118)" fill="#8a6a3a" opacity="0.55" />
        </g>

        {/* architrave */}
        <rect x="120" y="140" width="660" height="14" fill="url(#h-marble)" stroke="url(#h-gold)" strokeWidth="0.8" />
        <rect x="110" y="154" width="680" height="6" fill="#1a1814" stroke="url(#h-gold)" strokeWidth="0.6" />
        <g fill="#3a3024">
          {Array.from({ length: 18 }).map((_, i) => {
            const groupX = 145 + i * 36;
            return [0, 8, 16].map((dx, j) => (
              <rect key={`${i}-${j}`} x={groupX + dx} y="144" width="4" height="6" />
            ));
          })}
        </g>

        {/* columns */}
        {[155, 380, 605].map((xpos, idx) => (
          <g key={idx} transform={`translate(${xpos}, 160)`}>
            {/* capital */}
            <rect x="-4" y="0" width="60" height="6" fill="url(#h-marble)" stroke="url(#h-gold)" strokeWidth="0.6" />
            <path d="M -2 6 Q -2 16 7 16 Q 16 16 16 9" fill="none" stroke="#8a6a3a" strokeWidth="1.2" />
            <path d="M 54 6 Q 54 16 45 16 Q 36 16 36 9" fill="none" stroke="#8a6a3a" strokeWidth="1.2" />
            <circle cx="7" cy="13" r="1.4" fill="#8a6a3a" />
            <circle cx="45" cy="13" r="1.4" fill="#8a6a3a" />
            {/* shaft */}
            <rect x="2" y="16" width="48" height="260" fill="url(#h-marble)" stroke="url(#h-gold)" strokeWidth="0.6" />
            {[10, 16, 22, 28, 34, 40].map((fx, i) => (
              <line key={i} x1={fx} y1={16} x2={fx} y2={276} stroke="#1a1814" strokeWidth="0.8" />
            ))}
            {/* base */}
            <rect x="-4" y="276" width="60" height="6" fill="url(#h-marble)" stroke="url(#h-gold)" strokeWidth="0.6" />
            <rect x="-10" y="282" width="72" height="9" fill="url(#h-marble)" stroke="url(#h-gold)" strokeWidth="0.6" />
          </g>
        ))}

        {/* stylobate / steps */}
        <rect x="90" y="451" width="720" height="7" fill="url(#h-marble)" stroke="url(#h-gold)" strokeWidth="0.6" />
        <rect x="74" y="458" width="752" height="9" fill="url(#h-marble)" stroke="url(#h-gold)" strokeWidth="0.6" />
        <rect x="56" y="467" width="788" height="11" fill="url(#h-marble)" stroke="url(#h-gold)" strokeWidth="0.6" />

        {/* memory fragments between columns */}
        <g opacity="0.85">
          <rect x="240" y="270" width="60" height="3.5" fill="#e8b765" rx="1">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="3.4s" repeatCount="indefinite" />
          </rect>
          <rect x="246" y="280" width="48" height="3.5" fill="#8a6a3a" rx="1" />
          <rect x="252" y="290" width="38" height="3.5" fill="#5a4a2a" rx="1" />
          <rect x="467" y="260" width="60" height="3.5" fill="#e8b765" rx="1">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="3.4s" begin="0.7s" repeatCount="indefinite" />
          </rect>
          <rect x="473" y="270" width="48" height="3.5" fill="#8a6a3a" rx="1" />
          <rect x="479" y="280" width="38" height="3.5" fill="#5a4a2a" rx="1" />
          <rect x="485" y="290" width="28" height="3.5" fill="#3a2e1a" rx="1" />
          <rect x="690" y="280" width="60" height="3.5" fill="#e8b765" rx="1">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="3.4s" begin="1.4s" repeatCount="indefinite" />
          </rect>
          <rect x="696" y="290" width="48" height="3.5" fill="#8a6a3a" rx="1" />
          <rect x="702" y="300" width="38" height="3.5" fill="#5a4a2a" rx="1" />
        </g>

        {/* engraving */}
        <text x="450" y="500" textAnchor="middle"
              fontFamily="Cormorant Garamond, serif" fontSize="15" fontStyle="italic"
              fill="#8a7a5a" letterSpacing="3">
          &#x0393;&#x039D;&#x03A9;&#x0398;&#x0399; &#x03A3;&#x0395;&#x0391;&#x03A5;&#x03A4;&#x039F;&#x039D; &nbsp;&middot;&nbsp; &#x039C;&#x039D;&#x0397;&#x039C;&#x039F;&#x03A3;&#x03A5;&#x039D;&#x0397;
        </text>
      </svg>
    </div>
  );
}

interface LandingHeroProps {
  onOpenLibrary: () => void;
}

export default function LandingHero({ onOpenLibrary }: LandingHeroProps) {
  return (
    <section className="hero">
      <div className="hero-shaft"></div>
      <FloatingFragments />
      <HeroEyebrow />

      <h1 className="hero-title">
        Memory for the<br />
        <em>thinking machine.</em>
      </h1>

      <p className="hero-sub">
        ContextBook is a cross-platform memory layer for AI agents.
        Compressed insights, not raw logs &mdash; retrieved by meaning, not by name.
        One library, every model.
      </p>

      <div className="hero-cta">
        <button className="btn btn-primary btn-lg" onClick={onOpenLibrary}>
          <span>Open the Library</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path>
          </svg>
        </button>
        <a className="btn btn-lg" href="https://github.com" target="_blank" rel="noreferrer">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57v-2c-3.34.73-4.04-1.61-4.04-1.61-.55-1.4-1.34-1.77-1.34-1.77-1.09-.74.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.84 2.82 1.31 3.51 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.42.36.81 1.1.81 2.22v3.29c0 .31.22.7.83.57A12 12 0 0 0 12 .3" /></svg>
          <span>Star on GitHub</span>
        </a>
      </div>

      <div className="hero-meta">
        <span><span className="pill-dot"></span> Open source · MIT</span>
        <span><span className="pill-dot"></span> Self-hosted</span>
      </div>

      <HeroTemple />
    </section>
  );
}
