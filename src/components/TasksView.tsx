import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  LayoutGrid,
  List,
  Pencil,
  Pin,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  AppSettings,
  DashboardView,
  ScheduleBlock,
  SmartSortMode,
  TaskCategory,
  TaskItem,
  TaskPriority,
} from '../types/dashboard';
import { getTodayKey } from '../data/initialData';
import { TaskCheckButton } from './TaskCheckButton';
import { EmptyStateIllustration } from './EmptyStateIllustration';
import { useCadenceStyle, useDoodleCelebratePulse } from '../hooks/useCadenceStyle';
import { DoodleHeaderScene } from './DoodleKit';
import { AiSourceBadge, PriorityFlagPicker } from './PriorityFlag';
import {
  applyAiOrderWithPinnedLock,
  classifyTaskQuadrant,
  computeQuadrantDropPatch,
  diffDaysFromToday,
  DURATION_CHIPS,
  filterTasksFittingMinutes,
  formatDurationLabel,
  formatRepeatLabel,
  formatShortDateLabel,
  formatTimeShort,
  MatrixQuadrant,
  sortTasksSmart,
} from '../utils/taskUtils';
import { AiSortResult, AiTaskSuggestion, requestAiTaskSort } from '../services/aiTaskSort';

interface TasksViewProps {
  tasks: TaskItem[];
  schedule: ScheduleBlock[];
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onToggleTask: (id: string) => void;
  onUpdateTask: (id: string, patch: Partial<TaskItem>) => void;
  onBatchUpdateTasks: (patches: Array<{ id: string; patch: Partial<TaskItem> }>) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
  onOpenNewTask: () => void;
}

