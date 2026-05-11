import { ItemView, Notice, setIcon, type WorkspaceLeaf, type TFile } from "obsidian";
import { recordTimerCompletionToDailyNote } from "./daily-note-writer";
import type PomodoroTimerPlugin from "./main";
import { hydrateTasksFromDailyNote, TASKS_KEY } from "./task-sync";
import type { DailyStats, FocusTask, TaskFilter, TimerConfig, TimerMode, TimerStatus } from "../types";
import { formatTime, generateId, playAlert, todayDate } from "../utils";

export const VIEW_TYPE_POMODORO_TIMER = "pomodoro-timer-view";

const ACTIVE_TASK_KEY = "pomodoro-timer-active-task";
const TIMER_CONFIG_KEY = "pomodoro-timer-config";
const STATS_KEY = "pomodoro-timer-stats";
const SOUND_KEY = "pomodoro-timer-sound";
const LEGACY_ACTIVE_TASK_KEY = "tomato-active-task";
const LEGACY_TIMER_CONFIG_KEY = "tomato-timer-config";
const LEGACY_STATS_KEY = "tomato-stats";
const LEGACY_SOUND_KEY = "tomato-sound";
const POMODOROS_BEFORE_LONG_BREAK = 4;

const DEFAULT_DURATIONS: TimerConfig = {
	pomodoro: 25 * 60,
	"short-break": 5 * 60,
	"long-break": 15 * 60,
};

const MODE_LABELS: Record<TimerMode, string> = {
	pomodoro: "Focus",
	"short-break": "Short Break",
	"long-break": "Long Break",
};

const MODE_ORDER: TimerMode[] = ["pomodoro", "short-break", "long-break"];
const FILTERS: TaskFilter[] = ["all", "active", "completed"];

export class PomodoroTimerView extends ItemView {
	private timer: ReturnType<typeof window.setInterval> | null = null;
	private mode: TimerMode = "pomodoro";
	private status: TimerStatus = "idle";
	private remaining = DEFAULT_DURATIONS.pomodoro;
	private total = DEFAULT_DURATIONS.pomodoro;
	private completedPomodoros = 0;
	private taskFilter: TaskFilter = "all";
	private editingTaskId: string | null = null;

