import { formatDateKey, getOffsetDateKey, getTodayKey } from '../data/initialData';
import {
  AppSettings,
  AppStyleId,
  AppThemeId,
  CategoryItem,
  ColorMode,
  DashboardView,
  DEFAULT_APP_SETTINGS,
  DefaultReminderOffset,
  FocusSession,
  HabitItem,
  LayoutDensity,
  MatrixImportantRule,
  NoteItem,
  ScheduleBlock,
  SmartSortMode,
  SubtaskItem,
  TaskItem,
  TaskPriority,
  TaskReminderOverride,
  TaskRepeatFrequency,
} from '../types/dashboard';
import { normalizeCategories } from './categoryUtils';

export type MatrixQuadrant = 'do-first' | 'schedule' | 'quick' | 'drop';

export const DURATION_CHIPS = [2, 5, 15, 30, 60, 120] as const;
export const MAX_TASK_DURATION_MINUTES = 1440;

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
const VALID_REMINDER_OVERRIDES = new Set<string>(['default', 'none', '0', '10', '30', '60', '1440']);
const VALID_DEFAULT_OFFSETS = new Set<string>(['0', '10', '30', '60', '1440']);

export const PRIORITY_RANK: Record<TaskPriority, number> = {
  [TaskPriority.None]: 0,
  [TaskPriority.Low]: 1,
  [TaskPriority.Medium]: 2,
  [TaskPriority.High]: 3,
};

export function normalizePriority(raw: unknown): TaskPriority {
  if (typeof raw === 'string') {
    if (VALID_PRIORITIES.has(raw)) {
      return raw as TaskPriority;
    }
    const lower = raw.trim().toLowerCase();
    if (lower === 'high' || lower === 'p1') return TaskPriority.High;
    if (lower === 'medium' || lower === 'med' || lower === 'p2') return TaskPriority.Medium;
    if (lower === 'low' || lower === 'p3') return TaskPriority.Low;
    if (lower === 'none' || lower === 'p4') return TaskPriority.None;
  }
  return TaskPriority.None;
}

/**
 * Strictly validates a YYYY-MM-DD local date key (rejecting rollovers like 2026-02-31).
 */
export function parseDateKeyLocal(dateKey: string): Date | null {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [y, m, d] = dateKey.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

export function normalizeDateKey(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return parseDateKeyLocal(trimmed) ? trimmed : undefined;
}

export function isValidTimeHHMM(timeStr: unknown): timeStr is string {
  if (typeof timeStr !== 'string') return false;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr.trim());
  return Boolean(match);
}

export function normalizeTimeHHMM(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (!match) return undefined;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export function sanitizeDurationMinutes(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) {
    return undefined;
  }
  return Math.max(1, Math.min(MAX_TASK_DURATION_MINUTES, Math.round(raw)));
}

export function normalizeReminderOverride(raw: unknown): TaskReminderOverride | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (VALID_REMINDER_OVERRIDES.has(trimmed)) {
    return trimmed as TaskReminderOverride;
  }
  return undefined;
}

/**
 * Migrates legacy, partial, or malformed TaskItem records safely:
 * - Maps legacy High / Medium / Low to matching flags
 * - Converts any legacy 'ai' source markers to 'user'
 * - Preserves rule-based 'auto' source + undo metadata
 * - Maps legacy `notes` into `details`
 * - Rejects invalid dates/times cleanly and clamps durations to 1..1440
 */
