import { formatDateKey, getOffsetDateKey, getTodayKey } from '../data/initialData';
import {
  AppSettings,
  MatrixImportantRule,
  SmartSortMode,
  SubtaskItem,
  TaskItem,
  TaskPriority,
  TaskRepeatFrequency,
} from '../types/dashboard';

export type MatrixQuadrant = 'do-first' | 'schedule' | 'quick' | 'drop';

export const DURATION_CHIPS = [2, 5, 15, 30, 60, 120] as const;

export const WEEKDAY_OPTIONS: Array<{ value: number; short: string; label: string }> = [
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
  { value: 6, short: 'Sat', label: 'Saturday' },
  { value: 0, short: 'Sun', label: 'Sunday' },
];

const VALID_PRIORITIES = new Set<string>(Object.values(TaskPriority));
const VALID_REPEATS = new Set<string>(['none', 'daily', 'weekly', 'monthly', 'custom']);

export function normalizePriority(raw: unknown): TaskPriority {
  if (typeof raw === 'string' && VALID_PRIORITIES.has(raw)) {
    return raw as TaskPriority;
  }
  return TaskPriority.None;
}

/**
 * Migrates legacy or partial TaskItem records safely:
 * - Maps legacy High / Medium / Low to matching flags with prioritySource: 'user'
 * - Converts any legacy 'ai' source markers to 'user'
 * - Maps legacy `notes` into `details`
 * - Preserves custom category names cleanly
 * - Ensures missing priority defaults to TaskPriority.None
 */
export function migrateTask(raw: Partial<TaskItem> & { id: string; title?: string }): TaskItem {
  const priority = normalizePriority(raw.priority);
  const prioritySource = 'user' as const;

  const durationMinutes =
    typeof raw.durationMinutes === 'number' && Number.isFinite(raw.durationMinutes) && raw.durationMinutes > 0
      ? Math.round(raw.durationMinutes)
      : undefined;

  const details =
    typeof raw.details === 'string' && raw.details.trim()
      ? raw.details
      : typeof raw.notes === 'string' && raw.notes.trim()
        ? raw.notes
        : undefined;

  const subtasks: SubtaskItem[] | undefined = Array.isArray(raw.subtasks)
    ? raw.subtasks
        .filter((st): st is SubtaskItem => Boolean(st && typeof st.title === 'string' && st.title.trim()))
        .map((st, index) => ({
          id: typeof st.id === 'string' && st.id ? st.id : `sub_${index}_${Date.now()}`,
          title: st.title.trim().slice(0, 240),
          completed: Boolean(st.completed),
        }))
        .slice(0, 30)
    : undefined;

  const repeat: TaskRepeatFrequency =
    typeof raw.repeat === 'string' && VALID_REPEATS.has(raw.repeat)
      ? (raw.repeat as TaskRepeatFrequency)
      : 'none';

  const repeatWeekdays = Array.isArray(raw.repeatWeekdays)
    ? Array.from(
        new Set(
          raw.repeatWeekdays.filter(
            (d): d is number => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6
          )
        )
      )
    : undefined;

  const category =
    typeof raw.category === 'string' && raw.category.trim()
      ? raw.category.trim().slice(0, 60)
      : undefined;

  return {
    id: raw.id,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Untitled Task',
    category,
    priority,
    prioritySource,
    dueDate: typeof raw.dueDate === 'string' && raw.dueDate.trim() ? raw.dueDate.trim() : undefined,
    dueTime: typeof raw.dueTime === 'string' && raw.dueTime.trim() ? raw.dueTime.trim() : undefined,
    deadlineDate:
      typeof raw.deadlineDate === 'string' && raw.deadlineDate.trim()
        ? raw.deadlineDate.trim()
        : undefined,
    deadlineTime:
      typeof raw.deadlineTime === 'string' && raw.deadlineTime.trim()
        ? raw.deadlineTime.trim()
        : undefined,
    completed: Boolean(raw.completed),
    details,
    subtasks: subtasks && subtasks.length > 0 ? subtasks : undefined,
    repeat,
    repeatWeekdays: repeat === 'custom' ? repeatWeekdays : undefined,
    durationMinutes,
    pinned: Boolean(raw.pinned),
    createdAt: typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : new Date().toISOString(),
  };
}

export function migrateTasks(items: Array<Partial<TaskItem> & { id: string }>): TaskItem[] {
  return items.map((item) => migrateTask(item));
}

