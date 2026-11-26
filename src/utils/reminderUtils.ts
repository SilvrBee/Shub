import {
  AppSettings,
  DefaultReminderOffset,
  ReminderRecord,
  ReminderTrigger,
  TaskItem,
} from '../types/dashboard';
import {
  addDaysToDateKey,
  formatTimeShort,
  normalizeTimeHHMM,
  parseDateKeyLocal,
} from './taskUtils';

const LIVE_REMINDER_WINDOW_MS = 90 * 1000;
const MAX_CATCHUP_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const DEFAULT_FIRED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function buildLocalTimestampMs(dateKey: string, timeHHMM: string): number | null {
  const dateObj = parseDateKeyLocal(dateKey);
  if (!dateObj) return null;
  const cleanTime = normalizeTimeHHMM(timeHHMM);
  if (!cleanTime) return null;
  const [h, m] = cleanTime.split(':').map(Number);
  const dt = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), h, m, 0, 0);
  const ms = dt.getTime();
  return Number.isNaN(ms) ? null : ms;
}

function formatOffsetHuman(offsetMinutes: number): string {
  if (offsetMinutes <= 0) return 'Due now';
  if (offsetMinutes === 60) return 'Due in 1 hour';
  if (offsetMinutes === 1440) return 'Due in 1 day';
  return `Due in ${offsetMinutes} min`;
}

/**
 * Resolves the effective lead minutes before due time for a task, or null if disabled ('none').
 */
export function resolveTaskOffsetMinutes(
  task: Pick<TaskItem, 'reminderOffset'>,
  defaultOffset: DefaultReminderOffset
): number | null {
  if (task.reminderOffset === 'none') return null;
  const raw =
    task.reminderOffset && task.reminderOffset !== 'default'
      ? task.reminderOffset
      : defaultOffset;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 30;
}

/**
 * Pure computation of reminder triggers for a single open task from task & settings timestamps.
 * Never depends on DOM or timers. Editing dates/times/override changes the triggerKey fingerprint
 * so updated schedules fire cleanly without stale suppression.
 */
export function computeTaskReminderTriggers(
  task: TaskItem,
  settings: Pick<
    AppSettings,
    | 'notificationsEnabled'
    | 'defaultReminderOffset'
    | 'morningReminderTime'
    | 'deadlineHeadsUpEnabled'
    | 'timeFormat'
  >
): ReminderTrigger[] {
  if (!settings.notificationsEnabled || task.completed) {
    return [];
  }

  const offsetMinutes = resolveTaskOffsetMinutes(task, settings.defaultReminderOffset);
  if (offsetMinutes === null) {
    return [];
  }

  const triggers: ReminderTrigger[] = [];
  const morningTime = normalizeTimeHHMM(settings.morningReminderTime) ?? '09:00';

  const validDueDate = task.dueDate && parseDateKeyLocal(task.dueDate) ? task.dueDate : undefined;
  const validDeadlineDate =
    task.deadlineDate && parseDateKeyLocal(task.deadlineDate) ? task.deadlineDate : undefined;
  const validDueTime = normalizeTimeHHMM(task.dueTime);
  const validDeadlineTime = normalizeTimeHHMM(task.deadlineTime);

  // 1. Primary reminder: based on dueDate/dueTime, or deadlineDate/deadlineTime if no dueDate
  const primaryDate = validDueDate ?? validDeadlineDate;
  const primaryTime = validDueDate ? validDueTime : validDeadlineTime;

  if (primaryDate) {
    if (primaryTime) {
      const targetMs = buildLocalTimestampMs(primaryDate, primaryTime);
      if (targetMs !== null) {
        const triggerAtMs = targetMs - offsetMinutes * 60 * 1000;
        const formattedTime = formatTimeShort(primaryTime, settings.timeFormat);
        const subtitle =
          offsetMinutes === 0
            ? `Due at ${formattedTime}`
            : `${formatOffsetHuman(offsetMinutes)} (${formattedTime})`;
        triggers.push({
          triggerKey: `${task.id}|due|${primaryDate}|${primaryTime}|${offsetMinutes}`,
          taskId: task.id,
          taskTitle: task.title,
          kind: 'due',
          triggerAtMs,
          targetAtMs: targetMs,
          targetDate: primaryDate,
          targetTime: primaryTime,
          category: task.category,
          priority: task.priority,
          subtitle,
        });
      }
    } else {
      // Date-only task fires at configured morning reminder time
      const triggerAtMs = buildLocalTimestampMs(primaryDate, morningTime);
      if (triggerAtMs !== null) {
        triggers.push({
          triggerKey: `${task.id}|due-morning|${primaryDate}|${morningTime}`,
          taskId: task.id,
          taskTitle: task.title,
          kind: 'due',
          triggerAtMs,
          targetAtMs: triggerAtMs,
          targetDate: primaryDate,
          targetTime: morningTime,
          category: task.category,
          priority: task.priority,
          subtitle: validDueDate ? 'Scheduled for today' : 'Deadline today',
        });
      }
    }
  }

  // 2. Optional heads-up 1 day before hard deadline
  if (settings.deadlineHeadsUpEnabled && validDeadlineDate) {
    const dayBeforeKey = addDaysToDateKey(validDeadlineDate, -1);
    const headsUpTime = validDeadlineTime ?? morningTime;
    const headsUpMs = buildLocalTimestampMs(dayBeforeKey, headsUpTime);
    const deadlineMs = buildLocalTimestampMs(validDeadlineDate, headsUpTime) ?? headsUpMs;
    if (headsUpMs !== null) {
      const formattedDeadlineTime = validDeadlineTime
        ? ` at ${formatTimeShort(validDeadlineTime, settings.timeFormat)}`
        : '';
      triggers.push({
        triggerKey: `${task.id}|deadline-heads-up|${validDeadlineDate}|${headsUpTime}`,
        taskId: task.id,
        taskTitle: task.title,
        kind: 'deadline-heads-up',
        triggerAtMs: headsUpMs,
        targetAtMs: deadlineMs ?? headsUpMs,
        targetDate: validDeadlineDate,
        targetTime: validDeadlineTime,
        category: task.category,
        priority: task.priority,
        subtitle: `Deadline tomorrow${formattedDeadlineTime}`,
      });
    }
  }

  return triggers;
}

