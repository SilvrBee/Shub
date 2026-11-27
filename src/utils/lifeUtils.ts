import { formatDateKey, getTodayKey } from '../data/initialData';
import {
  AppSettings,
  DEFAULT_LIFE_CHAPTER,
  DEFAULT_LIFE_PROFILE,
  HabitItem,
  LifeChapter,
  LifeProfileSettings,
  MoodRatingRecord,
  TaskItem,
} from '../types/dashboard';
import { normalizeDateKey, parseDateKeyLocal, sortTasksSmart } from './taskUtils';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ChapterStatus {
  hasStarted: boolean;
  dayNumber: number;
  dayLabel: string;
  remainingDays: number | null;
  remainingLabel: string;
  progressPercent: number | null;
}

export interface TimeProgressBar {
  id: 'today' | 'week' | 'month' | 'year' | 'life';
  label: string;
  percent: number;
  detailLabel: string;
}

export interface TodayHabitEntry {
  habit: HabitItem;
  todayIndex: number;
  completedToday: boolean;
  doneThisWeek: number;
  targetDaysPerWeek: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function computeChapterStatus(
  chapter: LifeChapter,
  now = new Date()
): ChapterStatus {
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDt = parseDateKeyLocal(chapter.startDate);
  const endDt = parseDateKeyLocal(chapter.endDate);

  let hasStarted = true;
  let dayNumber = 1;
  let dayLabel = 'Day 1 of chapter';

  if (startDt) {
    const diffFromStart = Math.floor(
      (todayMidnight.getTime() - startDt.getTime()) / MS_PER_DAY
    );
    if (diffFromStart < 0) {
      hasStarted = false;
      dayNumber = 0;
      const daysUntilStart = Math.abs(diffFromStart);
      dayLabel =
        daysUntilStart === 1
          ? 'Starts tomorrow'
          : `Starts in ${daysUntilStart} days`;
    } else {
      dayNumber = diffFromStart + 1;
      dayLabel = `Day ${dayNumber} of chapter`;
    }
  }

  let remainingDays: number | null = null;
  let remainingLabel = 'Open-ended';
  if (endDt) {
    remainingDays = Math.round(
      (endDt.getTime() - todayMidnight.getTime()) / MS_PER_DAY
    );
    if (remainingDays > 1) {
      remainingLabel = `${remainingDays} days remaining`;
    } else if (remainingDays === 1) {
      remainingLabel = '1 day remaining';
    } else if (remainingDays === 0) {
      remainingLabel = 'Ends today';
    } else {
      remainingLabel = `Ended ${Math.abs(remainingDays)}d ago`;
    }
  }

  let progressPercent: number | null = null;
  if (startDt && endDt && endDt.getTime() >= startDt.getTime()) {
    const totalDays = Math.max(
      1,
      Math.round((endDt.getTime() - startDt.getTime()) / MS_PER_DAY) + 1
    );
    const elapsedDays = Math.max(
      0,
      Math.min(
        totalDays,
        Math.floor((todayMidnight.getTime() - startDt.getTime()) / MS_PER_DAY) + 1
      )
    );
    progressPercent = Math.round(clamp01(elapsedDays / totalDays) * 1000) / 10;
  }

  return {
    hasStarted,
    dayNumber,
    dayLabel,
    remainingDays,
    remainingLabel,
    progressPercent,
  };
}

function getBirthdayForYear(birthMonthIndex: number, birthDay: number, year: number): Date {
  const daysInMonth = new Date(year, birthMonthIndex + 1, 0).getDate();
  return new Date(year, birthMonthIndex, Math.min(birthDay, daysInMonth), 0, 0, 0, 0);
}

export function computeExactAgeYears(birthDateKey: string, now = new Date()): number {
  const parsed =
    parseDateKeyLocal(birthDateKey) ?? parseDateKeyLocal(DEFAULT_LIFE_PROFILE.birthDate)!;
  const birthYear = parsed.getFullYear();
  const birthMonthIndex = parsed.getMonth();
  const birthDay = parsed.getDate();

  if (now.getTime() <= parsed.getTime()) {
    return 0;
  }

  let lastBirthdayYear = now.getFullYear();
  let lastBirthday = getBirthdayForYear(birthMonthIndex, birthDay, lastBirthdayYear);
  if (lastBirthday.getTime() > now.getTime()) {
    lastBirthdayYear -= 1;
    lastBirthday = getBirthdayForYear(birthMonthIndex, birthDay, lastBirthdayYear);
  }
  const nextBirthday = getBirthdayForYear(birthMonthIndex, birthDay, lastBirthdayYear + 1);
  const wholeYears = Math.max(0, lastBirthdayYear - birthYear);
  const spanMs = Math.max(1, nextBirthday.getTime() - lastBirthday.getTime());
  const fraction = clamp01((now.getTime() - lastBirthday.getTime()) / spanMs);
  return wholeYears + fraction;
}

export function computeTimeProgressBars(
  now = new Date(),
  profile: LifeProfileSettings = DEFAULT_LIFE_PROFILE
): TimeProgressBar[] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  // 1. Today
  const startOfDay = new Date(y, m, d, 0, 0, 0, 0);
  const endOfDay = new Date(y, m, d + 1, 0, 0, 0, 0);
  const todayRatio = clamp01(
    (now.getTime() - startOfDay.getTime()) / (endOfDay.getTime() - startOfDay.getTime())
  );
  const elapsedMinutes = Math.max(
    0,
    Math.min(1440, Math.floor((now.getTime() - startOfDay.getTime()) / 60_000))
  );
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const elapsedMinsRemainder = elapsedMinutes % 60;