function parseDateKeyLocal(dateKey: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export function diffDaysFromToday(dateKey: string, todayKey = getTodayKey()): number | null {
  const target = parseDateKeyLocal(dateKey);
  const today = parseDateKeyLocal(todayKey);
  if (!target || !today) return null;
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const base = parseDateKeyLocal(dateKey) ?? new Date();
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + deltaDays);
  return formatDateKey(next);
}

function addMonthsClamped(dateKey: string, months: number): string {
  const base = parseDateKeyLocal(dateKey) ?? new Date();
  const targetMonth = base.getMonth() + months;
  const targetYear = base.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDayOfTarget = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const day = Math.min(base.getDate(), lastDayOfTarget);
  return formatDateKey(new Date(targetYear, normalizedMonth, day));
}

/**
 * Generates the next task occurrence when a repeating task is marked completed.
 */
export function buildNextRecurrenceTask(task: TaskItem, newId: string): TaskItem | null {
  const repeat = task.repeat ?? 'none';
  if (repeat === 'none') return null;

  const todayKey = getTodayKey();
  const anchorKey = task.dueDate || task.deadlineDate || todayKey;
  const anchorDate = parseDateKeyLocal(anchorKey) ?? new Date();

  let nextAnchorKey = todayKey;

  if (repeat === 'daily') {
    const base = anchorKey < todayKey ? todayKey : anchorKey;
    nextAnchorKey = addDaysToDateKey(base, 1);
  } else if (repeat === 'weekly') {
    const base = anchorKey < todayKey ? todayKey : anchorKey;
    nextAnchorKey = addDaysToDateKey(base, 7);
  } else if (repeat === 'monthly') {
    const base = anchorKey < todayKey ? todayKey : anchorKey;
    nextAnchorKey = addMonthsClamped(base, 1);
  } else if (repeat === 'custom') {
    const weekdays = (task.repeatWeekdays ?? []).filter((d) => d >= 0 && d <= 6);
    if (weekdays.length === 0) {
      const base = anchorKey < todayKey ? todayKey : anchorKey;
      nextAnchorKey = addDaysToDateKey(base, 7);
    } else {
      const startDate =
        anchorKey < todayKey ? parseDateKeyLocal(todayKey)! : anchorDate;
      for (let offset = 1; offset <= 14; offset++) {
        const cand = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate() + offset
        );
        if (weekdays.includes(cand.getDay())) {
          nextAnchorKey = formatDateKey(cand);
          break;
        }
      }
    }
  }

  let nextDueDate = task.dueDate ? nextAnchorKey : undefined;
  let nextDeadlineDate = task.deadlineDate;

  if (task.dueDate && task.deadlineDate) {
    const dueDt = parseDateKeyLocal(task.dueDate);
    const deadDt = parseDateKeyLocal(task.deadlineDate);
    if (dueDt && deadDt) {
      const gapDays = Math.round((deadDt.getTime() - dueDt.getTime()) / (24 * 60 * 60 * 1000));
      nextDeadlineDate = addDaysToDateKey(nextAnchorKey, gapDays);
    } else {
      nextDeadlineDate = nextAnchorKey;
    }
  } else if (!task.dueDate && task.deadlineDate) {
    nextDeadlineDate = nextAnchorKey;
  } else if (!task.dueDate && !task.deadlineDate) {
    nextDueDate = nextAnchorKey;
  }

  const resetSubtasks = task.subtasks?.map((st) => ({ ...st, completed: false }));

  return {
    ...task,
    id: newId,
    dueDate: nextDueDate,
    deadlineDate: nextDeadlineDate,
    completed: false,
    subtasks: resetSubtasks,
    createdAt: new Date().toISOString(),
  };
}

export function getUrgencyDays(task: TaskItem, todayKey = getTodayKey()): number | null {
  const candidates: number[] = [];
  if (task.deadlineDate) {
    const d = diffDaysFromToday(task.deadlineDate, todayKey);
    if (d !== null) candidates.push(d);
  }
  if (task.dueDate) {
    const d = diffDaysFromToday(task.dueDate, todayKey);
    if (d !== null) candidates.push(d);
  }
  if (candidates.length === 0) return null;
  return Math.min(...candidates);
}

function getDeadlineDays(task: TaskItem, todayKey = getTodayKey()): number | null {
  if (!task.deadlineDate) return null;
  return diffDaysFromToday(task.deadlineDate, todayKey);
}

