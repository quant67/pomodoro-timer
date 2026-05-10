import { App, PluginSettingTab, Setting } from "obsidian";
import type TomatoClockPlugin from "./main";

export interface TomatoClockSettings {
	dailyNoteFolder: string;
	dateFormat: string;
	managedSectionHeading: string;
	taskSyncTag: string;
}

export const DEFAULT_SETTINGS: TomatoClockSettings = {
	dailyNoteFolder: "",
	dateFormat: "YYYY-MM-DD",
	managedSectionHeading: "Pomodoro Timer",
	taskSyncTag: "#pomodoro",
};

export class TomatoClockSettingsTab extends PluginSettingTab {
	plugin: TomatoClockPlugin;

	constructor(app: App, plugin: TomatoClockPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Daily note folder")
			.setDesc("Folder path for daily notes")
			.addText((text) =>
				text
					.setPlaceholder("Daily")
					.setValue(this.plugin.settings.dailyNoteFolder)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteFolder = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Date format")
			.setDesc("Date format string for daily note filenames")
			.addText((text) =>
				text
					.setPlaceholder("YYYY-MM-DD")
					.setValue(this.plugin.settings.dateFormat)
					.onChange(async (value) => {
						this.plugin.settings.dateFormat = value;
						await this.plugin.saveSettings();
					}),
			);

		containerEl.createEl("h2", { text: "Managed section" });

		new Setting(containerEl)
			.setName("Section heading")
			.setDesc("Heading that identifies the managed task section in daily notes")
			.addText((text) =>
				text
					.setPlaceholder("## Tasks")
					.setValue(this.plugin.settings.managedSectionHeading)
					.onChange(async (value) => {
						this.plugin.settings.managedSectionHeading = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Task sync tag")
			.setDesc("Tag used to identify tasks synced by the timer")
			.addText((text) =>
				text
					.setPlaceholder("#pomodoro")
					.setValue(this.plugin.settings.taskSyncTag)
					.onChange(async (value) => {
						this.plugin.settings.taskSyncTag = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
