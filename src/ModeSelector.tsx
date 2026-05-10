import type { TimerMode } from './types';

interface Props {
  mode: TimerMode;
  onChange: (m: TimerMode) => void;
}

const OPTIONS: { value: TimerMode; label: string }[] = [
  { value: 'pomodoro', label: 'Pomodoro' },
  { value: 'short-break', label: 'Short Break' },
  { value: 'long-break', label: 'Long Break' },
];

export function ModeSelector({ mode, onChange }: Props) {
  return (
    <div className="mode-selector" role="tablist" aria-label="Timer mode">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={mode === opt.value}
          className={`mode-btn${mode === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
