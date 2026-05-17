import Icon from './Icon';

interface AskBarProps {
  onOpen: () => void;
}

export default function AskBar({ onOpen }: AskBarProps) {
  return (
    <button
      type="button"
      className="searchbar askbar"
      onClick={onOpen}
      aria-label="Search or ask anything — opens the command palette"
    >
      <Icon name="search" size={13} />
      <span className="askbar-text">Search or ask anything…</span>
      <span className="kbd">⌘K</span>
    </button>
  );
}
