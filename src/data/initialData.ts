import {
  FocusSession,
  HabitItem,
  NoteItem,
  ScheduleBlock,
  TaskCategory,
  TaskItem,
  TaskPriority,
} from '../types/dashboard';

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOffsetDateKey(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatDateKey(d);
}

export function getTodayKey(): string {
  return formatDateKey(new Date());
}

/** Returns YYYY-MM-DD keys for Mon..Sun of the current local week. */
export function getCurrentWeekDateKeys(referenceDate = new Date()): string[] {
  const day = referenceDate.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() + diffToMonday
  );
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    keys.push(formatDateKey(d));
  }
  return keys;
}

function buildSeedHabitDates(
  completedThisWeek: boolean[],
  seedSalt: number,
  targetPerWeek: number
): string[] {
  const weekKeys = getCurrentWeekDateKeys();
  const todayKey = getTodayKey();
  const dates = new Set<string>();

  // Prior 11 full weeks
  const firstDayOfCurrentWeek = new Date(`${weekKeys[0]}T00:00:00`);
  for (let w = 11; w >= 1; w--) {
    for (let d = 0; d < 7; d++) {
      const score = ((w * 13 + d * 7 + seedSalt * 5) % 10) + 1;
      if (score <= targetPerWeek + 1) {
        const dt = new Date(
          firstDayOfCurrentWeek.getFullYear(),
          firstDayOfCurrentWeek.getMonth(),
          firstDayOfCurrentWeek.getDate() - w * 7 + d
        );
        const key = formatDateKey(dt);
        if (key <= todayKey) dates.add(key);
      }
    }
  }

  // Current week aligned with completedDays booleans
  completedThisWeek.forEach((done, idx) => {
    if (done && weekKeys[idx]) {
      dates.add(weekKeys[idx]);
    }
  });

  return Array.from(dates).sort();
}

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    title: 'Finalize Q4 product roadmap brief',
    category: TaskCategory.Work,
    priority: TaskPriority.High,
    prioritySource: 'user',
    dueDate: getTodayKey(),
    dueTime: '14:00',
    deadlineDate: getTodayKey(),
    deadlineTime: '17:00',
    completed: false,
    details: 'Include engineering capacity estimates and milestone dates before 14:00 sync.',
    subtasks: [
      { id: 'sub-1', title: 'Confirm Q4 eng bandwidth', completed: true },
      { id: 'sub-2', title: 'Draft milestone sequence', completed: false },
    ],
    durationMinutes: 60,
    durationSource: 'user',
    pinned: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    title: 'Review monthly investment allocation & savings transfer',
    category: TaskCategory.Finance,
    priority: TaskPriority.High,
    prioritySource: 'user',
    dueDate: getTodayKey(),
    completed: false,
    details: 'Verify index fund auto-deposit and update Q4 spreadsheet.',
    durationMinutes: 30,
    durationSource: 'user',
    repeat: 'monthly',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-3',
    title: 'Send design feedback on onboarding prototype',
    category: TaskCategory.Work,
    priority: TaskPriority.Medium,
    prioritySource: 'user',
    dueDate: getTodayKey(),
    completed: true,
    details: 'Shared annotated notes in Figma.',
    durationMinutes: 15,
    durationSource: 'user',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-4',
    title: 'Evening 5 km tempo run',
    category: TaskCategory.Health,
    priority: TaskPriority.Medium,
    prioritySource: 'user',
    dueDate: getTodayKey(),
    dueTime: '17:45',
    completed: false,
    durationMinutes: 45,
    durationSource: 'user',
    repeat: 'custom',
    repeatWeekdays: [1, 3, 5],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-5',
    title: 'Renew passport & schedule biometric appointment',
    category: TaskCategory.Personal,
    priority: TaskPriority.Low,
    prioritySource: 'user',
    dueDate: getOffsetDateKey(2),
    deadlineDate: getOffsetDateKey(5),
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-6',
    title: 'Reply to Sarah with Thursday agenda link',
    category: TaskCategory.Work,
    priority: TaskPriority.None,
    prioritySource: 'user',
    dueDate: getOffsetDateKey(1),
    completed: false,
    durationMinutes: 5,
    durationSource: 'user',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-7',
    title: 'Order replacement espresso water filters',
    category: TaskCategory.Personal,
    priority: TaskPriority.Low,
    prioritySource: 'user',
    dueDate: getOffsetDateKey(-1),
    completed: true,
    durationMinutes: 5,
    durationSource: 'user',
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_SCHEDULE: ScheduleBlock[] = [
  {
    id: 'sched-1',
    title: 'Deep Work: Roadmap & Strategy Brief',
    startTime: '08:30',
    endTime: '10:30',
    category: TaskCategory.Work,
    location: 'Home Studio',
  },
  {
    id: 'sched-2',
    title: 'Product & Engineering Sync',
    startTime: '11:00',
    endTime: '11:45',
    category: TaskCategory.Work,
    location: 'Video Conference',
  },
  {
    id: 'sched-3',
    title: 'Midday Walk & Lunch',
    startTime: '12:30',
    endTime: '13:30',
    category: TaskCategory.Health,
    location: 'Neighborhood Park',
  },
  {
    id: 'sched-4',
    title: 'Quarterly Finance & Budget Review',
    startTime: '14:30',
    endTime: '15:30',
    category: TaskCategory.Finance,
    location: 'Desk',
  },
  {
    id: 'sched-5',
    title: '5 km Tempo Run',
    startTime: '17:45',
    endTime: '18:30',
    category: TaskCategory.Health,
    location: 'Waterfront Trail',
  },
];

