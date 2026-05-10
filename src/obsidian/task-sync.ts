import type { FocusTask } from '../types';
import type { TomatoClockSettings } from './settings';
import {
	ensureFilteredTaskBlockIds,
	filterTasksByTag,
	parseTasksFromContent,
	removeTaskSyncToken,
	setTaskLineCompletion,
	updateTaskLineText,
	writeManagedSection,
	type DailyStats as SyncDailyStats,
	type ObsidianFile,
	type SyncedTask,
	type ObsidianVault,
} from './sync';
import { readConfiguredDailyNote } from './daily-note-config';
import type { TomatoClockPluginData } from './storage';

export const TASKS_KEY = 'tomato-tasks';
const MANAGED_START = '<!-- tomato-clock:start -->';
const MANAGED_END = '<!-- tomato-clock:end -->';

interface TaskSyncPlugin {
	app: {
		vault: ObsidianVault;
	};
	settings: TomatoClockSettings;
	data: TomatoClockPluginData;
	savePluginData(): Promise<void>;
}

export async function hydrateTasksFromDailyNote(plugin: TaskSyncPlugin): Promise<void> {
	try {
		const { file, content } = await readConfiguredDailyNote(plugin, new Date());
		const parsedFocusTasks = await readTaggedTasksFromVault(plugin, file, content);

		plugin.data.appState[TASKS_KEY] = mergeHydratedTasks(
			parsedFocusTasks,
			normalizeFocusTasks(readStoredFocusTasks(plugin)),
		);
		await plugin.savePluginData();
	} catch (error) {
		console.error('Failed to hydrate Tomato Clock tasks from Daily Note', error);
	}
}

export async function syncFocusTasksToDailyNote(plugin: TaskSyncPlugin): Promise<void> {
	try {
		const date = new Date();
		const dateKey = formatDateKey(date);
		const tasks = normalizeFocusTasks(readStoredFocusTasks(plugin));
		const stats = plugin.data.syncDailyStats[dateKey] ?? createEmptyStats(dateKey);
		const { file, content } = await readConfiguredDailyNote(plugin, date);
		const prepared = await prepareTasksForDailyNote(plugin, file, content, tasks);

		plugin.data.appState[TASKS_KEY] = prepared.tasks;
		await plugin.savePluginData();
		await writeManagedSection(
			plugin.app.vault,
			file,
			prepared.content,
			stats,
			focusTasksToSyncedTasks(prepared.managedTasks, plugin.settings.taskSyncTag),
		);
	} catch (error) {
		console.error('Failed to sync Tomato Clock tasks to Daily Note', error);
	}
}

export async function prepareTasksForDailyNote(
	plugin: TaskSyncPlugin,
	file: ObsidianFile,
	content: string,
	tasks = normalizeFocusTasks(readStoredFocusTasks(plugin)),
): Promise<{ content: string; tasks: FocusTask[]; managedTasks: FocusTask[] }> {
	let nextContent = ensureFilteredTaskBlockIds(content, plugin.settings.taskSyncTag);
	const synced = await syncSourceTasksToVault(plugin, file, nextContent, tasks);
	nextContent = synced.currentDailyNoteContent;

	if (nextContent !== content) {
		await plugin.app.vault.modify(file, nextContent);
	}

	return {
		content: nextContent,
		tasks: synced.remainingTasks,
		managedTasks: getManagedFocusTasks(synced.remainingTasks),
	};
}

export function readStoredFocusTasks(plugin: TaskSyncPlugin): FocusTask[] {
	const value = plugin.data.appState[TASKS_KEY];
	return Array.isArray(value) ? (value as FocusTask[]) : [];
}

export function normalizeFocusTasks(tasks: FocusTask[]): FocusTask[] {
	return tasks.map((task) => ({
		...task,
		blockId: task.blockId ?? blockIdFromTaskId(task.id),
	}));
}

export function getManagedFocusTasks(tasks: FocusTask[]): FocusTask[] {
	return tasks.filter((task) => task.sourceSection === 'managed' || !task.sourcePath);
}

export function focusTasksToSyncedTasks(
	tasks: FocusTask[],
	taskSyncTag: string,
): SyncedTask[] {
	const tag = taskSyncTag.trim();

	return normalizeFocusTasks(tasks).map((task, index) => {
		const blockId = task.blockId ?? blockIdFromTaskId(task.id);
		const raw = renderTaskLine(task, blockId, tag);

		return {
			blockId,
			text: task.text,
			completed: task.completed,
			tags: tag ? [tag.toLowerCase()] : [],
			raw,
			lineIndex: index,
		};
	});
}

function syncedTaskToFocusTask(
	task: SyncedTask,
	sourcePath: string,
	sourceSection: FocusTask['sourceSection'],
): FocusTask {
	return {
		id: task.blockId,
		blockId: task.blockId,
		sourcePath,
		sourceLine: task.lineIndex,
		sourceSection,
		text: task.text,
		completed: task.completed,
		createdAt: Date.now(),
	};
}

