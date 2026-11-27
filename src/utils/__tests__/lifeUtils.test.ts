import { describe, expect, it } from 'vitest';
import {
  computeAreaPulses,
  computeChapterStatus,
  computeExactAgeYears,
  computeTimeProgressBars,
  getHabitsDueToday,
  getNextUpCountdowns,
  getPinnedCountdown,
  getTodayTasksSorted,
  validateAreaSettings,
  validateCountdowns,
  validateLifeChapter,
  validateLifeProfile,
  validateMoodRatings,
} from '../lifeUtils';
import {
  AreaSettings,
  CountdownItem,
  DEFAULT_AREA_SETTINGS,
  HabitItem,
  TaskItem,
  TaskPriority,
} from '../../types/dashboard';

describe('computeChapterStatus', () => {
  it('computes Day N and remaining days within an active chapter', () => {
    const now = new Date(2026, 10, 27, 9, 30, 0); // 2026-11-27
    const status = computeChapterStatus(
      {
        name: 'Drop Year',
        theme: 'Build craft',
        startDate: '2026-11-01',
        endDate: '2026-12-31',
        goals: ['Deep work'],
      },
      now
    );
    expect(status.hasStarted).toBe(true);
    expect(status.dayNumber).toBe(27);
    expect(status.dayLabel).toBe('Day 27 of chapter');
    expect(status.remainingDays).toBe(34);
    expect(status.remainingLabel).toBe('34 days remaining');
  });

  it('handles future chapters and single-day remaining boundary', () => {
    const now = new Date(2026, 10, 27, 12, 0, 0);
    const future = computeChapterStatus(
      {
        name: 'Spring',
        theme: '',
        startDate: '2026-11-30',
        endDate: '2026-12-10',
        goals: [],
      },
      now
    );
    expect(future.hasStarted).toBe(false);
    expect(future.dayLabel).toBe('Starts in 3 days');

    const endingSoon = computeChapterStatus(
      {
        name: 'Sprint',
        theme: '',
        startDate: '2026-11-20',
        endDate: '2026-11-28',
        goals: [],
      },
      now
    );
    expect(endingSoon.remainingDays).toBe(1);
    expect(endingSoon.remainingLabel).toBe('1 day remaining');
  });
});

describe('computeTimeProgressBars', () => {
  it('computes Today, Mon-Sun Week, Month, Year (Day 331 of 365), and Life progress', () => {
    // Friday, Nov 27, 2026 12:00 local time
    const now = new Date(2026, 10, 27, 12, 0, 0, 0);
    const bars = computeTimeProgressBars(now, {
      birthDate: '2007-03-04',
      lifeExpectancy: 80,
    });

    expect(bars.map((b) => b.id)).toEqual(['today', 'week', 'month', 'year', 'life']);
    expect(bars[0].percent).toBeCloseTo(50, 1);
    expect(bars[0].detailLabel).toBe('12h 00m of 24h');

    // Friday is Day 5 of Mon-Sun week (4.5 / 7 = 64.3%)
    expect(bars[1].detailLabel).toBe('Day 5 of 7');
    expect(bars[1].percent).toBeCloseTo((4.5 / 7) * 100, 1);

    expect(bars[2].detailLabel).toBe('Day 27 of 30');
    expect(bars[3].detailLabel).toBe('Day 331 of 365');

    const age = computeExactAgeYears('2007-03-04', now);
    expect(age).toBeGreaterThan(19.7);
    expect(age).toBeLessThan(19.8);
    expect(bars[4].detailLabel).toBe(`Age ${age.toFixed(1)} of 80`);
  });

  it('accounts for leap years cleanly (366 days)', () => {
    const leapNow = new Date(2024, 11, 31, 0, 0, 0, 0);
    const bars = computeTimeProgressBars(leapNow, {
      birthDate: '2007-03-04',
      lifeExpectancy: 80,
    });
    expect(bars[3].detailLabel).toBe('Day 366 of 366');
  });
});