export function migrateTask(
  raw: unknown,
  fallbackIndex = 0,
  nowIso = new Date().toISOString()
): TaskItem {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const id =
    typeof rec.id === 'string' && rec.id.trim()
      ? rec.id.trim().slice(0, 128)
      : `task_migrated_${fallbackIndex}`;

  const priority = normalizePriority(rec.priority);
  const prioritySource = rec.prioritySource === 'auto' ? 'auto' : 'user';
  const priorityAutoPrev =
    rec.priorityAutoPrev !== undefined ? normalizePriority(rec.priorityAutoPrev) : undefined;
  const priorityAutoReason =
    typeof rec.priorityAutoReason === 'string' && rec.priorityAutoReason.trim()
      ? rec.priorityAutoReason.trim().slice(0, 160)
      : undefined;
  const priorityAutoLocked = Boolean(rec.priorityAutoLocked);

  const durationMinutes = sanitizeDurationMinutes(rec.durationMinutes);

  const details =
    typeof rec.details === 'string' && rec.details.trim()
      ? rec.details.slice(0, 4000)
      : typeof rec.notes === 'string' && rec.notes.trim()
        ? rec.notes.slice(0, 4000)
        : undefined;

  const subtasks: SubtaskItem[] | undefined = Array.isArray(rec.subtasks)
    ? rec.subtasks
        .filter(
          (st): st is Record<string, unknown> =>
            Boolean(st && typeof st === 'object' && typeof (st as Record<string, unknown>).title === 'string' && ((st as Record<string, unknown>).title as string).trim())
        )
        .map((st, index) => ({
          id: typeof st.id === 'string' && st.id.trim() ? st.id.trim().slice(0, 128) : `sub_${index}_${id}`,
          title: (st.title as string).trim().slice(0, 240),
          completed: Boolean(st.completed),
        }))
        .slice(0, 30)
    : undefined;

  const repeat: TaskRepeatFrequency =
    typeof rec.repeat === 'string' && VALID_REPEATS.has(rec.repeat)
      ? (rec.repeat as TaskRepeatFrequency)
      : 'none';

  const repeatWeekdays = Array.isArray(rec.repeatWeekdays)
    ? Array.from(
        new Set(
          rec.repeatWeekdays.filter(
            (d): d is number => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6
          )
        )
      ).slice(0, 7)
    : undefined;

  const category =
    typeof rec.category === 'string' && rec.category.trim()
      ? rec.category.trim().slice(0, 60)
      : undefined;

  const reminderOffset = normalizeReminderOverride(rec.reminderOffset);
  const recurrenceChildId =
    typeof rec.recurrenceChildId === 'string' && rec.recurrenceChildId.trim()
      ? rec.recurrenceChildId.trim().slice(0, 128)
      : undefined;

  const createdAt =
    typeof rec.createdAt === 'string' &&
    rec.createdAt.trim() &&
    !Number.isNaN(Date.parse(rec.createdAt))
      ? rec.createdAt
      : nowIso;

  return {
    id,
    title:
      typeof rec.title === 'string' && rec.title.trim()
        ? rec.title.trim().slice(0, 300)
        : 'Untitled Task',
    category,
    priority,
    prioritySource,
    ...(prioritySource === 'auto' && priorityAutoPrev !== undefined ? { priorityAutoPrev } : {}),
    ...(prioritySource === 'auto' && priorityAutoReason ? { priorityAutoReason } : {}),
    ...(priorityAutoLocked ? { priorityAutoLocked: true } : {}),
    dueDate: normalizeDateKey(rec.dueDate),
    dueTime: normalizeTimeHHMM(rec.dueTime),
    deadlineDate: normalizeDateKey(rec.deadlineDate),
    deadlineTime: normalizeTimeHHMM(rec.deadlineTime),
    completed: Boolean(rec.completed),
    details,
    subtasks: subtasks && subtasks.length > 0 ? subtasks : undefined,
    repeat,
    repeatWeekdays: repeat === 'custom' ? repeatWeekdays : undefined,
    ...(recurrenceChildId ? { recurrenceChildId } : {}),
    durationMinutes,
    ...(reminderOffset && reminderOffset !== 'default' ? { reminderOffset } : {}),
    pinned: Boolean(rec.pinned),
    createdAt,
  };
}

export function migrateTasks(items: unknown): TaskItem[] {
  if (!Array.isArray(items)) return [];
  const seenIds = new Set<string>();
  const result: TaskItem[] = [];
  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const migrated = migrateTask(item, index);
    if (seenIds.has(migrated.id)) {
      migrated.id = `${migrated.id}_${index}`;
    }
    seenIds.add(migrated.id);
    result.push(migrated);
  });
  return result;
}

