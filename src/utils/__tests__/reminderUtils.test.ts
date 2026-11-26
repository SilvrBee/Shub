import { describe, expect, it } from 'vitest';
import {
  computeAllReminderTriggers,
  computeTaskReminderTriggers,
  evaluateRemindersTick,
  pruneFiredReminders,
  reconcileRemindersWithTasks,
  validateFiredReminderStore,
  validateReminderRecords,
} from '../reminderUtils';
import { DEFAULT_APP_SETTINGS, TaskItem, TaskPriority } from '../../types/dashboard';

function makeTask(overrides: Partial<TaskItem> & { id: string }): TaskItem {
  return {
    title: 'Reminder Task',
    priority: TaskPriority.Medium,
    prioritySource: 'user',
    completed: false,
    repeat: 'none',
    pinned: false,
    createdAt: new Date(2026, 4, 15, 8, 0, 0).toISOString(),
    ...overrides,
  };
}

describe('reminderUtils — trigger calculation & overrides', () => {
  it('calculates lead-time due trigger, date-only morning trigger, and deadline heads-up', () => {
    const settings = {
      ...DEFAULT_APP_SETTINGS,
      notificationsEnabled: true,
      defaultReminderOffset: '30' as const,
      morningReminderTime: '09:00',
      deadlineHeadsUpEnabled: true,
      timeFormat: '24h' as const,
    };

    const timedTask = makeTask({
      id: 't-timed',
      title: 'Client call',
      dueDate: '2026-05-15',
      dueTime: '14:00',
      deadlineDate: '2026-05-17',
      deadlineTime: '17:00',
    });

    const timedTriggers = computeTaskReminderTriggers(timedTask, settings);
    expect(timedTriggers).toHaveLength(2);
    expect(timedTriggers[0].kind).toBe('due');
    expect(timedTriggers[0].triggerAtMs).toBe(new Date(2026, 4, 15, 13, 30, 0).getTime());

    expect(timedTriggers[1].kind).toBe('deadline-heads-up');
    expect(timedTriggers[1].triggerAtMs).toBe(new Date(2026, 4, 16, 17, 0, 0).getTime());

    const dateOnlyTask = makeTask({
      id: 't-dateonly',
      title: 'Pay rent',
      dueDate: '2026-05-15',
    });
    const dateOnlyTriggers = computeTaskReminderTriggers(dateOnlyTask, {
      ...settings,
      deadlineHeadsUpEnabled: false,
    });
    expect(dateOnlyTriggers).toHaveLength(1);
    expect(dateOnlyTriggers[0].triggerAtMs).toBe(new Date(2026, 4, 15, 9, 0, 0).getTime());
  });

  it('respects per-task reminder overrides ("none" and custom offsets) and master toggle', () => {
    const taskDisabled = makeTask({
      id: 't-off',
      dueDate: '2026-05-15',
      dueTime: '14:00',
      reminderOffset: 'none',
    });
    expect(computeTaskReminderTriggers(taskDisabled, DEFAULT_APP_SETTINGS)).toHaveLength(0);

    const taskCustom = makeTask({
      id: 't-10m',
      dueDate: '2026-05-15',
      dueTime: '14:00',
      reminderOffset: '10',
    });
    const res = computeTaskReminderTriggers(taskCustom, DEFAULT_APP_SETTINGS);
    expect(res[0].triggerAtMs).toBe(new Date(2026, 4, 15, 13, 50, 0).getTime());

    expect(
      computeAllReminderTriggers([taskCustom], {
        ...DEFAULT_APP_SETTINGS,
        notificationsEnabled: false,
      })
    ).toHaveLength(0);
  });

  it('changes triggerKey fingerprint when due time is edited and gives repeating children their own key', () => {
    const original = makeTask({
      id: 't-edit',
      dueDate: '2026-05-15',
      dueTime: '14:00',
    });
    const edited = { ...original, dueTime: '16:00' };
    const trigA = computeTaskReminderTriggers(original, DEFAULT_APP_SETTINGS)[0];
    const trigB = computeTaskReminderTriggers(edited, DEFAULT_APP_SETTINGS)[0];
    expect(trigA.triggerKey).not.toBe(trigB.triggerKey);

    const child = makeTask({
      id: 't-edit-next',
      dueDate: '2026-05-16',
      dueTime: '14:00',
    });
    const trigChild = computeTaskReminderTriggers(child, DEFAULT_APP_SETTINGS)[0];
    expect(trigChild.triggerKey).not.toBe(trigA.triggerKey);
  });
});

