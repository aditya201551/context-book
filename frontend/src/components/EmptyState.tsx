interface EmptyStateProps {
  greek?: string;
  illustration?: React.ReactNode;
  title?: React.ReactNode;
  sub?: string;
  actions?: React.ReactNode;
  compact?: boolean;
  tone?: 'subtle';
}

export default function EmptyState({ greek, illustration, title, sub, actions, compact, tone }: EmptyStateProps) {
  return (
    <div className={`empty ${compact ? 'empty-compact' : ''} ${tone === 'subtle' ? 'empty-subtle' : ''}`}>
      {illustration && <div className="empty-illustr">{illustration}</div>}
      {greek && <div className="empty-greek">{greek}</div>}
      {title && <div className="empty-title">{title}</div>}
      {sub && <div className="empty-sub">{sub}</div>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}

export function IllPlinth() {
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <defs>
        <linearGradient id="empMarble" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a342a" />
          <stop offset="100%" stopColor="#1c1a16" />
        </linearGradient>
        <radialGradient id="empHalo" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#e8b765" stopOpacity="0.18" />
          <stop offset="70%" stopColor="#e8b765" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="100" fill="url(#empHalo)" />
      <rect x="30" y="34" width="60" height="6" fill="url(#empMarble)" stroke="#8a6a3a" strokeOpacity="0.5" strokeWidth="0.6" />
      <rect x="38" y="40" width="44" height="40" fill="url(#empMarble)" stroke="#8a6a3a" strokeOpacity="0.5" strokeWidth="0.6" />
      <line x1="46" y1="40" x2="46" y2="80" stroke="#1a1814" strokeWidth="0.8" />
      <line x1="54" y1="40" x2="54" y2="80" stroke="#1a1814" strokeWidth="0.8" />
      <line x1="62" y1="40" x2="62" y2="80" stroke="#1a1814" strokeWidth="0.8" />
      <line x1="70" y1="40" x2="70" y2="80" stroke="#1a1814" strokeWidth="0.8" />
      <rect x="30" y="80" width="60" height="6" fill="url(#empMarble)" stroke="#8a6a3a" strokeOpacity="0.5" strokeWidth="0.6" />
      <rect x="22" y="86" width="76" height="8" fill="url(#empMarble)" stroke="#8a6a3a" strokeOpacity="0.5" strokeWidth="0.6" />
      <g opacity="0.85">
        <circle cx="60" cy="22" r="2" fill="#e8b765" />
        <path d="M 60 14 L 60 18 M 60 26 L 60 30 M 52 22 L 56 22 M 64 22 L 68 22" stroke="#e8b765" strokeWidth="0.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function IllScroll() {
  return (
    <svg width="100" height="80" viewBox="0 0 100 80" fill="none">
      <defs>
        <linearGradient id="empPaper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a261f" />
          <stop offset="100%" stopColor="#1a1814" />
        </linearGradient>
      </defs>
      <ellipse cx="20" cy="14" rx="6" ry="3" stroke="#8a6a3a" strokeOpacity="0.6" strokeWidth="0.8" fill="url(#empPaper)" />
      <ellipse cx="80" cy="14" rx="6" ry="3" stroke="#8a6a3a" strokeOpacity="0.6" strokeWidth="0.8" fill="url(#empPaper)" />
      <rect x="20" y="14" width="60" height="52" fill="url(#empPaper)" stroke="#8a6a3a" strokeOpacity="0.5" strokeWidth="0.6" />
      <ellipse cx="20" cy="66" rx="6" ry="3" stroke="#8a6a3a" strokeOpacity="0.6" strokeWidth="0.8" fill="url(#empPaper)" />
      <ellipse cx="80" cy="66" rx="6" ry="3" stroke="#8a6a3a" strokeOpacity="0.6" strokeWidth="0.8" fill="url(#empPaper)" />
      <line x1="28" y1="28" x2="72" y2="28" stroke="#3a3024" strokeWidth="0.6" strokeDasharray="2 3" />
      <line x1="28" y1="36" x2="64" y2="36" stroke="#3a3024" strokeWidth="0.6" strokeDasharray="2 3" />
      <line x1="28" y1="44" x2="68" y2="44" stroke="#3a3024" strokeWidth="0.6" strokeDasharray="2 3" />
      <line x1="28" y1="52" x2="56" y2="52" stroke="#3a3024" strokeWidth="0.6" strokeDasharray="2 3" />
    </svg>
  );
}

export function IllHourglass() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <rect x="22" y="14" width="36" height="3" fill="#8a6a3a" opacity="0.7" />
      <rect x="22" y="63" width="36" height="3" fill="#8a6a3a" opacity="0.7" />
      <path d="M 24 17 L 56 17 L 42 40 L 56 63 L 24 63 L 38 40 Z"
        stroke="#8a6a3a" strokeOpacity="0.6" strokeWidth="0.9" fill="none" />
      <path d="M 28 60 L 52 60 L 46 56 L 34 56 Z" fill="#e8b765" opacity="0.4" />
    </svg>
  );
}

export function IllSearchEmpty() {
  return (
    <svg width="90" height="80" viewBox="0 0 90 80" fill="none">
      <circle cx="38" cy="38" r="22" stroke="#8a6a3a" strokeOpacity="0.6" strokeWidth="1.4" />
      <line x1="55" y1="55" x2="72" y2="72" stroke="#8a6a3a" strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />
      <text x="38" y="46" textAnchor="middle" fontFamily="Cormorant Garamond, serif"
        fontSize="22" fontStyle="italic" fill="#e8b765" opacity="0.7">?</text>
    </svg>
  );
}

export function IllDisconnect() {
  return (
    <svg width="100" height="60" viewBox="0 0 100 60" fill="none">
      <rect x="10" y="22" width="22" height="16" rx="6" stroke="#8a6a3a" strokeOpacity="0.6" strokeWidth="1.2" fill="none" />
      <rect x="68" y="22" width="22" height="16" rx="6" stroke="#8a6a3a" strokeOpacity="0.6" strokeWidth="1.2" fill="none" />
      <line x1="36" y1="30" x2="64" y2="30" stroke="#8a6a3a" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx="50" cy="30" r="3" fill="#e8b765" opacity="0.7" />
    </svg>
  );
}
