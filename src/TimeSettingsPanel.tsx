import type { TimerConfig, TimerMode } from './types';

interface Props {
  minutes: Record<TimerMode, number>;
  onChange: (mode: TimerMode, value: number) => void;
  onReset: () => void;
}

const FIELDS: { mode: TimerMode; label: string; min: number; max: number; step: number }[] = [
  { mode: 'pomodoro', label: 'Focus', min: 1, max: 180, step: 1 },
  { mode: 'short-break', label: 'Short', min: 1, max: 60, step: 1 },
  { mode: 'long-break', label: 'Long', min: 1, max: 90, step: 1 },
];

export function TimeSettingsPanel({ minutes, onChange, onReset }: Props) {
  return (
    <section className="time-settings-panel" aria-label="Timer settings">
      <div className="panel-header">
        <h2 className="panel-title">Time Settings</h2>
        <button className="panel-text-btn" type="button" onClick={onReset}>
          Reset
        </button>
      </div>

      <div className="time-settings-list">
        {FIELDS.map((field) => (
          <label className="time-setting-row" key={field.mode}>
            <span className="time-setting-label">{field.label}</span>
            <input
              className="time-setting-slider"
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={minutes[field.mode]}
              onChange={(event) => onChange(field.mode, Number(event.target.value))}
            />
            <input
              className="time-setting-input"
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={minutes[field.mode]}
              onChange={(event) => onChange(field.mode, Number(event.target.value))}
              aria-label={`${field.label} minutes`}
            />
            <span className="time-setting-unit">min</span>
          </label>
        ))}
      </div>
    </section>
  );
}

export function timerConfigToMinutes(config: TimerConfig): Record<TimerMode, number> {
  return {
    pomodoro: Math.round(config.pomodoro / 60),
    'short-break': Math.round(config['short-break'] / 60),
    'long-break': Math.round(config['long-break'] / 60),
  };
}