export function validateAndMigrateSettings(raw: unknown): AppSettings {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  let styleRaw = typeof rec.style === 'string' ? rec.style : DEFAULT_APP_SETTINGS.style;
  if (styleRaw === 'editorial-atelier') styleRaw = 'editorial';
  if (styleRaw === 'aurora-glass') styleRaw = 'aurora';
  const validStyles = new Set<string>([
    'classic',
    'editorial',
    'aurora',
    'celestial',
    'doodle',
    'minimalism',
    'bento',
    'editorial-style',
    'brutalism',
    'swiss',
    'motion-3d',
    'retro',
  ]);
  const style: AppStyleId = validStyles.has(styleRaw) ? (styleRaw as AppStyleId) : 'classic';

  const validModes = new Set<string>(['light', 'dark', 'system']);
  const colorMode: ColorMode =
    typeof rec.colorMode === 'string' && validModes.has(rec.colorMode)
      ? (rec.colorMode as ColorMode)
      : DEFAULT_APP_SETTINGS.colorMode;

  const validThemes = new Set<string>(['cobalt', 'emerald', 'indigo', 'amber', 'rose', 'nord']);
  const theme: AppThemeId =
    typeof rec.theme === 'string' && validThemes.has(rec.theme)
      ? (rec.theme as AppThemeId)
      : DEFAULT_APP_SETTINGS.theme;

  const density: LayoutDensity = rec.density === 'compact' ? 'compact' : 'comfortable';
  const validViews = new Set<string>(Object.values(DashboardView));
  const rawView = typeof rec.defaultView === 'string' ? rec.defaultView : '';
  const defaultView: DashboardView =
    rawView === 'overview'
      ? DashboardView.Home
      : validViews.has(rawView)
        ? (rawView as DashboardView)
        : DEFAULT_APP_SETTINGS.defaultView;

  const categories = normalizeCategories(rec.categories);
  const defaultTaskCategory =
    typeof rec.defaultTaskCategory === 'string' &&
    categories.some((c) => c.name === rec.defaultTaskCategory)
      ? rec.defaultTaskCategory
      : categories[0].name;

  const validSort = new Set<string>(['balanced', 'priority', 'deadline', 'quick-wins']);
  const smartSortMode: SmartSortMode =
    typeof rec.smartSortMode === 'string' && validSort.has(rec.smartSortMode)
      ? (rec.smartSortMode as SmartSortMode)
      : DEFAULT_APP_SETTINGS.smartSortMode;

  const defaultFocusMinutes =
    rec.defaultFocusMinutes === 15 || rec.defaultFocusMinutes === 25 || rec.defaultFocusMinutes === 50
      ? rec.defaultFocusMinutes
      : DEFAULT_APP_SETTINGS.defaultFocusMinutes;

  const quickWinMinutes =
    typeof rec.quickWinMinutes === 'number' && Number.isFinite(rec.quickWinMinutes)
      ? Math.max(1, Math.min(60, Math.round(rec.quickWinMinutes)))
      : DEFAULT_APP_SETTINGS.quickWinMinutes;

  const matrixUrgentDays =
    typeof rec.matrixUrgentDays === 'number' && Number.isFinite(rec.matrixUrgentDays)
      ? Math.max(0, Math.min(30, Math.round(rec.matrixUrgentDays)))
      : DEFAULT_APP_SETTINGS.matrixUrgentDays;

  const defaultReminderOffset: DefaultReminderOffset =
    typeof rec.defaultReminderOffset === 'string' &&
    VALID_DEFAULT_OFFSETS.has(rec.defaultReminderOffset)
      ? (rec.defaultReminderOffset as DefaultReminderOffset)
      : DEFAULT_APP_SETTINGS.defaultReminderOffset;

  const morningReminderTime =
    normalizeTimeHHMM(rec.morningReminderTime) ?? DEFAULT_APP_SETTINGS.morningReminderTime;

  const autoRaiseHighDays =
    typeof rec.autoRaiseHighDays === 'number' && Number.isFinite(rec.autoRaiseHighDays)
      ? Math.max(0, Math.min(30, Math.round(rec.autoRaiseHighDays)))
      : DEFAULT_APP_SETTINGS.autoRaiseHighDays;

  const autoRaiseMediumDays =
    typeof rec.autoRaiseMediumDays === 'number' && Number.isFinite(rec.autoRaiseMediumDays)
      ? Math.max(0, Math.min(30, Math.round(rec.autoRaiseMediumDays)))
      : DEFAULT_APP_SETTINGS.autoRaiseMediumDays;

  const defaultDurationEstimateMinutes =
    typeof rec.defaultDurationEstimateMinutes === 'number' &&
    Number.isFinite(rec.defaultDurationEstimateMinutes)
      ? Math.max(1, Math.min(240, Math.round(rec.defaultDurationEstimateMinutes)))
      : DEFAULT_APP_SETTINGS.defaultDurationEstimateMinutes;

  return {
    colorMode,
    style,
    theme,
    highContrast: Boolean(rec.highContrast),
    density,
    reducedMotion: Boolean(rec.reducedMotion),
    defaultView,
    timeFormat: rec.timeFormat === '12h' ? '12h' : '24h',
    defaultFocusMinutes,
    defaultFocusLabel:
      typeof rec.defaultFocusLabel === 'string' && rec.defaultFocusLabel.trim()
        ? rec.defaultFocusLabel.trim().slice(0, 120)
        : DEFAULT_APP_SETTINGS.defaultFocusLabel,
    defaultTaskCategory,
    defaultTaskPriority: normalizePriority(rec.defaultTaskPriority),
    smartSortMode,
    quickWinMinutes,
    matrixImportantRule: rec.matrixImportantRule === 'high-only' ? 'high-only' : 'high-medium',
    matrixUrgentDays,
    categories,
    showFocusChart: typeof rec.showFocusChart === 'boolean' ? rec.showFocusChart : true,
    showFocusTimer: typeof rec.showFocusTimer === 'boolean' ? rec.showFocusTimer : true,
    showScratchpad: typeof rec.showScratchpad === 'boolean' ? rec.showScratchpad : true,
    showGoogleCard: typeof rec.showGoogleCard === 'boolean' ? rec.showGoogleCard : true,
    notificationsEnabled:
      typeof rec.notificationsEnabled === 'boolean' ? rec.notificationsEnabled : true,
    defaultReminderOffset,
    morningReminderTime,
    deadlineHeadsUpEnabled:
      typeof rec.deadlineHeadsUpEnabled === 'boolean' ? rec.deadlineHeadsUpEnabled : true,
    notificationSoundEnabled:
      typeof rec.notificationSoundEnabled === 'boolean' ? rec.notificationSoundEnabled : true,
    autoRaisePriorityEnabled:
      typeof rec.autoRaisePriorityEnabled === 'boolean' ? rec.autoRaisePriorityEnabled : false,
    autoRaiseHighDays,
    autoRaiseMediumDays: Math.max(autoRaiseHighDays, autoRaiseMediumDays),
    defaultDurationEstimateMinutes,
  };
}

