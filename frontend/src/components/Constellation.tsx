import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { UMAP } from 'umap-js';
import type { ConstellationBook, BookSummary } from '../types';
import { api } from '../lib/api';
import Icon from './Icon';

interface Dot {
  book: ConstellationBook;
  idx: number;
  x: number;
  y: number;
  r: number;
}

interface Edge {
  i: number;
  j: number;
  sim: number;
}

interface ConstellationProps {
  onOpenBook: (summary: BookSummary) => void;
}

function cosineSim(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let k = 0; k < Math.min(a.length, b.length); k++) {
    dot += a[k] * b[k];
    na += a[k] * a[k];
    nb += b[k] * b[k];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function computeEdges(books: ConstellationBook[], thresholdFloor: number): { edges: Edge[]; threshold: number }[] {
  const n = books.length;
  const sims: number[] = [];
  const allPairs: { i: number; j: number; sim: number }[] = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = cosineSim(books[i].avg_embedding, books[j].avg_embedding);
      sims.push(sim);
      allPairs.push({ i, j, sim });
    }
  }

  if (sims.length === 0) return books.map(() => ({ edges: [], threshold: thresholdFloor }));

  const mu = sims.reduce((a, b) => a + b, 0) / sims.length;
  const sigma = Math.sqrt(sims.reduce((a, b) => a + (b - mu) ** 2, 0) / sims.length);
  const threshold = Math.max(thresholdFloor, mu + sigma);

  const edgesByNode: Map<number, Edge[]> = new Map();
  for (const p of allPairs) {
    if (p.sim >= threshold) {
      if (!edgesByNode.has(p.i)) edgesByNode.set(p.i, []);
      if (!edgesByNode.has(p.j)) edgesByNode.set(p.j, []);
      edgesByNode.get(p.i)!.push({ i: p.i, j: p.j, sim: p.sim });
      edgesByNode.get(p.j)!.push({ i: p.j, j: p.i, sim: p.sim });
    }
  }

  edgesByNode.forEach((list) => {
    list.sort((a, b) => b.sim - a.sim);
  });

  return books.map((_, idx) => ({
    edges: edgesByNode.get(idx) || [],
    threshold,
  }));
}

