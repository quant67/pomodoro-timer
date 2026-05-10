/** Pomodoro timer mode */
export type PomodoroMode = 'focus' | 'short_break' | 'long_break';

/** A completed or in-progress pomodoro session */
export interface PomodoroSession {
  /** Unique session id */
  id: string;
  /** Which mode this session ran in */
  mode: PomodoroMode;
  /** When the session started (ISO 8601) */
  startTime: string;
  /** Planned duration in minutes */
  durationMinutes: number;
  /** Actual duration in minutes (may differ if interrupted) */
  completedMinutes: number;
  /** Whether the session was completed, interrupted, or skipped */
  status: 'completed' | 'interrupted' | 'skipped';
  /** Optional task block id this session was linked to */
  taskBlockId?: string;
}

/** Aggregated stats for a single day */
export interface DailyStats {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Total completed focus sessions */
  totalFocusSessions: number;
  /** Total completed focus time in minutes */
  totalFocusMinutes: number;
  /** Total completed short breaks */
  totalShortBreaks: number;
  /** Total completed long breaks */
  totalLongBreaks: number;
  /** All sessions recorded this day */
  sessions: PomodoroSession[];
}

/**
 * A task parsed from a markdown checkbox line, carrying a stable block id
 * for two-way sync with the Obsidian UI.
 */
export interface SyncedTask {
  /** Stable block id like `^tc-task-abc123` */
  blockId: string;
  /** The task text (without checkbox markers or block id) */
  text: string;
  /** Whether the checkbox is marked complete (- [x]) */
  completed: boolean;
  /** Any tags found in the task line (e.g. #focus, #chore) */
  tags: string[];
  /** The raw markdown line that was parsed */
  raw: string;
  /** The line number (0-indexed) in the source file */
  lineIndex: number;
}

/** User-configurable sync settings */
export interface SyncSettings {
  /** Folder path for daily notes, e.g. "Journal" or "" for vault root */
  dailyNoteFolder: string;
  /** Moment.js-compatible date format, e.g. "YYYY-MM-DD" */
  dailyNoteDateFormat: string;
  /** Optional tag to filter tasks (e.g. "#focus" or "" for all) */
  taskTagFilter: string;
  /** Optional template content for new daily notes */
  template: string;
}