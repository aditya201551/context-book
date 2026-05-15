import { useState } from 'react';

interface CopyBtnProps {
  text: string;
  style?: React.CSSProperties;
}

export default function CopyBtn({ text, style }: CopyBtnProps) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button onClick={copy} title="Copy to clipboard" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: copied ? 'rgba(232,183,101,0.12)' : 'var(--raised)',
      border: '1px solid var(--border-soft)',
      borderRadius: 5, padding: '2px 7px',
      fontSize: 10.5, fontFamily: 'var(--font-mono)',
      color: copied ? 'var(--accent)' : 'var(--text-muted)',
      cursor: 'pointer', transition: 'all 0.15s', ...style
    }}>
      {copied
        ? <><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Copied</>
        : <><svg width="10" height="10" viewBox="0 0 12 12" fill="none"><rect x="4" y="1" width="7" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.2"/><path d="M8 3H2a1 1 0 00-1 1v7a1 1 0 001 1h6a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> Copy</>
      }
    </button>
  );
}