function syncExternalTaskStateToContent(
	content: string,
	tasks: FocusTask[],
	filePath: string,
	taskSyncTag: string,
): string {
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
			taskSyncTag,
		);
		if (textUpdated !== null) {
			nextContent = textUpdated;
		}
	}

	return nextContent;
}

async function readTaggedTasksFromVault(
	plugin: TaskSyncPlugin,
	dailyNoteFile: ObsidianFile,
	dailyNoteContent: string,
): Promise<FocusTask[]> {
	const files = plugin.app.vault.getMarkdownFiles?.() ?? [dailyNoteFile];
	const tasks: FocusTask[] = [];
	const seenPaths = new Set<string>();

	for (const file of files) {
		if (seenPaths.has(file.path)) {
			continue;
		}
		seenPaths.add(file.path);

		const content = file.path === dailyNoteFile.path
			? dailyNoteContent
			: await plugin.app.vault.read(file);

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
			plugin.settings.taskSyncTag,
		);

		for (const task of parsedTasks) {
			tasks.push(
				syncedTaskToFocusTask(
					task,
					file.path,
					getSourceSection(file, dailyNoteFile, task.lineIndex, managedRange),
				),
			);
		}
	}

	return tasks;
}

async function syncSourceTasksToVault(
	plugin: TaskSyncPlugin,
	dailyNoteFile: ObsidianFile,
	dailyNoteContent: string,
	tasks: FocusTask[],
): Promise<{ currentDailyNoteContent: string; remainingTasks: FocusTask[] }> {
	const currentDailyNoteContent = syncExternalTaskStateToContent(
		dailyNoteContent,
		tasks,
		dailyNoteFile.path,
		plugin.settings.taskSyncTag,
	);
	const sourcePaths = new Set(
		tasks
			.filter(isSourceTask)
			.map((task) => task.sourcePath)
			.filter((path): path is string => Boolean(path)),
	);

	for (const sourcePath of sourcePaths) {
		if (sourcePath === dailyNoteFile.path) {
			continue;
		}

		const file = plugin.app.vault.getAbstractFileByPath?.(sourcePath) as ObsidianFile | null | undefined;
		if (!file) {
			continue;
		}

		const content = await plugin.app.vault.read(file);
		const updated = syncExternalTaskStateToContent(
			content,
			tasks,
			sourcePath,
			plugin.settings.taskSyncTag,
		);
		if (updated !== content) {
			await plugin.app.vault.modify(file, updated);
		}
	}

	return {
		currentDailyNoteContent,
		remainingTasks: tasks.filter((task) => !task.removedAt),
	};
}

function mergeHydratedTasks(hydrated: FocusTask[], stored: FocusTask[]): FocusTask[] {
	const tasksByBlockId = new Map<string, FocusTask>();

	for (const task of hydrated) {
		tasksByBlockId.set(task.blockId ?? task.id, task);
	}

	for (const task of stored) {
		const key = task.blockId ?? task.id;
		if (tasksByBlockId.has(key) || isSourceTask(task) || task.removedAt) {
			continue;
		}

		tasksByBlockId.set(key, task);
	}

	return Array.from(tasksByBlockId.values());
}

function getSourceSection(
	file: ObsidianFile,
	dailyNoteFile: ObsidianFile,
	lineIndex: number,
	managedRange: { start: number; end: number } | null,
): FocusTask['sourceSection'] {
	if (file.path !== dailyNoteFile.path) {
		return 'vault';
	}

	return isLineInManagedSection(lineIndex, managedRange) ? 'managed' : 'daily-note';
}

function isSourceTask(task: FocusTask): boolean {
	return task.sourceSection === 'daily-note' || task.sourceSection === 'vault';
}


function getManagedLineRange(content: string): { start: number; end: number } | null {
	const lines = content.split('\n');
	const start = lines.findIndex((line) => line.trim() === MANAGED_START);
	const end = lines.findIndex((line) => line.trim() === MANAGED_END);

	if (start === -1 || end === -1 || end <= start) {
		return null;
	}

	return { start, end };
}

function isLineInManagedSection(
	lineIndex: number,
	range: { start: number; end: number } | null,
): boolean {
	return range !== null && lineIndex > range.start && lineIndex < range.end;
}

function renderTaskLine(task: FocusTask, blockId: string, tag: string): string {
	const checkbox = task.completed ? 'x' : ' ';
	const tagPart = tag && !task.text.toLowerCase().includes(tag.toLowerCase()) ? ` ${tag}` : '';
	return `- [${checkbox}] ${task.text}${tagPart} ${blockId}`;
}

function blockIdFromTaskId(id: string): string {
	const suffix = id.toLowerCase().replace(/[^a-f0-9]/g, '').slice(0, 12);
	return `^tc-task-${suffix || Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
}

function createEmptyStats(date: string): SyncDailyStats {
	return {
		date,
		totalFocusSessions: 0,
		totalFocusMinutes: 0,
		totalShortBreaks: 0,
		totalLongBreaks: 0,
		sessions: [],
	};
}

function formatDateKey(date: Date): string {
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}
