import { useState, useEffect, useRef, useMemo } from 'react';

// Cluster → position zone (centerX, centerY in 0\u20131 space) + accent color
const CLUSTER_ZONES: Record<string, { cx: number; cy: number; color: string; name: string }> = {
  'distributed-systems': { cx: 0.18, cy: 0.30, color: '#7ab8ff', name: 'Distributed systems' },
  'theory':              { cx: 0.18, cy: 0.30, color: '#7ab8ff', name: 'Distributed systems' },
  'algorithms':          { cx: 0.18, cy: 0.30, color: '#7ab8ff', name: 'Distributed systems' },
  'postgres':            { cx: 0.42, cy: 0.62, color: '#e8b765', name: 'Infrastructure' },
  'performance':         { cx: 0.42, cy: 0.62, color: '#e8b765', name: 'Infrastructure' },
  'embeddings':          { cx: 0.42, cy: 0.62, color: '#e8b765', name: 'Infrastructure' },
  'architecture':        { cx: 0.42, cy: 0.62, color: '#e8b765', name: 'Infrastructure' },
  'system':              { cx: 0.42, cy: 0.62, color: '#e8b765', name: 'Infrastructure' },
  'mcp':                 { cx: 0.42, cy: 0.62, color: '#e8b765', name: 'Infrastructure' },
  'memory':              { cx: 0.42, cy: 0.62, color: '#e8b765', name: 'Infrastructure' },
  'context-book':        { cx: 0.42, cy: 0.62, color: '#e8b765', name: 'Infrastructure' },
  'team':                { cx: 0.78, cy: 0.28, color: '#7dd88f', name: 'Team & process' },
  'meeting':             { cx: 0.78, cy: 0.28, color: '#7dd88f', name: 'Team & process' },
  'onboarding':          { cx: 0.78, cy: 0.28, color: '#7dd88f', name: 'Team & process' },
  'roadmap':             { cx: 0.78, cy: 0.28, color: '#7dd88f', name: 'Team & process' },
  'process':             { cx: 0.78, cy: 0.28, color: '#7dd88f', name: 'Team & process' },
  'research':            { cx: 0.66, cy: 0.78, color: '#b6a1fb', name: 'Research' },
  'papers':              { cx: 0.66, cy: 0.78, color: '#b6a1fb', name: 'Research' },
  'ml':                  { cx: 0.66, cy: 0.78, color: '#b6a1fb', name: 'Research' },
  'journal':             { cx: 0.85, cy: 0.70, color: '#ff8c7a', name: 'Personal' },
  'personal':            { cx: 0.85, cy: 0.70, color: '#ff8c7a', name: 'Personal' },
  'ideas':               { cx: 0.85, cy: 0.70, color: '#ff8c7a', name: 'Personal' },
  'api':                 { cx: 0.22, cy: 0.72, color: '#82d4e0', name: 'Engineering' },
  'auth':                { cx: 0.22, cy: 0.72, color: '#82d4e0', name: 'Engineering' },
  'security':            { cx: 0.22, cy: 0.72, color: '#82d4e0', name: 'Engineering' },
  'oauth':               { cx: 0.22, cy: 0.72, color: '#82d4e0', name: 'Engineering' },
  'debugging':           { cx: 0.22, cy: 0.72, color: '#82d4e0', name: 'Engineering' },
  'rust':                { cx: 0.22, cy: 0.72, color: '#82d4e0', name: 'Engineering' },
  'react':               { cx: 0.22, cy: 0.72, color: '#82d4e0', name: 'Engineering' },
  'frontend':            { cx: 0.22, cy: 0.72, color: '#82d4e0', name: 'Engineering' },
  'languages':           { cx: 0.22, cy: 0.72, color: '#82d4e0', name: 'Engineering' },
  'incidents':           { cx: 0.22, cy: 0.72, color: '#82d4e0', name: 'Engineering' },
  'search':              { cx: 0.22, cy: 0.72, color: '#82d4e0', name: 'Engineering' },
  'product':             { cx: 0.66, cy: 0.78, color: '#b6a1fb', name: 'Research' },
  // Non-technical clusters
  'travel':              { cx: 0.82, cy: 0.32, color: '#ff8c7a', name: 'Travel' },
  'cooking':             { cx: 0.75, cy: 0.52, color: '#e8a07a', name: 'Cooking' },
  'recipes':             { cx: 0.75, cy: 0.52, color: '#e8a07a', name: 'Cooking' },
  'fitness':             { cx: 0.88, cy: 0.42, color: '#7dd88f', name: 'Fitness' },
  'health':              { cx: 0.88, cy: 0.42, color: '#7dd88f', name: 'Fitness' },
  'language':            { cx: 0.70, cy: 0.45, color: '#b6a1fb', name: 'Learning' },
  'learning':            { cx: 0.70, cy: 0.45, color: '#b6a1fb', name: 'Learning' },
  'writing':             { cx: 0.85, cy: 0.62, color: '#ff8c7a', name: 'Creative' },
  'creative':            { cx: 0.85, cy: 0.62, color: '#ff8c7a', name: 'Creative' },
  'hobby':               { cx: 0.85, cy: 0.62, color: '#ff8c7a', name: 'Creative' },
  'finance':             { cx: 0.90, cy: 0.72, color: '#ff8c7a', name: 'Personal' },
  'life':                { cx: 0.86, cy: 0.68, color: '#ff8c7a', name: 'Personal' },
};

