import type { Tweaks } from '../types';
import Icon from './Icon';

const ACCENTS: Record<string, string> = { amber: '#e8b765', violet: '#a78bfa', green: '#7dd88f', coral: '#ff8c7a', cyan: '#6ec9d6' };
const THEMES = { midnight: true, slate: true };

interface TweaksPanelProps {
  tweaks: Tweaks;
  setTweaks: (t: Tweaks | ((p: Tweaks) => Tweaks)) => void;
  onClose: () => void;
}

export default function TweaksPanel({ tweaks, setTweaks, onClose }: TweaksPanelProps) {
  const set = (k: keyof Tweaks, v: any) => setTweaks(p => ({ ...p, [k]: v }));
  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <span className="tweaks-title"><Icon name="settings" size={13} /> Tweaks</span>
        <button className="icon-btn" onClick={onClose}><Icon name="close" size={14} /></button>
      </div>

      <div className="tweak-row">
        <label>Accent</label>
        <div className="swatch-row">
          {Object.entries(ACCENTS).map(([k, v]) => (
            <button key={k} className={`swatch ${tweaks.accent === k ? 'active' : ''}`} style={{ background: v }} onClick={() => set('accent', k)} title={k} />
          ))}
        </div>
      </div>

      <div className="tweak-row">
        <label>Theme</label>
        <div className="seg">
          {Object.keys(THEMES).map(k => (
            <button key={k} className={tweaks.theme === k ? 'active' : ''} onClick={() => set('theme', k)}>{k}</button>
          ))}
        </div>
      </div>

      <div className="tweak-row">
        <label>Density</label>
        <div className="seg">
          {['compact', 'comfortable', 'roomy'].map(k => (
            <button key={k} className={tweaks.density === k ? 'active' : ''} onClick={() => set('density', k)}>{k}</button>
          ))}
        </div>
      </div>

      <div className="tweak-row">
        <label>Default view</label>
        <div className="seg">
          {['cards', 'rows', 'compact'].map(k => (
            <button key={k} className={tweaks.defaultView === k ? 'active' : ''} onClick={() => set('defaultView', k)}>{k}</button>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border-soft)', margin: '4px 0' }} />

      <div className="tweak-row tweak-toggle">
        <label>
          Empty mode
          <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>preview zero-data states</span>
        </label>
        <button className={`toggle ${tweaks.emptyMode ? 'on' : ''}`} onClick={() => set('emptyMode', !tweaks.emptyMode)}>
          <span className="toggle-dot" />
        </button>
      </div>
    </div>
  );
}
