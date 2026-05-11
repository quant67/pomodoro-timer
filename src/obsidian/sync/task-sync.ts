import type { SyncedTask } from './types';
import type { ObsidianVault, ObsidianFile } from './daily-note';

// ---------------------------------------------------------------------------
// Block-id generation
// ---------------------------------------------------------------------------

/** Generate a short random block id suffix (6 hex chars) */
export function generateBlockIdSuffix(): string {
  return Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
}

// ---------------------------------------------------------------------------
// Pure parsing functions (testable without an Obsidian app)
// ---------------------------------------------------------------------------

/**
 * Regex capturing a checkbox task line.
 *
 * Groups:
 *   1 – indentation
 *   2 – list marker
 *   3 – checkbox state (`[ ]` or `[x]`)
 *   4 – the text after the checkbox
 */
const TASK_LINE_RE = /^(\s*)([-*])\s+(\[[ xX]\])\s+(.+)/;

/** Match a block id like `^pt-task-abc123`; legacy `^tc-task-*` ids are supported. */
const BLOCK_ID_RE = /\^(?:pt|tc)-task-[a-f0-9]+\b/;

/** Match inline tags like `#focus` */
const TAG_RE = /#[\w/-]+/g;

/**
 * Parse a single line of markdown. Returns null if the line is not a checkbox task.
 */
export function parseTaskLine(line: string, lineIndex: number): SyncedTask | null {
  const match = line.match(TASK_LINE_RE);
  if (!match) return null;

  const checkbox = match[3].toLowerCase();
  const rest = match[4].trim();
  const completed = checkbox === '[x]';

  // Extract block id
  const blockIdMatch = rest.match(BLOCK_ID_RE);
  const blockId = blockIdMatch ? blockIdMatch[0] : `^pt-task-${generateBlockIdSuffix()}`;

  // Extract tags (from the part before any block id)
  const textPart = blockIdMatch ? rest.slice(0, rest.indexOf(blockIdMatch[0])).trim() : rest;
  const tags = (textPart.match(TAG_RE) ?? []).map((t) => t.toLowerCase());

  // Text without tags (preserved for structured access)
  const text = textPart.replace(TAG_RE, '').trim();

  // Preserve the original line verbatim for fidelity during re-serialization
  const raw = line;

  return { blockId, text, completed, tags, raw, lineIndex };
}

/**
 * Parse all checkbox task lines from markdown file content.
 */
export function parseTasksFromContent(content: string): SyncedTask[] {
  const lines = content.split('\n');
  const tasks: SyncedTask[] = [];

  for (let i = 0; i < lines.length; i++) {
    const task = parseTaskLine(lines[i], i);
    if (task) {
      tasks.push(task);
    }
  }

  return tasks;
}

/**
 * Filter tasks by a configured tag. If `tagFilter` is empty or falsy, return all tasks.
 * The tag filter should include the `#` prefix (e.g. `"#focus"`).
 */
export function filterTasksByTag(tasks: SyncedTask[], tagFilter: string): SyncedTask[] {
  if (!tagFilter) return tasks;
  const normalized = tagFilter.toLowerCase();
  return tasks.filter((t) => t.tags.includes(normalized));
}

/**
 * Toggle a task's completion state by block id.
 * Returns the updated line content if found and toggled, or null if not found.
 */
export function toggleTaskLine(
  content: string,
  blockId: string,
): string | null {
  return setTaskLineCompletion(content, blockId, null);
}

export function setTaskLineCompletion(
  content: string,
  blockId: string,
  completed: boolean | null,
): string | null {
  const lines = content.split('\n');
  let modified = false;

  const updatedLines = lines.map((line) => {
    // Skip lines that don't contain the block id
    if (!line.includes(blockId)) return line;

    const task = parseTaskLine(line, 0);
    if (!task || task.blockId !== blockId) return line;

    modified = true;

    const nextCompleted = completed ?? !task.completed;
    if (nextCompleted === task.completed) {
      return line;
    }

    return line.replace(/\[[ xX]\]/, nextCompleted ? '[x]' : '[ ]');
  });

  return modified ? updatedLines.join('\n') : null;
}

