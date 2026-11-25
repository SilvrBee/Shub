import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock,
  LayoutGrid,
  List,
  Pencil,
  Pin,
  Plus,
  Repeat,
  Search,
  Settings2,
  Trash2,
} from 'lucide-react';
import {
  AppSettings,
  DashboardView,
  SmartSortMode,
  TaskItem,
  TaskPriority,
} from '../types/dashboard';
import { getTodayKey } from '../data/initialData';
import { TaskCheckButton } from './TaskCheckButton';
import { EmptyStateIllustration } from './EmptyStateIllustration';
import { useCadenceStyle, useDoodleCelebratePulse } from '../hooks/useCadenceStyle';
import { DoodleHeaderScene } from './DoodleKit';
import { PriorityFlagPicker } from './PriorityFlag';
import { CustomSelect } from './ui/CustomSelect';
import { CustomCheckbox } from './ui/CustomCheckbox';
import { PortalPopover } from './ui/PortalPopover';
import { CategoryBadge, CategoryIcon } from './ui/CategoryBadge';
import {
  classifyTaskQuadrant,
  computeQuadrantDropPatch,
  diffDaysFromToday,
  DURATION_CHIPS,
  formatDurationLabel,
  formatRepeatLabel,
  formatShortDateLabel,
  formatTimeShort,
  MatrixQuadrant,
  sortTasksSmart,
} from '../utils/taskUtils';

interface TasksViewProps {
  tasks: TaskItem[];
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onToggleTask: (id: string) => void;
  onUpdateTask: (id: string, patch: Partial<TaskItem>) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
  onOpenNewTask: () => void;
  onOpenCategoryManager: () => void;
}

const QUADRANTS: Array<{
  id: MatrixQuadrant;
  title: string;
  subtitle: string;
  accentClass: string;
}> = [
  {
    id: 'do-first',
    title: 'Do first',
    subtitle: 'Important & Urgent',
    accentClass: 'border-t-2 border-t-rose-500/80',
  },
  {
    id: 'schedule',
    title: 'Schedule',
    subtitle: 'Important & Not urgent',
    accentClass: 'border-t-2 border-t-blue-500/80',
  },
  {
    id: 'quick',
    title: 'Quick',
    subtitle: 'Not important & Urgent',
    accentClass: 'border-t-2 border-t-amber-500/80',
  },
  {
    id: 'drop',
    title: 'Drop',
    subtitle: 'Not important & Not urgent',
    accentClass: 'border-t-2 border-t-slate-400/60',
  },
];

const SORT_MODE_LABELS: Record<SmartSortMode, string> = {
  balanced: 'Balanced',
  priority: 'Priority first',
  deadline: 'Deadline first',
  'quick-wins': 'Quick wins first',
};