describe('getTodayTasksSorted & getHabitsDueToday', () => {
  it('selects top tasks for today using the active sort mode and keeps completed-today toggleable', () => {
    const todayKey = '2026-11-27';
    const tasks: TaskItem[] = [
      {
        id: 'future',
        title: 'Future task',
        priority: TaskPriority.High,
        dueDate: '2026-11-29',
        completed: false,
        createdAt: '2026-11-20T00:00:00Z',
      },
      {
        id: 'low-today',
        title: 'Low today',
        priority: TaskPriority.Low,
        dueDate: todayKey,
        completed: false,
        createdAt: '2026-11-20T00:00:00Z',
      },
      {
        id: 'high-today',
        title: 'High today',
        priority: TaskPriority.High,
        dueDate: todayKey,
        completed: false,
        createdAt: '2026-11-20T00:00:00Z',
      },
      {
        id: 'done-yesterday',
        title: 'Old completed',
        priority: TaskPriority.High,
        dueDate: '2026-11-26',
        completed: true,
        createdAt: '2026-11-20T00:00:00Z',
      },
      {
        id: 'done-today',
        title: 'Done today',
        priority: TaskPriority.Medium,
        dueDate: todayKey,
        completed: true,
        createdAt: '2026-11-20T00:00:00Z',
      },
    ];

    const top = getTodayTasksSorted(
      tasks,
      {
        smartSortMode: 'priority',
        quickWinMinutes: 5,
        defaultDurationEstimateMinutes: 15,
      },
      todayKey,
      5
    );

    expect(top.map((t) => t.id)).toEqual(['high-today', 'low-today', 'done-today']);
  });

  it('filters habits due today based on targetDaysPerWeek or already completed today', () => {
    const friday = new Date(2026, 10, 27, 10, 0, 0); // Friday -> todayIndex 4
    const habits: HabitItem[] = [
      {
        id: 'h-met',
        name: 'Weekly 3x met Mon-Wed',
        category: 'Health',
        targetDaysPerWeek: 3,
        completedDays: [true, true, true, false, false, false, false],
        completedDates: [],
      },
      {
        id: 'h-due',
        name: 'Reading',
        category: 'Focus',
        targetDaysPerWeek: 5,
        completedDays: [true, true, false, false, false, false, false],
        completedDates: [],
      },
      {
        id: 'h-done-today',
        name: 'Already done today',
        category: 'Focus',
        targetDaysPerWeek: 3,
        completedDays: [true, true, false, false, true, false, false],
        completedDates: ['2026-11-27'],
      },
    ];

    const due = getHabitsDueToday(habits, friday);
    expect(due.map((d) => d.habit.id)).toEqual(['h-due', 'h-done-today']);
    expect(due[1].completedToday).toBe(true);
    expect(due[1].todayIndex).toBe(4);
  });
});

describe('validators', () => {
  it('sanitizes chapter, profile, and mood ratings cleanly', () => {
    const chapter = validateLifeChapter({
      name: '  ',
      startDate: 'bad-date',
      goals: ['Goal A', 'Goal A', ''],
    });
    expect(chapter.name).toBe('Drop Year');
    expect(chapter.goals).toEqual(['Goal A']);

    const profile = validateLifeProfile({ birthDate: 'invalid', lifeExpectancy: 999 });
    expect(profile.birthDate).toBe('2007-03-04');
    expect(profile.lifeExpectancy).toBe(150);

    const moods = validateMoodRatings([
      { dateKey: '2026-11-27', rating: 14 },
      { dateKey: '2026-11-26', rating: 7 },
      { dateKey: 'bad', rating: 5 },
    ]);
    expect(moods).toHaveLength(2);
    expect(moods[0]).toEqual({
      id: '2026-11-27',
      dateKey: '2026-11-27',
      rating: 10,
      updatedAt: undefined,
    });
  });

  it('validates areaSettings and enforces at most one pinned countdown', () => {
    const area = validateAreaSettings({
      studyWeeklyGoalHours: 200,
      categoryAreaMap: { Work: 'projects', Unknown: 'invalid', Study: 'study' },
      journalOpenedDates: ['2026-11-27', 'bad', '2026-11-27'],
    });
    expect(area.studyWeeklyGoalHours).toBe(80);
    expect(area.categoryAreaMap).toEqual({ Work: 'projects', Study: 'study' });
    expect(area.journalOpenedDates).toEqual(['2026-11-27']);

    const countdowns = validateCountdowns([
      { id: 'c1', title: 'Exam', targetDate: '2026-12-10', icon: 'GraduationCap', pinned: true },
      { id: 'c2', title: 'Launch', targetDate: '2026-12-20', icon: 'UnknownIcon', pinned: true },
      { id: 'bad', title: '', targetDate: '2026-12-30' },
    ]);
    expect(countdowns).toHaveLength(2);
    expect(countdowns[0].pinned).toBe(true);
    expect(countdowns[1].pinned).toBe(false);
    expect(countdowns[1].icon).toBe('Calendar');
  });
});

