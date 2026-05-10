import { Plugin, type WorkspaceLeaf } from "obsidian";
import { TomatoClockView, VIEW_TYPE_TOMATO_CLOCK } from "./view";
import { TomatoClockSettingsTab } from "./settings";
import type { TomatoClockSettings } from "./settings";
import { DEFAULT_SETTINGS } from "./settings";
import {
	createDefaultPluginData,
	mergePluginData,
	type TomatoClockPluginData,
} from "./storage";
import { syncFocusTasksToDailyNote, TASKS_KEY } from "./task-sync";

export default class TomatoClockPlugin extends Plugin {
	settings: TomatoClockSettings = DEFAULT_SETTINGS;
	data: TomatoClockPluginData = createDefaultPluginData(DEFAULT_SETTINGS);

	async onload() {
		await this.loadPluginData();

		this.registerView(VIEW_TYPE_TOMATO_CLOCK, (leaf) => new TomatoClockView(leaf, this));

		this.addRibbonIcon("clock", "Pomodoro Timer", () => {
			this.activateView();
		});

		this.addCommand({
			id: "open-tomato-clock",
			name: "Open Pomodoro Timer",
			callback: () => {
				this.activateView();
			},
		});

		this.addSettingTab(new TomatoClockSettingsTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_TOMATO_CLOCK);
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

		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_TOMATO_CLOCK)[0] ?? null;

		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({ type: VIEW_TYPE_TOMATO_CLOCK, active: true });
		}

		workspace.revealLeaf(leaf);
	}
}
