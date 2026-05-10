import { useState, type FormEvent } from 'react';
import type { FocusTask, TaskFilter } from './types';

interface Props {
  tasks: FocusTask[];
  filteredTasks: FocusTask[];
  activeTaskId: string | null;
  filter: TaskFilter;
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onSetActive: (id: string | null) => void;
  onSetFilter: (f: TaskFilter) => void;
}

function CheckIcon({ checked }: { checked: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" fill={checked ? 'currentColor' : 'none'} />
      {checked && <polyline points="8 12 11 15 16 9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

const FILTERS: TaskFilter[] = ['all', 'active', 'completed'];

export function TaskPanel({
  tasks,
  filteredTasks,
  activeTaskId,
  filter,
  onAdd,
  onToggle,
  onEdit,
  onDelete,
  onSetActive,
  onSetFilter,
}: Props) {
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onAdd(input);
    setInput('');
  };

  const beginEdit = (task: FocusTask) => {
    setEditingId(task.id);
    setDraft(task.text);
  };

  const saveEdit = () => {
    if (!editingId) return;
    onEdit(editingId, draft);
    setEditingId(null);
    setDraft('');
  };

  return (
    <section className="task-panel" aria-label="Focus tasks">
      <div className="task-panel-header">
        <h2 className="task-panel-title">Focus Tasks</h2>
        <div className="task-filters" role="tablist" aria-label="Task filter">
          {FILTERS.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              className={`task-filter-btn${filter === f ? ' active' : ''}`}
              onClick={() => onSetFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <form className="task-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="task-input"
          placeholder="Add a focus task…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="New task text"
        />
        <button
          type="submit"
          className="task-add-btn"
          aria-label="Add task"
          disabled={!input.trim()}
        >
          <PlusIcon />
        </button>
      </form>

      <ul className="task-list" role="list">
        {filteredTasks.length === 0 && (
          <li className="task-empty">
            {tasks.length === 0 ? 'No tasks yet.' : 'No matching tasks.'}
          </li>
        )}
        {filteredTasks.map((task) => (
          <li
            key={task.id}
            className={`task-item${activeTaskId === task.id ? ' active' : ''}${task.completed ? ' completed' : ''}`}
          >
            <button
              className="task-check"
              onClick={() => onToggle(task.id)}
              aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
            >
              <CheckIcon checked={task.completed} />
            </button>
            {editingId === task.id ? (
              <form
                className="task-edit-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveEdit();
                }}
              >
                <input
                  className="task-edit-input"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={saveEdit}
                  autoFocus
                  aria-label={`Edit task: ${task.text}`}
                />
              </form>
            ) : (
              <button
                className="task-text-btn"
                onClick={() => onSetActive(activeTaskId === task.id ? null : task.id)}
                aria-label="Set active task"
              >
                <span className="task-text">{task.text}</span>
                {task.sourcePath && <span className="task-source">{task.sourcePath}</span>}
              </button>
            )}
            {activeTaskId === task.id && (
              <span className="task-active-badge" aria-label="Active task">Active</span>
            )}
            <button
              className="task-action-btn"
              onClick={() => beginEdit(task)}
              aria-label={`Edit task: ${task.text}`}
            >
              <EditIcon />
            </button>
            <button
              className="task-action-btn task-delete-btn"
              onClick={() => onDelete(task.id)}
              aria-label={`Remove task: ${task.text}`}
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
