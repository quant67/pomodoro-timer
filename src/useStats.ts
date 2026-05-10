import { useState, useCallback } from 'react';
import type { DailyStats, JsonStorageAdapter } from './types';
import { browserStorage, todayDate } from './utils';

export function useStats(storage: JsonStorageAdapter = browserStorage) {
  const [stats, setStatsState] = useState<DailyStats>(() =>
    storage.load<DailyStats>('tomato-stats', {
      date: todayDate(),
      pomodorosCompleted: 0,
      focusMinutes: 0,
    }),
  );

  const resetIfNewDay = useCallback((s: DailyStats): DailyStats => {
    const td = todayDate();
    if (s.date !== td) {
      return { date: td, pomodorosCompleted: 0, focusMinutes: 0 };
    }
    return s;
  }, []);

  const recordPomodoro = useCallback(
    (focusMinutes: number) => {
      setStatsState((prev) => {
        const current = resetIfNewDay(prev);
        const next = {
          ...current,
          pomodorosCompleted: current.pomodorosCompleted + 1,
          focusMinutes: current.focusMinutes + focusMinutes,
        };
        storage.save('tomato-stats', next);
        return next;
      });
    },
    [resetIfNewDay, storage],
  );

  const sync = useCallback(() => {
    setStatsState((prev) => {
      const current = resetIfNewDay(prev);
      storage.save('tomato-stats', current);
      return current;
    });
  }, [resetIfNewDay, storage]);

  return { stats, recordPomodoro, sync };
}
