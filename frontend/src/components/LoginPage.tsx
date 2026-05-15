import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

/* Owl of Athena — symbol of wisdom */
const OwlMark = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <ellipse cx="12" cy="13" rx="7" ry="8" stroke="#e8b765" strokeWidth="1.4"/>
    <circle cx="9" cy="11" r="2.2" fill="#e8b765"/>
    <circle cx="15" cy="11" r="2.2" fill="#e8b765"/>
    <circle cx="9" cy="11" r="0.9" fill="#0c0c0e"/>
    <circle cx="15" cy="11" r="0.9" fill="#0c0c0e"/>
    <path d="M11 14 L12 15.5 L13 14" stroke="#e8b765" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M5 7 L7 9 M19 7 L17 9" stroke="#e8b765" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

/* Greek temple illustration with columns, constellation, and engraving */
const TempleIllustration = () => (
  <svg viewBox="0 0 460 440" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="marble" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3a342a"/>
        <stop offset="50%" stopColor="#2a261f"/>
        <stop offset="100%" stopColor="#1c1a16"/>
      </linearGradient>
      <linearGradient id="goldStroke" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e8b765" stopOpacity="0.7"/>
        <stop offset="100%" stopColor="#8a6a3a" stopOpacity="0.4"/>
      </linearGradient>
      <radialGradient id="halo" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stopColor="#e8b765" stopOpacity="0.18"/>
        <stop offset="60%" stopColor="#e8b765" stopOpacity="0"/>
      </radialGradient>
    </defs>

    {/* halo glow */}
    <rect width="460" height="440" fill="url(#halo)"/>

    {/* constellation behind */}
    <g opacity="0.4" stroke="#8a7a5a" strokeWidth="0.6" fill="none">
      <line x1="60" y1="60" x2="120" y2="40"/>
      <line x1="120" y1="40" x2="180" y2="70"/>
      <line x1="180" y1="70" x2="220" y2="50"/>
      <line x1="320" y1="55" x2="370" y2="80"/>
      <line x1="370" y1="80" x2="410" y2="50"/>
      <line x1="370" y1="80" x2="380" y2="120"/>
    </g>
    <g fill="#e8b765" opacity="0.85">
      <circle cx="60" cy="60" r="1.5"/>
      <circle cx="120" cy="40" r="1.8"/>
      <circle cx="180" cy="70" r="1.3"/>
      <circle cx="220" cy="50" r="1.6"/>
      <circle cx="320" cy="55" r="1.5"/>
      <circle cx="370" cy="80" r="2.2"/>
      <circle cx="410" cy="50" r="1.4"/>
      <circle cx="380" cy="120" r="1.3"/>
      <circle cx="40" cy="120" r="1.4"/>
      <circle cx="430" cy="200" r="1.2"/>
    </g>

    {/* architrave */}
    <rect x="60" y="120" width="340" height="14" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.8"/>
    <rect x="50" y="134" width="360" height="6" fill="#1a1814" stroke="url(#goldStroke)" strokeWidth="0.6"/>
    {/* triglyphs */}
    <g fill="#3a3024">
      <rect x="78" y="124" width="4" height="6"/>
      <rect x="86" y="124" width="4" height="6"/>
      <rect x="94" y="124" width="4" height="6"/>
      <rect x="158" y="124" width="4" height="6"/>
      <rect x="166" y="124" width="4" height="6"/>
      <rect x="174" y="124" width="4" height="6"/>
      <rect x="238" y="124" width="4" height="6"/>
      <rect x="246" y="124" width="4" height="6"/>
      <rect x="254" y="124" width="4" height="6"/>
      <rect x="318" y="124" width="4" height="6"/>
      <rect x="326" y="124" width="4" height="6"/>
      <rect x="334" y="124" width="4" height="6"/>
    </g>

    {/* 3 Ionic columns */}
    <g>
      {/* left column */}
      <g transform="translate(85, 140)">
        <rect x="-4" y="0" width="48" height="6" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>
        <path d="M -2 6 Q -2 14 6 14 Q 14 14 14 8" fill="none" stroke="#8a6a3a" strokeWidth="1.2"/>
        <path d="M 42 6 Q 42 14 34 14 Q 26 14 26 8" fill="none" stroke="#8a6a3a" strokeWidth="1.2"/>
        <circle cx="6" cy="11" r="1.2" fill="#8a6a3a"/>
        <circle cx="34" cy="11" r="1.2" fill="#8a6a3a"/>
        <rect x="2" y="14" width="36" height="200" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>
        <line x1="9" y1="14" x2="9" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="14" y1="14" x2="14" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="19" y1="14" x2="19" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="24" y1="14" x2="24" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="29" y1="14" x2="29" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="34" y1="14" x2="34" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <rect x="-4" y="214" width="48" height="6" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>
        <rect x="-8" y="220" width="56" height="8" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>
      </g>
      {/* center column */}
      <g transform="translate(208, 140)">
        <rect x="-4" y="0" width="48" height="6" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>
        <path d="M -2 6 Q -2 14 6 14 Q 14 14 14 8" fill="none" stroke="#8a6a3a" strokeWidth="1.2"/>
        <path d="M 42 6 Q 42 14 34 14 Q 26 14 26 8" fill="none" stroke="#8a6a3a" strokeWidth="1.2"/>
        <circle cx="6" cy="11" r="1.2" fill="#8a6a3a"/>
        <circle cx="34" cy="11" r="1.2" fill="#8a6a3a"/>
        <rect x="2" y="14" width="36" height="200" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>
        <line x1="9" y1="14" x2="9" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="14" y1="14" x2="14" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="19" y1="14" x2="19" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="24" y1="14" x2="24" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="29" y1="14" x2="29" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="34" y1="14" x2="34" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <rect x="-4" y="214" width="48" height="6" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>
        <rect x="-8" y="220" width="56" height="8" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>
      </g>
      {/* right column */}
      <g transform="translate(331, 140)">
        <rect x="-4" y="0" width="48" height="6" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>
        <path d="M -2 6 Q -2 14 6 14 Q 14 14 14 8" fill="none" stroke="#8a6a3a" strokeWidth="1.2"/>
        <path d="M 42 6 Q 42 14 34 14 Q 26 14 26 8" fill="none" stroke="#8a6a3a" strokeWidth="1.2"/>
        <circle cx="6" cy="11" r="1.2" fill="#8a6a3a"/>
        <circle cx="34" cy="11" r="1.2" fill="#8a6a3a"/>
        <rect x="2" y="14" width="36" height="200" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>
        <line x1="9" y1="14" x2="9" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="14" y1="14" x2="14" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="19" y1="14" x2="19" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="24" y1="14" x2="24" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="29" y1="14" x2="29" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <line x1="34" y1="14" x2="34" y2="214" stroke="#1a1814" strokeWidth="0.8"/>
        <rect x="-4" y="214" width="48" height="6" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>
        <rect x="-8" y="220" width="56" height="8" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>
      </g>
    </g>

    {/* stylobate / steps */}
    <rect x="40" y="368" width="380" height="6" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>
    <rect x="28" y="374" width="404" height="8" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>
    <rect x="14" y="382" width="432" height="10" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.6"/>

    {/* pediment top with laurel */}
    <path d="M 60 120 L 230 80 L 400 120 Z" fill="url(#marble)" stroke="url(#goldStroke)" strokeWidth="0.8"/>
    <circle cx="230" cy="105" r="8" fill="none" stroke="#e8b765" strokeWidth="1" opacity="0.7"/>
    <circle cx="230" cy="105" r="2.5" fill="#e8b765" opacity="0.7"/>

    {/* laurel branches on pediment */}
    <g stroke="#8a6a3a" strokeWidth="0.9" fill="none" opacity="0.65">
      <path d="M 215 105 Q 200 100 188 110"/>
      <path d="M 245 105 Q 260 100 272 110"/>
      <ellipse cx="200" cy="103" rx="3" ry="1.5" transform="rotate(-25 200 103)" fill="#8a6a3a" opacity="0.5"/>
      <ellipse cx="195" cy="107" rx="3" ry="1.5" transform="rotate(15 195 107)" fill="#8a6a3a" opacity="0.5"/>
      <ellipse cx="260" cy="103" rx="3" ry="1.5" transform="rotate(25 260 103)" fill="#8a6a3a" opacity="0.5"/>
      <ellipse cx="265" cy="107" rx="3" ry="1.5" transform="rotate(-15 265 107)" fill="#8a6a3a" opacity="0.5"/>
    </g>

    {/* engraving at base */}
    <text x="230" y="406" textAnchor="middle"
      fontFamily="Cormorant Garamond, serif" fontSize="13" fontStyle="italic"
      fill="#8a7a5a" letterSpacing="2">
      &#x0393;&#x039D;&#x03A9;&#x0398;&#x0399; &#x03A3;&#x0395;&#x0391;&#x03A5;&#x03A4;&#x039F;&#x039D;
    </text>

    {/* floating chunks of memory between columns */}
    <g opacity="0.7">
      <rect x="142" y="200" width="48" height="3" fill="#e8b765" rx="1"/>
      <rect x="146" y="208" width="40" height="3" fill="#8a6a3a" rx="1"/>
      <rect x="150" y="216" width="32" height="3" fill="#5a4a2a" rx="1"/>
      <rect x="265" y="190" width="48" height="3" fill="#e8b765" rx="1"/>
      <rect x="269" y="198" width="40" height="3" fill="#8a6a3a" rx="1"/>
      <rect x="273" y="206" width="32" height="3" fill="#5a4a2a" rx="1"/>
      <rect x="277" y="214" width="24" height="3" fill="#3a2e1a" rx="1"/>
    </g>
  </svg>
);

