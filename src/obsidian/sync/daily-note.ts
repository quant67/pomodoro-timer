import type { DailyStats, PomodoroSession, SyncedTask } from './types';

// ---------------------------------------------------------------------------
// Minimal Obsidian API shape – no hard dependency on the obsidian package
// ---------------------------------------------------------------------------

export interface ObsidianVault {
  getAbstractFileByPath?(path: string): unknown | null;
  getMarkdownFiles?(): ObsidianFile[];
  create(path: string, content: string): Promise<ObsidianFile>;
  read(file: unknown): Promise<string>;
  modify(file: unknown, content: string): Promise<void>;
  process?(file: unknown, fn: (data: string) => string): Promise<string>;
}

export interface ObsidianFile {
  path: string;
}

// ---------------------------------------------------------------------------
// Pure rendering functions (testable without an Obsidian app)
// ---------------------------------------------------------------------------

const MANAGED_START = '<!-- pomodoro-timer:start -->';
const MANAGED_END = '<!-- pomodoro-timer:end -->';
const LEGACY_MANAGED_START = '<!-- tomato-clock:start -->';
const LEGACY_MANAGED_END = '<!-- tomato-clock:end -->';

/** Render a single session as a markdown list item */
export function renderSession(session: PomodoroSession): string {
  const emoji = session.mode === 'focus' ? '🍅' : session.mode === 'short_break' ? '☕' : '🌿';
  const statusBadge =
    session.status === 'completed'
      ? ''
      : session.status === 'interrupted'
        ? ' ⚠️'
        : ' ⏭️';

  const duration = `${session.completedMinutes}m`;
  return `- ${emoji} **${session.mode.replace('_', ' ')}** ${duration} ${statusBadge}${session.taskBlockId ? ` (task: \`${session.taskBlockId}\`)` : ''}`;
}

/** Render the full managed section content */
export function renderManagedSection(
  stats: DailyStats,
  tasks: SyncedTask[],
): string {
  const lines: string[] = [];

  lines.push(MANAGED_START);
  lines.push('');

  // Summary header
  const totalSessions = stats.totalFocusSessions;
  const totalMin = stats.totalFocusMinutes;
  lines.push(`## 🍅 Pomodoro Timer`);
  lines.push('');
  lines.push(`**${totalSessions}** focus sessions · **${totalMin}** minutes`);
  lines.push('');

  // Session log
  if (stats.sessions.length > 0) {
    lines.push('### Sessions');
    for (const session of stats.sessions) {
      lines.push(renderSession(session));
    }
    lines.push('');
  }

  // Synced tasks
  const activeTasks = tasks.filter((t) => !t.completed);
  const doneTasks = tasks.filter((t) => t.completed);

  if (activeTasks.length > 0) {
    lines.push('### Focus Tasks');
    for (const t of activeTasks) {
      lines.push(t.raw);
    }
    lines.push('');
  }

  if (doneTasks.length > 0) {
    lines.push('### Completed');
    for (const t of doneTasks) {
      lines.push(t.raw);
    }
    lines.push('');
  }

  lines.push(MANAGED_END);

  return lines.join('\n');
}

/**
 * Splits file content into [beforeManaged, betweenManaged, afterManaged].
 * Returns `null` for sections that don't exist.
 */
export function splitAtManagedSection(
  content: string,
): [before: string | null, between: string | null, after: string | null] {
  const marker = findManagedMarkers(content);

  if (marker === null) {
    return [content, null, null];
  }

  const { start, end, startToken, endToken } = marker;
  const before = content.slice(0, start).replace(/\n*$/, '');
  const between = content.slice(start + startToken.length, end).trim();
  const after = content.slice(end + endToken.length).replace(/^\n*/, '');

  return [
    before || null,
    between || null,
    after || null,
  ];
}

/**
 * Given file content, replace (or append) the managed section.
 * Preserves everything outside the managed Pomodoro Timer marker block.
 */
export function upsertManagedSection(
  currentContent: string,
  newSectionContent: string,
): string {
  const [before, , after] = splitAtManagedSection(currentContent);

  if (before === null && after === null) {
    // No managed section exists – append it
    const trimmed = currentContent.replace(/\n*$/, '');
    return trimmed ? `${trimmed}\n\n${newSectionContent}\n` : `${newSectionContent}\n`;
  }

  const parts: string[] = [];
  if (before) parts.push(before);
  parts.push(newSectionContent);
  if (after) parts.push(after);

  return parts.join('\n\n') + '\n';
}

function findManagedMarkers(
  content: string,
): { start: number; end: number; startToken: string; endToken: string } | null {
  for (const [startToken, endToken] of [
    [MANAGED_START, MANAGED_END],
    [LEGACY_MANAGED_START, LEGACY_MANAGED_END],
  ] as const) {
    const start = content.indexOf(startToken);
    const end = content.indexOf(endToken);
    if (start !== -1 && end !== -1 && end > start) {
      return { start, end, startToken, endToken };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Obsidian-API-dependent helpers
// ---------------------------------------------------------------------------

/**
 * Build the daily note file path from folder and date format.
 * Example output: "Journal/2026-05-10.md"
 */
export function dailyNotePath(
  folder: string,
  dateFormat: string,
  date: Date = new Date(),
): string {
  const fileName = formatDate(date, dateFormat);
  const folderPart = folder ? `${folder}/` : '';
  return `${folderPart}${fileName}.md`;
}

/**
 * Read a daily note, returning its content.
 * Creates the file with optional template content if it doesn't exist.
 */
export async function readDailyNote(
  vault: ObsidianVault,
  path: string,
  template = '',
): Promise<{ file: ObsidianFile; content: string }> {
  const existing = vault.getAbstractFileByPath?.(path) as ObsidianFile | null | undefined;

  if (existing) {
    return { file: existing, content: await vault.read(existing) };
  }

  const file = await vault.create(path, template || '');
  return { file, content: template || '' };
}

/**
 * Write the managed section into a daily note, preserving user content.
 */
export async function writeManagedSection(
  vault: ObsidianVault,
  file: ObsidianFile,
  currentContent: string,
  stats: DailyStats,
  tasks: SyncedTask[],
): Promise<void> {
  const section = renderManagedSection(stats, tasks);
  if (vault.process) {
    await vault.process(file, (content) => upsertManagedSection(content, section));
    return;
  }

  await vault.modify(file, upsertManagedSection(currentContent, section));
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Format a Date to a string using a simple pattern:
 * YYYY, MM, DD, M, D are supported.
 * For Moment.js-style "YYYY-MM-DD", "M/D/YYYY", etc.
 *
 * This avoids pulling in Moment/luxon as a dependency. The consumer can
 * supply any format string and get a reasonable result.
 */
function formatDate(date: Date, format: string): string {
  const map: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: String(date.getMonth() + 1).padStart(2, '0'),
    M: String(date.getMonth() + 1),
    DD: String(date.getDate()).padStart(2, '0'),
    D: String(date.getDate()),
  };

  // Replace longest tokens first to avoid partial replacements
  let result = format;
  for (const [token, value] of Object.entries(map)) {
    result = result.replace(token, value);
  }
  return result;
}
