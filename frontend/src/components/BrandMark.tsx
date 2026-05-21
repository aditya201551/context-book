/* ContextBook Bridge Icon — based on sample favicon.svg */
interface BrandMarkProps {
  size?: number;
  color?: string;
}

export default function BrandMark({ size = 20, color = '#e8b765' }: BrandMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="28" stroke={color} strokeWidth="3.2" />
      <g stroke={color} strokeLinecap="square" fill="none">
        <line x1="22" y1="27" x2="22" y2="44" strokeWidth="4.5" />
        <line x1="42" y1="27" x2="42" y2="44" strokeWidth="4.5" />
        <line x1="17" y1="27" x2="47" y2="27" strokeWidth="4.5" />
      </g>
      <rect x="17" y="44" width="11" height="3.2" fill={color} />
      <rect x="36" y="44" width="11" height="3.2" fill={color} />
      <g transform="translate(32 17) rotate(45)">
        <rect x="-4.5" y="-4.5" width="9" height="9" fill={color} />
      </g>
    </svg>
  );
}