/* Greek key meander border pattern */
const MeanderBorder = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 600 18" preserveAspectRatio="none">
    <defs>
      <pattern id="meanderP" x="0" y="0" width="36" height="18" patternUnits="userSpaceOnUse">
        <path d="M 0 14 L 0 4 L 28 4 L 28 14 L 8 14 L 8 8 L 22 8 L 22 12"
          fill="none" stroke="#8a7a5a" strokeWidth="1.4"/>
      </pattern>
    </defs>
    <rect width="100%" height="18" fill="url(#meanderP)"/>
  </svg>
);

/* GitHub icon for login button */
const GitHubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#e8e8ea">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

/* Google icon for login button */
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function LoginPage() {
  const location = useLocation();
  const next = new URLSearchParams(location.search).get('next') || '/dashboard';
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.me()
      .then(() => { window.location.replace(next); })
      .catch(() => setChecking(false));
  }, []);

  if (checking) return null;

  const googleURL = '/auth/google?next=' + encodeURIComponent(next);
  const githubURL = '/auth/github?next=' + encodeURIComponent(next);

  return (
    <div className="login-page">
      {/* Left: Greek-themed brand panel */}
      <div className="login-panel">
        <MeanderBorder className="meander top" />
        <MeanderBorder className="meander bot" />

        {/* brand row */}
        <div className="login-panel-brand">
          <div className="login-panel-mark">
            <OwlMark />
          </div>
          <div>
            <div className="login-panel-name">ContextBridge</div>
            <div className="login-panel-tag">Mnemosyne &middot; Library of Memory</div>
          </div>
        </div>

        {/* central illustration */}
        <div className="login-illustr-wrap">
          <div className="login-illustr">
            <TempleIllustration />
          </div>
        </div>

        {/* manifesto block */}
        <div className="login-manifesto">
          <div className="login-headline">
            A library for the<br />
            <em>thinking machine.</em>
          </div>
          <div className="login-manifesto-sub">
            Where every conversation, every insight, every fragment of knowledge finds its proper shelf &mdash; retrievable not by name, but by meaning.
          </div>
          <div className="login-quote">
            <div className="login-quote-text">"Memory is the scribe of the soul."</div>
            <div className="login-quote-attr">Aristotle</div>
          </div>
        </div>
      </div>

      {/* Right: form panel */}
      <div className="login-form-wrap">
        <div className="login-form-inner">
          <div className="login-form-title">Welcome back</div>
          <div className="login-form-sub">Sign in to your ContextBridge account.</div>

          <a href={githubURL} style={{ textDecoration: 'none', display: 'block' }}>
            <button className="login-oauth-btn">
              <GitHubIcon />
              Continue with GitHub
            </button>
          </a>
          <a href={googleURL} style={{ textDecoration: 'none', display: 'block' }}>
            <button className="login-oauth-btn">
              <GoogleIcon />
              Continue with Google
            </button>
          </a>

          <div className="login-footer">
            By signing in, you agree to our{' '}
            <a href="#" onClick={e => e.preventDefault()}>Terms</a>{' '}
            and{' '}
            <a href="#" onClick={e => e.preventDefault()}>Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  );
}