interface AiUndoEntry {
  patches: Array<{ id: string; prev: Partial<TaskItem> }>;
  label: string;
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setCustomVal(task.durationMinutes ? String(task.durationMinutes) : '');
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, task.durationMinutes]);

  const label = formatDurationLabel(task.durationMinutes);

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
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
        {task.durationSource === 'ai' && label && <AiSourceBadge />}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1 z-40 w-52 p-2.5 rounded-lg bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-700 shadow-lg space-y-2"
        >
          <div className="flex flex-wrap gap-1">
            {DURATION_CHIPS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  onSetDuration(m);
                  setOpen(false);
                }}
                className={`px-2 py-1 rounded text-[11px] font-mono tabular-nums border ${
                  task.durationMinutes === m
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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
              className="w-20 px-2 py-1 rounded text-xs font-mono tabular-nums bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
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
                }}
                className="px-1.5 py-1 rounded text-[11px] text-slate-500 hover:text-rose-600"
              >
                Clear
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

export function TasksView({
  tasks,
  schedule,
  settings,
  onUpdateSettings,
  onToggleTask,
  onUpdateTask,
  onBatchUpdateTasks,
  onEditTask,
  onDeleteTask,
  onOpenNewTask,
}: TasksViewProps) {
  const activeStyle = useCadenceStyle();
  const isDoodleCelebrating = useDoodleCelebratePulse(1800);
  const todayKey = getTodayKey();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [categoryFilter, setCategoryFilter] = useState<'All' | TaskCategory>('All');
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [availableMinutesInput, setAvailableMinutesInput] = useState('');
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState<MatrixQuadrant | null>(null);

  // AI sort state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiSortResult | null>(null);
  const [aiOrderApplied, setAiOrderApplied] = useState(false);
  const [sortSource, setSortSource] = useState<'score' | 'ai'>('score');
  const [pendingSuggestions, setPendingSuggestions] = useState<Record<string, AiTaskSuggestion>>({});
  const [lastAiUndo, setLastAiUndo] = useState<AiUndoEntry | null>(null);
  const lastAutoFingerprintRef = useRef<string>('');

  const availableMinutes = useMemo(() => {
    const trimmed = availableMinutesInput.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
  }, [availableMinutesInput]);

  const openTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);

  const scoreSortedAll = useMemo(
    () => sortTasksSmart(tasks, settings.smartSortMode, settings.quickWinMinutes, todayKey),
    [tasks, settings.smartSortMode, settings.quickWinMinutes, todayKey]
  );

  const scoreSortedOpen = useMemo(
    () => scoreSortedAll.filter((t) => !t.completed),
    [scoreSortedAll]
  );

  const runAiSort = useCallback(
    async (isAuto = false) => {
      if (openTasks.length === 0 || aiLoading) return;
      setAiLoading(true);
      setAiError(null);

      try {
        const { result } = await requestAiTaskSort({
          openTasks: scoreSortedOpen,
          schedule,
          dailyCap: settings.aiDailyCap,
        });

        setAiResult(result);
        setSortSource('ai');
        setAiOrderApplied(isAuto);

        if (settings.aiPriorityMode === 'auto-unflagged') {
          const batchPatches: Array<{ id: string; patch: Partial<TaskItem> }> = [];
          const undoPatches: Array<{ id: string; prev: Partial<TaskItem> }> = [];
          const sugMap = new Map(result.suggestions.map((s) => [s.id, s]));

          for (const t of openTasks) {
            const sug = sugMap.get(t.id);
            if (!sug) continue;
            const patch: Partial<TaskItem> = {};
            const prev: Partial<TaskItem> = {};

            // Strictly never overwrite user-set priority flags
            if (
              sug.suggestedPriority &&
              t.priority === TaskPriority.None &&
              t.prioritySource !== 'user'
            ) {
              patch.priority = sug.suggestedPriority;
              patch.prioritySource = 'ai';
              prev.priority = t.priority;
              prev.prioritySource = t.prioritySource;
            } else if (
              sug.suggestedPriority &&
              t.priority === TaskPriority.None &&
              t.prioritySource === 'user'
            ) {
              // Respect prioritySource === 'user' even when currently None; do not touch.
            }

            if (
              sug.suggestedDurationMinutes &&
              (t.durationMinutes === undefined || t.durationMinutes <= 0)
            ) {
              patch.durationMinutes = sug.suggestedDurationMinutes;
              patch.durationSource = 'ai';
              prev.durationMinutes = t.durationMinutes;
              prev.durationSource = t.durationSource;
            }

            if (Object.keys(patch).length > 0) {
              batchPatches.push({ id: t.id, patch });
              undoPatches.push({ id: t.id, prev });
            }
          }

          setPendingSuggestions({});
          if (batchPatches.length > 0) {
            onBatchUpdateTasks(batchPatches);
            setLastAiUndo({
              patches: undoPatches,
              label: `Undo ${batchPatches.length} AI suggestion${batchPatches.length === 1 ? '' : 's'}`,
            });
          }
        } else if (settings.aiPriorityMode === 'suggest') {
          const nextMap: Record<string, AiTaskSuggestion> = {};
          const taskById = new Map(openTasks.map((t) => [t.id, t]));
          for (const sug of result.suggestions) {
            const target = taskById.get(sug.id);
            if (!target) continue;
            const filtered: AiTaskSuggestion = { id: sug.id };
            if (sug.suggestedPriority && target.priority === TaskPriority.None) {
              filtered.suggestedPriority = sug.suggestedPriority;
            }
            if (
              sug.suggestedDurationMinutes &&
              (target.durationMinutes === undefined || target.durationMinutes <= 0)
            ) {
              filtered.suggestedDurationMinutes = sug.suggestedDurationMinutes;
            }
            if (filtered.suggestedPriority || filtered.suggestedDurationMinutes) {
              nextMap[sug.id] = filtered;
            }
          }
          setPendingSuggestions(nextMap);
        } else {
          setPendingSuggestions({});
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'AI sort unavailable. Using score order.';
        setAiError(message);
        setSortSource('score');
      } finally {
        setAiLoading(false);
      }
    },
    [
      aiLoading,
      onBatchUpdateTasks,
      openTasks,
      schedule,
      scoreSortedOpen,
      settings.aiDailyCap,
      settings.aiPriorityMode,
    ]
  );

  // Auto-run AI sort when Auto toggle is enabled and open tasks fingerprint changes
  const openTasksFingerprint = useMemo(
    () =>
      openTasks
        .map(
          (t) =>
            `${t.id}:${t.title}:${t.priority}:${t.dueDate ?? ''}:${t.deadlineDate ?? ''}:${t.durationMinutes ?? ''}:${Boolean(t.pinned)}`
        )
        .sort()
        .join('|'),
    [openTasks]
  );

  useEffect(() => {
    if (!settings.aiAutoSort) {
      lastAutoFingerprintRef.current = '';
      return;
    }
    if (openTasks.length === 0) return;
    if (lastAutoFingerprintRef.current === openTasksFingerprint) return;

    const timer = window.setTimeout(() => {
      lastAutoFingerprintRef.current = openTasksFingerprint;
      void runAiSort(true);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [settings.aiAutoSort, openTasks.length, openTasksFingerprint, runAiSort]);

  const orderedOpenTasks = useMemo(() => {
    if (sortSource === 'ai' && aiResult && aiResult.orderedTaskIds.length > 0) {
      return applyAiOrderWithPinnedLock(scoreSortedOpen, aiResult.orderedTaskIds);
    }
    return scoreSortedOpen;
  }, [aiResult, scoreSortedOpen, sortSource]);

  const unestimatedOpenCount = useMemo(
    () =>
      openTasks.filter((t) => typeof t.durationMinutes !== 'number' || t.durationMinutes <= 0)
        .length,
    [openTasks]
  );

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const completedTasks = scoreSortedAll.filter((t) => t.completed);

    let basePool: TaskItem[];
    if (availableMinutes !== null) {
      const fitting = filterTasksFittingMinutes(
        orderedOpenTasks,
        availableMinutes,
        settings.smartSortMode,
        settings.quickWinMinutes,
        todayKey
      );
      basePool = sortSource === 'ai' && aiResult
        ? orderedOpenTasks.filter(
            (t) =>
              typeof t.durationMinutes === 'number' &&
              t.durationMinutes > 0 &&
              t.durationMinutes <= availableMinutes
          )
        : fitting;
    } else if (statusFilter === 'active') {
      basePool = orderedOpenTasks;
    } else if (statusFilter === 'completed') {
      basePool = completedTasks;
    } else {
      basePool = [...orderedOpenTasks, ...completedTasks];
    }

    return basePool.filter((t) => {
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
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
  }, [
    aiResult,
    availableMinutes,
    categoryFilter,
    orderedOpenTasks,
    scoreSortedAll,
    search,
    settings.quickWinMinutes,
    settings.smartSortMode,
    sortSource,
    statusFilter,
    todayKey,
  ]);

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
      durationSource: minutes ? 'user' : undefined,
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

  const handleAcceptSuggestion = (
    task: TaskItem,
    field: 'priority' | 'duration'
  ) => {
    const sug = pendingSuggestions[task.id];
    if (!sug) return;
    if (field === 'priority' && sug.suggestedPriority) {
      setLastAiUndo({
        patches: [
          {
            id: task.id,
            prev: { priority: task.priority, prioritySource: task.prioritySource },
          },
        ],
        label: 'Undo AI priority change',
      });
      onUpdateTask(task.id, {
        priority: sug.suggestedPriority,
        prioritySource: 'ai',
      });
      setPendingSuggestions((prev) => {
        const cur = prev[task.id];
        if (!cur) return prev;
        const nextItem = { ...cur, suggestedPriority: undefined };
        const copy = { ...prev };
        if (!nextItem.suggestedPriority && !nextItem.suggestedDurationMinutes) {
          delete copy[task.id];
        } else {
          copy[task.id] = nextItem;
        }
        return copy;
      });
    } else if (field === 'duration' && sug.suggestedDurationMinutes) {
      setLastAiUndo({
        patches: [
          {
            id: task.id,
            prev: {
              durationMinutes: task.durationMinutes,
              durationSource: task.durationSource,
            },
          },
        ],
        label: 'Undo AI duration change',
      });
      onUpdateTask(task.id, {
        durationMinutes: sug.suggestedDurationMinutes,
        durationSource: 'ai',
      });
      setPendingSuggestions((prev) => {
        const cur = prev[task.id];
        if (!cur) return prev;
        const nextItem = { ...cur, suggestedDurationMinutes: undefined };
        const copy = { ...prev };
        if (!nextItem.suggestedPriority && !nextItem.suggestedDurationMinutes) {
          delete copy[task.id];
        } else {
          copy[task.id] = nextItem;
        }
        return copy;
      });
    }
  };

  const handleIgnoreSuggestion = (taskId: string, field: 'priority' | 'duration') => {
    setPendingSuggestions((prev) => {
      const cur = prev[taskId];
      if (!cur) return prev;
      const nextItem = {
        ...cur,
        ...(field === 'priority' ? { suggestedPriority: undefined } : {}),
        ...(field === 'duration' ? { suggestedDurationMinutes: undefined } : {}),
      };
      const copy = { ...prev };
      if (!nextItem.suggestedPriority && !nextItem.suggestedDurationMinutes) {
        delete copy[taskId];
      } else {
        copy[taskId] = nextItem;
      }
      return copy;
    });
  };

  const handleUndoLastAi = () => {
    if (!lastAiUndo) return;
    onBatchUpdateTasks(lastAiUndo.patches.map((p) => ({ id: p.id, patch: p.prev })));
    setLastAiUndo(null);
  };

  const handleApplyAiOrder = () => {
    setAiOrderApplied(true);
    setSortSource('ai');
  };

  const handleDiscardAiOrder = () => {
    setAiResult(null);
    setAiOrderApplied(false);
    setSortSource('score');
    setPendingSuggestions({});
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

          {/* AI Sort & Auto Toggle */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121927] overflow-hidden">
            <button
              type="button"
              onClick={() => void runAiSort(false)}
              disabled={aiLoading || openTasks.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 transition-colors whitespace-nowrap"
            >
              <Sparkles className={`w-3.5 h-3.5 text-indigo-500 ${aiLoading ? 'animate-pulse' : ''}`} />
              <span>{aiLoading ? 'Sorting...' : 'AI sort'}</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ aiAutoSort: !settings.aiAutoSort })}
              aria-pressed={settings.aiAutoSort}
              title="Automatically run AI sort when open tasks change"
              className={`px-2.5 py-2 text-xs font-medium border-l border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap ${
                settings.aiAutoSort
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Auto {settings.aiAutoSort ? 'On' : 'Off'}
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

      {/* Non-blocking AI Error / Status Banner */}
      {aiError && (
        <div
          role="status"
          className="cadence-card bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{aiError}</span>
          </div>
          <button
            type="button"
            onClick={() => setAiError(null)}
            aria-label="Dismiss AI status message"
            className="p-1 rounded hover:bg-amber-200/40 dark:hover:bg-amber-800/40"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* AI Order Control Bar (Apply / Discard / Fall back to Score order / Undo) */}
      {(aiResult || lastAiUndo) && (
        <div className="cadence-card bg-white dark:bg-[#121927] border border-indigo-200 dark:border-indigo-900/60 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {sortSource === 'ai'
                ? aiOrderApplied
                  ? 'AI order applied · Pinned tasks locked'
                  : 'AI order preview · Pinned tasks locked'
                : 'Showing deterministic score order'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {aiResult && (
              <>
                <div className="inline-flex items-center p-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setSortSource('score')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      sortSource === 'score'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Score order
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortSource('ai')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      sortSource === 'ai'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    AI order
                  </button>
                </div>

                {!aiOrderApplied && sortSource === 'ai' && (
                  <button
                    type="button"
                    onClick={handleApplyAiOrder}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    <span>Apply AI order</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDiscardAiOrder}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Discard
                </button>
              </>
            )}

            {lastAiUndo && (
              <button
                type="button"
                onClick={handleUndoLastAi}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{lastAiUndo.label}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter, Smart Order & Time-Fit Toolbar */}
      <div className="editorial-rise editorial-rise-2 editorial-toolbar cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks, details, or subtasks..."
              aria-label="Search tasks"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {viewMode === 'list' && availableMinutes === null && (
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

            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'All' | TaskCategory)}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-600"
            >
              <option value="All">All Categories</option>
              {Object.values(TaskCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              aria-label="Smart order mode"
              value={settings.smartSortMode}
              onChange={(e) => {
                onUpdateSettings({ smartSortMode: e.target.value as SmartSortMode });
                setSortSource('score');
              }}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-600"
            >
              {(Object.keys(SORT_MODE_LABELS) as SmartSortMode[]).map((mode) => (
                <option key={mode} value={mode}>
                  Smart: {SORT_MODE_LABELS[mode]}
                </option>
              ))}
            </select>

            {/* "I have X minutes" input */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <label htmlFor="tasks-have-minutes" className="text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                I have
              </label>
              <input
                id="tasks-have-minutes"
                type="number"
                min={1}
                max={480}
                value={availableMinutesInput}
                onChange={(e) => setAvailableMinutesInput(e.target.value)}
                placeholder="min"
                aria-label="I have X minutes available"
                className="w-14 px-1.5 py-0.5 rounded text-xs font-mono tabular-nums bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">min</span>
              {availableMinutes !== null && (
                <button
                  type="button"
                  onClick={() => setAvailableMinutesInput('')}
                  aria-label="Clear time filter"
                  className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {availableMinutes !== null && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span>
              Showing {filteredTasks.length} open task{filteredTasks.length === 1 ? '' : 's'} fitting within{' '}
              <strong className="text-slate-800 dark:text-slate-200">{availableMinutes} min</strong>
            </span>
            {unestimatedOpenCount > 0 && (
              <span>
                {unestimatedOpenCount} open task{unestimatedOpenCount === 1 ? ' has' : 's have'} no estimated duration
              </span>
            )}
          </div>
        )}
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
                  : availableMinutes !== null
                    ? `No tasks fit in ${availableMinutes} minutes`
                    : 'No tasks match your filters'
              }
              description={
                tasks.length === 0
                  ? 'Create your first task to organize daily priorities and track progress.'
                  : availableMinutes !== null
                    ? 'Increase your available minutes or add estimated durations to open tasks.'
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
                const isExpanded = Boolean(expandedSubtasks[task.id]);
                const sug = pendingSuggestions[task.id];
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
                            source={task.prioritySource}
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
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {task.category}
                            </span>
                          )}
                        </div>

                        {/* AI Suggest-only chips */}
                        {sug && (sug.suggestedPriority || sug.suggestedDurationMinutes) && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {sug.suggestedPriority && (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/70 dark:bg-indigo-950/30 text-xs">
                                <AiSourceBadge />
                                <span className="text-slate-700 dark:text-slate-200">
                                  Flag: <strong>{sug.suggestedPriority}</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptSuggestion(task, 'priority')}
                                  className="px-1.5 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-[11px] font-medium"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleIgnoreSuggestion(task.id, 'priority')}
                                  className="px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px]"
                                >
                                  Ignore
                                </button>
                              </div>
                            )}

                            {sug.suggestedDurationMinutes && (
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/70 dark:bg-indigo-950/30 text-xs">
                                <AiSourceBadge />
                                <span className="text-slate-700 dark:text-slate-200 font-mono tabular-nums">
                                  Est: <strong>{formatDurationLabel(sug.suggestedDurationMinutes)}</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptSuggestion(task, 'duration')}
                                  className="px-1.5 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-[11px] font-medium"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleIgnoreSuggestion(task.id, 'duration')}
                                  className="px-1.5 py-0.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px]"
                                >
                                  Ignore
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Expanded one-level subtasks */}
                        {isExpanded && subtasks.length > 0 && (
                          <ul className="mt-2 pl-2 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5">
                            {subtasks.map((st) => (
                              <li key={st.id} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleSubtask(task, st.id)}
                                  aria-label={
                                    st.completed
                                      ? `Mark subtask "${st.title}" incomplete`
                                      : `Mark subtask "${st.title}" complete`
                                  }
                                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                    st.completed
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                                  }`}
                                >
                                  {st.completed && <Check className="w-3 h-3" />}
                                </button>
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
                      {items.map((task) => (
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
                                source={task.prioritySource}
                                taskTitle={task.title}
                                compact
                                onChange={(p) => handleSetPriority(task, p)}
                              />
                              {task.durationMinutes && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
                                  <Clock className="w-3 h-3" aria-hidden="true" />
                                  {formatDurationLabel(task.durationMinutes)}
                                  {task.durationSource === 'ai' && <AiSourceBadge />}
                                </span>
                              )}
                              {task.deadlineDate && (
                                <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                  Due by {formatShortDateLabel(task.deadlineDate, todayKey)}
                                </span>
                              )}
                            </div>

                            {/* Accessible quadrant move select for keyboard/touch users */}
                            <select
                              aria-label={`Move "${task.title}" to quadrant`}
                              value={quad.id}
                              onChange={(e) =>
                                handleMoveToQuadrant(task, e.target.value as MatrixQuadrant)
                              }
                              className="px-1.5 py-0.5 rounded text-[11px] bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                            >
                              {QUADRANTS.map((q) => (
                                <option key={q.id} value={q.id}>
                                  {q.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </li>
                      ))}
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
