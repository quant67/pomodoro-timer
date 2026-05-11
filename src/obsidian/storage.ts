import type { DailyStats as SyncDailyStats } from './sync';
import type { PomodoroTimerSettings } from './settings';

export interface PomodoroTimerPluginData {
	settings: PomodoroTimerSettings;
	appState: Record<string, unknown>;
	syncDailyStats: Record<string, SyncDailyStats>;
}

type RawPluginData = Partial<PomodoroTimerPluginData & PomodoroTimerSettings> | null | undefined;

export function createDefaultPluginData(settings: PomodoroTimerSettings): PomodoroTimerPluginData {
	return {
		settings: { ...settings },
		appState: {},
		syncDailyStats: {},
	};
}

export function mergePluginData(
	raw: RawPluginData,
	defaultSettings: PomodoroTimerSettings,
): PomodoroTimerPluginData {
	const rawSettings = raw?.settings ?? raw;
	const settings = {
		...defaultSettings,
		...(isObject(rawSettings) ? rawSettings : {}),
	};

	return {
		settings,
		appState: isObject(raw?.appState) ? { ...raw.appState } : {},
		syncDailyStats: isObject(raw?.syncDailyStats) ? { ...raw.syncDailyStats } : {},
	};
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
