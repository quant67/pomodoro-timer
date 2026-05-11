"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/obsidian/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => PomodoroTimerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/obsidian/view.ts
var import_obsidian = require("obsidian");

// src/obsidian/sync/daily-note.ts
var MANAGED_START = "<!-- pomodoro-timer:start -->";
var MANAGED_END = "<!-- pomodoro-timer:end -->";
var LEGACY_MANAGED_START = "<!-- tomato-clock:start -->";
var LEGACY_MANAGED_END = "<!-- tomato-clock:end -->";
function renderSession(session) {
  const emoji = session.mode === "focus" ? "\u{1F345}" : session.mode === "short_break" ? "\u2615" : "\u{1F33F}";
  const statusBadge = session.status === "completed" ? "" : session.status === "interrupted" ? " \u26A0\uFE0F" : " \u23ED\uFE0F";
  const duration = `${session.completedMinutes}m`;
  return `- ${emoji} **${session.mode.replace("_", " ")}** ${duration} ${statusBadge}${session.taskBlockId ? ` (task: \`${session.taskBlockId}\`)` : ""}`;
}
function renderManagedSection(stats, tasks) {
  const lines = [];
  lines.push(MANAGED_START);
  lines.push("");
  const totalSessions = stats.totalFocusSessions;
  const totalMin = stats.totalFocusMinutes;
  lines.push(`## \u{1F345} Pomodoro Timer`);
  lines.push("");
  lines.push(`**${totalSessions}** focus sessions \xB7 **${totalMin}** minutes`);
  lines.push("");
  if (stats.sessions.length > 0) {
    lines.push("### Sessions");
    for (const session of stats.sessions) {
      lines.push(renderSession(session));
    }
    lines.push("");
  }
  const activeTasks = tasks.filter((t) => !t.completed);
  const doneTasks = tasks.filter((t) => t.completed);
  if (activeTasks.length > 0) {
    lines.push("### Focus Tasks");
    for (const t of activeTasks) {
      lines.push(t.raw);
    }
    lines.push("");
  }
  if (doneTasks.length > 0) {
    lines.push("### Completed");
    for (const t of doneTasks) {
      lines.push(t.raw);
    }
    lines.push("");
  }
  lines.push(MANAGED_END);
  return lines.join("\n");
}
function splitAtManagedSection(content) {
  const marker = findManagedMarkers(content);
  if (marker === null) {
    return [content, null, null];
  }
  const { start, end, startToken, endToken } = marker;
  const before = content.slice(0, start).replace(/\n*$/, "");
  const between = content.slice(start + startToken.length, end).trim();
  const after = content.slice(end + endToken.length).replace(/^\n*/, "");
  return [
    before || null,
    between || null,
    after || null
  ];
}
function upsertManagedSection(currentContent, newSectionContent) {
  const [before, , after] = splitAtManagedSection(currentContent);
  if (before === null && after === null) {
    const trimmed = currentContent.replace(/\n*$/, "");
    return trimmed ? `${trimmed}

${newSectionContent}
` : `${newSectionContent}
`;
  }
  const parts = [];
  if (before) parts.push(before);
  parts.push(newSectionContent);
  if (after) parts.push(after);
  return parts.join("\n\n") + "\n";
}
function findManagedMarkers(content) {
  for (const [startToken, endToken] of [
    [MANAGED_START, MANAGED_END],
    [LEGACY_MANAGED_START, LEGACY_MANAGED_END]
  ]) {
    const start = content.indexOf(startToken);
    const end = content.indexOf(endToken);
    if (start !== -1 && end !== -1 && end > start) {
      return { start, end, startToken, endToken };
    }
  }
  return null;
}
function dailyNotePath(folder, dateFormat, date = /* @__PURE__ */ new Date()) {
  const fileName = formatDate(date, dateFormat);
  const folderPart = folder ? `${folder}/` : "";
  return `${folderPart}${fileName}.md`;
}
async function readDailyNote(vault, path, template = "") {
  var _a;
  const existing = (_a = vault.getAbstractFileByPath) == null ? void 0 : _a.call(vault, path);
  if (existing) {
    return { file: existing, content: await vault.read(existing) };
  }
  const file = await vault.create(path, template || "");
  return { file, content: template || "" };
}
async function writeManagedSection(vault, file, currentContent, stats, tasks) {
  const section = renderManagedSection(stats, tasks);
  if (vault.process) {
    await vault.process(file, (content) => upsertManagedSection(content, section));
    return;
  }
  await vault.modify(file, upsertManagedSection(currentContent, section));
}
function formatDate(date, format) {
  const map = {
    YYYY: String(date.getFullYear()),
    MM: String(date.getMonth() + 1).padStart(2, "0"),
    M: String(date.getMonth() + 1),
    DD: String(date.getDate()).padStart(2, "0"),
    D: String(date.getDate())
  };
  let result = format;
  for (const [token, value] of Object.entries(map)) {
    result = result.replace(token, value);
  }
  return result;
}