function pickZone(tags: string[]) {
  for (const t of tags) {
    if (CLUSTER_ZONES[t]) return CLUSTER_ZONES[t];
  }
  return { cx: 0.5, cy: 0.5, color: '#9a907c', name: 'Misc' };
}

interface SyntheticContext {
  context_id: string;
  title: string;
  source: string;
  tags: string[];
}

const SYNTHETIC_DATA: { title: string; tags: string[] }[] = [
  // Technical — Distributed systems
  { title: 'Lamport timestamps vs vector clocks', tags: ['distributed-systems','theory','algorithms'] },
  { title: 'Two-phase commit — failure modes', tags: ['distributed-systems','algorithms'] },
  { title: 'Gossip protocols at scale', tags: ['distributed-systems','algorithms'] },
  { title: 'CRDTs: state-based vs op-based', tags: ['distributed-systems','algorithms','theory'] },
  // Technical — Infrastructure
  { title: 'Postgres logical replication setup', tags: ['postgres','architecture'] },
  { title: 'pgbouncer pool sizing for 8 cores', tags: ['postgres','performance'] },
  { title: 'Vault sharding strategy beyond 10M chunks', tags: ['architecture','postgres','performance'] },
  { title: 'WAL backpressure on burst writes', tags: ['postgres','performance'] },
  { title: 'Embedding cache hit-rate experiments', tags: ['embeddings','performance'] },
  { title: 'MCP server lifecycle on macOS', tags: ['mcp','system'] },
  { title: 'Token-budget governor design', tags: ['architecture','context-book'] },
  // Technical — Engineering
  { title: 'OAuth refresh token rotation', tags: ['auth','security','oauth'] },
  { title: 'Rate limiter — token bucket vs sliding window', tags: ['api','architecture'] },
  { title: 'WebSocket reconnect strategy', tags: ['api','frontend'] },
  { title: 'gRPC deadlines — defaults are wrong', tags: ['api','debugging'] },
  { title: 'TypeScript strictness migration plan', tags: ['frontend','architecture'] },
  { title: 'React 19 transitions — when to use', tags: ['react','frontend'] },
  // Technical — ML / Research
  { title: 'Speculative decoding — what works', tags: ['ml','research'] },
  { title: 'LoRA vs full fine-tune for retrieval', tags: ['ml','research','embeddings'] },
  { title: 'BM25 + dense fusion — eval methodology', tags: ['ml','research','search'] },
  // Non-technical — Travel
  { title: 'Japan trip — Tokyo → Kyoto itinerary, April 12–20', tags: ['travel','personal'] },
  { title: 'JR Pass vs individual tickets — cost breakdown', tags: ['travel','personal'] },
  { title: 'Best cherry blossom viewing spots in Tokyo', tags: ['travel','journal'] },
  { title: 'Hotel booking: Shibuya vs Shinjuku comparison', tags: ['travel','personal'] },
  // Non-technical — Cooking / Food
  { title: 'Thai green curry recipe — coconut cream substitution', tags: ['cooking','personal','recipes'] },
  { title: 'Sourdough starter feeding schedule', tags: ['cooking','recipes'] },
  { title: 'Weekly meal prep plan — vegetarian batch cooking', tags: ['cooking','recipes','personal'] },
  { title: 'Grocery list: pantry staples for quick dinners', tags: ['cooking','personal'] },
  // Non-technical — Fitness
  { title: 'Leg day progression: 185 → 190 lb squats', tags: ['fitness','health','personal'] },
  { title: 'Left knee tenderness — skip lungges this week', tags: ['fitness','health','personal'] },
  { title: 'Running cadence target: 170 spm', tags: ['fitness','health'] },
  { title: 'Weekly yoga sequence for lower back relief', tags: ['fitness','health','personal'] },
  // Non-technical — Language learning
  { title: 'Spanish subjunctive — "espero que" drills', tags: ['language','learning','personal'] },
  { title: 'Anki flashcards: 500 most common Spanish verbs', tags: ['language','learning','personal'] },
  { title: 'French pronunciation: nasal vowel practice', tags: ['language','learning'] },
  { title: 'Weekly Duolingo streak — 42 days', tags: ['language','learning','journal'] },
  // Non-technical — Creative / Personal
  { title: 'Sci-fi story outline — Chapter 3: The Signal', tags: ['writing','creative','personal'] },
  { title: 'Character arc notes: Mara and the AI', tags: ['writing','creative','personal'] },
  { title: 'Photography project: neon-lit alleyways', tags: ['creative','hobby','personal'] },
  { title: 'Monthly budget: groceries overspent by $47', tags: ['finance','personal'] },
  { title: 'Reading list — Q2: sci-fi and tech history', tags: ['personal','journal','ideas'] },
  { title: 'Career conversation with mentor — key takeaways', tags: ['personal','journal'] },
  { title: 'Side project: tiny vector DB in Zig', tags: ['ideas','personal'] },
  { title: 'Weekly journal — May 02', tags: ['journal','personal'] },
  // Team & process
  { title: 'Post-mortem template — what we actually keep', tags: ['team','process','incidents'] },
  { title: 'Q3 planning offsite agenda', tags: ['meeting','roadmap','team'] },
  { title: 'On-call rotation fairness audit', tags: ['team','process'] },
  { title: 'RFC: code review SLAs', tags: ['team','process'] },
];