export function updateTaskLineText(
  content: string,
  blockId: string,
  text: string,
  tagFilter: string,
): string | null {
  const lines = content.split('\n');
  let modified = false;

  const updatedLines = lines.map((line) => {
    if (!line.includes(blockId)) return line;

    const match = line.match(TASK_LINE_RE);
    const task = parseTaskLine(line, 0);
    if (!match || !task || task.blockId !== blockId) return line;

    modified = true;
    return renderUpdatedTaskLine(line, match, task.completed, text, tagFilter, blockId);
  });

  return modified ? updatedLines.join('\n') : null;
}

export function removeTaskSyncToken(
  content: string,
  blockId: string,
  tagFilter: string,
): string | null {
  const lines = content.split('\n');
  let modified = false;
  const normalizedTag = tagFilter.trim();

  const updatedLines = lines.map((line) => {
    if (!line.includes(blockId)) return line;

    const task = parseTaskLine(line, 0);
    if (!task || task.blockId !== blockId) return line;

    modified = true;
    let nextLine = line.replace(blockId, '').replace(/\s+$/g, '');
    if (normalizedTag) {
      nextLine = nextLine
        .replace(new RegExp(`(^|\\s)${escapeRegExp(normalizedTag)}(?=\\s|$)`, 'i'), '$1')
        .replace(/\s+$/g, '');
    }
    return nextLine;
  });

  return modified ? updatedLines.join('\n') : null;
}

/**
 * Ensure all parsed tasks have stable block ids.
 * Mutates tasks in-place and returns the updated file content.
 */
export function ensureBlockIds(content: string): string {
  const lines = content.split('\n');

  const updatedLines = lines.map((line) => {
    const parsed = parseTaskLine(line, 0);
    if (!parsed) return line;

    // If the line already has a block id, leave it
    if (BLOCK_ID_RE.test(line)) return line;

    // Generate a new block id and append it
    const blockId = `^pt-task-${generateBlockIdSuffix()}`;
    return `${line.trimEnd()} ${blockId}`;
  });

  return updatedLines.join('\n');
}

export function ensureFilteredTaskBlockIds(content: string, tagFilter: string): string {
  const lines = content.split('\n');
  const normalizedTag = tagFilter.trim().toLowerCase();

  const updatedLines = lines.map((line) => {
    const parsed = parseTaskLine(line, 0);
    if (!parsed) return line;
    if (normalizedTag && !parsed.tags.includes(normalizedTag)) return line;
    if (BLOCK_ID_RE.test(line)) return line;

    return `${line.trimEnd()} ^pt-task-${generateBlockIdSuffix()}`;
  });

  return updatedLines.join('\n');
}

function renderUpdatedTaskLine(
  line: string,
  match: RegExpMatchArray,
  completed: boolean,
  text: string,
  tagFilter: string,
  blockId: string,
): string {
  const indent = match[1] ?? '';
  const marker = match[2] ?? '-';
  const tag = tagFilter.trim();
  const existingTags = (line.match(TAG_RE) ?? []).filter(
    (existingTag) => existingTag.toLowerCase() !== tag.toLowerCase(),
  );
  const tags = tag ? [...existingTags, tag] : existingTags;
  const tagPart = tags.length > 0 ? ` ${Array.from(new Set(tags)).join(' ')}` : '';
  const checkbox = completed ? '[x]' : '[ ]';
  return `${indent}${marker} ${checkbox} ${text.trim()}${tagPart} ${blockId}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Obsidian-API-dependent helpers
// ---------------------------------------------------------------------------

/**
 * Read tasks from a daily note file, optionally filtered by a tag.
 */
export async function readTasksFromFile(
  vault: ObsidianVault,
  file: ObsidianFile,
  tagFilter = '',
): Promise<SyncedTask[]> {
  const content = await vault.read(file);
  const allTasks = parseTasksFromContent(content);
  return filterTasksByTag(allTasks, tagFilter);
}

/**
 * Toggle a task by block id in a file, returning the new content or null if no change.
 */
export async function toggleTaskInFile(
  vault: ObsidianVault,
  file: ObsidianFile,
  blockId: string,
): Promise<boolean> {
  const content = await vault.read(file);
  const updated = toggleTaskLine(content, blockId);
  if (updated === null) return false;
  await vault.modify(file, updated);
  return true;
}
