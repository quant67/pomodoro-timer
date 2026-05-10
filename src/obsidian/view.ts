import { ItemView, type WorkspaceLeaf } from "obsidian";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../App";
import { recordTimerCompletionToDailyNote } from "./daily-note-writer";
import type TomatoClockPlugin from "./main";
import { createObsidianStorageAdapter } from "./storage";
import { hydrateTasksFromDailyNote } from "./task-sync";

export const VIEW_TYPE_TOMATO_CLOCK = "tomato-clock-view";

export class TomatoClockView extends ItemView {
	private root: Root | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: TomatoClockPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_TOMATO_CLOCK;
	}

	getDisplayText(): string {
		return "Pomodoro Timer";
	}

	getIcon(): string {
		return "clock";
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		await hydrateTasksFromDailyNote(this.plugin);

		const host = this.contentEl.createDiv({ cls: "tomato-clock-plugin-host" });
		this.root = createRoot(host);
		this.root.render(createElement(App, {
			storage: createObsidianStorageAdapter(this.plugin),
			onTimerComplete: (event) => {
				void recordTimerCompletionToDailyNote(this.plugin, event);
			},
		}));
	}

	async onClose(): Promise<void> {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
		this.contentEl.empty();
	}
}
