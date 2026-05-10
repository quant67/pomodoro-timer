import { useState, useCallback } from 'react';
import type { FocusTask, JsonStorageAdapter, TaskFilter } from './types';
import { browserStorage, generateId } from './utils';

export const TASKS_KEY = 'tomato-tasks';
export const ACTIVE_TASK_KEY = 'tomato-active-task';

export function useTasks(storage: JsonStorageAdapter = browserStorage) {
  const [tasks, setTasksState] = useState<FocusTask[]>(() =>
    storage.load<FocusTask[]>(TASKS_KEY, []),
  );
  const [activeTaskId, setActiveTaskIdState] = useState<string | null>(() =>
    storage.load<string | null>(ACTIVE_TASK_KEY, null),
  );
  const [filter, setFilter] = useState<TaskFilter>('all');

  const persist = useCallback((t: FocusTask[]) => {
    storage.save(TASKS_KEY, t);
  }, [storage]);

  const setActiveTaskId = useCallback((id: string | null) => {
    setActiveTaskIdState(id);
    storage.save(ACTIVE_TASK_KEY, id);
  }, [storage]);

  const addTask = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setTasksState((prev) => {
        const next = [
          ...prev,
          { id: generateId(), text: trimmed, completed: false, createdAt: Date.now() },
        ];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const toggleTask = useCallback(
    (id: string) => {
      setTasksState((prev) => {
        const next = prev.map((t) =>
          t.id === id ? { ...t, completed: !t.completed } : t,
        );
        const updated = next.find((t) => t.id === id);
        if (updated?.completed) {
          setActiveTaskIdState((current) => {
            const nextActive = current === id ? null : current;
            storage.save(ACTIVE_TASK_KEY, nextActive);
            return nextActive;
          });
        }
        persist(next);
        return next;
      });
    },
    [persist, storage],
  );

  const editTask = useCallback(
    (id: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setTasksState((prev) => {
        const next = prev.map((t) =>
          t.id === id ? { ...t, text: trimmed } : t,
        );
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const deleteTask = useCallback(
    (id: string) => {
      setTasksState((prev) => {
        const next = prev.flatMap((t) => {
          if (t.id !== id) return [t];
          if (t.sourcePath) return [{ ...t, removedAt: Date.now() }];
          return [];
        });
        persist(next);
        return next;
      });
      setActiveTaskIdState((prev) => {
        const nextActive = prev === id ? null : prev;
        storage.save(ACTIVE_TASK_KEY, nextActive);
        return nextActive;
      });
    },
    [persist, storage],
  );

  const visibleTasks = tasks.filter((t) => !t.removedAt);
  const filteredTasks = visibleTasks.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  return {
    tasks: visibleTasks,
    filteredTasks,
    activeTaskId,
    filter,
    addTask,
    toggleTask,
    editTask,
    deleteTask,
    setActiveTaskId,
    setFilter,
  };
}
