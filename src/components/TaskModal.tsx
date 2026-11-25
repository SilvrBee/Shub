import { useEffect, useState } from 'react';
import { Check, Flag, Pin, Plus, Repeat, Trash2, X } from 'lucide-react';
import {
  FieldSource,
  SubtaskItem,
  TaskCategory,
  TaskItem,
  TaskPriority,
  TaskRepeatFrequency,
} from '../types/dashboard';
import { FLAG_META, PRIORITY_ORDER } from './PriorityFlag';
import { DURATION_CHIPS, WEEKDAY_OPTIONS } from '../utils/taskUtils';

interface TaskModalProps {
  isOpen: boolean;
  initialTask?: TaskItem | null;
  defaultCategory?: TaskCategory;
  defaultPriority?: TaskPriority;
  onClose: () => void;
  onSave: (taskData: Omit<TaskItem, 'id' | 'createdAt' | 'completed'>, existingId?: string) => void;
}

function makeSubtaskId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function TaskModal({
  isOpen,
  initialTask,
  defaultPriority = TaskPriority.None,
  onClose,
  onSave,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [category, setCategory] = useState<TaskCategory | ''>('');
  const [priority, setPriority] = useState<TaskPriority>(defaultPriority);
  const [prioritySource, setPrioritySource] = useState<FieldSource>('user');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [durationSource, setDurationSource] = useState<FieldSource>('user');
  const [repeat, setRepeat] = useState<TaskRepeatFrequency>('none');
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([]);
  const [pinned, setPinned] = useState(false);
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialTask) {
      setTitle(initialTask.title);
      setDetails(initialTask.details ?? initialTask.notes ?? '');
      setCategory(initialTask.category ?? '');
      setPriority(initialTask.priority ?? TaskPriority.None);
      setPrioritySource(initialTask.prioritySource ?? 'user');
      setDueDate(initialTask.dueDate ?? '');
      setDueTime(initialTask.dueTime ?? '');
      setDeadlineDate(initialTask.deadlineDate ?? '');
      setDeadlineTime(initialTask.deadlineTime ?? '');
      setDurationMinutes(
        typeof initialTask.durationMinutes === 'number' && initialTask.durationMinutes > 0
          ? String(initialTask.durationMinutes)
          : ''
      );
      setDurationSource(initialTask.durationSource ?? 'user');
      setRepeat(initialTask.repeat ?? 'none');
      setRepeatWeekdays(initialTask.repeatWeekdays ?? []);
      setPinned(Boolean(initialTask.pinned));
      setSubtasks(initialTask.subtasks ? initialTask.subtasks.map((s) => ({ ...s })) : []);
      setNewSubtaskTitle('');
    } else {
      setTitle('');
      setDetails('');
      setCategory('');
      setPriority(defaultPriority ?? TaskPriority.None);
      setPrioritySource('user');
      setDueDate('');
      setDueTime('');
      setDeadlineDate('');
      setDeadlineTime('');
      setDurationMinutes('');
      setDurationSource('user');
      setRepeat('none');
      setRepeatWeekdays([]);
      setPinned(false);
      setSubtasks([]);
      setNewSubtaskTitle('');
    }
  }, [isOpen, initialTask, defaultPriority]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectPriority = (next: TaskPriority) => {
    setPriority(next);
    setPrioritySource('user');
  };

  const handleSelectDurationChip = (mins: number) => {
    if (Number(durationMinutes) === mins) {
      setDurationMinutes('');
    } else {
      setDurationMinutes(String(mins));
    }
    setDurationSource('user');
  };

  const handleDurationInputChange = (val: string) => {
    setDurationMinutes(val);
    setDurationSource('user');
  };

  const handleToggleWeekday = (dayValue: number) => {
    setRepeatWeekdays((prev) =>
      prev.includes(dayValue) ? prev.filter((d) => d !== dayValue) : [...prev, dayValue]
    );
  };

  const handleAddSubtask = () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    setSubtasks((prev) => [
      ...prev,
      { id: makeSubtaskId(), title: trimmed.slice(0, 240), completed: false },
    ]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((st) => st.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const parsedDur = Number(durationMinutes);
    const validDuration =
      durationMinutes.trim() && Number.isFinite(parsedDur) && parsedDur > 0
        ? Math.min(1440, Math.round(parsedDur))
        : undefined;

    onSave(
      {
        title: trimmed,
        details: details.trim() || undefined,
        category: category || undefined,
        priority,
        prioritySource: initialTask && priority === initialTask.priority ? prioritySource : 'user',
        dueDate: dueDate.trim() || undefined,
        dueTime: dueDate.trim() && dueTime.trim() ? dueTime.trim() : dueTime.trim() || undefined,
        deadlineDate: deadlineDate.trim() || undefined,
        deadlineTime: deadlineTime.trim() || undefined,
        durationMinutes: validDuration,
        durationSource:
          validDuration !== undefined
            ? initialTask && validDuration === initialTask.durationMinutes
              ? durationSource
              : 'user'
            : undefined,
        repeat,
        repeatWeekdays: repeat === 'custom' ? repeatWeekdays : undefined,
        pinned,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
      },
      initialTask?.id
    );
    onClose();
  };

  const numericDuration = Number(durationMinutes);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div className="cadence-card editorial-preserve-pad w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <h2
              id="task-modal-title"
              className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              {initialTask ? 'Edit Task' : 'New Task'}
            </h2>
            <button
              type="button"
              onClick={() => setPinned((p) => !p)}
              aria-pressed={pinned}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                pinned
                  ? 'border-blue-600/40 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${pinned ? 'fill-current' : ''}`} />
              <span>{pinned ? 'Pinned' : 'Pin'}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Title (only required field) */}
          <div>
            <label
              htmlFor="task-title"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to get done?"
              className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
            />
          </div>

          {/* Details (optional) */}
          <div>
            <label
              htmlFor="task-details"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Details <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="task-details"
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Links, context, or next steps..."
              className="w-full px-3.5 py-2 rounded-lg text-sm bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 resize-y"
            />
          </div>

          {/* Priority Flag & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <div className="sm:col-span-8">
              <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Priority Flag
              </span>
              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Task priority flag">
                {PRIORITY_ORDER.map((prio) => {
                  const meta = FLAG_META[prio];
                  const selected = priority === prio;
                  return (
                    <button
                      key={prio}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handleSelectPriority(prio)}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        selected
                          ? 'border-blue-600 dark:border-blue-400 bg-blue-50/70 dark:bg-blue-950/40 text-slate-900 dark:text-slate-100'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Flag
                        className={`w-3.5 h-3.5 shrink-0 ${meta.iconClass} ${meta.fillClass}`}
                        aria-hidden="true"
                      />
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sm:col-span-4">
              <label
                htmlFor="task-category"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Category <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select
                id="task-category"
                value={category}
                onChange={(e) => setCategory((e.target.value || '') as TaskCategory | '')}
                className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
              >
                <option value="">None</option>
                {Object.values(TaskCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date/Time & Deadline Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0B0F17]/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Due Date &amp; Time <span className="text-slate-400 font-normal">(optional)</span>
                </span>
                {(dueDate || dueTime) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDueDate('');
                      setDueTime('');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="task-due-date"
                  type="date"
                  aria-label="Due date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md text-xs font-mono tabular-nums bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
                <input
                  id="task-due-time"
                  type="time"
                  aria-label="Due time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md text-xs font-mono tabular-nums bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0B0F17]/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Hard Deadline <span className="text-slate-400 font-normal">(optional)</span>
                </span>
                {(deadlineDate || deadlineTime) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeadlineDate('');
                      setDeadlineTime('');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  id="task-deadline-date"
                  type="date"
                  aria-label="Deadline date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md text-xs font-mono tabular-nums bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
                <input
                  id="task-deadline-time"
                  type="time"
                  aria-label="Deadline time"
                  value={deadlineTime}
                  onChange={(e) => setDeadlineTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md text-xs font-mono tabular-nums bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Estimated Duration */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Estimated Duration <span className="text-slate-400 font-normal">(optional)</span>
              </span>
              {durationMinutes && (
                <button
                  type="button"
                  onClick={() => handleDurationInputChange('')}
                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {DURATION_CHIPS.map((mins) => {
                const active = numericDuration === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleSelectDurationChip(mins)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-mono tabular-nums border transition-colors ${
                      active
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {mins}m
                  </button>
                );
              })}
              <div className="flex items-center gap-1.5 ml-auto">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  step={1}
                  value={durationMinutes}
                  onChange={(e) => handleDurationInputChange(e.target.value)}
                  placeholder="Custom"
                  aria-label="Custom estimated duration in minutes"
                  className="w-24 px-2.5 py-1.5 rounded-md text-xs font-mono tabular-nums bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">min</span>
              </div>
            </div>
          </div>

          {/* Repeat Schedule */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="task-repeat"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <Repeat className="w-3.5 h-3.5 text-slate-400" />
                <span>Repeat</span>
              </label>
              <select
                id="task-repeat"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value as TaskRepeatFrequency)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom weekdays</option>
              </select>
            </div>

            {repeat === 'custom' && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {WEEKDAY_OPTIONS.map((day) => {
                  const selected = repeatWeekdays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      aria-pressed={selected}
                      aria-label={day.label}
                      onClick={() => handleToggleWeekday(day.value)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        selected
                          ? 'border-blue-600 dark:border-blue-400 bg-blue-600 text-white dark:bg-blue-500'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subtasks (one level) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Subtasks <span className="text-slate-400 font-normal">(optional)</span>
              </span>
              {subtasks.length > 0 && (
                <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {subtasks.filter((s) => s.completed).length}/{subtasks.length} done
                </span>
              )}
            </div>

            {subtasks.length > 0 && (
              <ul className="space-y-1.5">
                {subtasks.map((st) => (
                  <li
                    key={st.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(st.id)}
                      aria-label={
                        st.completed ? `Mark "${st.title}" incomplete` : `Mark "${st.title}" done`
                      }
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        st.completed
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {st.completed && <Check className="w-3 h-3" />}
                    </button>
                    <input
                      type="text"
                      value={st.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSubtasks((prev) =>
                          prev.map((item) =>
                            item.id === st.id ? { ...item, title: val } : item
                          )
                        );
                      }}
                      aria-label="Subtask title"
                      className={`flex-1 bg-transparent text-xs focus:outline-none ${
                        st.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      aria-label={`Remove subtask "${st.title}"`}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Add a subtask step..."
                aria-label="New subtask"
                className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0"
            >
              {initialTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