function buildAllContexts(): SyntheticContext[] {
  return SYNTHETIC_DATA.map((s, i) => ({
    context_id: `syn-${i.toString(16).padStart(8, '0')}-${(i*7).toString(16).padStart(4, '0')}`,
    title: s.title,
    source: ['claude', 'cursor', 'user'][i % 3],
    tags: s.tags,
  }));
}

function tagSim(a: string[], b: string[]) {
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

interface Star {
  ctx: SyntheticContext;
  idx: number;
  zone: ReturnType<typeof pickZone>;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  tagSig: string;
}

function buildStars(contexts: SyntheticContext[], width: number, height: number): Star[] {
  return contexts.map((c, idx) => {
    const zone = pickZone(c.tags);
    let h = 0;
    for (let i = 0; i < c.context_id.length; i++) h = (h * 31 + c.context_id.charCodeAt(i)) >>> 0;
    const a = ((h % 1000) / 1000) * Math.PI * 2;
    const r = 0.05 + ((h >> 10) % 1000) / 1000 * 0.14;
    return {
      ctx: c,
      idx,
      zone,
      x: width * (zone.cx + Math.cos(a) * r),
      y: height * (zone.cy + Math.sin(a) * r * 1.3),
      vx: Math.cos(a) * 0.05,
      vy: Math.sin(a) * 0.05,
      r: 1.6 + ((h >> 20) % 100) / 100 * 1.8,
      tagSig: c.tags.join('|'),
    };
  });
}

function hexA(hex: string, a: number): string {
  if (hex.startsWith('rgba')) return hex;
  if (hex.startsWith('#')) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  return hex;
}

export default function LandingConstellation() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ star: Star; x: number; y: number; neighbors: number } | null>(null);
  const [query, setQuery] = useState('');
  const [size, setSize] = useState({ w: 800, h: 520 });
  const animRef = useRef(0);
  const starsRef = useRef<Star[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });

  const contexts = useMemo(() => buildAllContexts(), []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    starsRef.current = buildStars(contexts, size.w, size.h);
  }, [contexts, size.w, size.h]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size.w * dpr; c.height = size.h * dpr;
    c.style.width = size.w + 'px'; c.style.height = size.h + 'px';
    ctx.scale(dpr, dpr);

    const lcQuery = query.trim().toLowerCase();

    function draw(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, size.w, size.h);

      // ambient twinkle stars
      ctx.fillStyle = 'rgba(232,183,101,0.18)';
      for (let i = 0; i < 60; i++) {
        const seed = i * 17.31;
        const px = ((Math.sin(seed) * 10000) % 1 + 1) % 1 * size.w;
        const py = ((Math.cos(seed * 1.7) * 10000) % 1 + 1) % 1 * size.h;
        const tw = 0.4 + Math.sin(t * 0.0008 + seed) * 0.4;
        ctx.globalAlpha = tw * 0.5;
        ctx.fillRect(px, py, 1, 1);
      }
      ctx.globalAlpha = 1;

      const stars = starsRef.current;
      let hovered = null as Star | null;
      let bestD = 24;
      for (const s of stars) {
        const dx = s.x - mouseRef.current.x;
        const dy = s.y - mouseRef.current.y;
        const d = Math.hypot(dx, dy);
        if (d < bestD) { bestD = d; hovered = s; }
      }

      let queryMatch = null as Star | null;
      if (lcQuery.length >= 2) {
        for (const s of stars) {
          if (s.ctx.title.toLowerCase().includes(lcQuery) ||
              s.ctx.tags.some(tg => tg.includes(lcQuery))) {
            if (!queryMatch || s.ctx.title.length < queryMatch.ctx.title.length) queryMatch = s;
          }
        }
      }

      const focus = hovered || queryMatch;

      if (focus) {
        const sims = stars
          .filter(s => s !== focus)
          .map(s => ({ s, sim: tagSim(focus.ctx.tags, s.ctx.tags) }))
          .filter(x => x.sim > 0)
          .sort((a, b) => b.sim - a.sim)
          .slice(0, 10);

        for (const { s, sim } of sims) {
          const grad = ctx.createLinearGradient(focus.x, focus.y, s.x, s.y);
          grad.addColorStop(0, `rgba(232,183,101,${0.7 * Math.min(1, sim * 1.5)})`);
          grad.addColorStop(1, `rgba(232,183,101,${0.1 * Math.min(1, sim * 1.5)})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 0.6 + sim * 1.4;
          ctx.beginPath();
          ctx.moveTo(focus.x, focus.y);
          ctx.lineTo(s.x, s.y);
          ctx.stroke();
        }
      }

      for (const s of stars) {
        const isFocus = s === focus;
        const isNeighbor = focus && !isFocus && tagSim(focus.ctx.tags, s.ctx.tags) > 0;
        const isDim = focus && !isFocus && !isNeighbor;

        s.x += s.vx * 0.04;
        s.y += s.vy * 0.04;
        const zx = s.zone.cx * size.w;
        const zy = s.zone.cy * size.h;
        if (Math.hypot(s.x - zx, s.y - zy) > Math.min(size.w, size.h) * 0.22) {
          s.vx *= -1; s.vy *= -1;
        }

        if (isFocus) {
          const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 24);
          halo.addColorStop(0, 'rgba(232,183,101,0.45)');
          halo.addColorStop(1, 'rgba(232,183,101,0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 24, 0, Math.PI * 2);
          ctx.fill();
        }

        const glowR = Math.max(0.1, s.r * 4);
        const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
        const baseAlpha = isFocus ? 0.95 : isDim ? 0.22 : 0.6;
        const baseColor = isFocus ? '#f0c678' : isNeighbor ? '#e8b765' : s.zone.color;
        glow.addColorStop(0, hexA(baseColor, baseAlpha));
        glow.addColorStop(1, hexA(baseColor, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = hexA(baseColor, isDim ? 0.4 : 1);
        ctx.beginPath();
        ctx.arc(s.x, s.y, Math.max(0.5, s.r * (isFocus ? 1.6 : 1)), 0, Math.PI * 2);
        ctx.fill();

        if (isFocus) {
          ctx.font = '11px "Geist Mono", monospace';
          ctx.fillStyle = 'rgba(232,183,101,0.9)';
          ctx.textAlign = 'center';
          const trunc = s.ctx.title.length > 38 ? s.ctx.title.slice(0, 36) + '…' : s.ctx.title;
          const tw = ctx.measureText(trunc).width;
          ctx.fillStyle = 'rgba(20,19,18,0.8)';
          ctx.fillRect(s.x - tw/2 - 8, s.y + 18, tw + 16, 18);
          ctx.fillStyle = 'rgba(232,183,101,0.95)';
          ctx.fillText(trunc, s.x, s.y + 30);
        }
      }

      const focusNeighbors = focus
        ? stars.filter(s => s !== focus).filter(s => tagSim(focus.ctx.tags, s.ctx.tags) > 0).length
        : 0;
      setHover(focus ? { star: focus, x: focus.x, y: focus.y, neighbors: focusNeighbors } : null);

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [size.w, size.h, query]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const handleLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

  return (
    <section className="section" id="constellation">
      <div className="section-hd reveal">
        <div className="section-greek">Anámnēsis · constellation of meaning</div>
        <h2 className="section-title">
          Memory you can<br/>
          <em>see and steer.</em>
        </h2>
        <p className="section-sub">
          Every context becomes a star. Hover one and ContextBook draws the semantic neighborhood —
          the same vector retrieval that runs inside the server, visualized. Search to summon a memory by intent.
        </p>
      </div>

      <div className="const-wrap reveal reveal-delay-1">
        <div className="const-head">
          <div className="const-search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              type="text"
              placeholder="Pull by intent — e.g. “pagination decision”"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="kbd-hint">/</span>
          </div>
          <span className="const-status">
            <span className="pulse"></span>
            {contexts.length} contexts · live embeddings
          </span>
        </div>

        <div className="const-canvas-wrap" ref={wrapRef}
             onMouseMove={handleMove}
             onMouseLeave={handleLeave}>
          <canvas className="const-canvas" ref={canvasRef}></canvas>
          {hover && (
            <div className="const-tooltip visible" style={{ left: hover.x, top: hover.y }}>
              <div className="tip-src">
                {hover.star.ctx.source}
                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                  · {hover.star.zone.name}
                </span>
              </div>
              <div className="tip-title">{hover.star.ctx.title}</div>
              <div className="tip-tags">
                {hover.star.ctx.tags.slice(0, 5).map((t, i) => <span key={i}>#{t}</span>)}
              </div>
              <div className="tip-related">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>
                </svg>
                <strong>{hover.neighbors}</strong>
                <span>semantic neighbors</span>
              </div>
            </div>
          )}
        </div>

        <div className="const-legend">
          <div className="legend-cluster">
            <span><span className="dot" style={{ background: '#7ab8ff' }}></span>Distributed</span>
            <span><span className="dot" style={{ background: '#e8b765' }}></span>Infrastructure</span>
            <span><span className="dot" style={{ background: '#7dd88f' }}></span>Team &amp; process</span>
            <span><span className="dot" style={{ background: '#82d4e0' }}></span>Engineering</span>
            <span><span className="dot" style={{ background: '#b6a1fb' }}></span>Research</span>
            <span><span className="dot" style={{ background: '#ff8c7a' }}></span>Travel</span>
            <span><span className="dot" style={{ background: '#e8a07a' }}></span>Cooking</span>
            <span><span className="dot" style={{ background: '#7dd88f' }}></span>Fitness</span>
            <span><span className="dot" style={{ background: '#b6a1fb' }}></span>Learning</span>
            <span><span className="dot" style={{ background: '#ff8c7a' }}></span>Creative</span>
            <span><span className="dot" style={{ background: '#ff8c7a' }}></span>Personal</span>
          </div>
          <span>hover · type to pull</span>
        </div>
      </div>
    </section>
  );
}