export function validateAndMigrateSchedule(raw: unknown): ScheduleBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: ScheduleBlock[] = [];
  raw.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;
    const rec = item as Record<string, unknown>;
    const startTime = normalizeTimeHHMM(rec.startTime) ?? '09:00';
    const endTime = normalizeTimeHHMM(rec.endTime) ?? '10:00';
    const title =
      typeof rec.title === 'string' && rec.title.trim()
        ? rec.title.trim().slice(0, 200)
        : 'Untitled Block';
    const category =
      typeof rec.category === 'string' && rec.category.trim()
        ? rec.category.trim().slice(0, 60)
        : 'Work';
    out.push({
      id: typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : `sched_m_${idx}`,
      title,
      startTime,
      endTime,
      category,
      location:
        typeof rec.location === 'string' && rec.location.trim()
          ? rec.location.trim().slice(0, 200)
          : undefined,
    });
  });
  return out;
}

export function validateAndMigrateHabits(raw: unknown): HabitItem[] {
  if (!Array.isArray(raw)) return [];
  const out: HabitItem[] = [];
  raw.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;
    const rec = item as Record<string, unknown>;
    const rawDays = Array.isArray(rec.completedDays) ? (rec.completedDays as unknown[]) : null;
    const completedDays = rawDays
      ? Array.from({ length: 7 }, (_, i) => Boolean(rawDays[i]))
      : [false, false, false, false, false, false, false];
    const completedDates = Array.isArray(rec.completedDates)
      ? Array.from(
          new Set(
            rec.completedDates
              .map((d) => normalizeDateKey(d))
              .filter((d): d is string => Boolean(d))
          )
        )
          .sort()
          .slice(-400)
      : [];
    const target =
      typeof rec.targetDaysPerWeek === 'number' && Number.isFinite(rec.targetDaysPerWeek)
        ? Math.max(1, Math.min(7, Math.round(rec.targetDaysPerWeek)))
        : 5;

    out.push({
      id: typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : `habit_m_${idx}`,
      name:
        typeof rec.name === 'string' && rec.name.trim()
          ? rec.name.trim().slice(0, 160)
          : 'Unnamed Habit',
      category:
        typeof rec.category === 'string' && rec.category.trim()
          ? rec.category.trim().slice(0, 60)
          : 'Focus',
      targetDaysPerWeek: target,
      completedDays,
      completedDates,
    });
  });
  return out;
}

export function validateAndMigrateFocusSessions(raw: unknown): FocusSession[] {
  if (!Array.isArray(raw)) return [];
  const out: FocusSession[] = [];
  raw.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;
    const rec = item as Record<string, unknown>;
    const minutes =
      typeof rec.minutes === 'number' && Number.isFinite(rec.minutes) && rec.minutes > 0
        ? Math.min(600, Math.round(rec.minutes))
        : 25;
    const dateKey = normalizeDateKey(rec.dateKey) ?? getTodayKey();
    const completedAt =
      typeof rec.completedAt === 'string' && !Number.isNaN(Date.parse(rec.completedAt))
        ? rec.completedAt
        : `${dateKey}T12:00:00.000Z`;
    out.push({
      id: typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : `focus_m_${idx}`,
      label:
        typeof rec.label === 'string' && rec.label.trim()
          ? rec.label.trim().slice(0, 200)
          : 'Focus sprint',
      minutes,
      dateKey,
      completedAt,
    });
  });
  return out;
}

export function validateAndMigrateNotes(raw: unknown): NoteItem[] {
  if (!Array.isArray(raw)) return [];
  const out: NoteItem[] = [];
  raw.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;
    const rec = item as Record<string, unknown>;
    out.push({
      id: typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim() : `note_m_${idx}`,
      title:
        typeof rec.title === 'string' ? rec.title.slice(0, 300) : 'Untitled Note',
      category:
        typeof rec.category === 'string' && rec.category.trim()
          ? rec.category.trim().slice(0, 80)
          : 'General',
      content: typeof rec.content === 'string' ? rec.content.slice(0, 50000) : '',
      updatedAt:
        typeof rec.updatedAt === 'string' && !Number.isNaN(Date.parse(rec.updatedAt))
          ? rec.updatedAt
          : new Date().toISOString(),
    });
  });
  return out;
}