  // 2. This week (Mon-Sun)
  const dayOfWeekMon0 = (now.getDay() + 6) % 7; // 0 = Mon .. 6 = Sun
  const startOfWeek = new Date(y, m, d - dayOfWeekMon0, 0, 0, 0, 0);
  const endOfWeek = new Date(
    startOfWeek.getFullYear(),
    startOfWeek.getMonth(),
    startOfWeek.getDate() + 7,
    0,
    0,
    0,
    0
  );
  const weekRatio = clamp01(
    (now.getTime() - startOfWeek.getTime()) / (endOfWeek.getTime() - startOfWeek.getTime())
  );

  // 3. This month
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const startOfMonth = new Date(y, m, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(y, m + 1, 1, 0, 0, 0, 0);
  const monthRatio = clamp01(
    (now.getTime() - startOfMonth.getTime()) / (endOfMonth.getTime() - startOfMonth.getTime())
  );

  // 4. This year
  const startOfYear = new Date(y, 0, 1, 0, 0, 0, 0);
  const endOfYear = new Date(y + 1, 0, 1, 0, 0, 0, 0);
  const totalDaysInYear = Math.round(
    (endOfYear.getTime() - startOfYear.getTime()) / MS_PER_DAY
  );
  const startOfToday = new Date(y, m, d, 0, 0, 0, 0);
  const dayOfYear = Math.round((startOfToday.getTime() - startOfYear.getTime()) / MS_PER_DAY) + 1;
  const yearRatio = clamp01(
    (now.getTime() - startOfYear.getTime()) / (endOfYear.getTime() - startOfYear.getTime())
  );

  // 5. Life
  const safeExpectancy =
    typeof profile.lifeExpectancy === 'number' && Number.isFinite(profile.lifeExpectancy)
      ? Math.max(1, Math.min(150, Math.round(profile.lifeExpectancy)))
      : DEFAULT_LIFE_PROFILE.lifeExpectancy;
  const ageYears = computeExactAgeYears(profile.birthDate, now);
  const lifeRatio = clamp01(ageYears / safeExpectancy);

  return [
    {
      id: 'today',
      label: 'Today',
      percent: Math.round(todayRatio * 1000) / 10,
      detailLabel: `${elapsedHours}h ${String(elapsedMinsRemainder).padStart(2, '0')}m of 24h`,
    },
    {
      id: 'week',
      label: 'This week',
      percent: Math.round(weekRatio * 1000) / 10,
      detailLabel: `Day ${dayOfWeekMon0 + 1} of 7`,
    },
    {
      id: 'month',
      label: 'This month',
      percent: Math.round(monthRatio * 1000) / 10,
      detailLabel: `Day ${d} of ${daysInMonth}`,
    },
    {
      id: 'year',
      label: 'This year',
      percent: Math.round(yearRatio * 1000) / 10,
      detailLabel: `Day ${dayOfYear} of ${totalDaysInYear}`,
    },
    {
      id: 'life',
      label: 'Life',
      percent: Math.round(lifeRatio * 1000) / 10,
      detailLabel: `Age ${ageYears.toFixed(1)} of ${safeExpectancy}`,
    },
  ];
}

export function getTodayTasksSorted(
  tasks: TaskItem[],
  settings: Pick<
    AppSettings,
    'smartSortMode' | 'quickWinMinutes' | 'defaultDurationEstimateMinutes'
  >,
  todayKey = getTodayKey(),
  limit = 5
): TaskItem[] {
  const pool = tasks.filter((t) => {
    const dueTodayOrEarlier = Boolean(t.dueDate && t.dueDate <= todayKey);
    const deadlineTodayOrEarlier = Boolean(t.deadlineDate && t.deadlineDate <= todayKey);
    const strictlyToday = t.dueDate === todayKey || t.deadlineDate === todayKey;

    if (!t.completed) {
      return dueTodayOrEarlier || deadlineTodayOrEarlier;
    }
    return strictlyToday;
  });

  return sortTasksSmart(
    pool,
    settings.smartSortMode,
    settings.quickWinMinutes,
    todayKey,
    settings.defaultDurationEstimateMinutes
  ).slice(0, Math.max(1, limit));
}

export function getHabitsDueToday(
  habits: HabitItem[],
  now = new Date()
): TodayHabitEntry[] {
  const todayIndex = (now.getDay() + 6) % 7;
  const todayKey = formatDateKey(now);

  return habits
    .map((habit) => {
      const doneThisWeek = habit.completedDays.filter(Boolean).length;
      const completedToday = Boolean(
        habit.completedDays[todayIndex] || habit.completedDates?.includes(todayKey)
      );
      return {
        habit,
        todayIndex,
        completedToday,
        doneThisWeek,
        targetDaysPerWeek: habit.targetDaysPerWeek,
      };
    })
    .filter(
      (entry) =>
        entry.completedToday ||
        entry.targetDaysPerWeek >= 7 ||
        entry.doneThisWeek < entry.targetDaysPerWeek
    );
}

export function validateLifeChapter(raw: unknown): LifeChapter {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const name =
    typeof rec.name === 'string' && rec.name.trim()
      ? rec.name.trim().slice(0, 120)
      : DEFAULT_LIFE_CHAPTER.name;
  const theme =
    typeof rec.theme === 'string'
      ? rec.theme.trim().slice(0, 240)
      : DEFAULT_LIFE_CHAPTER.theme;
  const startDate =
    rec.startDate === ''
      ? ''
      : normalizeDateKey(rec.startDate) ?? DEFAULT_LIFE_CHAPTER.startDate;
  const endDate =
    rec.endDate === ''
      ? ''
      : normalizeDateKey(rec.endDate) ?? DEFAULT_LIFE_CHAPTER.endDate;
  const goals = Array.isArray(rec.goals)
    ? Array.from(
        new Set(
          rec.goals
            .filter((g): g is string => typeof g === 'string')
            .map((g) => g.trim().slice(0, 80))
            .filter(Boolean)
        )
      ).slice(0, 10)
    : DEFAULT_LIFE_CHAPTER.goals;

  return {
    name,
    theme,
    startDate,
    endDate,
    goals,
  };
}

export function validateLifeProfile(raw: unknown): LifeProfileSettings {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const birthDate = normalizeDateKey(rec.birthDate) ?? DEFAULT_LIFE_PROFILE.birthDate;
  const lifeExpectancy =
    typeof rec.lifeExpectancy === 'number' && Number.isFinite(rec.lifeExpectancy)
      ? Math.max(1, Math.min(150, Math.round(rec.lifeExpectancy)))
      : DEFAULT_LIFE_PROFILE.lifeExpectancy;

  return {
    birthDate,
    lifeExpectancy,
  };
}

export function validateMoodRatings(raw: unknown): MoodRatingRecord[] {
  if (!Array.isArray(raw)) return [];
  const byDate = new Map<string, MoodRatingRecord>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const dateKey = normalizeDateKey(rec.dateKey ?? rec.id);
    if (!dateKey) continue;
    if (typeof rec.rating !== 'number' || !Number.isFinite(rec.rating)) continue;
    const rating = Math.max(1, Math.min(10, Math.round(rec.rating)));
    byDate.set(dateKey, {
      id: dateKey,
      dateKey,
      rating,
      updatedAt:
        typeof rec.updatedAt === 'string' && !Number.isNaN(Date.parse(rec.updatedAt))
          ? rec.updatedAt
          : undefined,
    });
  }

  return Array.from(byDate.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}