export function scoreTask(
  task: TaskItem,
  mode: SmartSortMode,
  quickWinMinutes = 5,
  todayKey = getTodayKey()
): number {
  const priorityWeights: Record<TaskPriority, number> = {
    [TaskPriority.High]: 90,
    [TaskPriority.Medium]: 55,
    [TaskPriority.Low]: 25,
    [TaskPriority.None]: 0,
  };

  const days = getUrgencyDays(task, todayKey);
  const deadlineDays = getDeadlineDays(task, todayKey);

  let urgencyScore = 0;
  if (days !== null) {
    if (days < 0) urgencyScore = 130 + Math.min(40, Math.abs(days) * 6); // Overdue highest
    else if (days === 0) urgencyScore = 115; // Due today
    else if (days === 1) urgencyScore = 88;
    else if (days === 2) urgencyScore = 72;
    else if (days <= 5) urgencyScore = 50 - (days - 2) * 8;
    else if (days <= 14) urgencyScore = Math.max(8, 28 - (days - 5) * 2);
    else urgencyScore = 4;
  }

  // Extra nudge if explicit deadline is overdue or imminent
  if (deadlineDays !== null && deadlineDays <= 1) {
    urgencyScore += deadlineDays < 0 ? 25 : deadlineDays === 0 ? 18 : 10;
  }

  const priorityScore = priorityWeights[task.priority] ?? 0;

  const threshold = Math.max(1, quickWinMinutes);
  const isQuickWin =
    typeof task.durationMinutes === 'number' &&
    task.durationMinutes > 0 &&
    task.durationMinutes <= threshold;
  const quickWinScore = isQuickWin ? 45 : 0;

  if (mode === 'priority') {
    return priorityScore * 2.2 + urgencyScore * 0.8 + quickWinScore * 0.5;
  }
  if (mode === 'deadline') {
    return urgencyScore * 2.2 + priorityScore * 0.7 + quickWinScore * 0.4;
  }
  if (mode === 'quick-wins') {
    const durationBonus =
      typeof task.durationMinutes === 'number' && task.durationMinutes > 0
        ? Math.max(0, 120 - task.durationMinutes)
        : 0;
    return quickWinScore * 2.6 + durationBonus * 0.6 + urgencyScore * 0.8 + priorityScore * 0.6;
  }

  // Balanced mode
  return urgencyScore + priorityScore + quickWinScore;
}

export function compareTasksSmart(
  a: TaskItem,
  b: TaskItem,
  mode: SmartSortMode,
  quickWinMinutes = 5,
  todayKey = getTodayKey()
): number {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;

  const scoreA = scoreTask(a, mode, quickWinMinutes, todayKey);
  const scoreB = scoreTask(b, mode, quickWinMinutes, todayKey);
  if (Math.abs(scoreB - scoreA) > 0.001) {
    return scoreB - scoreA;
  }

  // Shorter-first tie-breaking
  const durA = typeof a.durationMinutes === 'number' ? a.durationMinutes : Number.POSITIVE_INFINITY;
  const durB = typeof b.durationMinutes === 'number' ? b.durationMinutes : Number.POSITIVE_INFINITY;
  if (durA !== durB) {
    return durA - durB;
  }

  const dateA = a.deadlineDate || a.dueDate || '9999-99-99';
  const dateB = b.deadlineDate || b.dueDate || '9999-99-99';
  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }

  return a.createdAt.localeCompare(b.createdAt);
}

export function sortTasksSmart(
  tasks: TaskItem[],
  mode: SmartSortMode,
  quickWinMinutes = 5,
  todayKey = getTodayKey()
): TaskItem[] {
  return [...tasks].sort((a, b) => compareTasksSmart(a, b, mode, quickWinMinutes, todayKey));
}

export function isTaskImportant(task: TaskItem, rule: MatrixImportantRule): boolean {
  if (rule === 'high-only') {
    return task.priority === TaskPriority.High;
  }
  return task.priority === TaskPriority.High || task.priority === TaskPriority.Medium;
}

