import type { DailyStats } from './types';

interface Props {
  stats: DailyStats;
}

export function StatsPanel({ stats }: Props) {
  const streak = stats.pomodorosCompleted > 0 ? 1 : 0;
  const focusRate = stats.focusMinutes > 0
    ? Math.round((stats.pomodorosCompleted * 25 / stats.focusMinutes) * 100)
    : 0;

  return (
    <section className="stats-panel" aria-label="Daily statistics">
      <h2 className="stats-title">Today</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{stats.pomodorosCompleted}</span>
          <span className="stat-label">Pomodoros</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.focusMinutes}</span>
          <span className="stat-label">Focus Min</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{focusRate}%</span>
          <span className="stat-label">Focus Rate</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{streak > 0 ? `${streak}d` : '—'}</span>
          <span className="stat-label">Streak</span>
        </div>
      </div>
    </section>
  );
}
