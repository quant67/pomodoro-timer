import type { TimerMode, TimerStatus } from './types';
import { ProgressRing } from './ProgressRing';
import { formatTime } from './utils';

interface Props {
  mode: TimerMode;
  status: TimerStatus;
  remaining: number;
  total: number;
}

const MODE_LABELS: Record<TimerMode, string> = {
  pomodoro: 'Focus Time',
  'short-break': 'Short Break',
  'long-break': 'Long Break',
};

export function TimerDisplay({ mode, status, remaining, total }: Props) {
  return (
    <div className="timer-display">
      <span className="timer-mode-label">{MODE_LABELS[mode]}</span>
      <div className="timer-ring-wrapper">
        <ProgressRing remaining={remaining} total={total} mode={mode} />
        <div className="timer-time">
          <span className="timer-time-value" aria-live="polite" aria-label={`${formatTime(remaining)} remaining`}>
            {formatTime(remaining)}
          </span>
          {status === 'paused' && <span className="timer-paused-label">Paused</span>}
        </div>
      </div>
    </div>
  );
}
