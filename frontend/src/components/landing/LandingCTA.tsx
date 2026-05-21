interface LandingCTAProps {
  onOpenLibrary: () => void;
}

export default function LandingCTA({ onOpenLibrary }: LandingCTAProps) {
  return (
    <section className="final-cta" id="cta">
      <svg className="final-meander" viewBox="0 0 240 12" preserveAspectRatio="none">
        <defs>
          <pattern id="finalMP" x="0" y="0" width="36" height="12" patternUnits="userSpaceOnUse">
            <path d="M 0 9 L 0 3 L 28 3 L 28 9 L 6 9 L 6 5 L 22 5 L 22 7"
              fill="none" stroke="#8a6a3a" strokeWidth="1.2"/>
          </pattern>
        </defs>
        <rect width="100%" height="12" fill="url(#finalMP)" />
      </svg>

      <h2 className="final-title reveal">
        Give your agents<br/>
        <em>a memory worth keeping.</em>
      </h2>

      <p className="final-quote reveal reveal-delay-1">
        “Memory is the scribe of the soul.”
      </p>
      <div className="final-attr reveal reveal-delay-1">Aristotle</div>

      <div className="final-cta-row reveal reveal-delay-2" style={{ marginTop: 36 }}>
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

      <div className="hero-meta" style={{ marginTop: 36 }}>
        <span><span className="pill-dot"></span> Open source · MIT</span>
        <span><span className="pill-dot"></span> Self-hosted</span>
      </div>
    </section>
  );
}
