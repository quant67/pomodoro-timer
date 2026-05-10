import type { TomatoClockSettings } from './settings';
import {
	dailyNotePath,
	readDailyNote,
	type ObsidianFile,
	type ObsidianVault,
} from './sync';

interface DailyNotesCoreSettings {
	folder?: string;
	format?: string;
	template?: string;
}

interface VaultWithAdapter extends ObsidianVault {
	adapter?: {
		read(path: string): Promise<string>;
		exists(path: string): Promise<boolean>;
	};
}

export interface DailyNoteHost {
	app: {
		vault: ObsidianVault;
	};
	settings: TomatoClockSettings;
}

export async function readConfiguredDailyNote(
	host: DailyNoteHost,
	date: Date,
): Promise<{ file: ObsidianFile; content: string; path: string }> {
	const dailyNotesSettings = await readDailyNotesCoreSettings(host.app.vault);
	const folder = dailyNotesSettings.folder ?? host.settings.dailyNoteFolder;
	const dateFormat = dailyNotesSettings.format ?? host.settings.dateFormat;
	const template = await readDailyNoteTemplate(host.app.vault, dailyNotesSettings.template);
	const path = dailyNotePath(folder, dateFormat, date);
	const { file, content } = await readDailyNote(host.app.vault, path, template);

	return { file, content, path };
}

async function readDailyNotesCoreSettings(vault: ObsidianVault): Promise<DailyNotesCoreSettings> {
	const adapter = (vault as VaultWithAdapter).adapter;
	if (!adapter) {
		return {};
	}

	try {
		const raw = await adapter.read('.obsidian/daily-notes.json');
		return JSON.parse(raw) as DailyNotesCoreSettings;
	} catch {
		return {};
	}
}

async function readDailyNoteTemplate(
	vault: ObsidianVault,
	templatePath: string | undefined,
): Promise<string> {
	const adapter = (vault as VaultWithAdapter).adapter;
	if (!adapter || !templatePath) {
		return '';
	}

	const candidates = templatePath.endsWith('.md')
		? [templatePath]
		: [templatePath, `${templatePath}.md`];

	for (const candidate of candidates) {
		try {
			if (await adapter.exists(candidate)) {
				return await adapter.read(candidate);
			}
		} catch {
			return '';
		}
	}

	return '';
}
