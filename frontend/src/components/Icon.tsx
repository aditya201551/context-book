interface IconProps {
  size?: number;
  stroke?: number;
  name: string;
}

const ICONS: Record<string, string | string[]> = {
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-4.35-4.35',
  plus: ['M12 5v14', 'M5 12h14'],
  library: ['M4 5h16', 'M4 12h16', 'M4 19h10'],
  dashboard: ['M4 4h7v7H4z', 'M13 4h7v5h-7z', 'M13 11h7v9h-7z', 'M4 13h7v7H4z'],
  sparkle: ['M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z', 'M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z'],
  settings: ['M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
  tag: 'M7 7h.01M3 7V3h4l11 11-4 4L3 7z',
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  chev: 'M9 6l6 6-6 6',
  arrUp: 'M12 19V5M5 12l7-7 7 7',
  arrDn: 'M12 5v14M5 12l7 7 7-7',
  enter: ['M9 10l-5 5 5 5', 'M20 4v7a4 4 0 0 1-4 4H4'],
  cards: ['M3 3h8v8H3z','M13 3h8v8h-8z','M3 13h8v8H3z','M13 13h8v8h-8z'],
  rows: ['M3 6h18', 'M3 12h18', 'M3 18h18'],
  compact: ['M3 5h18', 'M3 9h18', 'M3 13h18', 'M3 17h18', 'M3 21h18'],
  pin: 'M12 2l2 6h6l-5 4 2 7-5-4-5 4 2-7-5-4h6z',
  link: ['M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1', 'M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1'],
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z'],
  trash: ['M3 6h18', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'],
  filter: ['M4 5h16', 'M6 12h12', 'M10 19h4'],
  check: 'M5 13l4 4L19 7',
  clock: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M12 7v5l3 2'],
  copy: ['M9 9h10v10H9z','M5 15V5h10'],
  import: ['M12 3v12','M7 10l5 5 5-5','M5 21h14'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5M21 12H9'],
};

export default function Icon({ name, size = 16, stroke = 1.75 }: IconProps) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
    </svg>
  );
}