	private timerValueEl: HTMLElement | null = null;
	private modeLabelEl: HTMLElement | null = null;
	private statusEl: HTMLElement | null = null;
	private ringEl: SVGCircleElement | null = null;
	private controlsEl: HTMLElement | null = null;
	private statsEl: HTMLElement | null = null;
	private tasksEl: HTMLElement | null = null;
	private settingsEl: HTMLElement | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: PomodoroTimerPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_POMODORO_TIMER;
	}

	getDisplayText(): string {
		return "Pomodoro Timer";
	}

	getIcon(): string {
		return "clock";
	}

	async onOpen(): Promise<void> {
		await hydrateTasksFromDailyNote(this.plugin);
		this.loadTimerState();
		this.render();
	}

	async onClose(): Promise<void> {
		this.clearTimer();
		this.contentEl.empty();
	}

	private render(): void {
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

	private renderTimerPanel(container: HTMLElement): void {
		const modeBar = container.createDiv({ cls: "pt-mode-bar" });
		for (const mode of MODE_ORDER) {
			const button = modeBar.createEl("button", {
				cls: `pt-mode-button ${this.mode === mode ? "is-active" : ""}`,
				text: MODE_LABELS[mode],
			});
			button.addEventListener("click", () => this.setMode(mode));
		}

		const ringWrap = container.createDiv({ cls: "pt-ring-wrap" });
		const svg = ringWrap.createSvg("svg", {
			cls: "pt-ring",
			attr: { viewBox: "0 0 180 180", role: "img" },
		});
		svg.createSvg("circle", {
			cls: "pt-ring-track",
			attr: { cx: "90", cy: "90", r: "76" },
		});
		this.ringEl = svg.createSvg("circle", {
			cls: "pt-ring-progress",
			attr: { cx: "90", cy: "90", r: "76" },
		});

		const readout = ringWrap.createDiv({ cls: "pt-readout" });
		this.modeLabelEl = readout.createDiv({ cls: "pt-readout-mode" });
		this.timerValueEl = readout.createDiv({ cls: "pt-readout-time" });
		this.statusEl = readout.createDiv({ cls: "pt-readout-status" });

		this.controlsEl = container.createDiv({ cls: "pt-controls" });
		this.updateTimerReadout();
		this.renderControls();
	}

	private renderControls(): void {
		if (!this.controlsEl) return;

		this.controlsEl.empty();
		const primary = this.controlsEl.createEl("button", { cls: "mod-cta pt-control-button" });
		setIcon(primary, this.status === "running" ? "pause" : "play");
		primary.createSpan({ text: this.primaryActionLabel() });
		primary.addEventListener("click", () => this.toggleTimer());

		const reset = this.controlsEl.createEl("button", { cls: "pt-control-button" });
		setIcon(reset, "rotate-ccw");
		reset.createSpan({ text: "Reset" });
		reset.addEventListener("click", () => this.resetTimer());
	}

	private renderStats(): void {
		if (!this.statsEl) return;

		const stats = this.getStats();
		this.statsEl.empty();
		this.statsEl.addClass("pt-card");
		this.statsEl.createEl("h3", { text: "Today" });

		const grid = this.statsEl.createDiv({ cls: "pt-stat-grid" });
		this.renderStat(grid, String(stats.pomodorosCompleted), "Sessions");
		this.renderStat(grid, String(stats.focusMinutes), "Minutes");
	}

	private renderStat(container: HTMLElement, value: string, label: string): void {
		const item = container.createDiv({ cls: "pt-stat" });
		item.createDiv({ cls: "pt-stat-value", text: value });
		item.createDiv({ cls: "pt-stat-label", text: label });
	}

	private renderSettings(): void {
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
				attr: { min: "1", max: "180" },
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

	private renderTasks(): void {
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
				text: this.titleCase(filter),
			});
			button.addEventListener("click", () => {
				this.taskFilter = filter;
				this.renderTasks();
			});
		}

		const form = this.tasksEl.createEl("form", { cls: "pt-task-form" });
		const input = form.createEl("input", {
			type: "text",
			placeholder: "Add a focus task",
		});
		const add = form.createEl("button", { type: "submit", cls: "mod-cta" });
		setIcon(add, "plus");
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
				cls: `pt-task-item ${task.id === activeTaskId ? "is-active" : ""} ${task.completed ? "is-complete" : ""}`,
			});

			const check = item.createEl("button", { cls: "clickable-icon pt-task-check" });
			setIcon(check, task.completed ? "check-square" : "square");
			check.addEventListener("click", () => this.toggleTask(task.id));

			if (this.editingTaskId === task.id) {
				const editInput = item.createEl("input", {
					type: "text",
					value: task.text,
					cls: "pt-task-edit",
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
			setIcon(open, "file-text");
			open.addEventListener("click", () => this.openTaskSource(task));

			const edit = item.createEl("button", { cls: "clickable-icon" });
			setIcon(edit, "pencil");
			edit.addEventListener("click", () => {
				this.editingTaskId = task.id;
				this.renderTasks();
			});

			const remove = item.createEl("button", { cls: "clickable-icon" });
			setIcon(remove, "trash-2");
			remove.addEventListener("click", () => this.deleteTask(task.id));
		}
	}

	private toggleTimer(): void {
		if (this.status === "running") {
			this.pauseTimer();
			return;
		}

		this.startTimer();
	}

	private startTimer(): void {
		this.clearTimer();
		this.status = "running";
		this.timer = window.setInterval(() => this.tick(), 1000);
		this.updateTimerReadout();
		this.renderControls();
	}

	private pauseTimer(): void {
		this.clearTimer();
		this.status = "paused";
		this.updateTimerReadout();
		this.renderControls();
	}

	private resetTimer(): void {
		this.clearTimer();
		this.status = "idle";
		this.remaining = this.getTimerConfig()[this.mode];
		this.total = this.remaining;
		this.updateTimerReadout();
		this.renderControls();
	}

	private tick(): void {
		if (this.remaining > 1) {
			this.remaining -= 1;
			this.updateTimerReadout();
			return;
		}

		this.completeCurrentTimer();
	}

	private completeCurrentTimer(): void {
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
				completedAt: new Date().toISOString(),
				activeTaskId: this.getActiveTaskId(),
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
		new Notice(`${MODE_LABELS[completedMode]} complete`);
	}

	private setMode(mode: TimerMode): void {
		this.clearTimer();
		this.mode = mode;
		this.status = "idle";
		this.remaining = this.getTimerConfig()[mode];
		this.total = this.remaining;
		this.render();
	}

	private nextMode(mode: TimerMode): TimerMode {
		if (mode !== "pomodoro") return "pomodoro";
		return this.completedPomodoros % POMODOROS_BEFORE_LONG_BREAK === 0
			? "long-break"
			: "short-break";
	}

	private updateTimerReadout(): void {
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

	private clearTimer(): void {
		if (this.timer !== null) {
			window.clearInterval(this.timer);
			this.timer = null;
		}
	}

	private primaryActionLabel(): string {
		if (this.status === "running") return "Pause";
		if (this.status === "paused") return "Resume";
		return "Start";
	}

	private loadTimerState(): void {
		const config = this.getTimerConfig();
		this.mode = "pomodoro";
		this.status = "idle";
		this.remaining = config.pomodoro;
		this.total = config.pomodoro;
	}

	private addTask(text: string): void {
		const trimmed = text.trim();
		if (!trimmed) return;

		const tasks = this.getAllTasks();
		tasks.push({
			id: generateId(),
			blockId: undefined,
			text: trimmed,
			completed: false,
			createdAt: Date.now(),
		});
		this.saveTasks(tasks);
	}

	private toggleTask(id: string): void {
		const tasks = this.getAllTasks().map((task) =>
			task.id === id ? { ...task, completed: !task.completed } : task,
		);
		const updated = tasks.find((task) => task.id === id);
		if (updated?.completed && this.getActiveTaskId() === id) {
			this.saveActiveTask(null);
		}
		this.saveTasks(tasks);
	}

	private editTask(id: string, text: string): void {
		const trimmed = text.trim();
		if (!trimmed) {
			this.renderTasks();
			return;
		}

		const tasks = this.getAllTasks().map((task) =>
			task.id === id ? { ...task, text: trimmed } : task,
		);
		this.saveTasks(tasks);
	}

	private deleteTask(id: string): void {
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

	private saveTasks(tasks: FocusTask[]): void {
		this.saveAppState(TASKS_KEY, tasks);
		this.plugin.onAppStateSaved(TASKS_KEY);
		this.renderTasks();
	}

	private getAllTasks(): FocusTask[] {
		const value = this.plugin.data.appState[TASKS_KEY];
		return Array.isArray(value) ? [...value] as FocusTask[] : [];
	}

	private getVisibleTasks(): FocusTask[] {
		return this.getAllTasks().filter((task) => !task.removedAt);
	}

	private getFilteredTasks(tasks: FocusTask[]): FocusTask[] {
		if (this.taskFilter === "active") return tasks.filter((task) => !task.completed);
		if (this.taskFilter === "completed") return tasks.filter((task) => task.completed);
		return tasks;
	}

	private getActiveTaskId(): string | null {
		const value = this.plugin.data.appState[ACTIVE_TASK_KEY] ?? this.plugin.data.appState[LEGACY_ACTIVE_TASK_KEY];
		return typeof value === "string" ? value : null;
	}

	private saveActiveTask(id: string | null): void {
		this.saveAppState(ACTIVE_TASK_KEY, id);
	}

	private getTimerConfig(): TimerConfig {
		const value = this.plugin.data.appState[TIMER_CONFIG_KEY] ?? this.plugin.data.appState[LEGACY_TIMER_CONFIG_KEY];
		if (!this.isTimerConfig(value)) return { ...DEFAULT_DURATIONS };
		return {
			pomodoro: value.pomodoro,
			"short-break": value["short-break"],
			"long-break": value["long-break"],
		};
	}

	private isTimerConfig(value: unknown): value is TimerConfig {
		if (typeof value !== "object" || value === null) return false;
		const candidate = value as Partial<TimerConfig>;
		return Number.isFinite(candidate.pomodoro)
			&& Number.isFinite(candidate["short-break"])
			&& Number.isFinite(candidate["long-break"]);
	}

	private getStats(): DailyStats {
		const stored = (this.plugin.data.appState[STATS_KEY] ?? this.plugin.data.appState[LEGACY_STATS_KEY]) as DailyStats | undefined;
		if (stored?.date === todayDate()) return stored;
		return {
			date: todayDate(),
			pomodorosCompleted: 0,
			focusMinutes: 0,
		};
	}

	private recordStats(focusMinutes: number): void {
		const current = this.getStats();
		this.saveAppState(STATS_KEY, {
			...current,
			pomodorosCompleted: current.pomodorosCompleted + 1,
			focusMinutes: current.focusMinutes + focusMinutes,
		});
	}

	private isSoundEnabled(): boolean {
		const sound = (this.plugin.data.appState[SOUND_KEY] ?? this.plugin.data.appState[LEGACY_SOUND_KEY]) as { enabled?: boolean } | undefined;
		return sound?.enabled ?? true;
	}

	private saveAppState<T>(key: string, value: T): void {
		this.plugin.data.appState[key] = value;
		void this.plugin.savePluginData();
	}

	private async openTaskSource(task: FocusTask): Promise<void> {
		if (!task.sourcePath) return;
		const file = this.plugin.app.vault.getAbstractFileByPath(task.sourcePath);
		if (!file) return;
		await this.plugin.app.workspace.getLeaf(false).openFile(file as TFile, {
			eState: task.sourceLine === undefined ? undefined : { line: task.sourceLine },
		});
	}

	private clampMinutes(value: number): number {
		if (!Number.isFinite(value)) return 1;
		return Math.min(180, Math.max(1, Math.round(value)));
	}

	private titleCase(value: string): string {
		return value.charAt(0).toUpperCase() + value.slice(1);
	}
}
