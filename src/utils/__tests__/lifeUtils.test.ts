import { describe, expect, it } from 'vitest';
import {
  buildLifePosterWeeks,
  buildYearPixelsGrid,
  computeAreaPulses,
  computeChapterStatus,
  computeExactAgeYears,
  computeLifeProgressBar,
  computeTimeProgressBars,
  findActiveChapter,
  findOverlappingChapter,
  formatMoodValue,
  getHabitsDueToday,
  getMoodScaleColor,
  getNextUpCountdowns,
  getPinnedCountdown,
  getTodayTasksSorted,
  normalizeMoodRating,
  validateAreaSettings,
  validateChapters,
  validateCountdowns,
  validateLifeChapter,
  validateLifeProfile,
  validateMoodRatings,
} from '../lifeUtils';
import {
  AreaSettings,
  ChapterItem,
  CountdownItem,
  DEFAULT_AREA_SETTINGS,
  HabitItem,
  TaskItem,
  TaskPriority,
} from '../../types/dashboard';

describe('computeChapterStatus', () => {
  it('computes Day N of M, progressPercent, and remaining days within a bounded chapter', () => {
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
    expect(status.totalDays).toBe(61);
    expect(status.dayLabel).toBe('Day 27 of 61');
    expect(status.progressPercent).toBeCloseTo((27 / 61) * 100, 1);
    expect(status.remainingDays).toBe(34);
    expect(status.remainingLabel).toBe('34 days remaining');

    const openEnded = computeChapterStatus(
      {
        name: 'Open Chapter',
        theme: '',
        startDate: '2026-11-01',
        endDate: '',
        goals: [],
      },
      now
    );
    expect(openEnded.totalDays).toBeNull();
    expect(openEnded.dayLabel).toBe('Day 27 of chapter');
    expect(openEnded.progressPercent).toBeNull();
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
    expect(bars[4].detailLabel).toBe(`Age ${age.toFixed(1)} of 80 years`);

    const lifeBar = computeLifeProgressBar(now, {
      birthDate: '2007-03-04',
      lifeExpectancy: 80,
    });
    expect(lifeBar.label).toBe(`${age.toFixed(1)} of 80 years`);
    expect(lifeBar.percent).toBeCloseTo((age / 80) * 100, 1);
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

describe('validators & chapters', () => {
  it('sanitizes chapter, profile, and 0.5-step mood ratings cleanly', () => {
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

    expect(normalizeMoodRating(7.5)).toBe(7.5);
    expect(normalizeMoodRating(7.3)).toBe(7.5);
    expect(normalizeMoodRating(0.2)).toBe(1);
    expect(formatMoodValue(7)).toBe('7');
    expect(formatMoodValue(7.5)).toBe('7.5');

    const moods = validateMoodRatings([
      { dateKey: '2026-11-27', rating: 14 },
      { dateKey: '2026-11-26', rating: 7.5 },
      { dateKey: '2026-11-25', rating: 6 },
      { dateKey: 'bad', rating: 5 },
    ]);
    expect(moods).toHaveLength(3);
    expect(moods[0]).toEqual({
      id: '2026-11-27',
      dateKey: '2026-11-27',
      rating: 10,
      updatedAt: undefined,
    });
    expect(moods[1].rating).toBe(7.5);
    expect(moods[2].rating).toBe(6);
  });

  it('validates chapters, detects overlaps (including boundary days), and resolves active chapter', () => {
    const chapters: ChapterItem[] = validateChapters([
      {
        id: 'c2',
        name: 'College Year 1',
        theme: 'Foundations',
        startDate: '2027-06-01',
        endDate: '2028-05-31',
        color: 'emerald',
        goals: ['Learn systems'],
      },
      {
        id: 'c1',
        name: 'Drop Year',
        theme: 'Deep work',
        startDate: '2026-06-01',
        endDate: '2027-05-31',
        color: 'blue',
        goals: ['Consistency'],
      },
      {
        id: 'invalid-order',
        name: 'Reversed',
        theme: '',
        startDate: '2026-10-10',
        endDate: '2026-10-01',
        color: 'rose',
        goals: [],
      },
    ]);

    expect(chapters.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(
      findOverlappingChapter(chapters, { startDate: '2027-05-31', endDate: '2027-06-05' })?.id
    ).toBe('c1');
    expect(
      findOverlappingChapter(chapters, {
        id: 'c1',
        startDate: '2026-06-01',
        endDate: '2027-05-31',
      })
    ).toBeNull();
    expect(
      findOverlappingChapter(chapters, { startDate: '2028-06-01', endDate: '2028-12-31' })
    ).toBeNull();

    expect(findActiveChapter(chapters, '2026-11-27')?.id).toBe('c1');
    expect(findActiveChapter(chapters, '2027-06-01')?.id).toBe('c2');
    expect(findActiveChapter(chapters, '2029-01-01')).toBeNull();
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

describe('buildLifePosterWeeks', () => {
  it('builds 52 weeks per year, classifies past/current/future, and assigns chapters by max overlap', () => {
    const now = new Date(2026, 10, 27, 12, 0, 0); // 2026-11-27
    const chapters: ChapterItem[] = [
      {
        id: 'drop_year',
        name: 'Drop Year',
        theme: 'Deep work',
        startDate: '2026-06-01',
        endDate: '2027-05-31',
        color: 'blue',
        goals: ['Craft'],
      },
      {
        id: 'early',
        name: 'Spring Sprint',
        theme: 'Prep',
        startDate: '2026-03-01',
        endDate: '2026-03-10',
        color: 'emerald',
        goals: [],
      },
    ];

    const grid = buildLifePosterWeeks(
      { birthDate: '2007-03-04', lifeExpectancy: 80 },
      chapters,
      now
    );

    expect(grid.totalWeeks).toBe(80 * 52);
    expect(grid.weeks).toHaveLength(80 * 52);
    expect(grid.currentWeekIndex).not.toBeNull();

    const currentCells = grid.weeks.filter((w) => w.status === 'current');
    expect(currentCells).toHaveLength(1);
    const currentCell = currentCells[0];
    expect(currentCell.startDate <= '2026-11-27' && '2026-11-27' <= currentCell.endDate).toBe(true);
    expect(currentCell.chapter?.id).toBe('drop_year');

    // Week 0 begins on birthDate
    expect(grid.weeks[0].startDate).toBe('2007-03-04');
    expect(grid.weeks[0].status).toBe('past');
    expect(grid.weeks[0].chapter).toBeNull();

    // Past weeks count matches cells before current week
    expect(grid.pastWeeks).toBe(currentCell.index);
    expect(grid.weeks[grid.weeks.length - 1].status).toBe('future');
  });

  it('handles Feb 29 leap-day birthdates cleanly without drifting into March 1 on non-leap years', () => {
    const grid = buildLifePosterWeeks(
      { birthDate: '2008-02-29', lifeExpectancy: 4 },
      [],
      new Date(2010, 5, 1, 12, 0, 0)
    );
    expect(grid.weeks[0].startDate).toBe('2008-02-29');
    expect(grid.weeks[52].startDate).toBe('2009-02-28');
    expect(grid.weeks[51].endDate).toBe('2009-02-27');
  });
});

describe('getMoodScaleColor & buildYearPixelsGrid', () => {
  it('computes theme-token color-mix strings across 0.5 mood steps', () => {
    const low = getMoodScaleColor(1);
    const mid = getMoodScaleColor(5.5);
    const high = getMoodScaleColor(10);

    expect(low).toContain('color-mix(');
    expect(low).toContain('var(--cadence-mood-scale-start)');
    expect(mid).toContain('var(--cadence-mood-scale-mid)');
    expect(high).toContain('var(--cadence-mood-scale-end)');
    expect(low).not.toMatch(/#[0-9a-f]{3,8}/i);
  });

  it('builds a 12x31 grid, handles leap years, preserves unrated/future states, and averages months', () => {
    const now = new Date(2026, 10, 27, 10, 0, 0); // 2026-11-27
    const data = buildYearPixelsGrid(
      2026,
      [
        { id: '2026-11-25', dateKey: '2026-11-25', rating: 7.5 },
        { id: '2026-11-27', dateKey: '2026-11-27', rating: 9 },
        { id: '2026-01-05', dateKey: '2026-01-05', rating: 6 },
        { id: '2025-12-31', dateKey: '2025-12-31', rating: 10 }, // ignored for 2026
      ],
      now
    );

    expect(data.year).toBe(2026);
    expect(data.isLeapYear).toBe(false);
    expect(data.daysByMonth).toHaveLength(12);
    expect(data.daysByMonth[1][28]).toBeNull(); // Feb 29 absent in 2026
    expect(data.daysByMonth[10][26]?.status).toBe('today'); // Nov 27
    expect(data.daysByMonth[10][26]?.rating).toBe(9);
    expect(data.daysByMonth[10][27]?.status).toBe('future'); // Nov 28
    expect(data.daysByMonth[0][0]?.status).toBe('past'); // Jan 1 unrated
    expect(data.daysByMonth[0][0]?.rating).toBeNull();

    // Jan avg = 6, Nov avg = (7.5 + 9)/2 = 8.25 -> 8.3
    expect(data.monthSummaries[0].average).toBe(6);
    expect(data.monthSummaries[1].average).toBeNull();
    expect(data.monthSummaries[10].average).toBe(8.3);
    expect(data.ratedCount).toBe(3);
    expect(data.yearAverage).toBe(7.5); // (6 + 7.5 + 9)/3

    const leapData = buildYearPixelsGrid(2024, [], now);
    expect(leapData.isLeapYear).toBe(true);
    expect(leapData.daysByMonth[1][28]?.dateKey).toBe('2024-02-29');
  });
});