function seededRNG(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function buildFallbackDots(books: ConstellationBook[], w: number, h: number): Dot[] {
  const radius = Math.max(40, Math.min(w, h) * 0.35);
  return books.map((b, idx) => {
    const angle = (idx / Math.max(books.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const jitter = (seededRNG(idx + 19)() - 0.5) * 18;
    const r = Math.max(2.5, Math.min(6, 2.5 + Math.sqrt(b.token_count || 0) * 0.15));
    return {
      book: b,
      idx,
      x: w / 2 + Math.cos(angle) * (radius + jitter),
      y: h / 2 + Math.sin(angle) * (radius + jitter),
      r,
    };
  });
}

function normalizeProjection(embedding: unknown, count: number): number[][] | null {
  if (!Array.isArray(embedding) || embedding.length !== count) return null;
  const points: number[][] = [];
  for (const point of embedding) {
    if (!Array.isArray(point) || point.length < 2) return null;
    const [x, y] = point;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    points.push([x, y]);
  }
  return points;
}

function projectionPad(w: number, h: number): number {
  return Math.min(80, Math.max(40, Math.min(w, h) * 0.08));
}

function scaleProjectionToCanvas(projection: number[][], books: ConstellationBook[], w: number, h: number): Dot[] {
  const pad = projectionPad(w, h);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of projection) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  return projection.map(([x, y], idx) => {
    const nx = (x - minX) / rangeX;
    const ny = (y - minY) / rangeY;
    const b = books[idx];
    const r = Math.max(2.5, Math.min(6, 2.5 + Math.sqrt(b?.token_count || 0) * 0.15));
    return {
      book: b,
      idx,
      x: pad + nx * (w - pad * 2),
      y: pad + ny * (h - pad * 2),
      r,
    };
  });
}

const AMBER = '#e8b765';
const AMBER_DIM = 'rgba(232,183,101,0.15)';
const AMBER_EDGE = 'rgba(232,183,101,';
const BG = '#141312';

export default function Constellation({ onOpenBook }: ConstellationProps) {
  const [books, setBooks] = useState<ConstellationBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [umapRunning, setUmapRunning] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [currentCount, setCurrentCount] = useState(0);
  const [minimumRequired, setMinimumRequired] = useState(5);
  const [edgeThresholdFloor, setEdgeThresholdFloor] = useState(0.6);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 520 });
  const animRef = useRef(0);
  const dotsRef = useRef<Dot[]>([]);
  const targetDotsRef = useRef<Dot[]>([]);
  const edgesByNodeRef = useRef<{ edges: Edge[]; threshold: number }[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const panRef = useRef({ ox: 0, oy: 0 });

  useEffect(() => {
    api.constellation()
      .then(data => {
        setBooks(data.books.filter(b => Array.isArray(b.avg_embedding) && b.avg_embedding.length > 0));
        if (data.minimum_required) setMinimumRequired(data.minimum_required);
        if (data.current_count !== undefined) setCurrentCount(data.current_count);
        if (typeof data.edge_threshold_floor === 'number') setEdgeThresholdFloor(data.edge_threshold_floor);
        setLoading(false);
      })
      .catch(() => { setBooks([]); setLoading(false); });
  }, []);

  const nodeEdges = useMemo(() => {
    if (books.length < minimumRequired) return [];
    return computeEdges(books, edgeThresholdFloor);
  }, [books, minimumRequired, edgeThresholdFloor]);

  useEffect(() => { edgesByNodeRef.current = nodeEdges; }, [nodeEdges]);

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

  // UMAP computation
  useEffect(() => {
    if (books.length < minimumRequired) return;

    let cancelled = false;
    const w = size.w || 800;
    const h = size.h || 520;

    const commitDots = (dots: Dot[]) => {
      if (cancelled) return;
      targetDotsRef.current = dots;
      if (dotsRef.current.length === 0 || dotsRef.current.length !== dots.length) {
        dotsRef.current = dots;
      }
      setUmapRunning(false);
      setDirty(false);
    };

    // Fallback: simple deterministic layout for very small libraries where UMAP
    // degenerates (nNeighbors=1 creates a 1-NN chain with no spatial meaning).
    if (books.length <= 3) {
      const dots = buildFallbackDots(books, w, h);
      commitDots(dots);
      return () => { cancelled = true; };
    }

    setUmapRunning(true);
    const embeddings = books.map(b => b.avg_embedding);
    const nNeighbors = Math.max(1, Math.min(minimumRequired, Math.floor(books.length / 2), books.length - 1));

    const umap = new UMAP({
      nNeighbors,
      minDist: 0.15,
      nComponents: 2,
      nEpochs: 200,
      random: seededRNG(42),
      distanceFn: (a, b) => {
        let dot = 0, na = 0, nb = 0;
        if (!Array.isArray(a) || !Array.isArray(b)) return 1;
        for (let k = 0; k < Math.min(a.length, b.length); k++) {
          dot += a[k] * b[k];
          na += a[k] * a[k];
          nb += b[k] * b[k];
        }
        if (na === 0 || nb === 0) return 1;
        return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
      },
    });

    umap.fitAsync(embeddings, (epoch) => {
      return true;
    }).then((embedding: number[][]) => {
      if (cancelled) return;
      const w = size.w || 800;
      const h = size.h || 520;
      const projection = normalizeProjection(embedding, books.length);

      if (!projection) {
        commitDots(buildFallbackDots(books, w, h));
        return;
      }

      commitDots(scaleProjectionToCanvas(projection, books, w, h));
    }).catch((err: any) => {
      if (cancelled) return;
      console.error('UMAP failed', err);
      setUmapRunning(false);
    });

    return () => { cancelled = true; };
  }, [books, minimumRequired, size.w, size.h]);

  // Canvas render loop
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size.w * dpr;
    c.height = size.h * dpr;
    c.style.width = size.w + 'px';
    c.style.height = size.h + 'px';
    ctx.scale(dpr, dpr);

    const lcQuery = query.trim().toLowerCase();

    function draw(t = 0) {
      if (!ctx) return;
      ctx.clearRect(0, 0, size.w, size.h);

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

      // Animate dots toward targets
      const dots = dotsRef.current;
      const targets = targetDotsRef.current;
      if (dots.length === targets.length) {
        for (let i = 0; i < dots.length; i++) {
          dots[i].x += (targets[i].x - dots[i].x) * 0.12;
          dots[i].y += (targets[i].y - dots[i].y) * 0.12;
          dots[i].r = targets[i].r;
        }
      }

      // Find hovered dot
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      let hovIdx: number | null = null;
      let bestD = 16;
      for (const d of dots) {
        const dist = Math.hypot(d.x + panRef.current.ox - mx, d.y + panRef.current.oy - my);
        if (dist < bestD) { bestD = dist; hovIdx = d.idx; }
      }
      // Only update state periodically to avoid excessive re-renders
      setHoveredIdx(prev => {
        if (prev !== hovIdx) {
          if (hovIdx !== null) {
            const d = dots[hovIdx];
            setHoverPos(d ? { x: d.x + panRef.current.ox, y: d.y + panRef.current.oy } : null);
          } else {
            setHoverPos(null);
          }
          return hovIdx;
        }
        return prev;
      });

      const focusIdx = hovIdx ?? null;
      const edgesArr = edgesByNodeRef.current;

      // Determine query matches
      const queryMatches = new Set<number>();
      if (lcQuery.length >= 2) {
        for (const d of dots) {
          if (d.book.title.toLowerCase().includes(lcQuery) ||
              d.book.tags.some(t => t.toLowerCase().includes(lcQuery))) {
            queryMatches.add(d.idx);
          }
        }
      }

      const hasFocus = focusIdx !== null || queryMatches.size > 0;
      const focusSet = new Set<number>();
      if (focusIdx !== null) {
        focusSet.add(focusIdx);
        if (edgesArr[focusIdx]) {
          for (const e of edgesArr[focusIdx].edges) {
            focusSet.add(e.j);
          }
        }
      }
      for (const idx of queryMatches) focusSet.add(idx);

      // Draw edges
      if (focusIdx !== null && edgesArr[focusIdx]) {
        for (const e of edgesArr[focusIdx].edges) {
          const dA = dots[e.i];
          const dB = dots[e.j];
          if (!dA || !dB) continue;
          const alpha = 0.15 + e.sim * 0.35;
          ctx.strokeStyle = AMBER_EDGE + alpha.toFixed(2) + ')';
          ctx.lineWidth = 0.4 + e.sim * 0.8;
          ctx.beginPath();
          ctx.moveTo(dA.x + panRef.current.ox, dA.y + panRef.current.oy);
          ctx.lineTo(dB.x + panRef.current.ox, dB.y + panRef.current.oy);
          ctx.stroke();
        }
      }

      // Draw dots
      for (const d of dots) {
        const isFocus = d.idx === focusIdx;
        const isNeighbor = focusSet.has(d.idx);
        const isQueryMatch = queryMatches.has(d.idx);
        const isDim = hasFocus && !isFocus && !isNeighbor;

        const dx = d.x + panRef.current.ox;
        const dy = d.y + panRef.current.oy;

        // Wide bloom glow (outer halo)
        const bloomR = Math.max(0.1, d.r * (isFocus ? 7 : 5));
        const bloom = ctx.createRadialGradient(dx, dy, 0, dx, dy, bloomR);
        const bloomAlpha = isFocus ? 0.18 : isDim ? 0.02 : 0.08;
        bloom.addColorStop(0, `rgba(232,183,101,${bloomAlpha})`);
        bloom.addColorStop(1, `rgba(232,183,101,0)`);
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(dx, dy, bloomR, 0, Math.PI * 2);
        ctx.fill();

        // Tight core glow
        const glowR = Math.max(0.1, d.r * (isFocus ? 3 : 2.2));
        const glow = ctx.createRadialGradient(dx, dy, 0, dx, dy, glowR);
        const coreAlpha = isFocus ? 0.55 : isDim ? 0.08 : 0.25;
        glow.addColorStop(0, `rgba(232,183,101,${coreAlpha})`);
        glow.addColorStop(1, `rgba(232,183,101,0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(dx, dy, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Sharp bright center
        const dotAlpha = isDim ? 0.3 : 1;
        ctx.fillStyle = `rgba(240,198,120,${dotAlpha})`;
        ctx.beginPath();
        ctx.arc(dx, dy, Math.max(0.5, d.r * (isFocus ? 1.5 : 1)), 0, Math.PI * 2);
        ctx.fill();

        // Focus ring
        if (isFocus || isQueryMatch) {
          ctx.strokeStyle = 'rgba(240,198,120,0.6)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(dx, dy, d.r + 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      /*
      // The HTML hover card below carries the title and metadata.
      if (focusIdx !== null) {
        const d = dots[focusIdx];
        if (d) {
          const dx = d.x + panRef.current.ox;
          const dy = d.y + panRef.current.oy;
          const title = d.book.title.length > 36 ? d.book.title.slice(0, 34) + '…' : d.book.title;
          ctx.font = '11px "Geist Mono", monospace';
          const tw = ctx.measureText(title).width;
          ctx.fillStyle = 'rgba(20,19,18,0.85)';
          ctx.fillRect(dx - tw / 2 - 10, dy + d.r + 8, tw + 20, 22);
          ctx.strokeStyle = 'rgba(232,183,101,0.3)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(dx - tw / 2 - 10, dy + d.r + 8, tw + 20, 22);
          ctx.fillStyle = 'rgba(232,183,101,0.95)';
          ctx.textAlign = 'center';
          ctx.fillText(title, dx, dy + d.r + 23);
        }
      }
      */

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [size.w, size.h, query, books]);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const handleLeave = useCallback(() => {
    mouseRef.current = { x: -9999, y: -9999 };
    setHoveredIdx(null);
  }, []);

  const handleClick = useCallback(() => {
    if (hoveredIdx !== null) {
      const b = books[hoveredIdx];
      if (b) {
        onOpenBook({
          book_id: b.book_id,
          title: b.title,
          source: b.source,
          tags: b.tags,
          created_at: '',
          updated_at: '',
          page_count: b.page_count,
          token_count: b.token_count,
          preview: '',
        });
      }
    }
  }, [hoveredIdx, books, onOpenBook]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('');
      setSelectedIdx(null);
    }
  }, []);

  const threshold = nodeEdges.length > 0 ? nodeEdges[0].threshold : edgeThresholdFloor;

  if (loading) return (
    <div className="constellation-page">
      <div className="const-loading">
        <span className="pulse" /> Loading constellation…
      </div>
    </div>
  );

  if (books.length < minimumRequired) return (
    <div className="constellation-page">
      <div className="const-empty">
        <Icon name="stars" size={32} />
        <h3>Not enough books for a constellation</h3>
        <p>Add more books for the constellation to take shape.</p>
        <span className="const-hint">{currentCount || books.length} books · need at least {minimumRequired}</span>
      </div>
    </div>
  );

  return (
    <div className="constellation-page" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="const-head">
        <div className="const-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search by title or tag…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="kbd-hint">esc</span>
        </div>
        <span className="const-status">
          <span className="pulse" />
          {books.length} books · threshold {Math.round(threshold * 100)}%
          {umapRunning && ' · computing layout…'}
        </span>
      </div>

        <div className="const-canvas-wrap" ref={wrapRef}
             onMouseMove={handleMove}
             onMouseLeave={handleLeave}
             onClick={handleClick}>
          <canvas className="const-canvas" ref={canvasRef}></canvas>

          {hoverPos && hoveredIdx !== null && books[hoveredIdx] && (
            <div className="const-card" style={{ left: hoverPos.x, top: hoverPos.y + 18 }} data-side={hoverPos.x > (wrapRef.current?.clientWidth || 800) / 2 ? 'left' : 'right'}>
              <div className="const-card-head">
                <span className="const-card-src mono">{books[hoveredIdx].source || 'user'}</span>
              </div>
              <div className="const-card-title">{books[hoveredIdx].title}</div>
              <div className="const-card-tags">
                {(books[hoveredIdx].tags || []).slice(0, 3).map(t => <span key={t} className="const-card-tag">#{t}</span>)}
              </div>
              <div className="const-card-meta">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>
                </svg>
                <span className="const-card-neighbors">{nodeEdges[hoveredIdx]?.edges?.length || 0}</span>
                <span className="const-card-neighbor-label">{nodeEdges[hoveredIdx]?.edges?.length === 1 ? 'semantic neighbor' : 'semantic neighbors'}</span>
              </div>
              <div className="const-card-arrow" />
            </div>
          )}
        </div>

      <div className="const-legend">
        <div className="legend-row">
          <span className="legend-dot" style={{ background: AMBER }}></span>
          <span>Book node — radius by token count</span>
        </div>
        <div className="legend-row">
          <span className="legend-line"></span>
          <span>Edge: similarity &gt;= {Math.round(threshold * 100)}%</span>
        </div>
        {books.length < 20 && (
          <span className="legend-hint">{books.length} books · layout stabilizes around 20+</span>
        )}
      </div>
    </div>
  );
}