export function isTaskUrgent(
  task: TaskItem,
  urgentDays: number,
  todayKey = getTodayKey()
): boolean {
  const threshold = Math.max(0, urgentDays);
  if (task.deadlineDate) {
    const d = diffDaysFromToday(task.deadlineDate, todayKey);
    if (d !== null && d <= threshold) return true;
  }
  if (task.dueDate) {
    const d = diffDaysFromToday(task.dueDate, todayKey);
    // Overdue due dates are urgent; due today counts as urgent when threshold >= 0
    if (d !== null && d < 0) return true;
    if (!task.deadlineDate && d !== null && d <= threshold) return true;
  }
  return false;
}

export function classifyTaskQuadrant(
  task: TaskItem,
  settings: Pick<AppSettings, 'matrixImportantRule' | 'matrixUrgentDays'>,
  todayKey = getTodayKey()
): MatrixQuadrant {
  const important = isTaskImportant(task, settings.matrixImportantRule);
  const urgent = isTaskUrgent(task, settings.matrixUrgentDays, todayKey);

  if (important && urgent) return 'do-first';
  if (important && !urgent) return 'schedule';
  if (!important && urgent) return 'quick';
  return 'drop';
}

/**
 * Computes field mutations when a task is dragged/moved into an Eisenhower quadrant.
 * Always attributes priority changes to 'user'.
 */
export function computeQuadrantDropPatch(
  task: TaskItem,
  targetQuadrant: MatrixQuadrant,
  settings: Pick<AppSettings, 'matrixImportantRule' | 'matrixUrgentDays'>,
  todayKey = getTodayKey()
): Partial<TaskItem> {
  const wantsImportant = targetQuadrant === 'do-first' || targetQuadrant === 'schedule';
  const wantsUrgent = targetQuadrant === 'do-first' || targetQuadrant === 'quick';

  let nextPriority = task.priority;
  if (wantsImportant) {
    if (!isTaskImportant(task, settings.matrixImportantRule)) {
      if (settings.matrixImportantRule === 'high-only') {
        nextPriority = TaskPriority.High;
      } else {
        nextPriority = targetQuadrant === 'do-first' ? TaskPriority.High : TaskPriority.Medium;
      }
    }
  } else if (isTaskImportant(task, settings.matrixImportantRule)) {
    nextPriority = targetQuadrant === 'drop' ? TaskPriority.None : TaskPriority.Low;
  }

  let nextDeadlineDate = task.deadlineDate;
  let nextDueDate = task.dueDate;

  if (wantsUrgent) {
    if (!isTaskUrgent(task, settings.matrixUrgentDays, todayKey)) {
      nextDeadlineDate = todayKey;
    }
  } else {
    const safeFutureKey = getOffsetDateKey(Math.max(1, settings.matrixUrgentDays) + 3);
    if (nextDeadlineDate) {
      const d = diffDaysFromToday(nextDeadlineDate, todayKey);
      if (d !== null && d <= settings.matrixUrgentDays) {
        nextDeadlineDate = targetQuadrant === 'drop' ? undefined : safeFutureKey;
      }
    }
    if (nextDueDate) {
      const d = diffDaysFromToday(nextDueDate, todayKey);
      if (d !== null && d <= settings.matrixUrgentDays) {
        nextDueDate = targetQuadrant === 'drop' ? undefined : safeFutureKey;
      }
    }
  }

  return {
    priority: nextPriority,
    prioritySource: 'user',
    deadlineDate: nextDeadlineDate,
    dueDate: nextDueDate,
  };
}

export function formatDurationLabel(minutes?: number): string {
  if (!minutes || minutes <= 0) return '';
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export function formatTimeShort(hhmm: string | undefined, format: '24h' | '12h'): string {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return '';
  if (format === '24h') return hhmm;
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${period}`;
}

export function formatShortDateLabel(
  dateKey: string | undefined,
  todayKey = getTodayKey()
): string {
  if (!dateKey) return '';
  const diff = diffDaysFromToday(dateKey, todayKey);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const parsed = parseDateKeyLocal(dateKey);
  if (!parsed) return dateKey;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatRepeatLabel(task: Pick<TaskItem, 'repeat' | 'repeatWeekdays'>): string {
  const r = task.repeat ?? 'none';
  if (r === 'none') return '';
  if (r === 'daily') return 'Daily';
  if (r === 'weekly') return 'Weekly';
  if (r === 'monthly') return 'Monthly';
  const days = (task.repeatWeekdays ?? [])
    .map((d) => WEEKDAY_OPTIONS.find((w) => w.value === d)?.short)
    .filter(Boolean);
  return days.length > 0 ? days.join(', ') : 'Custom';
}