describe('reminderUtils — tick evaluation, catch-up, cancellation & recovery', () => {
  it('fires live reminders on time, classifies missed reminders while closed, and never repeats fired keys', () => {
    const sessionStartMs = new Date(2026, 4, 15, 14, 0, 0).getTime();

    const missedTask = makeTask({
      id: 't-missed',
      title: 'Morning standup',
      dueDate: '2026-05-15',
      dueTime: '10:00', // trigger at 09:30 -> long before sessionStartMs
      createdAt: new Date(2026, 4, 14, 18, 0, 0).toISOString(),
    });

    const liveTask = makeTask({
      id: 't-live',
      title: 'Afternoon review',
      dueDate: '2026-05-15',
      dueTime: '14:30', // trigger at 14:00 == sessionStartMs
      createdAt: new Date(2026, 4, 14, 18, 0, 0).toISOString(),
    });

    const backdatedHistorical = makeTask({
      id: 't-backdated',
      title: 'Backdated seed task',
      dueDate: '2026-05-14',
      dueTime: '10:00',
      createdAt: new Date(2026, 4, 15, 13, 0, 0).toISOString(), // created AFTER targetMs
    });

    const tick1 = evaluateRemindersTick({
      tasks: [missedTask, liveTask, backdatedHistorical],
      settings: DEFAULT_APP_SETTINGS,
      firedMap: {},
      nowMs: new Date(2026, 4, 15, 14, 0, 20).getTime(),
      sessionStartMs,
    });

    expect(tick1.dueMissed.map((r) => r.taskId)).toEqual(['t-missed']);
    expect(tick1.dueLive.map((r) => r.taskId)).toEqual(['t-live']);

    // Second tick must not repeat any previously fired reminder
    const tick2 = evaluateRemindersTick({
      tasks: [missedTask, liveTask, backdatedHistorical],
      settings: DEFAULT_APP_SETTINGS,
      firedMap: tick1.nextFiredMap,
      nowMs: new Date(2026, 4, 15, 14, 0, 50).getTime(),
      sessionStartMs,
    });
    expect(tick2.dueMissed).toHaveLength(0);
    expect(tick2.dueLive).toHaveLength(0);
  });

  it('cancels reminder records & fired entries when a task is completed or deleted', () => {
    const openTask = makeTask({
      id: 't-open',
      dueDate: '2026-05-15',
      dueTime: '14:00',
    });
    const tick = evaluateRemindersTick({
      tasks: [openTask],
      settings: DEFAULT_APP_SETTINGS,
      firedMap: {},
      nowMs: new Date(2026, 4, 15, 13, 31, 0).getTime(),
      sessionStartMs: new Date(2026, 4, 15, 13, 30, 0).getTime(),
    });
    const records = [...tick.dueLive, ...tick.dueMissed];
    expect(records).toHaveLength(1);

    const completedTasks = [{ ...openTask, completed: true }];
    expect(reconcileRemindersWithTasks(records, completedTasks, DEFAULT_APP_SETTINGS)).toEqual([]);
    expect(
      pruneFiredReminders(tick.nextFiredMap, completedTasks, new Date(2026, 4, 15, 13, 35, 0).getTime())
    ).toEqual({});
  });

  it('recovers cleanly from corrupted fired reminder stores and records arrays', () => {
    expect(validateFiredReminderStore(null)).toEqual({});
    expect(validateFiredReminderStore(['bad'])).toEqual({});
    expect(validateFiredReminderStore({ valid: 12345, corrupt: 'nope', nanVal: Number.NaN })).toEqual({
      valid: 12345,
    });

    expect(validateReminderRecords('broken')).toEqual([]);
    expect(
      validateReminderRecords([
        { taskId: 'missing-fields' },
        {
          triggerKey: 'k1',
          taskId: 't1',
          taskTitle: 'Valid',
          triggerAtMs: 1000,
          targetDate: '2026-05-15',
        },
        {
          triggerKey: 'k1', // duplicate
          taskId: 't1',
          taskTitle: 'Duplicate',
          triggerAtMs: 1000,
        },
      ])
    ).toHaveLength(1);
  });
});
