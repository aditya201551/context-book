import { useState, useEffect } from 'react';
import BrandMark from '../BrandMark';

interface LandingNavBarProps {
  onOpenLibrary: () => void;
}

export default function LandingNavBar({ onOpenLibrary }: LandingNavBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? window.scrollY / h : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav className={`nav-bar ${scrolled ? 'scrolled' : ''}`}>
        <a className="nav-brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <div className="nav-brand-mark">
            <BrandMark />
          </div>
          <div>
            <div className="nav-brand-name">ContextBook</div>
            <div className="nav-brand-tag">Mnemosyne &middot; Memory layer</div>
          </div>
        </a>
        <div className="nav-links">
          <a href="#problem">The problem</a>
          <a href="#how">How it works</a>
          <a href="#constellation">Constellation</a>
          <a href="#capabilities">API</a>
          <a href="#integrations">Install</a>
        </div>
        <div className="nav-cta">
          <a className="btn btn-ghost" href="https://github.com/aditya201551/context-book" target="_blank" rel="noreferrer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57v-2c-3.34.73-4.04-1.61-4.04-1.61-.55-1.4-1.34-1.77-1.34-1.77-1.09-.74.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.84 2.82 1.31 3.51 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.42.36.81 1.1.81 2.22v3.29c0 .31.22.7.83.57A12 12 0 0 0 12 .3" /></svg>
            <span>GitHub</span>
          </a>
          <button className="btn btn-primary" onClick={onOpenLibrary}>Open Library</button>
        </div>
      </nav>

      {/* meander progress strip */}
      <svg className="scroll-meander" viewBox="0 0 1000 12" preserveAspectRatio="none">
        <defs>
          <pattern id="navMeanderP" x="0" y="0" width="36" height="12" patternUnits="userSpaceOnUse">
            <path d="M 0 9 L 0 3 L 28 3 L 28 9 L 6 9 L 6 5 L 22 5 L 22 7"
              fill="none" stroke="#8a6a3a" strokeWidth="1.2" />
          </pattern>
          <mask id="navMeanderMask">
            <rect width={`${progress * 1000}`} height="12" fill="white"/>
          </mask>
        </defs>
        {/* faint full strip */}
        <rect width="100%" height="12" fill="url(#navMeanderP)" opacity="0.25"/>
        {/* bright fill up to progress */}
        <rect width="100%" height="12" fill="url(#navMeanderP)" opacity="1" mask="url(#navMeanderMask)"/>
      </svg>
    </>
  );
}