export function computeAllReminderTriggers(
  tasks: ReadonlyArray<TaskItem>,
  settings: Pick<
    AppSettings,
    | 'notificationsEnabled'
    | 'defaultReminderOffset'
    | 'morningReminderTime'
    | 'deadlineHeadsUpEnabled'
    | 'timeFormat'
  >
): ReminderTrigger[] {
  if (!settings.notificationsEnabled) return [];
  const all: ReminderTrigger[] = [];
  for (const task of tasks) {
    all.push(...computeTaskReminderTriggers(task, settings));
  }
  return all.sort((a, b) => a.triggerAtMs - b.triggerAtMs);
}

export interface FiredReminderStore {
  [triggerKey: string]: number; // firedAtMs timestamp
}

export interface EvaluateRemindersInput {
  tasks: ReadonlyArray<TaskItem>;
  settings: Pick<
    AppSettings,
    | 'notificationsEnabled'
    | 'defaultReminderOffset'
    | 'morningReminderTime'
    | 'deadlineHeadsUpEnabled'
    | 'timeFormat'
  >;
  firedMap: FiredReminderStore;
  nowMs: number;
  sessionStartMs: number;
}

export interface EvaluateRemindersOutput {
  dueLive: ReminderRecord[];
  dueMissed: ReminderRecord[];
  nextFiredMap: FiredReminderStore;
}

/**
 * Pure timestamp evaluation comparing all open triggers against `nowMs` and `sessionStartMs`.
 * - Fires any un-fired trigger where `triggerAtMs <= nowMs` and age <= MAX_CATCHUP_AGE_MS
 * - Skips backdated historical tasks whose target due time was already in the past when created.
 */