describe('computeAreaPulses', () => {
  const now = new Date(2026, 10, 27, 12, 0, 0); // Friday 2026-11-27

  it('returns muted no-data states when no metrics exist rather than fake numbers', () => {
    const pulses = computeAreaPulses({
      tasks: [],
      habits: [],
      focusSessions: [],
      moodRatings: [],
      areaSettings: {
        ...DEFAULT_AREA_SETTINGS,
        journalOpenedDates: [],
      },
      now,
    });

    for (const p of pulses) {
      expect(p.hasData).toBe(false);
      expect(p.score).toBeNull();
    }
    expect(pulses.find((p) => p.id === 'people')?.summaryLabel).toBe('No data yet');
  });

  it('computes honest 0-100 scores and 7-day trends across Study, Body, Mind, Skills, and Projects', () => {
    const areaSettings: AreaSettings = {
      studyWeeklyGoalHours: 10,
      categoryAreaMap: {
        Work: 'projects',
        Finance: 'skills',
      },
      journalOpenedDates: ['2026-11-25', '2026-11-27'],
    };

    const pulses = computeAreaPulses({
      now,
      areaSettings,
      focusSessions: [
        // Current 7d (Nov 21..Nov 27): 300 mins = 5h vs 10h goal -> 50
        { id: 'f1', label: 'Algorithms', minutes: 180, dateKey: '2026-11-26', completedAt: '' },
        { id: 'f2', label: 'Physics', minutes: 120, dateKey: '2026-11-24', completedAt: '' },
        // Previous 7d (Nov 14..Nov 20): 120 mins = 2h vs 10h goal -> 20
        { id: 'f3', label: 'Math', minutes: 120, dateKey: '2026-11-18', completedAt: '' },
      ],
      habits: [
        {
          id: 'walk',
          name: 'Evening walk & steps',
          category: 'Health',
          targetDaysPerWeek: 7,
          completedDays: [true, true, false, false, true, false, false],
          completedDates: ['2026-11-23', '2026-11-24', '2026-11-27'],
        },
      ],
      moodRatings: [
        { id: '2026-11-27', dateKey: '2026-11-27', rating: 8 },
      ],
      tasks: [
        {
          id: 'p1',
          title: 'Ship release',
          category: 'Work',
          priority: TaskPriority.High,
          dueDate: '2026-11-27',
          completed: true,
          createdAt: '',
        },
        {
          id: 'p2',
          title: 'Write docs',
          category: 'Work',
          priority: TaskPriority.Medium,
          dueDate: '2026-11-26',
          completed: false,
          createdAt: '',
        },
        {
          id: 's1',
          title: 'Practice drills',
          category: 'Finance',
          priority: TaskPriority.Low,
          dueDate: '2026-11-25',
          completed: true,
          createdAt: '',
        },
      ],
    });

    const byId = Object.fromEntries(pulses.map((p) => [p.id, p]));

    expect(byId.study.hasData).toBe(true);
    expect(byId.study.score).toBe(50);
    expect(byId.study.previousScore).toBe(20);
    expect(byId.study.trend).toBe('up');
    expect(byId.study.delta).toBe(30);

    expect(byId.body.hasData).toBe(true);
    expect(byId.body.score).toBe(43); // 3 / 7

    // Mind: 2 active days (Nov 25 journal + Nov 27 both journal & mood=8)
    // Math.round((2/7)*50 + (8/10)*50) = Math.round(14.28 + 40) = 54
    expect(byId.mind.hasData).toBe(true);
    expect(byId.mind.score).toBe(54);

    expect(byId.people.hasData).toBe(false);
    expect(byId.people.score).toBeNull();

    expect(byId.projects.score).toBe(50); // 1/2
    expect(byId.skills.score).toBe(100); // 1/1
  });
});

describe('countdown selectors', () => {
  const now = new Date(2026, 10, 27, 9, 0, 0);
  const items: CountdownItem[] = [
    { id: 'past', title: 'Past', targetDate: '2026-11-20', icon: 'Calendar', pinned: false },
    { id: 'pinned', title: 'Exam', targetDate: '2026-12-01', icon: 'GraduationCap', pinned: true },
    { id: 'near2', title: 'Demo Day', targetDate: '2026-12-12', icon: 'Sparkles', pinned: false },
    { id: 'near1', title: 'Trip', targetDate: '2026-12-04', icon: 'Plane', pinned: false },
    { id: 'far', title: 'Marathon', targetDate: '2027-01-15', icon: 'Trophy', pinned: false },
  ];

  it('picks the pinned countdown and the 2 nearest other upcoming countdowns', () => {
    expect(getPinnedCountdown(items)?.id).toBe('pinned');
    expect(getNextUpCountdowns(items, now, 2).map((c) => c.id)).toEqual(['near1', 'near2']);
  });
});