export const INITIAL_HABITS: HabitItem[] = [
  {
    id: 'habit-1',
    name: '90 min Morning Deep Work',
    category: 'Focus',
    targetDaysPerWeek: 5,
    completedDays: [true, true, true, true, false, false, false],
    completedDates: buildSeedHabitDates([true, true, true, true, false, false, false], 1, 5),
  },
  {
    id: 'habit-2',
    name: '30 min Non-Fiction Reading',
    category: 'Learning',
    targetDaysPerWeek: 7,
    completedDays: [true, true, false, true, true, false, false],
    completedDates: buildSeedHabitDates([true, true, false, true, true, false, false], 2, 7),
  },
  {
    id: 'habit-3',
    name: 'Strength or Cardio Session',
    category: 'Health',
    targetDaysPerWeek: 4,
    completedDays: [true, false, true, false, true, false, false],
    completedDates: buildSeedHabitDates([true, false, true, false, true, false, false], 3, 4),
  },
  {
    id: 'habit-4',
    name: 'Zero Screens After 22:00',
    category: 'Recovery',
    targetDaysPerWeek: 6,
    completedDays: [true, true, true, false, false, false, false],
    completedDates: buildSeedHabitDates([true, true, true, false, false, false, false], 4, 6),
  },
];

export const INITIAL_FOCUS_SESSIONS: FocusSession[] = [
  {
    id: 'focus-1',
    label: 'Roadmap & capacity outline',
    minutes: 50,
    completedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    dateKey: getTodayKey(),
  },
  {
    id: 'focus-2',
    label: 'Architecture spec drafting',
    minutes: 25,
    completedAt: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
    dateKey: getTodayKey(),
  },
  {
    id: 'focus-3',
    label: 'System audit & cleanup',
    minutes: 100,
    completedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    dateKey: getOffsetDateKey(-1),
  },
  {
    id: 'focus-4',
    label: 'Weekly planning & triage',
    minutes: 75,
    completedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    dateKey: getOffsetDateKey(-2),
  },
  {
    id: 'focus-5',
    label: 'Design critique preparation',
    minutes: 60,
    completedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    dateKey: getOffsetDateKey(-3),
  },
  {
    id: 'focus-6',
    label: 'Quarterly review synthesis',
    minutes: 110,
    completedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    dateKey: getOffsetDateKey(-4),
  },
  {
    id: 'focus-7',
    label: 'Reading & research notes',
    minutes: 45,
    completedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    dateKey: getOffsetDateKey(-5),
  },
  {
    id: 'focus-8',
    label: 'Documentation pass',
    minutes: 35,
    completedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
    dateKey: getOffsetDateKey(-6),
  },
];

export const INITIAL_NOTES: NoteItem[] = [
  {
    id: 'note-1',
    title: 'Weekly Priorities & Principles',
    category: 'Planning',
    content:
      '1. Protect the 08:30–10:30 deep work block every morning.\n2. Close open loops on the Q4 product roadmap before Friday afternoon.\n3. Keep meetings concise with written pre-reads.\n\nReading list:\n- Thinking in Systems (Chapters 4–6)\n- Designing Data-Intensive Applications (Replication notes)',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    title: 'Q4 Financial Check-In',
    category: 'Finance',
    content:
      'Savings rate target: 28% of net monthly income.\nEmergency reserve: fully funded (6 months).\nUpcoming expenses:\n- Annual insurance renewal (Dec 12)\n- Travel booking for winter break',
    updatedAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  },
  {
    id: 'note-3',
    title: 'Product Architecture Scratchpad',
    category: 'Work',
    content:
      'Key trade-offs to review on Thursday:\n- Keep state persistence deterministic and client-local where latency matters.\n- Avoid unnecessary modal chains; prefer inline edits for high-frequency workflows.\n- Audit keyboard shortcuts for power users.',
    updatedAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
  },
];

export const DEFAULT_SCRATCHPAD =
  'Call Elena after the 11:00 sync regarding Q4 budget sign-off.\nPick up dark roast beans on the walk back.';
