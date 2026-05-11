export type TimerMode = 'pomodoro' | 'short-break' | 'long-break';
export type TimerStatus = 'idle' | 'running' | 'paused';
export type TaskFilter = 'all' | 'active' | 'completed';

export interface TimerConfig {
  pomodoro: number;
  'short-break': number;
  'long-break': number;
}

export interface FocusTask {
  id: string;
  blockId?: string;
  sourcePath?: string;
  sourceLine?: number;
  sourceSection?: 'managed' | 'daily-note' | 'vault';
  text: string;
  completed: boolean;
  createdAt: number;
  removedAt?: number;
}

export interface DailyStats {
  date: string;
  pomodorosCompleted: number;
  focusMinutes: number;
}

export interface TimerCompletionEvent {
  mode: TimerMode;
  focusMinutes: number;
  completedAt: string;
  activeTaskId: string | null;
}
