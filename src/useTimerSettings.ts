import { useCallback, useMemo, useState } from 'react';
import type { JsonStorageAdapter, TimerConfig, TimerMode } from './types';
import { browserStorage } from './utils';
import { DEFAULT_DURATIONS } from './useTimer';

export const TIMER_CONFIG_KEY = 'tomato-timer-config';

const MIN_MINUTES = 1;
const MAX_MINUTES = 180;

export function useTimerSettings(storage: JsonStorageAdapter = browserStorage) {
  const [config, setConfigState] = useState<TimerConfig>(() =>
    normalizeTimerConfig(storage.load<TimerConfig>(TIMER_CONFIG_KEY, DEFAULT_DURATIONS)),
  );

  const minutes = useMemo(
    () => ({
      pomodoro: secondsToMinutes(config.pomodoro),
      'short-break': secondsToMinutes(config['short-break']),
      'long-break': secondsToMinutes(config['long-break']),
    }),
    [config],
  );

  const updateMinutes = useCallback(
    (mode: TimerMode, value: number) => {
      setConfigState((prev) => {
        const next = {
          ...prev,
          [mode]: minutesToSeconds(clampMinutes(value)),
        };
        storage.save(TIMER_CONFIG_KEY, next);
        return next;
      });
    },
    [storage],
  );

  const resetTimerConfig = useCallback(() => {
    setConfigState(DEFAULT_DURATIONS);
    storage.save(TIMER_CONFIG_KEY, DEFAULT_DURATIONS);
  }, [storage]);

  return {
    config,
    minutes,
    updateMinutes,
    resetTimerConfig,
  };
}

function normalizeTimerConfig(value: TimerConfig): TimerConfig {
  return {
    pomodoro: normalizeSeconds(value.pomodoro, DEFAULT_DURATIONS.pomodoro),
    'short-break': normalizeSeconds(value['short-break'], DEFAULT_DURATIONS['short-break']),
    'long-break': normalizeSeconds(value['long-break'], DEFAULT_DURATIONS['long-break']),
  };
}

function normalizeSeconds(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return minutesToSeconds(clampMinutes(secondsToMinutes(value)));
}

function secondsToMinutes(value: number): number {
  return Math.max(MIN_MINUTES, Math.round(value / 60));
}

function minutesToSeconds(value: number): number {
  return value * 60;
}

function clampMinutes(value: number): number {
  if (!Number.isFinite(value)) return MIN_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(value)));
}