export function evaluateRemindersTick({
  tasks,
  settings,
  firedMap,
  nowMs,
  sessionStartMs,
}: EvaluateRemindersInput): EvaluateRemindersOutput {
  if (!settings.notificationsEnabled) {
    return { dueLive: [], dueMissed: [], nextFiredMap: firedMap };
  }

  const taskById = new Map<string, TaskItem>();
  for (const t of tasks) taskById.set(t.id, t);

  const triggers = computeAllReminderTriggers(tasks, settings);
  const dueLive: ReminderRecord[] = [];
  const dueMissed: ReminderRecord[] = [];
  let nextFiredMap = firedMap;
  let copied = false;

  for (const trig of triggers) {
    if (trig.triggerAtMs > nowMs) continue;
    if (firedMap[trig.triggerKey] !== undefined) continue;
    if (nowMs - trig.triggerAtMs > MAX_CATCHUP_AGE_MS) continue;

    const task = taskById.get(trig.taskId);
    const createdMs = task ? Date.parse(task.createdAt) : NaN;
    const targetMs = trig.targetAtMs ?? trig.triggerAtMs;

    if (
      Number.isFinite(createdMs) &&
      targetMs < createdMs - LIVE_REMINDER_WINDOW_MS &&
      trig.triggerAtMs < sessionStartMs
    ) {
      continue;
    }

    if (!copied) {
      nextFiredMap = { ...firedMap };
      copied = true;
    }
    nextFiredMap[trig.triggerKey] = nowMs;

    const createdDuringThisSession =
      Number.isFinite(createdMs) && createdMs >= sessionStartMs - LIVE_REMINDER_WINDOW_MS;

    const isMissed =
      !createdDuringThisSession &&
      (trig.triggerAtMs < sessionStartMs - LIVE_REMINDER_WINDOW_MS ||
        nowMs - trig.triggerAtMs > LIVE_REMINDER_WINDOW_MS);

    const record: ReminderRecord = {
      ...trig,
      firedAtMs: nowMs,
      status: isMissed ? 'missed' : 'live',
      read: false,
    };

    if (isMissed) {
      dueMissed.push(record);
    } else {
      dueLive.push(record);
    }
  }

  return { dueLive, dueMissed, nextFiredMap };
}

/**
 * Drops fired keys & reminder records for tasks that were completed, deleted, or whose
 * trigger fingerprint is no longer active (e.g. due time edited).
 */
export function reconcileRemindersWithTasks(
  records: ReadonlyArray<ReminderRecord>,
  tasks: ReadonlyArray<TaskItem>,
  settings: Pick<
    AppSettings,
    | 'notificationsEnabled'
    | 'defaultReminderOffset'
    | 'morningReminderTime'
    | 'deadlineHeadsUpEnabled'
    | 'timeFormat'
  >
): ReminderRecord[] {
  const activeKeys = new Set(computeAllReminderTriggers(tasks, settings).map((t) => t.triggerKey));
  return records.filter((rec) => activeKeys.has(rec.triggerKey));
}

export function pruneFiredReminders(
  firedMap: FiredReminderStore,
  tasks: ReadonlyArray<TaskItem>,
  nowMs: number
): FiredReminderStore {
  const openIds = new Set(tasks.filter((t) => !t.completed).map((t) => t.id));
  const out: FiredReminderStore = {};
  for (const [key, firedAt] of Object.entries(firedMap)) {
    const taskId = key.split('|')[0];
    if (!openIds.has(taskId)) continue;
    if (typeof firedAt !== 'number' || !Number.isFinite(firedAt)) continue;
    if (nowMs - firedAt > DEFAULT_FIRED_RETENTION_MS) continue;
    out[key] = firedAt;
  }
  return out;
}

export function validateFiredReminderStore(raw: unknown): FiredReminderStore {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: FiredReminderStore = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key === 'string' && typeof val === 'number' && Number.isFinite(val)) {
      out[key] = val;
    }
  }
  return out;
}

export function validateReminderRecords(raw: unknown): ReminderRecord[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ReminderRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Partial<ReminderRecord>;
    if (
      typeof rec.triggerKey !== 'string' ||
      !rec.triggerKey ||
      typeof rec.taskId !== 'string' ||
      !rec.taskId ||
      typeof rec.taskTitle !== 'string' ||
      typeof rec.triggerAtMs !== 'number' ||
      !Number.isFinite(rec.triggerAtMs)
    ) {
      continue;
    }
    if (seen.has(rec.triggerKey)) continue;
    seen.add(rec.triggerKey);
    out.push({
      triggerKey: rec.triggerKey,
      taskId: rec.taskId,
      taskTitle: rec.taskTitle,
      kind: rec.kind === 'deadline-heads-up' ? 'deadline-heads-up' : 'due',
      triggerAtMs: rec.triggerAtMs,
      targetDate: typeof rec.targetDate === 'string' ? rec.targetDate : '',
      targetTime: typeof rec.targetTime === 'string' ? rec.targetTime : undefined,
      category: typeof rec.category === 'string' ? rec.category : undefined,
      priority: rec.priority ?? ('None' as TaskItem['priority']),
      subtitle: typeof rec.subtitle === 'string' ? rec.subtitle : 'Reminder',
      firedAtMs:
        typeof rec.firedAtMs === 'number' && Number.isFinite(rec.firedAtMs)
          ? rec.firedAtMs
          : rec.triggerAtMs,
      status: rec.status === 'missed' ? 'missed' : 'live',
      read: Boolean(rec.read),
    });
  }
  return out;
}
