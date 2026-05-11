import { Plugin, type WorkspaceLeaf } from "obsidian";
import { PomodoroTimerView, VIEW_TYPE_POMODORO_TIMER } from "./view";
import { PomodoroTimerSettingsTab } from "./settings";
import type { PomodoroTimerSettings } from "./settings";
import { DEFAULT_SETTINGS } from "./settings";
import {
	createDefaultPluginData,
	mergePluginData,
	type PomodoroTimerPluginData,
} from "./storage";
import { syncFocusTasksToDailyNote, TASKS_KEY } from "./task-sync";

export default class PomodoroTimerPlugin extends Plugin {
	settings: PomodoroTimerSettings = DEFAULT_SETTINGS;
	data: PomodoroTimerPluginData = createDefaultPluginData(DEFAULT_SETTINGS);

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
			},
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

	onAppStateSaved(key: string) {
		if (key === TASKS_KEY) {
			void syncFocusTasksToDailyNote(this);
		}
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_POMODORO_TIMER)[0] ?? null;

		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({ type: VIEW_TYPE_POMODORO_TIMER, active: true });
		}

		workspace.revealLeaf(leaf);
	}
}
