import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, Pin, Plus, Repeat, RotateCcw, Settings2, Trash2, X } from 'lucide-react';
import {
  CategoryItem,
  SubtaskItem,
  TaskItem,
  TaskPriority,
  TaskReminderOverride,
  TaskRepeatFrequency,
} from '../types/dashboard';
import { FLAG_META, PRIORITY_ORDER, PriorityFlagGlyph } from './PriorityFlag';
import {
  DURATION_CHIPS,
  findSimilarOpenTasks,
  undoAutoPriorityEscalation,
  WEEKDAY_OPTIONS,
} from '../utils/taskUtils';
import { CustomSelect } from './ui/CustomSelect';
import { CustomCheckbox } from './ui/CustomCheckbox';
import { DatePickerField, TimePickerField } from './ui/CustomDateTimePicker';
import { CategoryIcon } from './ui/CategoryBadge';

interface TaskModalProps {
  isOpen: boolean;
  initialTask?: TaskItem | null;
  existingTasks?: TaskItem[];
  categories: CategoryItem[];
  defaultCategory?: string;
  defaultPriority?: TaskPriority;
  timeFormat?: '12h' | '24h';
  onOpenCategoryManager: () => void;
  onClose: () => void;
  onSave: (taskData: Omit<TaskItem, 'id' | 'createdAt' | 'completed'>, existingId?: string) => void;
}

function makeSubtaskId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

const REPEAT_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom weekdays' },
];