export function validateScratchpad(raw: unknown): string {
  return typeof raw === 'string' ? raw.slice(0, 20000) : '';
}

export function diffDaysFromToday(dateKey: string, todayKey = getTodayKey()): number | null {
  const target = parseDateKeyLocal(dateKey);
  const today = parseDateKeyLocal(todayKey);
  if (!target || !today) return null;
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const base = parseDateKeyLocal(dateKey) ?? new Date();
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + deltaDays);
  return formatDateKey(next);
}

export function addMonthsClamped(dateKey: string, months: number): string {
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
 * Pure & deterministic when todayKey and nowIso are supplied.
 */
export function buildNextRecurrenceTask(
  task: TaskItem,
  newId: string,
  todayKey = getTodayKey(),
  nowIso = new Date().toISOString()
): TaskItem | null {
  const repeat = task.repeat ?? 'none';
  if (repeat === 'none') return null;

  const validDue = task.dueDate && parseDateKeyLocal(task.dueDate) ? task.dueDate : undefined;
  const validDeadline =
    task.deadlineDate && parseDateKeyLocal(task.deadlineDate) ? task.deadlineDate : undefined;

  const anchorKey = validDue || validDeadline || todayKey;
  const anchorDate = parseDateKeyLocal(anchorKey) ?? parseDateKeyLocal(todayKey) ?? new Date();

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
        anchorKey < todayKey ? parseDateKeyLocal(todayKey) ?? anchorDate : anchorDate;
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

  let nextDueDate = validDue ? nextAnchorKey : undefined;
  let nextDeadlineDate = validDeadline;

  if (validDue && validDeadline) {
    const dueDt = parseDateKeyLocal(validDue);
    const deadDt = parseDateKeyLocal(validDeadline);
    if (dueDt && deadDt) {
      const gapDays = Math.round((deadDt.getTime() - dueDt.getTime()) / (24 * 60 * 60 * 1000));
      nextDeadlineDate = addDaysToDateKey(nextAnchorKey, gapDays);
    } else {
      nextDeadlineDate = nextAnchorKey;
    }
  } else if (!validDue && validDeadline) {
    nextDeadlineDate = nextAnchorKey;
  } else if (!validDue && !validDeadline) {
    nextDueDate = nextAnchorKey;
  }

  const resetSubtasks = task.subtasks?.map((st) => ({ ...st, completed: false }));

  // Clear auto-priority lock on newly generated future occurrences and restore user baseline priority if auto-raised
  const basePriority =
    task.prioritySource === 'auto' && task.priorityAutoPrev ? task.priorityAutoPrev : task.priority;

  return {
    ...task,
    id: newId,
    priority: basePriority,
    prioritySource: 'user',
    priorityAutoPrev: undefined,
    priorityAutoReason: undefined,
    priorityAutoLocked: undefined,
    recurrenceChildId: undefined,
    dueDate: nextDueDate,
    deadlineDate: nextDeadlineDate,
    completed: false,
    subtasks: resetSubtasks,
    createdAt: nowIso,
  };
}

export interface CompleteRecurrenceResult {
  tasks: TaskItem[];
  updatedTask: TaskItem | null;
  nextOccurrence: TaskItem | null;
}

/**
 * Pure, idempotent completion helper for repeating & regular tasks.
 * Completing a repeating task twice quickly creates at most ONE next occurrence:
 * - If task is already completed when targetCompleted=true, returns no-op.
 * - If task already holds `recurrenceChildId` pointing to an active child in `tasks`, skips creating a duplicate.
 */
export function completeTaskWithRecurrence(
  tasks: TaskItem[],
  taskId: string,
  createId: () => string,
  options?: {
    targetCompleted?: boolean;
    todayKey?: string;
    nowIso?: string;
  }
): CompleteRecurrenceResult {
  const target = tasks.find((t) => t.id === taskId);
  if (!target) {
    return { tasks, updatedTask: null, nextOccurrence: null };
  }

  const nextCompleted =
    options?.targetCompleted !== undefined ? options.targetCompleted : !target.completed;

  if (nextCompleted === target.completed) {
    return { tasks, updatedTask: target, nextOccurrence: null };
  }

  const hasActiveChild =
    Boolean(target.recurrenceChildId) &&
    tasks.some((t) => t.id === target.recurrenceChildId && !t.completed);

  let nextOccurrence: TaskItem | null = null;
  if (nextCompleted && (target.repeat ?? 'none') !== 'none' && !hasActiveChild) {
    nextOccurrence = buildNextRecurrenceTask(
      target,
      createId(),
      options?.todayKey ?? getTodayKey(),
      options?.nowIso ?? new Date().toISOString()
    );
  }

  const updatedTask: TaskItem = {
    ...target,
    completed: nextCompleted,
    ...(nextOccurrence ? { recurrenceChildId: nextOccurrence.id } : {}),
  };

  const mapped = tasks.map((t) => (t.id === taskId ? updatedTask : t));
  return {
    tasks: nextOccurrence ? [nextOccurrence, ...mapped] : mapped,
    updatedTask,
    nextOccurrence,
  };
}

export interface DurationEstimate {
  minutes: number;
  isEstimated: boolean;
  source: 'explicit' | 'category-median' | 'default';
  sampleCount: number;
}

/**
 * Estimates duration for tasks without explicit durationMinutes:
 * Uses median duration of completed tasks in the same category when >= 3 samples exist;
 * otherwise falls back to the configurable default (default 15m).
 */
export function estimateTaskDuration(
  task: Pick<TaskItem, 'durationMinutes' | 'category'>,
  allTasks: ReadonlyArray<Pick<TaskItem, 'completed' | 'category' | 'durationMinutes'>>,
  fallbackMinutes = 15
): DurationEstimate {
  const explicit = sanitizeDurationMinutes(task.durationMinutes);
  if (explicit !== undefined) {
    return {
      minutes: explicit,
      isEstimated: false,
      source: 'explicit',
      sampleCount: 0,
    };
  }

  const catKey = task.category?.trim().toLowerCase();
  if (catKey) {
    const samples = allTasks
      .filter((other) => {
        if (!other.completed) return false;
        if (other.category?.trim().toLowerCase() !== catKey) return false;
        return sanitizeDurationMinutes(other.durationMinutes) !== undefined;
      })
      .map((other) => sanitizeDurationMinutes(other.durationMinutes)!)
      .sort((a, b) => a - b);

    if (samples.length >= 3) {
      const mid = Math.floor(samples.length / 2);
      const median =
        samples.length % 2 === 1
          ? samples[mid]
          : Math.round((samples[mid - 1] + samples[mid]) / 2);
      return {
        minutes: Math.max(1, Math.min(MAX_TASK_DURATION_MINUTES, median)),
        isEstimated: true,
        source: 'category-median',
        sampleCount: samples.length,
      };
    }

    return {
      minutes: sanitizeDurationMinutes(fallbackMinutes) ?? 15,
      isEstimated: true,
      source: 'default',
      sampleCount: samples.length,
    };
  }

  return {
    minutes: sanitizeDurationMinutes(fallbackMinutes) ?? 15,
    isEstimated: true,
    source: 'default',
    sampleCount: 0,
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
  todayKey = getTodayKey(),
  effectiveDurationMinutes?: number
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

  const threshold = Math.max(1, Number.isFinite(quickWinMinutes) ? quickWinMinutes : 5);
  const rawDur =
    effectiveDurationMinutes !== undefined ? effectiveDurationMinutes : task.durationMinutes;
  const safeDuration = sanitizeDurationMinutes(rawDur);
  const isQuickWin = safeDuration !== undefined && safeDuration <= threshold;
  const quickWinScore = isQuickWin ? 45 : 0;

  if (mode === 'priority') {
    return priorityScore * 2.2 + urgencyScore * 0.8 + quickWinScore * 0.5;
  }
  if (mode === 'deadline') {
    return urgencyScore * 2.2 + priorityScore * 0.7 + quickWinScore * 0.4;
  }
  if (mode === 'quick-wins') {
    const durationBonus = safeDuration !== undefined ? Math.max(0, 120 - safeDuration) : 0;
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
  todayKey = getTodayKey(),
  durationLookup?: ReadonlyMap<string, number>
): number {
  if (Boolean(a.completed) !== Boolean(b.completed)) return a.completed ? 1 : -1;
  if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;

  const estA = durationLookup?.get(a.id);
  const estB = durationLookup?.get(b.id);
  const scoreA = scoreTask(a, mode, quickWinMinutes, todayKey, estA);
  const scoreB = scoreTask(b, mode, quickWinMinutes, todayKey, estB);
  if (Math.abs(scoreB - scoreA) > 0.001) {
    return scoreB - scoreA;
  }

  // Shorter-first tie-breaking (clamped valid duration or fallback estimate)
  const validDurA = sanitizeDurationMinutes(estA ?? a.durationMinutes);
  const validDurB = sanitizeDurationMinutes(estB ?? b.durationMinutes);
  const durA = validDurA ?? Number.POSITIVE_INFINITY;
  const durB = validDurB ?? Number.POSITIVE_INFINITY;
  if (durA !== durB) {
    return durA - durB;
  }

  const dateA = normalizeDateKey(a.deadlineDate) || normalizeDateKey(a.dueDate) || '9999-99-99';
  const dateB = normalizeDateKey(b.deadlineDate) || normalizeDateKey(b.dueDate) || '9999-99-99';
  if (dateA !== dateB) {
    return dateA.localeCompare(dateB);
  }

  const createdA = typeof a.createdAt === 'string' ? a.createdAt : '';
  const createdB = typeof b.createdAt === 'string' ? b.createdAt : '';
  if (createdA !== createdB) {
    return createdA.localeCompare(createdB);
  }

  return 0;
}

export function sortTasksSmart(
  tasks: TaskItem[],
  mode: SmartSortMode,
  quickWinMinutes = 5,
  todayKey = getTodayKey(),
  defaultDurationEstimateMinutes = 15
): TaskItem[] {
  const durationLookup = new Map<string, number>();
  for (const t of tasks) {
    const est = estimateTaskDuration(t, tasks, defaultDurationEstimateMinutes);
    durationLookup.set(t.id, est.minutes);
  }

  const indexed = tasks.map((task, idx) => ({ task, idx }));
  indexed.sort((entryA, entryB) => {
    const cmp = compareTasksSmart(
      entryA.task,
      entryB.task,
      mode,
      quickWinMinutes,
      todayKey,
      durationLookup
    );
    return cmp !== 0 ? cmp : entryA.idx - entryB.idx;
  });
  return indexed.map((entry) => entry.task);
}

/**
 * Rule-based priority escalation as deadline (or due date) approaches.
 * - Off unless settings.autoRaisePriorityEnabled is true
 * - Only raises priority (never lowers), ignores completed, pinned, and user-locked tasks
 * - Records prioritySource: 'auto', priorityAutoPrev, and priorityAutoReason so Undo is exact
 */
export interface AutoPriorityChange {
  taskId: string;
  previousPriority: TaskPriority;
  newPriority: TaskPriority;
  reason: string;
}

export function computeAutoPriorityEscalations(
  tasks: TaskItem[],
  settings: Pick<
    AppSettings,
    'autoRaisePriorityEnabled' | 'autoRaiseHighDays' | 'autoRaiseMediumDays'
  >,
  todayKey = getTodayKey()
): { tasks: TaskItem[]; changes: AutoPriorityChange[] } {
  if (!settings.autoRaisePriorityEnabled) {
    return { tasks, changes: [] };
  }

  const highDays = Math.max(0, Math.min(30, Math.round(settings.autoRaiseHighDays)));
  const medDays = Math.max(highDays, Math.min(30, Math.round(settings.autoRaiseMediumDays)));

  const changes: AutoPriorityChange[] = [];
  let mutated = false;

  const nextTasks = tasks.map((task) => {
    if (task.completed || task.pinned || task.priorityAutoLocked) {
      return task;
    }
    const targetDate = normalizeDateKey(task.deadlineDate) ?? normalizeDateKey(task.dueDate);
    if (!targetDate) return task;

    const daysLeft = diffDaysFromToday(targetDate, todayKey);
    if (daysLeft === null) return task;

    let targetPriority: TaskPriority | null = null;
    let reason = '';
    const dateKind = task.deadlineDate ? 'Deadline' : 'Due';

    if (daysLeft <= highDays) {
      targetPriority = TaskPriority.High;
      reason =
        daysLeft < 0
          ? `${dateKind} overdue`
          : daysLeft === 0
            ? `${dateKind} today`
            : `${dateKind} in ${daysLeft}d`;
    } else if (daysLeft <= medDays) {
      targetPriority = TaskPriority.Medium;
      reason = `${dateKind} in ${daysLeft}d`;
    }

    if (!targetPriority) return task;

    // Only raise, never lower
    if (PRIORITY_RANK[targetPriority] <= PRIORITY_RANK[task.priority]) {
      return task;
    }

    mutated = true;
    const prevBaseline =
      task.prioritySource === 'auto' && task.priorityAutoPrev !== undefined
        ? task.priorityAutoPrev
        : task.priority;

    changes.push({
      taskId: task.id,
      previousPriority: prevBaseline,
      newPriority: targetPriority,
      reason,
    });

    return {
      ...task,
      priority: targetPriority,
      prioritySource: 'auto' as const,
      priorityAutoPrev: prevBaseline,
      priorityAutoReason: reason,
    };
  });

  return {
    tasks: mutated ? nextTasks : tasks,
    changes,
  };
}

export function undoAutoPriorityEscalation(task: TaskItem): Partial<TaskItem> {
  const restoredPriority = task.priorityAutoPrev ?? TaskPriority.None;
  return {
    priority: restoredPriority,
    prioritySource: 'user',
    priorityAutoPrev: undefined,
    priorityAutoReason: undefined,
    priorityAutoLocked: true,
  };
}

/**
 * Pure category deletion helper: removes a category (if > 1 remains) and reassigns all
 * tasks and schedule blocks referencing it to a valid remaining category.
 */
export function computeCategoryDeletion(
  categories: CategoryItem[],
  tasks: TaskItem[],
  schedule: ScheduleBlock[],
  defaultTaskCategory: string,
  categoryIdToDelete: string,
  reassignToName?: string
): {
  deleted: boolean;
  categories: CategoryItem[];
  tasks: TaskItem[];
  schedule: ScheduleBlock[];
  defaultTaskCategory: string;
  deletedName?: string;
  reassignedTo?: string;
} {
  if (categories.length <= 1) {
    return {
      deleted: false,
      categories,
      tasks,
      schedule,
      defaultTaskCategory,
    };
  }

  const target = categories.find((c) => c.id === categoryIdToDelete);
  if (!target) {
    return {
      deleted: false,
      categories,
      tasks,
      schedule,
      defaultTaskCategory,
    };
  }

  const remaining = categories.filter((c) => c.id !== categoryIdToDelete);
  const targetNameLower = target.name.trim().toLowerCase();
  const fallbackTarget =
    reassignToName && remaining.some((c) => c.name === reassignToName)
      ? reassignToName
      : remaining[0].name;

  const nextTasks = tasks.map((t) =>
    t.category && t.category.trim().toLowerCase() === targetNameLower
      ? { ...t, category: fallbackTarget }
      : t
  );

  const nextSchedule = schedule.map((b) =>
    b.category && b.category.trim().toLowerCase() === targetNameLower
      ? { ...b, category: fallbackTarget }
      : b
  );

  const nextDefault =
    defaultTaskCategory.trim().toLowerCase() === targetNameLower
      ? fallbackTarget
      : defaultTaskCategory;

  return {
    deleted: true,
    categories: remaining,
    tasks: nextTasks,
    schedule: nextSchedule,
    defaultTaskCategory: nextDefault,
    deletedName: target.name,
    reassignedTo: fallbackTarget,
  };
}

function normalizeTitleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length > 1);
}

/**
 * Finds open tasks whose title closely matches the draft title (exact normalized match,
 * containment for non-trivial strings, or >= 0.72 Jaccard token overlap).
 */
export function findSimilarOpenTasks(
  candidateTitle: string,
  tasks: ReadonlyArray<TaskItem>,
  excludeTaskId?: string
): TaskItem[] {
  const clean = candidateTitle.trim().toLowerCase().replace(/\s+/g, ' ');
  if (clean.length < 3) return [];

  const candTokens = new Set(normalizeTitleTokens(clean));
  if (candTokens.size === 0) return [];

  const matches: Array<{ task: TaskItem; score: number }> = [];

  for (const task of tasks) {
    if (task.completed || task.id === excludeTaskId) continue;
    const otherClean = task.title.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!otherClean) continue;

    if (otherClean === clean) {
      matches.push({ task, score: 1 });
      continue;
    }

    if (clean.length >= 6 && (otherClean.includes(clean) || clean.includes(otherClean))) {
      const ratio = Math.min(clean.length, otherClean.length) / Math.max(clean.length, otherClean.length);
      if (ratio >= 0.55) {
        matches.push({ task, score: ratio });
        continue;
      }
    }

    const otherTokens = new Set(normalizeTitleTokens(otherClean));
    if (otherTokens.size === 0) continue;

    let intersection = 0;
    for (const tok of candTokens) {
      if (otherTokens.has(tok)) intersection += 1;
    }
    const union = candTokens.size + otherTokens.size - intersection;
    const jaccard = union > 0 ? intersection / union : 0;
    if (jaccard >= 0.65 && intersection >= 2) {
      matches.push({ task, score: jaccard });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((m) => m.task);
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
    const safeFutureKey = addDaysToDateKey(todayKey, Math.max(1, settings.matrixUrgentDays) + 3);
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
    priorityAutoPrev: undefined,
    priorityAutoReason: undefined,
    deadlineDate: nextDeadlineDate,
    dueDate: nextDueDate,
  };
}

export function formatDurationLabel(minutes?: number): string {
  const valid = sanitizeDurationMinutes(minutes);
  if (!valid) return '';
  if (valid < 60) return `${valid}m`;
  const hrs = Math.floor(valid / 60);
  const rem = valid % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export function formatTimeShort(hhmm: string | undefined, format: '24h' | '12h'): string {
  if (!hhmm || !isValidTimeHHMM(hhmm)) return '';
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
