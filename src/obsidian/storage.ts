import type { JsonStorageAdapter } from '../types';
import type { DailyStats as SyncDailyStats } from './sync';
import type { TomatoClockSettings } from './settings';

export interface TomatoClockPluginData {
	settings: TomatoClockSettings;
	appState: Record<string, unknown>;
	syncDailyStats: Record<string, SyncDailyStats>;
}

export interface TomatoClockDataHost {
	data: TomatoClockPluginData;
	savePluginData(): Promise<void>;
	onAppStateSaved?(key: string): void;
}

type RawPluginData = Partial<TomatoClockPluginData & TomatoClockSettings> | null | undefined;

export function createDefaultPluginData(settings: TomatoClockSettings): TomatoClockPluginData {
	return {
		settings: { ...settings },
		appState: {},
		syncDailyStats: {},
	};
}

export function mergePluginData(
	raw: RawPluginData,
	defaultSettings: TomatoClockSettings,
): TomatoClockPluginData {
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

export function createObsidianStorageAdapter(plugin: TomatoClockDataHost): JsonStorageAdapter {
	return {
		load<T>(key: string, fallback: T): T {
			return (plugin.data.appState[key] as T | undefined) ?? fallback;
		},
		save<T>(key: string, value: T): void {
			plugin.data.appState[key] = value;
			void plugin.savePluginData().catch((error) => {
				console.error('Failed to save Tomato Clock plugin data', error);
			});
			plugin.onAppStateSaved?.(key);
		},
	};
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