function DurationQuickButton({
  task,
  onSetDuration,
}: {
  task: TaskItem;
  onSetDuration: (minutes: number | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customVal, setCustomVal] = useState(
    task.durationMinutes ? String(task.durationMinutes) : ''
  );
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      setCustomVal(task.durationMinutes ? String(task.durationMinutes) : '');
    }
  }, [open, task.durationMinutes]);

  const label = formatDurationLabel(task.durationMinutes);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={label ? `Estimated duration: ${label} (click to edit)` : 'Set estimated duration'}
        aria-label={`Set estimated duration for "${task.title}"`}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono tabular-nums transition-colors ${
          label
            ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
      >
        <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>{label || 'Est'}</span>
      </button>

      <PortalPopover
        open={open}
        anchorEl={triggerRef.current}
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        minWidth={210}
        maxWidth={240}
        maxHeight={220}
        role="dialog"
        ariaLabel={`Estimated duration for ${task.title}`}
        className="p-2.5 space-y-2"
      >
        <div className="flex flex-wrap gap-1">
          {DURATION_CHIPS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                onSetDuration(m);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={`px-2 py-1 rounded text-[11px] font-mono tabular-nums border transition-colors ${
                task.durationMinutes === m
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 cadence-popover-item'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = Number(customVal);
            if (Number.isFinite(parsed) && parsed > 0) {
              onSetDuration(Math.min(1440, Math.round(parsed)));
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="number"
            min={1}
            max={1440}
            value={customVal}
            onChange={(e) => setCustomVal(e.target.value)}
            placeholder="Min"
            aria-label="Custom minutes"
            className="cadence-input w-20 px-2 py-1 rounded text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none"
          />
          <button
            type="submit"
            className="px-2 py-1 rounded text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            Set
          </button>
          {task.durationMinutes && (
            <button
              type="button"
              onClick={() => {
                onSetDuration(undefined);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="px-1.5 py-1 rounded text-[11px] opacity-70 hover:opacity-100 hover:text-rose-500"
            >
              Clear
            </button>
          )}
        </form>
      </PortalPopover>
    </>
  );
}

export function TasksView({
  tasks,
  settings,
  onUpdateSettings,
  onToggleTask,
  onUpdateTask,
  onEditTask,
  onDeleteTask,
  onOpenNewTask,
  onOpenCategoryManager,
}: TasksViewProps) {
  const activeStyle = useCadenceStyle();
  const isDoodleCelebrating = useDoodleCelebratePulse(1800);
  const todayKey = getTodayKey();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState<MatrixQuadrant | null>(null);

  const effectiveCategoryFilter = useMemo(() => {
    if (categoryFilter === 'All') return 'All';
    return settings.categories.some((c) => c.name === categoryFilter)
      ? categoryFilter
      : 'All';
  }, [categoryFilter, settings.categories]);

  const openTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);

  const scoreSortedAll = useMemo(
    () => sortTasksSmart(tasks, settings.smartSortMode, settings.quickWinMinutes, todayKey),
    [tasks, settings.smartSortMode, settings.quickWinMinutes, todayKey]
  );

  const scoreSortedOpen = useMemo(
    () => scoreSortedAll.filter((t) => !t.completed),
    [scoreSortedAll]
  );

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const completedTasks = scoreSortedAll.filter((t) => t.completed);

    let basePool: TaskItem[];
    if (statusFilter === 'active') {
      basePool = scoreSortedOpen;
    } else if (statusFilter === 'completed') {
      basePool = completedTasks;
    } else {
      basePool = [...scoreSortedOpen, ...completedTasks];
    }

    return basePool.filter((t) => {
      if (effectiveCategoryFilter !== 'All' && t.category !== effectiveCategoryFilter) {
        return false;
      }
      if (q) {
        const hay = [
          t.title,
          t.details ?? t.notes ?? '',
          ...(t.subtasks?.map((s) => s.title) ?? []),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [effectiveCategoryFilter, scoreSortedAll, scoreSortedOpen, search, statusFilter]);

  const matrixGroups = useMemo(() => {
    const grouped: Record<MatrixQuadrant, TaskItem[]> = {
      'do-first': [],
      schedule: [],
      quick: [],
      drop: [],
    };
    const activeOnly = filteredTasks.filter((t) => !t.completed);
    for (const task of activeOnly) {
      const q = classifyTaskQuadrant(task, settings, todayKey);
      grouped[q].push(task);
    }
    return grouped;
  }, [filteredTasks, settings, todayKey]);

  const handleSetPriority = (task: TaskItem, nextPriority: TaskPriority) => {
    onUpdateTask(task.id, { priority: nextPriority, prioritySource: 'user' });
  };

  const handleSetDuration = (task: TaskItem, minutes: number | undefined) => {
    onUpdateTask(task.id, {
      durationMinutes: minutes,
    });
  };

  const handleTogglePin = (task: TaskItem) => {
    onUpdateTask(task.id, { pinned: !task.pinned });
  };

  const handleToggleSubtask = (task: TaskItem, subtaskId: string) => {
    if (!task.subtasks) return;
    const next = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    onUpdateTask(task.id, { subtasks: next });
  };

  const handleMoveToQuadrant = (task: TaskItem, targetQuadrant: MatrixQuadrant) => {
    const current = classifyTaskQuadrant(task, settings, todayKey);
    if (current === targetQuadrant) return;
    const patch = computeQuadrantDropPatch(task, targetQuadrant, settings, todayKey);
    onUpdateTask(task.id, patch);
  };

  const renderDeadlineAndDue = (task: TaskItem) => {
    const dueDiff = task.dueDate ? diffDaysFromToday(task.dueDate, todayKey) : null;
    const deadDiff = task.deadlineDate ? diffDaysFromToday(task.deadlineDate, todayKey) : null;
    const deadOverdue = !task.completed && deadDiff !== null && deadDiff < 0;
    const dueOverdue = !task.completed && dueDiff !== null && dueDiff < 0;

    return (
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs font-mono tabular-nums">
        {task.deadlineDate && (
          <span
            className={`inline-flex items-center gap-1 ${
              deadOverdue
                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                : deadDiff === 0
                  ? 'text-amber-600 dark:text-amber-400 font-medium'
                  : 'text-slate-600 dark:text-slate-300'
            }`}
            title="Hard deadline"
          >
            <CalendarClock className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>
              Due by {formatShortDateLabel(task.deadlineDate, todayKey)}
              {task.deadlineTime
                ? ` ${formatTimeShort(task.deadlineTime, settings.timeFormat)}`
                : ''}
            </span>
          </span>
        )}
        {task.dueDate && (
          <span
            className={
              dueOverdue
                ? 'text-rose-600 dark:text-rose-400 font-medium'
                : 'text-slate-500 dark:text-slate-400'
            }
            title="Scheduled date"
          >
            {task.deadlineDate ? 'Plan ' : ''}
            {formatShortDateLabel(task.dueDate, todayKey)}
            {task.dueTime ? ` ${formatTimeShort(task.dueTime, settings.timeFormat)}` : ''}
          </span>
        )}
      </div>
    );
  };

  const categoryFilterOptions = [
    { value: 'All', label: 'All Categories' },
    ...settings.categories.map((cat) => ({
      value: cat.name,
      label: cat.name,
      color: cat.color,
      icon: <CategoryIcon icon={cat.icon} className="w-3.5 h-3.5" />,
    })),
  ];

  const sortOptions = (Object.keys(SORT_MODE_LABELS) as SmartSortMode[]).map((mode) => ({
    value: mode,
    label: SORT_MODE_LABELS[mode],
  }));

  const quadrantOptions = QUADRANTS.map((q) => ({
    value: q.id,
    label: q.title,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="editorial-rise editorial-rise-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">01</span>
            <span className="editorial-kicker-text">Action Directory</span>
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {openTasks.length} active · {tasks.length - openTasks.length} completed
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {activeStyle === 'doodle' && (
            <DoodleHeaderScene
              tab={DashboardView.Tasks}
              mascotOverride={
                isDoodleCelebrating
                  ? 'celebrating'
                  : tasks.length === 0
                    ? 'sleeping'
                    : 'idle'
              }
            />
          )}

          {/* List / Matrix Toggle */}
          <div
            className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg"
            role="group"
            aria-label="Task view mode"
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              aria-pressed={viewMode === 'matrix'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Matrix</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenNewTask}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter & Sort Toolbar */}
      <div className="editorial-rise editorial-rise-2 editorial-toolbar cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, details, or subtasks..."
              aria-label="Search tasks"
              className="cadence-input w-full pl-9 pr-3 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {viewMode === 'list' && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
                {(['active', 'all', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                      statusFilter === status
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}

            <CustomSelect
              ariaLabel="Filter by category"
              value={effectiveCategoryFilter}
              onChange={setCategoryFilter}
              options={categoryFilterOptions}
              matchTriggerWidth={false}
              className="min-w-[146px]"
              footerAction={{
                label: 'Manage categories',
                icon: <Settings2 className="w-3.5 h-3.5" />,
                onClick: onOpenCategoryManager,
              }}
            />

            <CustomSelect
              ariaLabel="Sort tasks by"
              prefixLabel="Sort by:"
              value={settings.smartSortMode}
              onChange={(val) =>
                onUpdateSettings({ smartSortMode: val as SmartSortMode })
              }
              options={sortOptions}
              matchTriggerWidth={false}
              align="end"
              className="min-w-[180px]"
            />
          </div>
        </div>
      </div>

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div className="editorial-rise editorial-rise-3 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          {filteredTasks.length === 0 ? (
            <EmptyStateIllustration
              kind="tasks"
              title={
                tasks.length === 0
                  ? 'No tasks yet'
                  : 'No tasks match your filters'
              }
              description={
                tasks.length === 0
                  ? 'Create your first task to organize daily priorities and track progress.'
                  : 'Try clearing your search or switching category and status filters.'
              }
              action={
                <button
                  type="button"
                  onClick={onOpenNewTask}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Task</span>
                </button>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredTasks.map((task) => {
                const subtasks = task.subtasks ?? [];
                const doneSubCount = subtasks.filter((s) => s.completed).length;
                const isPartial =
                  !task.completed && doneSubCount > 0 && doneSubCount < subtasks.length;
                const isExpanded = Boolean(expandedSubtasks[task.id]);
                const repeatLabel = formatRepeatLabel(task);
                const taskDetails = task.details ?? task.notes;

                return (
                  <li
                    key={task.id}
                    className={`px-4 sm:px-6 py-3.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30 ${
                      task.pinned ? 'bg-blue-50/25 dark:bg-blue-950/15' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5 shrink-0">
                        <TaskCheckButton
                          checked={task.completed}
                          indeterminate={isPartial}
                          label={
                            task.completed
                              ? `Mark "${task.title}" incomplete`
                              : `Mark "${task.title}" complete`
                          }
                          onToggle={() => onToggleTask(task.id)}
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {task.pinned && (
                                <Pin
                                  className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 fill-current shrink-0"
                                  aria-label="Pinned task"
                                />
                              )}
                              <p
                                className={`text-sm font-medium leading-snug ${
                                  task.completed
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                {task.title}
                              </p>
                            </div>
                            {taskDetails && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                {taskDetails}
                              </p>
                            )}
                          </div>

                          {/* Compact row actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleTogglePin(task)}
                              aria-pressed={Boolean(task.pinned)}
                              aria-label={task.pinned ? `Unpin "${task.title}"` : `Pin "${task.title}"`}
                              title={task.pinned ? 'Unpin task' : 'Pin task'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                task.pinned
                                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40'
                                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <Pin className={`w-3.5 h-3.5 ${task.pinned ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditTask(task)}
                              aria-label={`Edit "${task.title}"`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTask(task.id)}
                              aria-label={`Delete "${task.title}"`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Compact metadata row: Flag, Duration, Deadline/Due, Subtasks, Repeat, Category */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <PriorityFlagPicker
                            priority={task.priority}
                            taskTitle={task.title}
                            compact
                            onChange={(nextPrio) => handleSetPriority(task, nextPrio)}
                          />

                          <DurationQuickButton
                            task={task}
                            onSetDuration={(mins) => handleSetDuration(task, mins)}
                          />

                          {(task.deadlineDate || task.dueDate) && renderDeadlineAndDue(task)}

                          {repeatLabel && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                              <Repeat className="w-3 h-3 shrink-0" aria-hidden="true" />
                              <span>{repeatLabel}</span>
                            </span>
                          )}

                          {subtasks.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSubtasks((prev) => ({
                                  ...prev,
                                  [task.id]: !prev[task.id],
                                }))
                              }
                              aria-expanded={isExpanded}
                              className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {doneSubCount}/{subtasks.length} subtasks
                              </span>
                            </button>
                          )}

                          {task.category && (
                            <CategoryBadge
                              name={task.category}
                              categories={settings.categories}
                            />
                          )}
                        </div>

                        {/* Expanded one-level subtasks */}
                        {isExpanded && subtasks.length > 0 && (
                          <ul className="mt-2 pl-2 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5">
                            {subtasks.map((st) => (
                              <li key={st.id} className="flex items-center gap-2">
                                <CustomCheckbox
                                  size="sm"
                                  checked={st.completed}
                                  onChange={() => handleToggleSubtask(task, st.id)}
                                  ariaLabel={
                                    st.completed
                                      ? `Mark subtask "${st.title}" incomplete`
                                      : `Mark subtask "${st.title}" complete`
                                  }
                                />
                                <span
                                  className={`text-xs ${
                                    st.completed
                                      ? 'line-through text-slate-400 dark:text-slate-500'
                                      : 'text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {st.title}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* MATRIX VIEW */}
      {viewMode === 'matrix' && (
        <div className="editorial-rise editorial-rise-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>
              Important:{' '}
              <strong className="text-slate-700 dark:text-slate-200">
                {settings.matrixImportantRule === 'high-only' ? 'High flag' : 'High or Medium flag'}
              </strong>{' '}
              · Urgent:{' '}
              <strong className="text-slate-700 dark:text-slate-200">
                Overdue or within {settings.matrixUrgentDays} day
                {settings.matrixUrgentDays === 1 ? '' : 's'}
              </strong>
            </span>
            <span>Drag tasks between quadrants to update flag &amp; deadline</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUADRANTS.map((quad) => {
              const items = matrixGroups[quad.id];
              const isOver = dragOverQuadrant === quad.id;
              return (
                <section
                  key={quad.id}
                  aria-label={quad.title}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverQuadrant !== quad.id) setDragOverQuadrant(quad.id);
                  }}
                  onDragLeave={() => {
                    if (dragOverQuadrant === quad.id) setDragOverQuadrant(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
                    setDragOverQuadrant(null);
                    setDraggedTaskId(null);
                    if (!id) return;
                    const dropped = tasks.find((t) => t.id === id);
                    if (dropped) handleMoveToQuadrant(dropped, quad.id);
                  }}
                  className={`cadence-card bg-white dark:bg-[#121927] border rounded-xl p-4 min-h-[220px] flex flex-col gap-3 transition-colors ${
                    quad.accentClass
                  } ${
                    isOver
                      ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <div>
                      <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {quad.title}
                      </h2>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {quad.subtitle}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-xs font-medium text-slate-500 dark:text-slate-400">
                      {items.length}
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 py-8 text-center">
                      Drop tasks here
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {items.map((task) => {
                        const subtasks = task.subtasks ?? [];
                        const doneSubCount = subtasks.filter((s) => s.completed).length;
                        const isPartial =
                          !task.completed && doneSubCount > 0 && doneSubCount < subtasks.length;
                        return (
                          <li
                            key={task.id}
                            draggable
                            onDragStart={(e) => {
                              setDraggedTaskId(task.id);
                              e.dataTransfer.setData('text/plain', task.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => {
                              setDraggedTaskId(null);
                              setDragOverQuadrant(null);
                            }}
                            className={`p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0F17]/70 cursor-grab active:cursor-grabbing space-y-2 ${
                              draggedTaskId === task.id ? 'opacity-50' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <TaskCheckButton
                                checked={task.completed}
                                indeterminate={isPartial}
                                label={`Mark "${task.title}" complete`}
                                onToggle={() => onToggleTask(task.id)}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  {task.pinned && (
                                    <Pin className="w-3 h-3 text-blue-600 dark:text-blue-400 fill-current shrink-0" />
                                  )}
                                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-snug">
                                    {task.title}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => onEditTask(task)}
                                aria-label={`Edit "${task.title}"`}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <PriorityFlagPicker
                                  priority={task.priority}
                                  taskTitle={task.title}
                                  compact
                                  onChange={(p) => handleSetPriority(task, p)}
                                />
                                {task.durationMinutes && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
                                    <Clock className="w-3 h-3" aria-hidden="true" />
                                    {formatDurationLabel(task.durationMinutes)}
                                  </span>
                                )}
                                {task.deadlineDate && (
                                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                    Due by {formatShortDateLabel(task.deadlineDate, todayKey)}
                                  </span>
                                )}
                                {task.category && (
                                  <CategoryBadge
                                    name={task.category}
                                    categories={settings.categories}
                                    compact
                                  />
                                )}
                              </div>

                              <CustomSelect
                                ariaLabel={`Move "${task.title}" to quadrant`}
                                value={quad.id}
                                onChange={(val) =>
                                  handleMoveToQuadrant(task, val as MatrixQuadrant)
                                }
                                options={quadrantOptions}
                                size="sm"
                                matchTriggerWidth={false}
                                minPopoverWidth={145}
                                align="end"
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
