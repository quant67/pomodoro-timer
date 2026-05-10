import { useState, useCallback, useRef, useEffect } from 'react';
import type { TimerMode, TimerStatus, TimerConfig } from './types';

export const DEFAULT_DURATIONS: TimerConfig = {
  pomodoro: 25 * 60,
  'short-break': 5 * 60,
  'long-break': 15 * 60,
};

const POMODOROS_BEFORE_LONG_BREAK = 4;

interface UseTimerReturn {
  mode: TimerMode;
  status: TimerStatus;
  remaining: number;
  total: number;
  completedPomodoros: number;
  setMode: (m: TimerMode) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  onComplete: (fn: () => void) => void;
}

export function useTimer(durations: TimerConfig = DEFAULT_DURATIONS): UseTimerReturn {
  const [mode, setModeState] = useState<TimerMode>('pomodoro');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [remaining, setRemaining] = useState(durations.pomodoro);
  const [total, setTotal] = useState(durations.pomodoro);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef<() => void>(() => {});
  const completedPomodorosRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const setMode = useCallback(
    (m: TimerMode) => {
      clearTimer();
      setModeState(m);
      setRemaining(durations[m]);
      setTotal(durations[m]);
      setStatus('idle');
    },
    [clearTimer, durations],
  );

  const tick = useCallback(() => {
    setRemaining((prev) => {
      if (prev <= 1) {
        clearTimer();
        setStatus('idle');
        let nextMode: TimerMode = 'pomodoro';
        if (mode === 'pomodoro') {
          const nextCount = completedPomodorosRef.current + 1;
          completedPomodorosRef.current = nextCount;
          setCompletedPomodoros(nextCount);
          nextMode = nextCount % POMODOROS_BEFORE_LONG_BREAK === 0
            ? 'long-break'
            : 'short-break';
        }
        setModeState(nextMode);
        setTotal(durations[nextMode]);
        onCompleteRef.current();
        return durations[nextMode];
      }
      return prev - 1;
    });
  }, [clearTimer, durations, mode]);

  const start = useCallback(() => {
    setStatus('running');
    intervalRef.current = setInterval(tick, 1000);
  }, [tick]);

  const pause = useCallback(() => {
    clearTimer();
    setStatus('paused');
  }, [clearTimer]);

  const resume = useCallback(() => {
    setStatus('running');
    intervalRef.current = setInterval(tick, 1000);
  }, [tick]);

  const reset = useCallback(() => {
    clearTimer();
    setRemaining(durations[mode]);
    setTotal(durations[mode]);
    setStatus('idle');
  }, [clearTimer, durations, mode]);

  const onComplete = useCallback((fn: () => void) => {
    onCompleteRef.current = fn;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  useEffect(() => {
    if (status === 'idle') {
      setRemaining(durations[mode]);
      setTotal(durations[mode]);
    }
  }, [durations, mode, status]);

  return {
    mode,
    status,
    remaining,
    total,
    completedPomodoros,
    setMode,
    start,
    pause,
    resume,
    reset,
    onComplete,
  };
}
