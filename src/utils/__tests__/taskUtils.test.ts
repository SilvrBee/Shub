import { describe, expect, it } from 'vitest';
import {
  addMonthsClamped,
  buildNextRecurrenceTask,
  completeTaskWithRecurrence,
  computeAutoPriorityEscalations,
  computeCategoryDeletion,
  estimateTaskDuration,
  findSimilarOpenTasks,
  migrateTask,
  migrateTasks,
  parseDateKeyLocal,
  sanitizeDurationMinutes,
  sortTasksSmart,
  undoAutoPriorityEscalation,
  validateAndMigrateFocusSessions,
  validateAndMigrateHabits,
  validateAndMigrateNotes,
  validateAndMigrateSchedule,
  validateAndMigrateSettings,
  validateScratchpad,
} from '../taskUtils';
import {
  CategoryItem,
  DEFAULT_APP_SETTINGS,
  TaskItem,
  TaskPriority,
} from '../../types/dashboard';

function makeTask(overrides: Partial<TaskItem> & { id: string }): TaskItem {
  return {
    title: 'Sample Task',
    priority: TaskPriority.None,
    prioritySource: 'user',
    completed: false,
    repeat: 'none',
    pinned: false,
    createdAt: '2026-05-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('taskUtils — dates, durations, sorting & ties', () => {
  it('rejects invalid rollover calendar dates like Feb 31 and accepts valid leap dates', () => {
    expect(parseDateKeyLocal('2026-02-31')).toBeNull();
    expect(parseDateKeyLocal('2026-04-31')).toBeNull();
    expect(parseDateKeyLocal('2025-02-29')).toBeNull();
    expect(parseDateKeyLocal('2024-02-29')).not.toBeNull();
    expect(parseDateKeyLocal('not-a-date')).toBeNull();
  });

  it('sanitizes zero, negative, NaN, and huge task durations safely', () => {
    expect(sanitizeDurationMinutes(0)).toBeUndefined();
    expect(sanitizeDurationMinutes(-15)).toBeUndefined();
    expect(sanitizeDurationMinutes(Number.NaN)).toBeUndefined();
    expect(sanitizeDurationMinutes(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(sanitizeDurationMinutes(1.4)).toBe(1);
    expect(sanitizeDurationMinutes(99999)).toBe(1440);
  });

  it('orders overdue tasks ahead of due-today and undated tasks', () => {
    const today = '2026-05-15';
    const tasks: TaskItem[] = [
      makeTask({ id: 'no-date', title: 'Backlog', priority: TaskPriority.High }),
      makeTask({ id: 'future', title: 'Next week', dueDate: '2026-05-25', priority: TaskPriority.High }),
      makeTask({ id: 'today', title: 'Due today', dueDate: today, priority: TaskPriority.Medium }),
      makeTask({ id: 'overdue', title: 'Overdue item', dueDate: '2026-05-10', priority: TaskPriority.Medium }),
    ];

    const sorted = sortTasksSmart(tasks, 'balanced', 5, today);
    expect(sorted.map((t) => t.id)).toEqual(['overdue', 'today', 'future', 'no-date']);
  });

  it('keeps deterministic stable ordering on exact score/date/duration ties', () => {
    const tasks: TaskItem[] = [
      makeTask({ id: 't1', title: 'First', createdAt: '2026-05-01T09:00:00.000Z' }),
      makeTask({ id: 't2', title: 'Second', createdAt: '2026-05-01T09:00:00.000Z' }),
      makeTask({ id: 't3', title: 'Third', createdAt: '2026-05-01T09:00:00.000Z' }),
    ];

    const sorted = sortTasksSmart(tasks, 'balanced', 5, '2026-05-15');
    expect(sorted.map((t) => t.id)).toEqual(['t1', 't2', 't3']);
  });
});

describe('taskUtils — repeating task edge cases', () => {
  it('completing a repeating task twice quickly creates only ONE next occurrence', () => {
    const initial: TaskItem[] = [
      makeTask({
        id: 'rep-1',
        title: 'Daily standup',
        dueDate: '2026-05-15',
        repeat: 'daily',
      }),
    ];

    let counter = 0;
    const makeId = () => `rep-child-${++counter}`;

    const first = completeTaskWithRecurrence(initial, 'rep-1', makeId, {
      targetCompleted: true,
      todayKey: '2026-05-15',
      nowIso: '2026-05-15T12:00:00.000Z',
    });

    expect(first.nextOccurrence?.id).toBe('rep-child-1');
    expect(first.nextOccurrence?.dueDate).toBe('2026-05-16');
    expect(first.tasks).toHaveLength(2);

    // Immediate second completion click on the same task
    const second = completeTaskWithRecurrence(first.tasks, 'rep-1', makeId, {
      targetCompleted: true,
      todayKey: '2026-05-15',
      nowIso: '2026-05-15T12:00:00.100Z',
    });

    expect(second.nextOccurrence).toBeNull();
    expect(second.tasks).toHaveLength(2);

    // Even if uncompleted and re-completed while active child still exists, skips creating duplicate
    const uncompleted = completeTaskWithRecurrence(second.tasks, 'rep-1', makeId, {
      targetCompleted: false,
      todayKey: '2026-05-15',
    });
    const recompleted = completeTaskWithRecurrence(uncompleted.tasks, 'rep-1', makeId, {
      targetCompleted: true,
      todayKey: '2026-05-15',
    });
    expect(recompleted.nextOccurrence).toBeNull();
    expect(recompleted.tasks).toHaveLength(2);
  });

  it('clamps monthly repeats on the 31st cleanly across short months & leap years', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29'); // leap year
    expect(addMonthsClamped('2026-03-31', 1)).toBe('2026-04-30');

    const jan31Task = makeTask({
      id: 'bill-31',
      title: 'Month-end close',
      dueDate: '2026-01-31',
      repeat: 'monthly',
    });
    const nextFeb = buildNextRecurrenceTask(jan31Task, 'bill-feb', '2026-01-31');
    expect(nextFeb?.dueDate).toBe('2026-02-28');

    const mar31Task = makeTask({
      id: 'bill-mar',
      title: 'Month-end close',
      dueDate: '2026-03-31',
      repeat: 'monthly',
    });
    const nextApr = buildNextRecurrenceTask(mar31Task, 'bill-apr', '2026-03-31');
    expect(nextApr?.dueDate).toBe('2026-04-30');
  });
});

describe('taskUtils — categories, duration estimation, auto-priority & duplicates', () => {
  it('reassigns tasks, schedule blocks, and default category when deleting a category, and blocks deleting last category', () => {
    const categories: CategoryItem[] = [
      { id: 'c1', name: 'Work', icon: 'Briefcase', color: '#2563eb' },
      { id: 'c2', name: 'Errands', icon: 'ShoppingBag', color: '#059669' },
    ];
    const tasks: TaskItem[] = [
      makeTask({ id: 't1', title: 'Buy coffee', category: 'Errands' }),
      makeTask({ id: 't2', title: 'Write spec', category: 'Work' }),
    ];
    const schedule = [
      { id: 's1', title: 'Post office', startTime: '12:00', endTime: '12:30', category: 'Errands' },
    ];

    const res = computeCategoryDeletion(categories, tasks, schedule, 'Errands', 'c2', 'Work');
    expect(res.deleted).toBe(true);
    expect(res.categories).toHaveLength(1);
    expect(res.defaultTaskCategory).toBe('Work');
    expect(res.tasks.every((t) => t.category === 'Work')).toBe(true);
    expect(res.schedule[0].category).toBe('Work');

    // Attempt to delete the last remaining category
    const blocked = computeCategoryDeletion(
      res.categories,
      res.tasks,
      res.schedule,
      res.defaultTaskCategory,
      'c1'
    );
    expect(blocked.deleted).toBe(false);
    expect(blocked.categories).toHaveLength(1);
  });

  it('estimates duration from category median when >= 3 completed samples exist, otherwise falls back', () => {
    const tasks: TaskItem[] = [
      makeTask({ id: 'd1', category: 'Work', completed: true, durationMinutes: 15 }),
      makeTask({ id: 'd2', category: 'Work', completed: true, durationMinutes: 30 }),
      makeTask({ id: 'd3', category: 'Work', completed: true, durationMinutes: 90 }),
      makeTask({ id: 'open-work', category: 'Work', completed: false }),
      makeTask({ id: 'd4', category: 'Health', completed: true, durationMinutes: 45 }),
      makeTask({ id: 'open-health', category: 'Health', completed: false }),
    ];

    const workEst = estimateTaskDuration(tasks[3], tasks, 20);
    expect(workEst.source).toBe('category-median');
    expect(workEst.minutes).toBe(30);
    expect(workEst.sampleCount).toBe(3);

    const healthEst = estimateTaskDuration(tasks[5], tasks, 20);
    expect(healthEst.source).toBe('default');
    expect(healthEst.minutes).toBe(20);
    expect(healthEst.sampleCount).toBe(1);
  });

  it('auto-raises approaching deadlines, skips pinned tasks, never lowers, and supports Undo lock', () => {
    const today = '2026-05-15';
    const tasks: TaskItem[] = [
      makeTask({
        id: 'urgent-none',
        priority: TaskPriority.None,
        deadlineDate: '2026-05-16', // 1 day -> High
      }),
      makeTask({
        id: 'soon-low',
        priority: TaskPriority.Low,
        deadlineDate: '2026-05-18', // 3 days -> Medium
      }),
      makeTask({
        id: 'already-high',
        priority: TaskPriority.High,
        deadlineDate: '2026-05-18', // stays High (never lowers)
      }),
      makeTask({
        id: 'pinned-none',
        priority: TaskPriority.None,
        pinned: true,
        deadlineDate: '2026-05-15', // skipped because pinned
      }),
    ];

    const settings = {
      autoRaisePriorityEnabled: true,
      autoRaiseHighDays: 1,
      autoRaiseMediumDays: 3,
    };

    const { tasks: escalated, changes } = computeAutoPriorityEscalations(tasks, settings, today);
    expect(changes).toHaveLength(2);
    expect(escalated[0].priority).toBe(TaskPriority.High);
    expect(escalated[0].prioritySource).toBe('auto');
    expect(escalated[0].priorityAutoPrev).toBe(TaskPriority.None);

    expect(escalated[1].priority).toBe(TaskPriority.Medium);
    expect(escalated[2].priority).toBe(TaskPriority.High);
    expect(escalated[3].priority).toBe(TaskPriority.None);

    // Undo restores prior priority and locks against further auto-escalation
    const undoPatch = undoAutoPriorityEscalation(escalated[0]);
    const afterUndo = escalated.map((t, idx) => (idx === 0 ? { ...t, ...undoPatch } : t));
    expect(afterUndo[0].priority).toBe(TaskPriority.None);
    expect(afterUndo[0].prioritySource).toBe('user');
    expect(afterUndo[0].priorityAutoLocked).toBe(true);

    const secondPass = computeAutoPriorityEscalations(afterUndo, settings, today);
    expect(secondPass.changes).toHaveLength(0);
  });

  it('detects duplicate open task titles without matching completed tasks', () => {
    const existing: TaskItem[] = [
      makeTask({ id: 't1', title: 'Prepare quarterly product roadmap', completed: false }),
      makeTask({ id: 't2', title: 'Submit expense report', completed: true }),
    ];

    expect(findSimilarOpenTasks('prepare quarterly product roadmap', existing).map((t) => t.id)).toEqual([
      't1',
    ]);
    expect(findSimilarOpenTasks('Submit expense report', existing)).toHaveLength(0);
  });
});

describe('taskUtils — corrupted and legacy stored data recovery', () => {
  it('safely migrates tasks with missing fields, legacy ai markers, invalid dates/times, and out-of-range durations', () => {
    const migrated = migrateTask({
      title: '   ',
      priority: 'ai-high', // unknown string
      prioritySource: 'ai',
      dueDate: '2026-02-30', // invalid rollover date
      dueTime: '27:99', // invalid time
      durationMinutes: 999999,
      notes: 'Legacy note body',
      repeat: 'every-hour', // invalid repeat
      subtasks: [{ title: '' }, { title: 'Valid step', completed: 'yes' }],
    });

    expect(migrated.title).toBe('Untitled Task');
    expect(migrated.priority).toBe(TaskPriority.None);
    expect(migrated.prioritySource).toBe('user');
    expect(migrated.dueDate).toBeUndefined();
    expect(migrated.dueTime).toBeUndefined();
    expect(migrated.durationMinutes).toBe(1440);
    expect(migrated.details).toBe('Legacy note body');
    expect(migrated.repeat).toBe('none');
    expect(migrated.subtasks).toHaveLength(1);
    expect(migrated.subtasks?.[0].title).toBe('Valid step');

    // Non-array or garbage entries in tasks array are discarded without throwing
    expect(migrateTasks('corrupted-string')).toEqual([]);
    expect(migrateTasks([null, 42, { id: 'ok', title: 'Valid' }])).toHaveLength(1);
  });

  it('validates and recovers corrupted settings and workspace collections', () => {
    const safeSettings = validateAndMigrateSettings({
      style: 'editorial-atelier', // legacy alias
      colorMode: 'neon', // invalid
      defaultReminderOffset: '999', // invalid
      morningReminderTime: '99:00', // invalid
      autoRaiseHighDays: 5,
      autoRaiseMediumDays: 2, // less than highDays -> clamped >= highDays
      defaultDurationEstimateMinutes: -10,
      categories: 'corrupt',
    });

    expect(safeSettings.style).toBe('editorial');
    expect(validateAndMigrateSettings({ style: 'minimalism' }).style).toBe('minimalism');
    expect(validateAndMigrateSettings({ style: 'bento' }).style).toBe('bento');
    expect(validateAndMigrateSettings({ style: 'editorial-style' }).style).toBe('editorial-style');
    expect(validateAndMigrateSettings({ style: 'brutalism' }).style).toBe('brutalism');
    expect(validateAndMigrateSettings({ style: 'swiss' }).style).toBe('swiss');
    expect(validateAndMigrateSettings({ style: 'motion-3d' }).style).toBe('motion-3d');
    expect(safeSettings.colorMode).toBe(DEFAULT_APP_SETTINGS.colorMode);
    expect(safeSettings.defaultReminderOffset).toBe('30');
    expect(safeSettings.morningReminderTime).toBe('09:00');
    expect(safeSettings.autoRaiseMediumDays).toBe(5);
    expect(safeSettings.defaultDurationEstimateMinutes).toBe(1);
    expect(safeSettings.categories.length).toBeGreaterThan(0);

    expect(validateAndMigrateSchedule('bad')).toEqual([]);
    expect(validateAndMigrateHabits([{ name: 'Meditate', completedDates: ['2026-02-31', '2026-05-01'] }])[0].completedDates).toEqual([
      '2026-05-01',
    ]);
    expect(validateAndMigrateFocusSessions([{ minutes: -5 }])[0].minutes).toBe(25);
    expect(validateAndMigrateNotes('bad')).toEqual([]);
    expect(validateScratchpad({ invalid: true })).toBe('');
  });
});
