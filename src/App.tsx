import { useCallback, useEffect } from 'react';
import { useTimer } from './useTimer';
import { useTimerSettings } from './useTimerSettings';
import { useStats } from './useStats';
import { useTasks } from './useTasks';
import { useSound } from './useSound';
import { Sidebar } from './Sidebar';
import { ModeSelector } from './ModeSelector';
import { TimerDisplay } from './TimerDisplay';
import { Controls } from './Controls';
import { StatsPanel } from './StatsPanel';
import { TaskPanel } from './TaskPanel';
import { TimeSettingsPanel } from './TimeSettingsPanel';
import { playAlert } from './utils';
import type { JsonStorageAdapter, TimerCompletionEvent } from './types';
import './App.css';

interface AppProps {
  storage?: JsonStorageAdapter;
  onTimerComplete?: (event: TimerCompletionEvent) => void;
}

export default function App({ storage, onTimerComplete }: AppProps) {
  const {
    config: timerConfig,
    minutes: timerMinutes,
    updateMinutes,
    resetTimerConfig,
  } = useTimerSettings(storage);
  const {
    mode,
    status,
    remaining,
    total,
    setMode,
    start,
    pause,
    resume,
    reset,
    onComplete,
  } = useTimer(timerConfig);

  const { stats, recordPomodoro, sync } = useStats(storage);
  const { soundEnabled, toggleSound } = useSound(storage);
  const {
    tasks,
    filteredTasks,
    activeTaskId,
    filter,
    addTask,
    toggleTask,
    editTask,
    deleteTask,
    setActiveTaskId,
    setFilter,
  } = useTasks(storage);

  const handleComplete = useCallback(() => {
    if (soundEnabled) {
      playAlert();
    }
    const focusMinutes = mode === 'pomodoro' ? Math.round(total / 60) : 0;
    if (mode === 'pomodoro') {
      recordPomodoro(focusMinutes);
    }
    onTimerComplete?.({
      mode,
      focusMinutes,
      completedAt: new Date().toISOString(),
      activeTaskId,
    });
  }, [soundEnabled, mode, total, recordPomodoro, onTimerComplete, activeTaskId]);

  useEffect(() => {
    onComplete(handleComplete);
  }, [onComplete, handleComplete]);

  // Sync stats on mount (reset date if new day)
  useEffect(() => {
    sync();
  }, [sync]);

  return (
    <div className="app-layout">
      <Sidebar
        mode={mode}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onSetMode={setMode}
      />

      <main className="main-content">
        <div className="timer-section">
          <ModeSelector mode={mode} onChange={setMode} />
          <TimerDisplay
            mode={mode}
            status={status}
            remaining={remaining}
            total={total}
          />
          <Controls
            status={status}
            onStart={start}
            onPause={pause}
            onResume={resume}
            onReset={reset}
          />
        </div>
      </main>

      <aside className="right-panel">
        <TimeSettingsPanel
          minutes={timerMinutes}
          onChange={updateMinutes}
          onReset={resetTimerConfig}
        />
        <StatsPanel stats={stats} />
        <TaskPanel
          tasks={tasks}
          filteredTasks={filteredTasks}
          activeTaskId={activeTaskId}
          filter={filter}
          onAdd={addTask}
          onToggle={toggleTask}
          onEdit={editTask}
          onDelete={deleteTask}
          onSetActive={setActiveTaskId}
          onSetFilter={setFilter}
        />
      </aside>
    </div>
  );
}