// src/obsidian/sync/task-sync.ts
function generateBlockIdSuffix() {
  return Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
}
var TASK_LINE_RE = /^(\s*)([-*])\s+(\[[ xX]\])\s+(.+)/;
var BLOCK_ID_RE = /\^(?:pt|tc)-task-[a-f0-9]+\b/;
var TAG_RE = /#[\w/-]+/g;
function parseTaskLine(line, lineIndex) {
  var _a;
  const match = line.match(TASK_LINE_RE);
  if (!match) return null;
  const checkbox = match[3].toLowerCase();
  const rest = match[4].trim();
  const completed = checkbox === "[x]";
  const blockIdMatch = rest.match(BLOCK_ID_RE);
  const blockId = blockIdMatch ? blockIdMatch[0] : `^pt-task-${generateBlockIdSuffix()}`;
  const textPart = blockIdMatch ? rest.slice(0, rest.indexOf(blockIdMatch[0])).trim() : rest;
  const tags = ((_a = textPart.match(TAG_RE)) != null ? _a : []).map((t) => t.toLowerCase());
  const text = textPart.replace(TAG_RE, "").trim();
  const raw = line;
  return { blockId, text, completed, tags, raw, lineIndex };
}
function parseTasksFromContent(content) {
  const lines = content.split("\n");
  const tasks = [];
  for (let i = 0; i < lines.length; i++) {
    const task = parseTaskLine(lines[i], i);
    if (task) {
      tasks.push(task);
    }
  }
  return tasks;
}
function filterTasksByTag(tasks, tagFilter) {
  if (!tagFilter) return tasks;
  const normalized = tagFilter.toLowerCase();
  return tasks.filter((t) => t.tags.includes(normalized));
}
function setTaskLineCompletion(content, blockId, completed) {
  const lines = content.split("\n");
  let modified = false;
  const updatedLines = lines.map((line) => {
    if (!line.includes(blockId)) return line;
    const task = parseTaskLine(line, 0);
    if (!task || task.blockId !== blockId) return line;
    modified = true;
    const nextCompleted = completed != null ? completed : !task.completed;
    if (nextCompleted === task.completed) {
      return line;
    }
    return line.replace(/\[[ xX]\]/, nextCompleted ? "[x]" : "[ ]");
  });
  return modified ? updatedLines.join("\n") : null;
}
function updateTaskLineText(content, blockId, text, tagFilter) {
  const lines = content.split("\n");
  let modified = false;
  const updatedLines = lines.map((line) => {
    if (!line.includes(blockId)) return line;
    const match = line.match(TASK_LINE_RE);
    const task = parseTaskLine(line, 0);
    if (!match || !task || task.blockId !== blockId) return line;
    modified = true;
    return renderUpdatedTaskLine(line, match, task.completed, text, tagFilter, blockId);
  });
  return modified ? updatedLines.join("\n") : null;
}
function removeTaskSyncToken(content, blockId, tagFilter) {
  const lines = content.split("\n");
  let modified = false;
  const normalizedTag = tagFilter.trim();
  const updatedLines = lines.map((line) => {
    if (!line.includes(blockId)) return line;
    const task = parseTaskLine(line, 0);
    if (!task || task.blockId !== blockId) return line;
    modified = true;
    let nextLine = line.replace(blockId, "").replace(/\s+$/g, "");
    if (normalizedTag) {
      nextLine = nextLine.replace(new RegExp(`(^|\\s)${escapeRegExp(normalizedTag)}(?=\\s|$)`, "i"), "$1").replace(/\s+$/g, "");
    }
    return nextLine;
  });
  return modified ? updatedLines.join("\n") : null;
}
function ensureFilteredTaskBlockIds(content, tagFilter) {
  const lines = content.split("\n");
  const normalizedTag = tagFilter.trim().toLowerCase();
  const updatedLines = lines.map((line) => {
    const parsed = parseTaskLine(line, 0);
    if (!parsed) return line;
    if (normalizedTag && !parsed.tags.includes(normalizedTag)) return line;
    if (BLOCK_ID_RE.test(line)) return line;
    return `${line.trimEnd()} ^pt-task-${generateBlockIdSuffix()}`;
  });
  return updatedLines.join("\n");
}
function renderUpdatedTaskLine(line, match, completed, text, tagFilter, blockId) {
  var _a, _b, _c;
  const indent = (_a = match[1]) != null ? _a : "";
  const marker = (_b = match[2]) != null ? _b : "-";
  const tag = tagFilter.trim();
  const existingTags = ((_c = line.match(TAG_RE)) != null ? _c : []).filter(
    (existingTag) => existingTag.toLowerCase() !== tag.toLowerCase()
  );
  const tags = tag ? [...existingTags, tag] : existingTags;
  const tagPart = tags.length > 0 ? ` ${Array.from(new Set(tags)).join(" ")}` : "";
  const checkbox = completed ? "[x]" : "[ ]";
  return `${indent}${marker} ${checkbox} ${text.trim()}${tagPart} ${blockId}`;
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// src/obsidian/daily-note-config.ts
async function readConfiguredDailyNote(host, date) {
  var _a, _b;
  const dailyNotesSettings = await readDailyNotesCoreSettings(host.app.vault);
  const folder = (_a = dailyNotesSettings.folder) != null ? _a : host.settings.dailyNoteFolder;
  const dateFormat = (_b = dailyNotesSettings.format) != null ? _b : host.settings.dateFormat;
  const template = await readDailyNoteTemplate(host.app.vault, dailyNotesSettings.template);
  const path = dailyNotePath(folder, dateFormat, date);
  const { file, content } = await readDailyNote(host.app.vault, path, template);
  return { file, content, path };
}
async function readDailyNotesCoreSettings(vault) {
  const adapter = vault.adapter;
  if (!adapter) {
    return {};
  }
  try {
    const raw = await adapter.read(".obsidian/daily-notes.json");
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}
async function readDailyNoteTemplate(vault, templatePath) {
  const adapter = vault.adapter;
  if (!adapter || !templatePath) {
    return "";
  }
  const candidates = templatePath.endsWith(".md") ? [templatePath] : [templatePath, `${templatePath}.md`];
  for (const candidate of candidates) {
    try {
      if (await adapter.exists(candidate)) {
        return await adapter.read(candidate);
      }
    } catch (e) {
      return "";
    }
  }
  return "";
}

// src/obsidian/task-sync.ts
var TASKS_KEY = "pomodoro-timer-tasks";
var LEGACY_TASKS_KEY = "tomato-tasks";
var MANAGED_START2 = "<!-- pomodoro-timer:start -->";
var MANAGED_END2 = "<!-- pomodoro-timer:end -->";
var LEGACY_MANAGED_START2 = "<!-- tomato-clock:start -->";
var LEGACY_MANAGED_END2 = "<!-- tomato-clock:end -->";
async function hydrateTasksFromDailyNote(plugin) {
  try {
    const { file, content } = await readConfiguredDailyNote(plugin, /* @__PURE__ */ new Date());
    const parsedFocusTasks = await readTaggedTasksFromVault(plugin, file, content);
    plugin.data.appState[TASKS_KEY] = mergeHydratedTasks(
      parsedFocusTasks,
      normalizeFocusTasks(readStoredFocusTasks(plugin))
    );
    await plugin.savePluginData();
  } catch (error) {
    console.error("Failed to hydrate Pomodoro Timer tasks from Daily Note", error);
  }
}
async function syncFocusTasksToDailyNote(plugin) {
  var _a;
  try {
    const date = /* @__PURE__ */ new Date();
    const dateKey = formatDateKey(date);
    const tasks = normalizeFocusTasks(readStoredFocusTasks(plugin));
    const stats = (_a = plugin.data.syncDailyStats[dateKey]) != null ? _a : createEmptyStats(dateKey);
    const { file, content } = await readConfiguredDailyNote(plugin, date);
    const prepared = await prepareTasksForDailyNote(plugin, file, content, tasks);
    plugin.data.appState[TASKS_KEY] = prepared.tasks;
    await plugin.savePluginData();
    await writeManagedSection(
      plugin.app.vault,
      file,
      prepared.content,
      stats,
      focusTasksToSyncedTasks(prepared.managedTasks, plugin.settings.taskSyncTag)
    );
  } catch (error) {
    console.error("Failed to sync Pomodoro Timer tasks to Daily Note", error);
  }
}
async function prepareTasksForDailyNote(plugin, file, content, tasks = normalizeFocusTasks(readStoredFocusTasks(plugin))) {
  let nextContent = ensureFilteredTaskBlockIds(content, plugin.settings.taskSyncTag);
  const synced = await syncSourceTasksToVault(plugin, file, nextContent, tasks);
  nextContent = synced.currentDailyNoteContent;
  if (nextContent !== content) {
    await plugin.app.vault.modify(file, nextContent);
  }
  return {
    content: nextContent,
    tasks: synced.remainingTasks,
    managedTasks: getManagedFocusTasks(synced.remainingTasks)
  };
}
function readStoredFocusTasks(plugin) {
  var _a;
  const value = (_a = plugin.data.appState[TASKS_KEY]) != null ? _a : plugin.data.appState[LEGACY_TASKS_KEY];
  return Array.isArray(value) ? value : [];
}
function normalizeFocusTasks(tasks) {
  return tasks.map((task) => {
    var _a;
    return {
      ...task,
      blockId: (_a = task.blockId) != null ? _a : blockIdFromTaskId(task.id)
    };
  });
}
function getManagedFocusTasks(tasks) {
  return tasks.filter((task) => task.sourceSection === "managed" || !task.sourcePath);
}
function focusTasksToSyncedTasks(tasks, taskSyncTag) {
  const tag = taskSyncTag.trim();
  return normalizeFocusTasks(tasks).map((task, index) => {
    var _a;
    const blockId = (_a = task.blockId) != null ? _a : blockIdFromTaskId(task.id);
    const raw = renderTaskLine(task, blockId, tag);
    return {
      blockId,
      text: task.text,
      completed: task.completed,
      tags: tag ? [tag.toLowerCase()] : [],
      raw,
      lineIndex: index
    };
  });
}
function syncedTaskToFocusTask(task, sourcePath, sourceSection) {
  return {
    id: task.blockId,
    blockId: task.blockId,
    sourcePath,
    sourceLine: task.lineIndex,
    sourceSection,
    text: task.text,
    completed: task.completed,
    createdAt: Date.now()
  };
}
function syncExternalTaskStateToContent(content, tasks, filePath, taskSyncTag) {
  let nextContent = content;
  for (const task of tasks) {
    if (!isSourceTask(task) || task.sourcePath !== filePath || !task.blockId) {
      continue;
    }
    if (task.removedAt) {
      const removed = removeTaskSyncToken(nextContent, task.blockId, taskSyncTag);
      if (removed !== null) {
        nextContent = removed;
      }
      continue;
    }
    const completionUpdated = setTaskLineCompletion(nextContent, task.blockId, task.completed);
    if (completionUpdated !== null) {
      nextContent = completionUpdated;
    }
    const textUpdated = updateTaskLineText(
      nextContent,
      task.blockId,
      task.text,
      taskSyncTag
    );
    if (textUpdated !== null) {
      nextContent = textUpdated;
    }
  }
  return nextContent;
}
async function readTaggedTasksFromVault(plugin, dailyNoteFile, dailyNoteContent) {
  var _a, _b, _c;
  const files = (_c = (_b = (_a = plugin.app.vault).getMarkdownFiles) == null ? void 0 : _b.call(_a)) != null ? _c : [dailyNoteFile];
  const tasks = [];
  const seenPaths = /* @__PURE__ */ new Set();
  for (const file of files) {
    if (seenPaths.has(file.path)) {
      continue;
    }
    seenPaths.add(file.path);
    const content = file.path === dailyNoteFile.path ? dailyNoteContent : await plugin.app.vault.read(file);
    if (!content.toLowerCase().includes(plugin.settings.taskSyncTag.toLowerCase())) {
      continue;
    }
    const prepared = ensureFilteredTaskBlockIds(content, plugin.settings.taskSyncTag);
    if (prepared !== content) {
      await plugin.app.vault.modify(file, prepared);
    }
    const managedRange = file.path === dailyNoteFile.path ? getManagedLineRange(prepared) : null;
    const parsedTasks = filterTasksByTag(
      parseTasksFromContent(prepared),
      plugin.settings.taskSyncTag
    );
    for (const task of parsedTasks) {
      tasks.push(
        syncedTaskToFocusTask(
          task,
          file.path,
          getSourceSection(file, dailyNoteFile, task.lineIndex, managedRange)
        )
      );
    }
  }
  return tasks;
}
async function syncSourceTasksToVault(plugin, dailyNoteFile, dailyNoteContent, tasks) {
  var _a, _b;
  const currentDailyNoteContent = syncExternalTaskStateToContent(
    dailyNoteContent,
    tasks,
    dailyNoteFile.path,
    plugin.settings.taskSyncTag
  );
  const sourcePaths = new Set(
    tasks.filter(isSourceTask).map((task) => task.sourcePath).filter((path) => Boolean(path))
  );
  for (const sourcePath of sourcePaths) {
    if (sourcePath === dailyNoteFile.path) {
      continue;
    }
    const file = (_b = (_a = plugin.app.vault).getAbstractFileByPath) == null ? void 0 : _b.call(_a, sourcePath);
    if (!file) {
      continue;
    }
    const content = await plugin.app.vault.read(file);
    const updated = syncExternalTaskStateToContent(
      content,
      tasks,
      sourcePath,
      plugin.settings.taskSyncTag
    );
    if (updated !== content) {
      await plugin.app.vault.modify(file, updated);
    }
  }
  return {
    currentDailyNoteContent,
    remainingTasks: tasks.filter((task) => !task.removedAt)
  };
}
function mergeHydratedTasks(hydrated, stored) {
  var _a, _b;
  const tasksByBlockId = /* @__PURE__ */ new Map();
  for (const task of hydrated) {
    tasksByBlockId.set((_a = task.blockId) != null ? _a : task.id, task);
  }
  for (const task of stored) {
    const key = (_b = task.blockId) != null ? _b : task.id;
    if (tasksByBlockId.has(key) || isSourceTask(task) || task.removedAt) {
      continue;
    }
    tasksByBlockId.set(key, task);
  }
  return Array.from(tasksByBlockId.values());
}
function getSourceSection(file, dailyNoteFile, lineIndex, managedRange) {
  if (file.path !== dailyNoteFile.path) {
    return "vault";
  }
  return isLineInManagedSection(lineIndex, managedRange) ? "managed" : "daily-note";
}
function isSourceTask(task) {
  return task.sourceSection === "daily-note" || task.sourceSection === "vault";
}
function getManagedLineRange(content) {
  const lines = content.split("\n");
  let start = lines.findIndex((line) => line.trim() === MANAGED_START2);
  let end = lines.findIndex((line) => line.trim() === MANAGED_END2);
  if (start === -1 || end === -1 || end <= start) {
    start = lines.findIndex((line) => line.trim() === LEGACY_MANAGED_START2);
    end = lines.findIndex((line) => line.trim() === LEGACY_MANAGED_END2);
  }
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return { start, end };
}
function isLineInManagedSection(lineIndex, range) {
  return range !== null && lineIndex > range.start && lineIndex < range.end;
}
function renderTaskLine(task, blockId, tag) {
  const checkbox = task.completed ? "x" : " ";
  const tagPart = tag && !task.text.toLowerCase().includes(tag.toLowerCase()) ? ` ${tag}` : "";
  return `- [${checkbox}] ${task.text}${tagPart} ${blockId}`;
}
function blockIdFromTaskId(id) {
  const suffix = id.toLowerCase().replace(/[^a-f0-9]/g, "").slice(0, 12);
  return `^pt-task-${suffix || Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`;
}
function createEmptyStats(date) {
  return {
    date,
    totalFocusSessions: 0,
    totalFocusMinutes: 0,
    totalShortBreaks: 0,
    totalLongBreaks: 0,
    sessions: []
  };
}
function formatDateKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// src/obsidian/daily-note-writer.ts
async function recordTimerCompletionToDailyNote(plugin, event) {
  var _a;
  if (event.mode !== "pomodoro" || event.focusMinutes <= 0) {
    return;
  }
  try {
    const completedAt = parseEventDate(event.completedAt);
    const date = formatDateKey2(completedAt);
    const stats = (_a = plugin.data.syncDailyStats[date]) != null ? _a : createEmptyStats2(date);
    const tasks = normalizeFocusTasks(readStoredFocusTasks(plugin));
    const activeTask = tasks.find((task) => task.id === event.activeTaskId);
    const session = createSession(event, completedAt, activeTask == null ? void 0 : activeTask.blockId);
    const nextStats = {
      ...stats,
      totalFocusSessions: stats.totalFocusSessions + 1,
      totalFocusMinutes: stats.totalFocusMinutes + event.focusMinutes,
      sessions: [...stats.sessions, session]
    };
    plugin.data.syncDailyStats[date] = nextStats;
    plugin.data.appState[TASKS_KEY] = tasks;
    await plugin.savePluginData();
    const { file, content } = await readConfiguredDailyNote(plugin, completedAt);
    const prepared = await prepareTasksForDailyNote(plugin, file, content, tasks);
    await writeManagedSection(
      plugin.app.vault,
      file,
      prepared.content,
      nextStats,
      focusTasksToSyncedTasks(prepared.managedTasks, plugin.settings.taskSyncTag)
    );
  } catch (error) {
    console.error("Failed to write Pomodoro Timer session to Daily Note", error);
  }
}
function createEmptyStats2(date) {
  return {
    date,
    totalFocusSessions: 0,
    totalFocusMinutes: 0,
    totalShortBreaks: 0,
    totalLongBreaks: 0,
    sessions: []
  };
}
function createSession(event, completedAt, taskBlockId) {
  return {
    id: createSessionId(),
    mode: "focus",
    startTime: completedAt.toISOString(),
    durationMinutes: event.focusMinutes,
    completedMinutes: event.focusMinutes,
    status: "completed",
    taskBlockId
  };
}
function createSessionId() {
  var _a, _b, _c;
  return (_c = (_b = (_a = globalThis.crypto) == null ? void 0 : _a.randomUUID) == null ? void 0 : _b.call(_a)) != null ? _c : `pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function parseEventDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? /* @__PURE__ */ new Date() : date;
}
function formatDateKey2(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// src/utils.ts
function todayDate() {
  const d = /* @__PURE__ */ new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function generateId() {
  var _a, _b;
  return (_b = (_a = crypto.randomUUID) == null ? void 0 : _a.call(crypto)) != null ? _b : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function playAlert() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
  }
}

// src/obsidian/view.ts
var VIEW_TYPE_POMODORO_TIMER = "pomodoro-timer-view";
var ACTIVE_TASK_KEY = "pomodoro-timer-active-task";
var TIMER_CONFIG_KEY = "pomodoro-timer-config";
var STATS_KEY = "pomodoro-timer-stats";
var SOUND_KEY = "pomodoro-timer-sound";
var LEGACY_ACTIVE_TASK_KEY = "tomato-active-task";
var LEGACY_TIMER_CONFIG_KEY = "tomato-timer-config";
var LEGACY_STATS_KEY = "tomato-stats";
var LEGACY_SOUND_KEY = "tomato-sound";
var POMODOROS_BEFORE_LONG_BREAK = 4;
var DEFAULT_DURATIONS = {
  pomodoro: 25 * 60,
  "short-break": 5 * 60,
  "long-break": 15 * 60
};
var MODE_LABELS = {
  pomodoro: "Focus",
  "short-break": "Short Break",
  "long-break": "Long Break"
};
var MODE_ORDER = ["pomodoro", "short-break", "long-break"];
var FILTERS = ["all", "active", "completed"];
var PomodoroTimerView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    __publicField(this, "timer", null);
    __publicField(this, "mode", "pomodoro");
    __publicField(this, "status", "idle");
    __publicField(this, "remaining", DEFAULT_DURATIONS.pomodoro);
    __publicField(this, "total", DEFAULT_DURATIONS.pomodoro);
    __publicField(this, "completedPomodoros", 0);
    __publicField(this, "taskFilter", "all");
    __publicField(this, "editingTaskId", null);
    __publicField(this, "timerValueEl", null);
    __publicField(this, "modeLabelEl", null);
    __publicField(this, "statusEl", null);
    __publicField(this, "ringEl", null);
    __publicField(this, "controlsEl", null);
    __publicField(this, "statsEl", null);
    __publicField(this, "tasksEl", null);
    __publicField(this, "settingsEl", null);
  }
  getViewType() {
    return VIEW_TYPE_POMODORO_TIMER;
  }
  getDisplayText() {
    return "Pomodoro Timer";
  }
  getIcon() {
    return "clock";
  }
  async onOpen() {
    await hydrateTasksFromDailyNote(this.plugin);
    this.loadTimerState();
    this.render();
  }
  async onClose() {
    this.clearTimer();
    this.contentEl.empty();
  }
  render() {
    this.contentEl.empty();
    this.contentEl.addClass("pomodoro-timer-native");
    const shell = this.contentEl.createDiv({ cls: "pt-native-shell" });
    const timerPanel = shell.createDiv({ cls: "pt-timer-panel" });
    const sidePanel = shell.createDiv({ cls: "pt-side-panel" });
    this.renderTimerPanel(timerPanel);
    this.statsEl = sidePanel.createDiv();
    this.renderStats();
    this.settingsEl = sidePanel.createDiv();
    this.renderSettings();
    this.tasksEl = shell.createDiv({ cls: "pt-tasks-panel" });
    this.renderTasks();
  }
  renderTimerPanel(container) {
    const modeBar = container.createDiv({ cls: "pt-mode-bar" });
    for (const mode of MODE_ORDER) {
      const button = modeBar.createEl("button", {
        cls: `pt-mode-button ${this.mode === mode ? "is-active" : ""}`,
        text: MODE_LABELS[mode]
      });
      button.addEventListener("click", () => this.setMode(mode));
    }
    const ringWrap = container.createDiv({ cls: "pt-ring-wrap" });
    const svg = ringWrap.createSvg("svg", {
      cls: "pt-ring",
      attr: { viewBox: "0 0 180 180", role: "img" }
    });
    svg.createSvg("circle", {
      cls: "pt-ring-track",
      attr: { cx: "90", cy: "90", r: "76" }
    });
    this.ringEl = svg.createSvg("circle", {
      cls: "pt-ring-progress",
      attr: { cx: "90", cy: "90", r: "76" }
    });
    const readout = ringWrap.createDiv({ cls: "pt-readout" });
    this.modeLabelEl = readout.createDiv({ cls: "pt-readout-mode" });
    this.timerValueEl = readout.createDiv({ cls: "pt-readout-time" });
    this.statusEl = readout.createDiv({ cls: "pt-readout-status" });
    this.controlsEl = container.createDiv({ cls: "pt-controls" });
    this.updateTimerReadout();
    this.renderControls();
  }
  renderControls() {
    if (!this.controlsEl) return;
    this.controlsEl.empty();
    const primary = this.controlsEl.createEl("button", { cls: "mod-cta pt-control-button" });
    (0, import_obsidian.setIcon)(primary, this.status === "running" ? "pause" : "play");
    primary.createSpan({ text: this.primaryActionLabel() });
    primary.addEventListener("click", () => this.toggleTimer());
    const reset = this.controlsEl.createEl("button", { cls: "pt-control-button" });
    (0, import_obsidian.setIcon)(reset, "rotate-ccw");
    reset.createSpan({ text: "Reset" });
    reset.addEventListener("click", () => this.resetTimer());
  }
  renderStats() {
    if (!this.statsEl) return;
    const stats = this.getStats();
    this.statsEl.empty();
    this.statsEl.addClass("pt-card");
    this.statsEl.createEl("h3", { text: "Today" });
    const grid = this.statsEl.createDiv({ cls: "pt-stat-grid" });
    this.renderStat(grid, String(stats.pomodorosCompleted), "Sessions");
    this.renderStat(grid, String(stats.focusMinutes), "Minutes");
  }
  renderStat(container, value, label) {
    const item = container.createDiv({ cls: "pt-stat" });
    item.createDiv({ cls: "pt-stat-value", text: value });
    item.createDiv({ cls: "pt-stat-label", text: label });
  }
  renderSettings() {
    if (!this.settingsEl) return;
    this.settingsEl.empty();
    this.settingsEl.addClass("pt-card");
    this.settingsEl.createEl("h3", { text: "Timer" });
    const config = this.getTimerConfig();
    for (const mode of MODE_ORDER) {
      const row = this.settingsEl.createDiv({ cls: "pt-setting-row" });
      row.createEl("label", { text: MODE_LABELS[mode] });
      const input = row.createEl("input", {
        type: "number",
        value: String(Math.round(config[mode] / 60)),
        attr: { min: "1", max: "180" }
      });
      input.addEventListener("change", () => {
        const next = this.getTimerConfig();
        next[mode] = this.clampMinutes(Number(input.value)) * 60;
        this.saveAppState(TIMER_CONFIG_KEY, next);
        if (this.status === "idle" && this.mode === mode) {
          this.remaining = next[mode];
          this.total = next[mode];
          this.updateTimerReadout();
        }
      });
    }
    const soundRow = this.settingsEl.createDiv({ cls: "pt-setting-row" });
    soundRow.createEl("label", { text: "Sound" });
    const sound = soundRow.createEl("input", { type: "checkbox" });
    sound.checked = this.isSoundEnabled();
    sound.addEventListener("change", () => {
      this.saveAppState(SOUND_KEY, { enabled: sound.checked });
    });
  }
  renderTasks() {
    if (!this.tasksEl) return;
    const tasks = this.getVisibleTasks();
    const filtered = this.getFilteredTasks(tasks);
    const activeTaskId = this.getActiveTaskId();
    this.tasksEl.empty();
    this.tasksEl.addClass("pt-card");
    const header = this.tasksEl.createDiv({ cls: "pt-task-header" });
    header.createEl("h3", { text: "Focus Tasks" });
    const filters = header.createDiv({ cls: "pt-task-filters" });
    for (const filter of FILTERS) {
      const button = filters.createEl("button", {
        cls: `pt-chip ${this.taskFilter === filter ? "is-active" : ""}`,
        text: this.titleCase(filter)
      });
      button.addEventListener("click", () => {
        this.taskFilter = filter;
        this.renderTasks();
      });
    }
    const form = this.tasksEl.createEl("form", { cls: "pt-task-form" });
    const input = form.createEl("input", {
      type: "text",
      placeholder: "Add a focus task"
    });
    const add = form.createEl("button", { type: "submit", cls: "mod-cta" });
    (0, import_obsidian.setIcon)(add, "plus");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.addTask(input.value);
      input.value = "";
    });
    const list = this.tasksEl.createDiv({ cls: "pt-task-list" });
    if (filtered.length === 0) {
      list.createDiv({ cls: "pt-empty", text: tasks.length === 0 ? "No tasks yet." : "No matching tasks." });
      return;
    }
    for (const task of filtered) {
      const item = list.createDiv({
        cls: `pt-task-item ${task.id === activeTaskId ? "is-active" : ""} ${task.completed ? "is-complete" : ""}`
      });
      const check = item.createEl("button", { cls: "clickable-icon pt-task-check" });
      (0, import_obsidian.setIcon)(check, task.completed ? "check-square" : "square");
      check.addEventListener("click", () => this.toggleTask(task.id));
      if (this.editingTaskId === task.id) {
        const editInput = item.createEl("input", {
          type: "text",
          value: task.text,
          cls: "pt-task-edit"
        });
        editInput.focus();
        const save = () => {
          this.editingTaskId = null;
          this.editTask(task.id, editInput.value);
        };
        editInput.addEventListener("blur", save);
        editInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") {
            this.editingTaskId = null;
            this.renderTasks();
          }
        });
      } else {
        const text = item.createEl("button", { cls: "pt-task-text" });
        text.createSpan({ text: task.text });
        if (task.sourcePath) {
          text.createSpan({ cls: "pt-task-source", text: task.sourcePath });
        }
        text.addEventListener("click", () => {
          this.saveActiveTask(task.id === activeTaskId ? null : task.id);
          this.renderTasks();
        });
      }
      const open = item.createEl("button", { cls: "clickable-icon" });
      (0, import_obsidian.setIcon)(open, "file-text");
      open.addEventListener("click", () => this.openTaskSource(task));
      const edit = item.createEl("button", { cls: "clickable-icon" });
      (0, import_obsidian.setIcon)(edit, "pencil");
      edit.addEventListener("click", () => {
        this.editingTaskId = task.id;
        this.renderTasks();
      });
      const remove = item.createEl("button", { cls: "clickable-icon" });
      (0, import_obsidian.setIcon)(remove, "trash-2");
      remove.addEventListener("click", () => this.deleteTask(task.id));
    }
  }
  toggleTimer() {
    if (this.status === "running") {
      this.pauseTimer();
      return;
    }
    this.startTimer();
  }
  startTimer() {
    this.clearTimer();
    this.status = "running";
    this.timer = window.setInterval(() => this.tick(), 1e3);
    this.updateTimerReadout();
    this.renderControls();
  }
  pauseTimer() {
    this.clearTimer();
    this.status = "paused";
    this.updateTimerReadout();
    this.renderControls();
  }
  resetTimer() {
    this.clearTimer();
    this.status = "idle";
    this.remaining = this.getTimerConfig()[this.mode];
    this.total = this.remaining;
    this.updateTimerReadout();
    this.renderControls();
  }
  tick() {
    if (this.remaining > 1) {
      this.remaining -= 1;
      this.updateTimerReadout();
      return;
    }
    this.completeCurrentTimer();
  }
  completeCurrentTimer() {
    this.clearTimer();
    const completedMode = this.mode;
    const completedTotal = this.total;
    this.status = "idle";
    if (completedMode === "pomodoro") {
      this.completedPomodoros += 1;
      this.recordStats(Math.round(completedTotal / 60));
      void recordTimerCompletionToDailyNote(this.plugin, {
        mode: completedMode,
        focusMinutes: Math.round(completedTotal / 60),
        completedAt: (/* @__PURE__ */ new Date()).toISOString(),
        activeTaskId: this.getActiveTaskId()
      });
    }
    if (this.isSoundEnabled()) {
      playAlert();
    }
    const nextMode = this.nextMode(completedMode);
    this.mode = nextMode;
    this.remaining = this.getTimerConfig()[nextMode];
    this.total = this.remaining;
    this.updateTimerReadout();
    this.renderControls();
    this.renderStats();
    new import_obsidian.Notice(`${MODE_LABELS[completedMode]} complete`);
  }
  setMode(mode) {
    this.clearTimer();
    this.mode = mode;
    this.status = "idle";
    this.remaining = this.getTimerConfig()[mode];
    this.total = this.remaining;
    this.render();
  }
  nextMode(mode) {
    if (mode !== "pomodoro") return "pomodoro";
    return this.completedPomodoros % POMODOROS_BEFORE_LONG_BREAK === 0 ? "long-break" : "short-break";
  }
  updateTimerReadout() {
    if (this.timerValueEl) this.timerValueEl.setText(formatTime(this.remaining));
    if (this.modeLabelEl) this.modeLabelEl.setText(MODE_LABELS[this.mode]);
    if (this.statusEl) this.statusEl.setText(this.status === "paused" ? "Paused" : "");
    if (this.ringEl) {
      const radius = 76;
      const circumference = 2 * Math.PI * radius;
      const progress = this.total > 0 ? this.remaining / this.total : 1;
      this.ringEl.style.strokeDasharray = `${circumference}`;
      this.ringEl.style.strokeDashoffset = `${circumference * (1 - progress)}`;
    }
  }
  clearTimer() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }
  primaryActionLabel() {
    if (this.status === "running") return "Pause";
    if (this.status === "paused") return "Resume";
    return "Start";
  }
  loadTimerState() {
    const config = this.getTimerConfig();
    this.mode = "pomodoro";
    this.status = "idle";
    this.remaining = config.pomodoro;
    this.total = config.pomodoro;
  }
  addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const tasks = this.getAllTasks();
    tasks.push({
      id: generateId(),
      blockId: void 0,
      text: trimmed,
      completed: false,
      createdAt: Date.now()
    });
    this.saveTasks(tasks);
  }
  toggleTask(id) {
    const tasks = this.getAllTasks().map(
      (task) => task.id === id ? { ...task, completed: !task.completed } : task
    );
    const updated = tasks.find((task) => task.id === id);
    if ((updated == null ? void 0 : updated.completed) && this.getActiveTaskId() === id) {
      this.saveActiveTask(null);
    }
    this.saveTasks(tasks);
  }
  editTask(id, text) {
    const trimmed = text.trim();
    if (!trimmed) {
      this.renderTasks();
      return;
    }
    const tasks = this.getAllTasks().map(
      (task) => task.id === id ? { ...task, text: trimmed } : task
    );
    this.saveTasks(tasks);
  }
  deleteTask(id) {
    const tasks = this.getAllTasks().flatMap((task) => {
      if (task.id !== id) return [task];
      if (task.sourcePath) return [{ ...task, removedAt: Date.now() }];
      return [];
    });
    if (this.getActiveTaskId() === id) {
      this.saveActiveTask(null);
    }
    this.saveTasks(tasks);
  }
  saveTasks(tasks) {
    this.saveAppState(TASKS_KEY, tasks);
    this.plugin.onAppStateSaved(TASKS_KEY);
    this.renderTasks();
  }
  getAllTasks() {
    const value = this.plugin.data.appState[TASKS_KEY];
    return Array.isArray(value) ? [...value] : [];
  }
  getVisibleTasks() {
    return this.getAllTasks().filter((task) => !task.removedAt);
  }
  getFilteredTasks(tasks) {
    if (this.taskFilter === "active") return tasks.filter((task) => !task.completed);
    if (this.taskFilter === "completed") return tasks.filter((task) => task.completed);
    return tasks;
  }
  getActiveTaskId() {
    var _a;
    const value = (_a = this.plugin.data.appState[ACTIVE_TASK_KEY]) != null ? _a : this.plugin.data.appState[LEGACY_ACTIVE_TASK_KEY];
    return typeof value === "string" ? value : null;
  }
  saveActiveTask(id) {
    this.saveAppState(ACTIVE_TASK_KEY, id);
  }
  getTimerConfig() {
    var _a;
    const value = (_a = this.plugin.data.appState[TIMER_CONFIG_KEY]) != null ? _a : this.plugin.data.appState[LEGACY_TIMER_CONFIG_KEY];
    if (!this.isTimerConfig(value)) return { ...DEFAULT_DURATIONS };
    return {
      pomodoro: value.pomodoro,
      "short-break": value["short-break"],
      "long-break": value["long-break"]
    };
  }
  isTimerConfig(value) {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value;
    return Number.isFinite(candidate.pomodoro) && Number.isFinite(candidate["short-break"]) && Number.isFinite(candidate["long-break"]);
  }
  getStats() {
    var _a;
    const stored = (_a = this.plugin.data.appState[STATS_KEY]) != null ? _a : this.plugin.data.appState[LEGACY_STATS_KEY];
    if ((stored == null ? void 0 : stored.date) === todayDate()) return stored;
    return {
      date: todayDate(),
      pomodorosCompleted: 0,
      focusMinutes: 0
    };
  }
  recordStats(focusMinutes) {
    const current = this.getStats();
    this.saveAppState(STATS_KEY, {
      ...current,
      pomodorosCompleted: current.pomodorosCompleted + 1,
      focusMinutes: current.focusMinutes + focusMinutes
    });
  }
  isSoundEnabled() {
    var _a, _b;
    const sound = (_a = this.plugin.data.appState[SOUND_KEY]) != null ? _a : this.plugin.data.appState[LEGACY_SOUND_KEY];
    return (_b = sound == null ? void 0 : sound.enabled) != null ? _b : true;
  }
  saveAppState(key, value) {
    this.plugin.data.appState[key] = value;
    void this.plugin.savePluginData();
  }
  async openTaskSource(task) {
    if (!task.sourcePath) return;
    const file = this.plugin.app.vault.getAbstractFileByPath(task.sourcePath);
    if (!file) return;
    await this.plugin.app.workspace.getLeaf(false).openFile(file, {
      eState: task.sourceLine === void 0 ? void 0 : { line: task.sourceLine }
    });
  }
  clampMinutes(value) {
    if (!Number.isFinite(value)) return 1;
    return Math.min(180, Math.max(1, Math.round(value)));
  }
  titleCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
};

// src/obsidian/settings.ts
var import_obsidian2 = require("obsidian");
var DEFAULT_SETTINGS = {
  dailyNoteFolder: "",
  dateFormat: "YYYY-MM-DD",
  managedSectionHeading: "Pomodoro Timer",
  taskSyncTag: "#pomodoro"
};
var PomodoroTimerSettingsTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    new import_obsidian2.Setting(containerEl).setName("Daily note folder").setDesc("Folder path for daily notes").addText(
      (text) => text.setPlaceholder("Daily").setValue(this.plugin.settings.dailyNoteFolder).onChange(async (value) => {
        this.plugin.settings.dailyNoteFolder = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Date format").setDesc("Date format string for daily note filenames").addText(
      (text) => text.setPlaceholder("YYYY-MM-DD").setValue(this.plugin.settings.dateFormat).onChange(async (value) => {
        this.plugin.settings.dateFormat = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h2", { text: "Managed section" });
    new import_obsidian2.Setting(containerEl).setName("Section heading").setDesc("Heading that identifies the managed task section in daily notes").addText(
      (text) => text.setPlaceholder("## Tasks").setValue(this.plugin.settings.managedSectionHeading).onChange(async (value) => {
        this.plugin.settings.managedSectionHeading = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Task sync tag").setDesc("Tag used to identify tasks synced by the timer").addText(
      (text) => text.setPlaceholder("#pomodoro").setValue(this.plugin.settings.taskSyncTag).onChange(async (value) => {
        this.plugin.settings.taskSyncTag = value;
        await this.plugin.saveSettings();
      })
    );
  }
};

// src/obsidian/storage.ts
function createDefaultPluginData(settings) {
  return {
    settings: { ...settings },
    appState: {},
    syncDailyStats: {}
  };
}
function mergePluginData(raw, defaultSettings) {
  var _a;
  const rawSettings = (_a = raw == null ? void 0 : raw.settings) != null ? _a : raw;
  const settings = {
    ...defaultSettings,
    ...isObject(rawSettings) ? rawSettings : {}
  };
  return {
    settings,
    appState: isObject(raw == null ? void 0 : raw.appState) ? { ...raw.appState } : {},
    syncDailyStats: isObject(raw == null ? void 0 : raw.syncDailyStats) ? { ...raw.syncDailyStats } : {}
  };
}
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/obsidian/main.ts
var PomodoroTimerPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "settings", DEFAULT_SETTINGS);
    __publicField(this, "data", createDefaultPluginData(DEFAULT_SETTINGS));
  }
  async onload() {
    await this.loadPluginData();
    this.registerView(VIEW_TYPE_POMODORO_TIMER, (leaf) => new PomodoroTimerView(leaf, this));
    this.addRibbonIcon("clock", "Pomodoro Timer", () => {
      this.activateView();
    });
    this.addCommand({
      id: "open-pomodoro-timer",
      name: "Open Pomodoro Timer",
      callback: () => {
        this.activateView();
      }
    });
    this.addSettingTab(new PomodoroTimerSettingsTab(this.app, this));
  }
  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_POMODORO_TIMER);
  }
  async loadPluginData() {
    this.data = mergePluginData(await this.loadData(), DEFAULT_SETTINGS);
    this.settings = this.data.settings;
  }
  async savePluginData() {
    this.data.settings = this.settings;
    await this.saveData(this.data);
  }
  async saveSettings() {
    await this.savePluginData();
  }
  onAppStateSaved(key) {
    if (key === TASKS_KEY) {
      void syncFocusTasksToDailyNote(this);
    }
  }
  async activateView() {
    var _a;
    const { workspace } = this.app;
    let leaf = (_a = workspace.getLeavesOfType(VIEW_TYPE_POMODORO_TIMER)[0]) != null ? _a : null;
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      if (!leaf) return;
      await leaf.setViewState({ type: VIEW_TYPE_POMODORO_TIMER, active: true });
    }
    workspace.revealLeaf(leaf);
  }
};
