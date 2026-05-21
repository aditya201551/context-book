import { useState, useRef, useEffect, useCallback } from 'react';

interface ScriptLine {
  kind: 'meta' | 'recall' | 'ai';
  text: string;
}

interface ScriptTurn {
  user: string;
  statelessLines: ScriptLine[];
  statefulLines: ScriptLine[];
}

const SCRIPT: ScriptTurn = {
  user: 'What did we decide about the Japan trip?',
  statelessLines: [
    { kind: 'meta',   text: '[ session: cold start · no memory ]' },
    { kind: 'ai',     text: 'I don\'t have any trip details on file.' },
    { kind: 'ai',     text: 'Where in Japan are you thinking of going?' },
    { kind: 'ai',     text: 'And what time of year were you planning to travel?' },
  ],
  statefulLines: [
    { kind: 'meta',   text: '[ pull_context(intent="Japan trip planning") · 3 hits ]' },
    { kind: 'recall', text: 'recalled — "Tokyo → Kyoto itinerary, April 12–20"' },
    { kind: 'recall', text: 'recalled — "Hotel in Shibuya booked, JR Pass wanted"' },
    { kind: 'ai',     text: 'You\'re doing Tokyo → Kyoto, April 12–20.' },
    { kind: 'ai',     text: 'You picked the Shibuya hotel and wanted a 7-day JR Pass.' },
    { kind: 'ai',     text: 'The cherry blossom forecast just updated for your dates — want me to check which parks are peak?' },
  ],
};

function useTypeLines(lines: ScriptLine[], speed = 18) {
  const [output, setOutput] = useState<(ScriptLine & { displayText?: string })[]>([]);
  const runningRef = useRef(false);
  const cancelRef = useRef(false);

  const start = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    cancelRef.current = false;
    setOutput([]);

    (async () => {
      for (let li = 0; li < lines.length; li++) {
        if (cancelRef.current) return;
        const line = lines[li];
        let acc = '';
        for (let i = 0; i < line.text.length; i++) {
          if (cancelRef.current) return;
          acc += line.text[i];
          setOutput((prev) => {
            const next = [...prev];
            next[li] = { ...line, displayText: acc };
            return next;
          });
          await new Promise((r) => setTimeout(r, speed + Math.random() * 12));
        }
        await new Promise((r) => setTimeout(r, 280));
      }
      runningRef.current = false;
    })();
  }, [lines, speed]);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    runningRef.current = false;
  }, []);

  const reset = useCallback(() => {
    cancel();
    setOutput([]);
  }, [cancel]);

  return { output, start, cancel, reset };
}

function Terminal({
  kind, title, badge, badgeOk, lines, showCursor,
}: {
  kind: 'stateless' | 'stateful';
  title: string;
  badge: string;
  badgeOk: boolean;
  lines: (ScriptLine & { displayText?: string })[];
  showCursor: boolean;
}) {
  return (
    <div className={`terminal ${kind === 'stateful' ? 'stateful' : ''}`}>
      <div className="terminal-head">
        <div className="terminal-head-left">
          <div className="term-dots">
            <span className="term-dot"></span>
            <span className="term-dot"></span>
            <span className="term-dot"></span>
          </div>
          <span className="term-label">{title}</span>
        </div>
        <span className={`term-badge ${badgeOk ? 'ok' : ''}`}>{badge}</span>
      </div>
      <div className="terminal-body">
        <span className="term-line">
          <span className="term-prompt">$</span>
          <span className="term-user">{SCRIPT.user.replace(/^\u003e\s*/, '')}</span>
        </span>
        <div className="term-divider"></div>

        {lines.map((line, i) => {
          if (!line) return null;
          if (line.kind === 'meta') {
            return <span key={i} className="term-line term-meta">{line.displayText || ''}</span>;
          }
          if (line.kind === 'recall') {
            return (
              <span key={i} className="term-line term-meta">
                <span className="term-recall">{line.displayText || ''}</span>
              </span>
            );
          }
          return <span key={i} className="term-line term-ai">{line.displayText || ''}</span>;
        })}
        {showCursor && <span className="term-cursor"></span>}
      </div>
    </div>
  );
}

export default function LandingDemo() {
  const {
    output: statelessLines, start: startStateless, cancel: cancelStateless, reset: resetStateless,
  } = useTypeLines(SCRIPT.statelessLines, 22);
  const {
    output: statefulLines, start: startStateful, cancel: cancelStateful, reset: resetStateful,
  } = useTypeLines(SCRIPT.statefulLines, 18);
  const [running, setRunning] = useState(false);
  const loopRef = useRef({ active: false, timer: null as ReturnType<typeof setTimeout> | null });
  const sectionRef = useRef<HTMLElement | null>(null);

  const CYCLE_MS = 13500;
  const PAUSE_MS = 2000;

  const run = useCallback(() => {
    cancelStateless();
    cancelStateful();
    resetStateless();
    resetStateful();
    setRunning(true);
    startStateless();
    startStateful();
  }, [cancelStateless, cancelStateful, resetStateless, resetStateful, startStateless, startStateful]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !loopRef.current.active) {
            loopRef.current.active = true;
            const tick = () => {
              if (!loopRef.current.active) return;
              run();
              loopRef.current.timer = setTimeout(() => {
                setRunning(false);
                loopRef.current.timer = setTimeout(tick, PAUSE_MS);
              }, CYCLE_MS);
            };
            tick();
          } else if (!e.isIntersecting && loopRef.current.active) {
            loopRef.current.active = false;
            if (loopRef.current.timer) clearTimeout(loopRef.current.timer);
            cancelStateless();
            cancelStateful();
          }
        }
      },
      { threshold: 0.25 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => {
      obs.disconnect();
      loopRef.current.active = false;
      if (loopRef.current.timer) clearTimeout(loopRef.current.timer);
      cancelStateless();
      cancelStateful();
    };
  }, [run, cancelStateless, cancelStateful]);

  return (
    <section className="section" id="problem" ref={sectionRef}>
      <div className="section-hd reveal">
        <div className="section-greek">Anamnesis &middot; the act of recollection</div>
        <h2 className="section-title">
          A stateless agent is an<br />
          <em>amnesiac genius.</em>
        </h2>
        <p className="section-sub">
          Every model is brilliant until you close the tab. ContextBook gives your agents
          a shared memory that survives sessions, tools, and providers &mdash; so they
          remember the work, the decisions, and the trade-offs you already made.
        </p>
      </div>

      <div className="demo-grid">
        <div className="reveal reveal-delay-1">
          <Terminal
            kind="stateless"
            title="agent.shell · without ContextBook"
            badge="STATELESS"
            badgeOk={false}
            lines={statelessLines}
            showCursor={running}
          />
        </div>
        <div className="reveal reveal-delay-2">
          <Terminal
            kind="stateful"
            title="agent.shell · with ContextBook"
            badge="STATEFUL"
            badgeOk={true}
            lines={statefulLines}
            showCursor={running}
          />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div className="demo-foot reveal reveal-delay-3">
          Same model. Same prompt. <em>Different memory.</em>
        </div>
      </div>
    </section>
  );
}