const REMINDER_OVERRIDE_OPTIONS = [
  { value: 'default', label: 'Use default setting' },
  { value: '0', label: 'At due time' },
  { value: '10', label: '10 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '1440', label: '1 day before' },
  { value: 'none', label: 'No reminder' },
];

export function TaskModal({
  isOpen,
  initialTask,
  existingTasks = [],
  categories,
  defaultPriority = TaskPriority.None,
  timeFormat = '24h',
  onOpenCategoryManager,
  onClose,
  onSave,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [category, setCategory] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>(defaultPriority);
  const [prioritySource, setPrioritySource] = useState<'user' | 'auto'>('user');
  const [priorityAutoLocked, setPriorityAutoLocked] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [reminderOffset, setReminderOffset] = useState<TaskReminderOverride>('default');
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
      setPrioritySource(initialTask.prioritySource === 'auto' ? 'auto' : 'user');
      setPriorityAutoLocked(Boolean(initialTask.priorityAutoLocked));
      setDueDate(initialTask.dueDate ?? '');
      setDueTime(initialTask.dueTime ?? '');
      setDeadlineDate(initialTask.deadlineDate ?? '');
      setDeadlineTime(initialTask.deadlineTime ?? '');
      setDurationMinutes(
        typeof initialTask.durationMinutes === 'number' && initialTask.durationMinutes > 0
          ? String(initialTask.durationMinutes)
          : ''
      );
      setReminderOffset(initialTask.reminderOffset ?? 'default');
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
      setPriorityAutoLocked(false);
      setDueDate('');
      setDueTime('');
      setDeadlineDate('');
      setDeadlineTime('');
      setDurationMinutes('');
      setReminderOffset('default');
      setRepeat('none');
      setRepeatWeekdays([]);
      setPinned(false);
      setSubtasks([]);
      setNewSubtaskTitle('');
    }
  }, [isOpen, initialTask, defaultPriority]);

  // If categories were renamed or removed while modal was open, keep selected category consistent
  useEffect(() => {
    if (!isOpen || !category) return;
    if (!categories.some((c) => c.name === category)) {
      setCategory('');
    }
  }, [categories, category, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !e.defaultPrevented &&
        !document.querySelector('[data-portal-popover="true"]') &&
        !document.querySelector('[data-category-manager-modal="true"]')
      ) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const similarTasks = useMemo(
    () => findSimilarOpenTasks(title, existingTasks, initialTask?.id),
    [title, existingTasks, initialTask?.id]
  );

  if (!isOpen) return null;

  const handleSelectDurationChip = (mins: number) => {
    if (Number(durationMinutes) === mins) {
      setDurationMinutes('');
    } else {
      setDurationMinutes(String(mins));
    }
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

    const datesChanged =
      initialTask &&
      ((dueDate.trim() || undefined) !== initialTask.dueDate ||
        (deadlineDate.trim() || undefined) !== initialTask.deadlineDate);

    onSave(
      {
        title: trimmed,
        details: details.trim() || undefined,
        category: category || undefined,
        priority,
        prioritySource,
        priorityAutoPrev: prioritySource === 'auto' ? initialTask?.priorityAutoPrev : undefined,
        priorityAutoReason: prioritySource === 'auto' ? initialTask?.priorityAutoReason : undefined,
        priorityAutoLocked: datesChanged ? false : priorityAutoLocked || undefined,
        dueDate: dueDate.trim() || undefined,
        dueTime: dueTime.trim() || undefined,
        deadlineDate: deadlineDate.trim() || undefined,
        deadlineTime: deadlineTime.trim() || undefined,
        durationMinutes: validDuration,
        reminderOffset: reminderOffset !== 'default' ? reminderOffset : undefined,
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

  const categoryOptions = [
    { value: '', label: 'None' },
    ...categories.map((cat) => ({
      value: cat.name,
      label: cat.name,
      color: cat.color,
      icon: <CategoryIcon icon={cat.icon} className="w-3.5 h-3.5" />,
    })),
  ];

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
              className="cadence-input w-full px-3.5 py-2.5 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
            />
            {similarTasks.length > 0 && (
              <div
                role="status"
                className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-300/70 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/25 text-xs text-amber-800 dark:text-amber-200"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Similar open task already exists:{' '}
                  <strong className="font-medium">&ldquo;{similarTasks[0].title}&rdquo;</strong>
                </span>
              </div>
            )}
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
              className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 resize-y"
            />
          </div>

          {/* Priority Flag & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
            <div className="sm:col-span-8">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Priority Flag
                </span>
                {prioritySource === 'auto' && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                    <span>
                      Auto{initialTask?.priorityAutoReason ? ` · ${initialTask.priorityAutoReason}` : ''}
                    </span>
                    {initialTask && (
                      <button
                        type="button"
                        onClick={() => {
                          const patch = undoAutoPriorityEscalation(initialTask);
                          setPriority(patch.priority ?? TaskPriority.None);
                          setPrioritySource('user');
                          setPriorityAutoLocked(true);
                        }}
                        className="inline-flex items-center gap-0.5 font-medium underline hover:opacity-80"
                      >
                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                        Undo
                      </button>
                    )}
                  </span>
                )}
              </div>
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
                      aria-label={meta.ariaLabel}
                      onClick={() => {
                        setPriority(prio);
                        setPrioritySource('user');
                      }}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        selected
                          ? 'border-blue-600 dark:border-blue-400 bg-blue-50/70 dark:bg-blue-950/40 text-slate-900 dark:text-slate-100'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B0F17] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <PriorityFlagGlyph priority={prio} />
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
              <CustomSelect
                id="task-category"
                ariaLabel="Task category"
                value={category}
                onChange={setCategory}
                options={categoryOptions}
                placeholder="None"
                className="w-full"
                footerAction={{
                  label: 'Manage categories',
                  icon: <Settings2 className="w-3.5 h-3.5" />,
                  onClick: onOpenCategoryManager,
                }}
              />
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
                <DatePickerField
                  id="task-due-date"
                  ariaLabel="Due date"
                  value={dueDate || undefined}
                  onChange={(v) => setDueDate(v ?? '')}
                />
                <TimePickerField
                  id="task-due-time"
                  ariaLabel="Due time"
                  value={dueTime || undefined}
                  onChange={(v) => setDueTime(v ?? '')}
                  timeFormat={timeFormat}
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
                <DatePickerField
                  id="task-deadline-date"
                  ariaLabel="Deadline date"
                  value={deadlineDate || undefined}
                  onChange={(v) => setDeadlineDate(v ?? '')}
                />
                <TimePickerField
                  id="task-deadline-time"
                  ariaLabel="Deadline time"
                  value={deadlineTime || undefined}
                  onChange={(v) => setDeadlineTime(v ?? '')}
                  timeFormat={timeFormat}
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
                  onClick={() => setDurationMinutes('')}
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
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="Custom"
                  aria-label="Custom estimated duration in minutes"
                  className="cadence-input w-24 px-2.5 py-1.5 rounded-md text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">min</span>
              </div>
            </div>
          </div>

          {/* Reminder Override & Repeat Schedule */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="task-reminder-override"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <Bell className="w-3.5 h-3.5 text-slate-400" />
                <span>Reminder</span>
              </label>
              <CustomSelect
                id="task-reminder-override"
                ariaLabel="Task reminder override"
                value={reminderOffset}
                onChange={(v) => setReminderOffset(v as TaskReminderOverride)}
                options={REMINDER_OVERRIDE_OPTIONS}
                matchTriggerWidth={false}
                align="end"
                className="min-w-[190px]"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <label
                htmlFor="task-repeat"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <Repeat className="w-3.5 h-3.5 text-slate-400" />
                <span>Repeat</span>
              </label>
              <CustomSelect
                id="task-repeat"
                ariaLabel="Repeat schedule"
                value={repeat}
                onChange={(v) => setRepeat(v as TaskRepeatFrequency)}
                options={REPEAT_OPTIONS}
                matchTriggerWidth={false}
                align="end"
                className="min-w-[190px]"
              />
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
                    <CustomCheckbox
                      size="sm"
                      checked={st.completed}
                      onChange={() => handleToggleSubtask(st.id)}
                      ariaLabel={
                        st.completed ? `Mark "${st.title}" incomplete` : `Mark "${st.title}" done`
                      }
                    />
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
                className="cadence-input flex-1 px-3 py-1.5 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
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
