import { useMemo } from 'react';

interface Props {
  remaining: number;
  total: number;
  mode: 'pomodoro' | 'short-break' | 'long-break';
}

const MODE_COLORS: Record<string, string> = {
  pomodoro: '#e53e3e',
  'short-break': '#38a169',
  'long-break': '#d69e2e',
};

export function ProgressRing({ remaining, total, mode }: Props) {
  const radius = 140;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;

  const progress = useMemo(() => {
    if (total === 0) return 0;
    return remaining / total;
  }, [remaining, total]);

  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="progress-ring-container">
      <svg
        className="progress-ring"
        width={radius * 2}
        height={radius * 2}
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
        aria-hidden="true"
      >
        <circle
          stroke="#e2e8f0"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={MODE_COLORS[mode]}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="progress-ring-fill"
        />
      </svg>
    </div>
  );
}
