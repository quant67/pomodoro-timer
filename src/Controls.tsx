import type { TimerStatus } from './types';
import { useMemo } from 'react';

interface Props {
  status: TimerStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </svg>
  );
}

export function Controls({ status, onStart, onPause, onResume, onReset }: Props) {
  const primaryAction = useMemo(() => {
    switch (status) {
      case 'idle':
        return { label: 'Start', icon: <PlayIcon />, action: onStart };
      case 'running':
        return { label: 'Pause', icon: <PauseIcon />, action: onPause };
      case 'paused':
        return { label: 'Resume', icon: <PlayIcon />, action: onResume };
    }
  }, [status, onStart, onPause, onResume]);

  return (
    <div className="controls">
      <button
        className="controls-primary"
        onClick={primaryAction.action}
        aria-label={primaryAction.label}
      >
        {primaryAction.icon}
        <span>{primaryAction.label}</span>
      </button>
      {(status === 'running' || status === 'paused') && (
        <button className="controls-reset" onClick={onReset} aria-label="Reset timer">
          <ResetIcon />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}
