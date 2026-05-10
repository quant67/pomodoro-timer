import type { TimerCompletionEvent } from '../types';
import type { TomatoClockSettings } from './settings';
import {
	writeManagedSection,
	type ObsidianVault,
} from './sync';
import type { DailyStats as SyncDailyStats, PomodoroSession } from './sync';
import type { TomatoClockPluginData } from './storage';
import { readConfiguredDailyNote } from './daily-note-config';
import {
	focusTasksToSyncedTasks,
	normalizeFocusTasks,
	prepareTasksForDailyNote,
	readStoredFocusTasks,
} from './task-sync';

interface DailyNoteWriterPlugin {
	app: {
		vault: ObsidianVault;
	};
	settings: TomatoClockSettings;
	data: TomatoClockPluginData;
	savePluginData(): Promise<void>;
}

export async function recordTimerCompletionToDailyNote(
	plugin: DailyNoteWriterPlugin,
	event: TimerCompletionEvent,
): Promise<void> {
	if (event.mode !== 'pomodoro' || event.focusMinutes <= 0) {
		return;
	}

	try {
		const completedAt = parseEventDate(event.completedAt);
		const date = formatDateKey(completedAt);
		const stats = plugin.data.syncDailyStats[date] ?? createEmptyStats(date);
		const tasks = normalizeFocusTasks(readStoredFocusTasks(plugin));
		const activeTask = tasks.find((task) => task.id === event.activeTaskId);
		const session = createSession(event, completedAt, activeTask?.blockId);
		const nextStats = {
			...stats,
			totalFocusSessions: stats.totalFocusSessions + 1,
			totalFocusMinutes: stats.totalFocusMinutes + event.focusMinutes,
			sessions: [...stats.sessions, session],
		};

		plugin.data.syncDailyStats[date] = nextStats;
		plugin.data.appState['tomato-tasks'] = tasks;
		await plugin.savePluginData();

		const { file, content } = await readConfiguredDailyNote(plugin, completedAt);
		const prepared = await prepareTasksForDailyNote(plugin, file, content, tasks);
		await writeManagedSection(
			plugin.app.vault,
			file,
			prepared.content,
			nextStats,
			focusTasksToSyncedTasks(prepared.managedTasks, plugin.settings.taskSyncTag),
		);
	} catch (error) {
		console.error('Failed to write Tomato Clock session to Daily Note', error);
	}
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

function createSession(
	event: TimerCompletionEvent,
	completedAt: Date,
	taskBlockId: string | undefined,
): PomodoroSession {
	return {
		id: createSessionId(),
		mode: 'focus',
		startTime: completedAt.toISOString(),
		durationMinutes: event.focusMinutes,
		completedMinutes: event.focusMinutes,
		status: 'completed',
		taskBlockId,
	};
}

function createSessionId(): string {
	return globalThis.crypto?.randomUUID?.() ?? `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseEventDate(value: string): Date {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDateKey(date: Date): string {
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd}`;
}
