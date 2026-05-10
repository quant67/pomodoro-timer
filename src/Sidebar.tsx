import type { TimerMode } from './types';

interface Props {
  mode: TimerMode;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSetMode: (m: TimerMode) => void;
}

function TomatoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2C8 2 5 5 5 9c0 3 1.5 5.5 3 7s2.5 2.5 4 2.5 2.5-1 4-2.5 3-4 3-7c0-4-3-7-7-7z"
        fill="#e53e3e"
      />
      <path
        d="M12 2c1.5 0 2.5-1 3-2-1 0-2 1-3 1s-2-1-3-1c.5 1 1.5 2 3 2z"
        fill="#c53030"
      />
      <path d="M10 10h4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 8v4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SoundOnIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

const MODE_LABELS: Record<TimerMode, string> = {
  pomodoro: 'Focus',
  'short-break': 'Short Break',
  'long-break': 'Long Break',
};

export function Sidebar({ mode, soundEnabled, onToggleSound, onSetMode }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <TomatoIcon />
        <span className="sidebar-title">Tomato Clock</span>
      </div>

      <nav className="sidebar-nav" aria-label="Timer modes">
        {(Object.keys(MODE_LABELS) as TimerMode[]).map((m) => (
          <button
            key={m}
            className={`sidebar-nav-btn${m === mode ? ' active' : ''}`}
            onClick={() => onSetMode(m)}
            aria-current={m === mode ? 'page' : undefined}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </nav>

      <div className="sidebar-section">
        <button
          className="sidebar-sound-btn"
          onClick={onToggleSound}
          aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
        >
          {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
          <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <p className="sidebar-note">Local mode. Data stays in your browser.</p>
      </div>
    </aside>
  );
}
