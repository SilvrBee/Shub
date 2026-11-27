import { formatDateKey, getCurrentWeekDateKeys, getTodayKey } from '../data/initialData';
import {
  AppSettings,
  AreaSettings,
  ChapterColorId,
  ChapterItem,
  CountdownIconId,
  CountdownItem,
  DEFAULT_AREA_SETTINGS,
  DEFAULT_CHAPTER_COLOR,
  DEFAULT_LIFE_CHAPTER,
  DEFAULT_LIFE_PROFILE,
  FocusSession,
  HabitItem,
  LIFE_AREA_IDS,
  LifeAreaId,
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
  totalDays: number | null;
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

  const totalDays =
    startDt && endDt && endDt.getTime() >= startDt.getTime()
      ? Math.max(1, Math.round((endDt.getTime() - startDt.getTime()) / MS_PER_DAY) + 1)
      : null;

  let hasStarted = true;
  let dayNumber = 1;
  let dayLabel = totalDays !== null ? `Day 1 of ${totalDays}` : 'Day 1 of chapter';

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
      dayNumber = totalDays !== null ? Math.min(totalDays, diffFromStart + 1) : diffFromStart + 1;
      dayLabel =
        totalDays !== null
          ? `Day ${dayNumber} of ${totalDays}`
          : `Day ${dayNumber} of chapter`;
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
  if (startDt && endDt && totalDays !== null) {
    const elapsedDays = hasStarted ? Math.max(0, Math.min(totalDays, dayNumber)) : 0;
    progressPercent = Math.round(clamp01(elapsedDays / totalDays) * 1000) / 10;
  }

  return {
    hasStarted,
    dayNumber,
    totalDays,
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
  const lifeProgress = computeLifeProgressBar(now, profile);

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
      percent: lifeProgress.percent,
      detailLabel: `Age ${lifeProgress.label}`,
    },
  ];
}

export interface LifeProgressBarResult {
  percent: number;
  label: string;
  ageYears: number;
  lifeExpectancy: number;
}

export function computeLifeProgressBar(
  now = new Date(),
  profile: LifeProfileSettings = DEFAULT_LIFE_PROFILE
): LifeProgressBarResult {
  const safeExpectancy =
    typeof profile.lifeExpectancy === 'number' && Number.isFinite(profile.lifeExpectancy)
      ? Math.max(1, Math.min(150, Math.round(profile.lifeExpectancy)))
      : DEFAULT_LIFE_PROFILE.lifeExpectancy;
  const ageYears = computeExactAgeYears(profile.birthDate, now);
  const lifeRatio = clamp01(ageYears / safeExpectancy);
  return {
    percent: Math.round(lifeRatio * 1000) / 10,
    label: `${ageYears.toFixed(1)} of ${safeExpectancy} years`,
    ageYears,
    lifeExpectancy: safeExpectancy,
  };
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

export interface ChapterColorMeta {
  id: ChapterColorId;
  label: string;
  colorVar: string;
}

export const CHAPTER_COLOR_OPTIONS: readonly ChapterColorMeta[] = [
  { id: 'blue', label: 'Primary Accent', colorVar: 'var(--cadence-area-study)' },
  { id: 'emerald', label: 'Emerald', colorVar: 'var(--cadence-area-body)' },
  { id: 'violet', label: 'Violet', colorVar: 'var(--cadence-area-mind)' },
  { id: 'amber', label: 'Amber', colorVar: 'var(--cadence-area-people)' },
  { id: 'cyan', label: 'Cyan', colorVar: 'var(--cadence-area-skills)' },
  { id: 'rose', label: 'Rose', colorVar: 'var(--cadence-area-projects)' },
] as const;

export const VALID_CHAPTER_COLORS: readonly ChapterColorId[] = [
  'blue',
  'emerald',
  'violet',
  'amber',
  'rose',
  'cyan',
] as const;

export function getChapterColorVar(colorId: ChapterColorId | string | undefined): string {
  const found = CHAPTER_COLOR_OPTIONS.find((opt) => opt.id === colorId);
  return found ? found.colorVar : CHAPTER_COLOR_OPTIONS[0].colorVar;
}

export function validateChapterItem(raw: unknown): ChapterItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const id = typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim().slice(0, 128) : '';
  const name =
    typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim().slice(0, 120) : '';
  const startDate = normalizeDateKey(rec.startDate);
  const endDate = normalizeDateKey(rec.endDate);
  if (!id || !name || !startDate || !endDate) return null;
  if (endDate < startDate) return null;

  const theme = typeof rec.theme === 'string' ? rec.theme.trim().slice(0, 240) : '';
  const color: ChapterColorId =
    typeof rec.color === 'string' && VALID_CHAPTER_COLORS.includes(rec.color as ChapterColorId)
      ? (rec.color as ChapterColorId)
      : DEFAULT_CHAPTER_COLOR;
  const goals = Array.isArray(rec.goals)
    ? Array.from(
        new Set(
          rec.goals
            .filter((g): g is string => typeof g === 'string')
            .map((g) => g.trim().slice(0, 80))
            .filter(Boolean)
        )
      ).slice(0, 10)
    : [];

  return {
    id,
    name,
    theme,
    startDate,
    endDate,
    color,
    goals,
    createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : undefined,
    updatedAt: typeof rec.updatedAt === 'string' ? rec.updatedAt : undefined,
  };
}

export function validateChapters(raw: unknown): ChapterItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const items: ChapterItem[] = [];
  for (const entry of raw) {
    const valid = validateChapterItem(entry);
    if (!valid || seen.has(valid.id)) continue;
    seen.add(valid.id);
    items.push(valid);
  }
  return items.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function findOverlappingChapter(
  chapters: ChapterItem[],
  candidate: { id?: string; startDate: string; endDate: string }
): ChapterItem | null {
  for (const existing of chapters) {
    if (candidate.id && existing.id === candidate.id) continue;
    if (
      existing.startDate <= candidate.endDate &&
      candidate.startDate <= existing.endDate
    ) {
      return existing;
    }
  }
  return null;
}

export function findActiveChapter(
  chapters: ChapterItem[],
  todayKey = getTodayKey()
): ChapterItem | null {
  return (
    chapters.find((c) => c.startDate <= todayKey && todayKey <= c.endDate) ?? null
  );
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

export function normalizeMoodRating(rating: number): number {
  if (!Number.isFinite(rating)) return 5;
  const clamped = Math.max(1, Math.min(10, rating));
  return Math.round(clamped * 2) / 2;
}

export function formatMoodValue(rating: number): string {
  const normalized = normalizeMoodRating(rating);
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
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
    const rating = normalizeMoodRating(rec.rating);
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

export interface LifeAreaMeta {
  id: LifeAreaId;
  label: string;
  description: string;
  icon: string;
  colorVar: string;
}

export const LIFE_AREA_META: Record<LifeAreaId, LifeAreaMeta> = {
  study: {
    id: 'study',
    label: 'Study',
    description: 'Focus hours vs your weekly study goal',
    icon: 'BookOpen',
    colorVar: 'var(--cadence-area-study)',
  },
  body: {
    id: 'body',
    label: 'Body',
    description: 'Days with steps or a walk logged this week',
    icon: 'HeartPulse',
    colorVar: 'var(--cadence-area-body)',
  },
  mind: {
    id: 'mind',
    label: 'Mind',
    description: 'Journal check-ins, mood entries, and average mood',
    icon: 'Brain',
    colorVar: 'var(--cadence-area-mind)',
  },
  people: {
    id: 'people',
    label: 'People',
    description: 'Relationships and shared moments',
    icon: 'Users',
    colorVar: 'var(--cadence-area-people)',
  },
  skills: {
    id: 'skills',
    label: 'Skills',
    description: 'Completed vs planned tasks in Skills categories',
    icon: 'Wrench',
    colorVar: 'var(--cadence-area-skills)',
  },
  projects: {
    id: 'projects',
    label: 'Projects',
    description: 'Completed vs planned tasks in Projects categories',
    icon: 'FolderKanban',
    colorVar: 'var(--cadence-area-projects)',
  },
};

export const VALID_COUNTDOWN_ICONS: readonly CountdownIconId[] = [
  'Calendar',
  'Flag',
  'GraduationCap',
  'Plane',
  'Trophy',
  'Target',
  'Compass',
  'BookOpen',
  'Star',
  'Sparkles',
] as const;

export const COUNTDOWN_ICON_LABELS: Record<CountdownIconId, string> = {
  Calendar: 'Calendar',
  Flag: 'Milestone',
  GraduationCap: 'Exam / Study',
  Plane: 'Travel',
  Trophy: 'Goal',
  Target: 'Target',
  Compass: 'Journey',
  BookOpen: 'Release / Book',
  Star: 'Special Day',
  Sparkles: 'Launch',
};

export interface AreaPulseResult {
  id: LifeAreaId;
  label: string;
  description: string;
  icon: string;
  colorVar: string;
  score: number | null; // 0..100 or null if no data
  previousScore: number | null;
  delta: number | null;
  trend: 'up' | 'down' | 'flat' | 'none';
  hasData: boolean;
  summaryLabel: string;
}

function getWindowKeysEndingAt(endDate: Date, days: number, offsetEndDays = 0): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate() - offsetEndDays - i
    );
    keys.push(formatDateKey(d));
  }
  return keys;
}

export function resolveCategoryToArea(
  categoryName: string | undefined,
  areaSettings: AreaSettings
): LifeAreaId | null {
  if (!categoryName || !categoryName.trim()) return null;
  const target = categoryName.trim().toLowerCase();
  for (const [cat, areaId] of Object.entries(areaSettings.categoryAreaMap)) {
    if (cat.trim().toLowerCase() === target) {
      return LIFE_AREA_IDS.includes(areaId) ? areaId : null;
    }
  }
  return null;
}

export function getMappedCategoriesForArea(
  areaId: LifeAreaId,
  areaSettings: AreaSettings,
  availableCategories: string[]
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const cat of availableCategories) {
    if (resolveCategoryToArea(cat, areaSettings) === areaId) {
      const key = cat.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(cat);
      }
    }
  }
  for (const [cat, mapped] of Object.entries(areaSettings.categoryAreaMap)) {
    if (mapped === areaId && !seen.has(cat.toLowerCase())) {
      seen.add(cat.toLowerCase());
      result.push(cat);
    }
  }
  return result;
}

function deriveTrend(score: number | null, previousScore: number | null): {
  delta: number | null;
  trend: 'up' | 'down' | 'flat' | 'none';
} {
  if (score === null || previousScore === null) {
    return { delta: null, trend: 'none' };
  }
  const delta = score - previousScore;
  if (delta > 0) return { delta, trend: 'up' };
  if (delta < 0) return { delta, trend: 'down' };
  return { delta: 0, trend: 'flat' };
}

export interface ComputeAreaPulsesInput {
  tasks: TaskItem[];
  habits: HabitItem[];
  focusSessions: FocusSession[];
  moodRatings: MoodRatingRecord[];
  areaSettings: AreaSettings;
  now?: Date;
}

export function computeAreaPulses({
  tasks,
  habits,
  focusSessions,
  moodRatings,
  areaSettings,
  now = new Date(),
}: ComputeAreaPulsesInput): AreaPulseResult[] {
  const currentKeys = getWindowKeysEndingAt(now, 7, 0);
  const previousKeys = getWindowKeysEndingAt(now, 7, 7);
  const currentSet = new Set(currentKeys);
  const previousSet = new Set(previousKeys);

  // 1. Study: Focus-session hours vs weekly goal in Settings
  const goalHours = Math.max(1, Math.min(80, Math.round(areaSettings.studyWeeklyGoalHours || 10)));
  const currFocusMinutes = focusSessions
    .filter((s) => currentSet.has(s.dateKey))
    .reduce((sum, s) => sum + Math.max(0, s.minutes), 0);
  const prevFocusMinutes = focusSessions
    .filter((s) => previousSet.has(s.dateKey))
    .reduce((sum, s) => sum + Math.max(0, s.minutes), 0);

  const studyHasData = currFocusMinutes > 0 || prevFocusMinutes > 0;
  const studyScore = studyHasData
    ? Math.min(100, Math.round((currFocusMinutes / 60 / goalHours) * 100))
    : null;
  const studyPrevScore =
    prevFocusMinutes > 0
      ? Math.min(100, Math.round((prevFocusMinutes / 60 / goalHours) * 100))
      : null;
  const studyTrend = deriveTrend(studyScore, studyPrevScore);
  const studyHoursText = (currFocusMinutes / 60).toFixed(1).replace(/\.0$/, '');

  // 2. Body: Days with steps or a walk logged out of 7
  const weekKeys = getCurrentWeekDateKeys(now);
  const bodyWalkDates = new Set<string>();
  for (const habit of habits) {
    if (!/(steps|walk)/i.test(habit.name)) continue;
    for (const dk of habit.completedDates ?? []) {
      bodyWalkDates.add(dk);
    }
    habit.completedDays.forEach((done, idx) => {
      if (done && weekKeys[idx]) {
        bodyWalkDates.add(weekKeys[idx]);
      }
    });
  }
  const currBodyDays = currentKeys.filter((k) => bodyWalkDates.has(k)).length;
  const prevBodyDays = previousKeys.filter((k) => bodyWalkDates.has(k)).length;
  const bodyHasData = currBodyDays > 0 || prevBodyDays > 0;
  const bodyScore = bodyHasData ? Math.min(100, Math.round((currBodyDays / 7) * 100)) : null;
  const bodyPrevScore =
    prevBodyDays > 0 ? Math.min(100, Math.round((prevBodyDays / 7) * 100)) : null;
  const bodyTrend = deriveTrend(bodyScore, bodyPrevScore);

  // 3. Mind: Days Journal opened or mood rated, plus average mood
  const journalDates = new Set(areaSettings.journalOpenedDates ?? []);
  const moodByDate = new Map<string, number>();
  for (const m of moodRatings) {
    moodByDate.set(m.dateKey, m.rating);
  }

  const evalMindWindow = (keys: string[]) => {
    let activeDays = 0;
    const moods: number[] = [];
    for (const k of keys) {
      const hasMood = moodByDate.has(k);
      const hasJournal = journalDates.has(k);
      if (hasMood || hasJournal) activeDays += 1;
      if (hasMood) moods.push(moodByDate.get(k)!);
    }
    if (activeDays === 0) {
      return { activeDays: 0, avgMood: null as number | null, score: null as number | null };
    }
    if (moods.length > 0) {
      const avgMood = moods.reduce((s, v) => s + v, 0) / moods.length;
      const score = Math.min(100, Math.round((activeDays / 7) * 50 + (avgMood / 10) * 50));
      return { activeDays, avgMood, score };
    }
    return {
      activeDays,
      avgMood: null as number | null,
      score: Math.min(100, Math.round((activeDays / 7) * 100)),
    };
  };

  const currMind = evalMindWindow(currentKeys);
  const prevMind = evalMindWindow(previousKeys);
  const mindHasData = currMind.activeDays > 0 || prevMind.activeDays > 0;
  const mindScore = mindHasData ? (currMind.score ?? 0) : null;
  const mindPrevScore = prevMind.score;
  const mindTrend = deriveTrend(mindScore, mindPrevScore);

  // 4. Skills and Projects: Tasks completed from mapped categories vs tasks planned
  const evalTaskAreaWindow = (areaId: LifeAreaId, keySet: Set<string>) => {
    const planned = tasks.filter((t) => {
      if (resolveCategoryToArea(t.category, areaSettings) !== areaId) return false;
      const dueInWindow = Boolean(t.dueDate && keySet.has(t.dueDate));
      const deadlineInWindow = Boolean(t.deadlineDate && keySet.has(t.deadlineDate));
      return dueInWindow || deadlineInWindow;
    });
    if (planned.length === 0) {
      return { planned: 0, completed: 0, score: null as number | null };
    }
    const completed = planned.filter((t) => t.completed).length;
    return {
      planned: planned.length,
      completed,
      score: Math.round((completed / planned.length) * 100),
    };
  };

  const currSkills = evalTaskAreaWindow('skills', currentSet);
  const prevSkills = evalTaskAreaWindow('skills', previousSet);
  const skillsTrend = deriveTrend(currSkills.score, prevSkills.score);

  const currProjects = evalTaskAreaWindow('projects', currentSet);
  const prevProjects = evalTaskAreaWindow('projects', previousSet);
  const projectsTrend = deriveTrend(currProjects.score, prevProjects.score);

  const resultsById: Record<LifeAreaId, AreaPulseResult> = {
    study: {
      ...LIFE_AREA_META.study,
      score: studyScore,
      previousScore: studyPrevScore,
      delta: studyTrend.delta,
      trend: studyTrend.trend,
      hasData: studyHasData,
      summaryLabel: studyHasData ? `${studyHoursText}h / ${goalHours}h goal` : 'No sessions yet',
    },
    body: {
      ...LIFE_AREA_META.body,
      score: bodyScore,
      previousScore: bodyPrevScore,
      delta: bodyTrend.delta,
      trend: bodyTrend.trend,
      hasData: bodyHasData,
      summaryLabel: bodyHasData ? `${currBodyDays}/7 active days` : 'No data yet',
    },
    mind: {
      ...LIFE_AREA_META.mind,
      score: mindScore,
      previousScore: mindPrevScore,
      delta: mindTrend.delta,
      trend: mindTrend.trend,
      hasData: mindHasData,
      summaryLabel: !mindHasData
        ? 'No data yet'
        : currMind.avgMood !== null
          ? `${currMind.activeDays}/7d · avg ${currMind.avgMood.toFixed(1)}`
          : `${currMind.activeDays}/7d journal`,
    },
    people: {
      ...LIFE_AREA_META.people,
      score: null,
      previousScore: null,
      delta: null,
      trend: 'none',
      hasData: false,
      summaryLabel: 'No data yet',
    },
    skills: {
      ...LIFE_AREA_META.skills,
      score: currSkills.score,
      previousScore: prevSkills.score,
      delta: skillsTrend.delta,
      trend: skillsTrend.trend,
      hasData: currSkills.planned > 0,
      summaryLabel:
        currSkills.planned > 0
          ? `${currSkills.completed}/${currSkills.planned} tasks`
          : 'No data yet',
    },
    projects: {
      ...LIFE_AREA_META.projects,
      score: currProjects.score,
      previousScore: prevProjects.score,
      delta: projectsTrend.delta,
      trend: projectsTrend.trend,
      hasData: currProjects.planned > 0,
      summaryLabel:
        currProjects.planned > 0
          ? `${currProjects.completed}/${currProjects.planned} tasks`
          : 'No data yet',
    },
  };

  return LIFE_AREA_IDS.map((id) => resultsById[id]);
}

export interface CountdownDisplayMeta {
  daysRemaining: number;
  shortBadge: string;
  detailLabel: string;
}

export function getCountdownDisplay(
  targetDateKey: string,
  now = new Date()
): CountdownDisplayMeta {
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = parseDateKeyLocal(targetDateKey);
  if (!target) {
    return {
      daysRemaining: 0,
      shortBadge: '—',
      detailLabel: 'Invalid date',
    };
  }
  const daysRemaining = Math.round((target.getTime() - todayMidnight.getTime()) / MS_PER_DAY);
  if (daysRemaining === 0) {
    return { daysRemaining: 0, shortBadge: 'Today', detailLabel: 'Today' };
  }
  if (daysRemaining === 1) {
    return { daysRemaining: 1, shortBadge: '1d left', detailLabel: 'Tomorrow' };
  }
  if (daysRemaining > 1) {
    return {
      daysRemaining,
      shortBadge: `${daysRemaining}d left`,
      detailLabel: `In ${daysRemaining} days`,
    };
  }
  if (daysRemaining === -1) {
    return { daysRemaining: -1, shortBadge: '1d ago', detailLabel: 'Yesterday' };
  }
  const abs = Math.abs(daysRemaining);
  return {
    daysRemaining,
    shortBadge: `${abs}d ago`,
    detailLabel: `${abs} days ago`,
  };
}

export function getPinnedCountdown(countdowns: CountdownItem[]): CountdownItem | null {
  return countdowns.find((c) => c.pinned) ?? null;
}

export function getNextUpCountdowns(
  countdowns: CountdownItem[],
  now = new Date(),
  limit = 2
): CountdownItem[] {
  const todayKey = formatDateKey(now);
  const pinned = getPinnedCountdown(countdowns);
  return countdowns
    .filter((c) => c.id !== pinned?.id && c.targetDate >= todayKey)
    .sort((a, b) => {
      const dateCmp = a.targetDate.localeCompare(b.targetDate);
      if (dateCmp !== 0) return dateCmp;
      return a.title.localeCompare(b.title);
    })
    .slice(0, Math.max(0, limit));
}

export function validateAreaSettings(raw: unknown): AreaSettings {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const studyWeeklyGoalHours =
    typeof rec.studyWeeklyGoalHours === 'number' && Number.isFinite(rec.studyWeeklyGoalHours)
      ? Math.max(1, Math.min(80, Math.round(rec.studyWeeklyGoalHours)))
      : DEFAULT_AREA_SETTINGS.studyWeeklyGoalHours;

  const rawMap =
    rec.categoryAreaMap && typeof rec.categoryAreaMap === 'object'
      ? (rec.categoryAreaMap as Record<string, unknown>)
      : DEFAULT_AREA_SETTINGS.categoryAreaMap;

  const categoryAreaMap: Record<string, LifeAreaId> = {};
  for (const [key, val] of Object.entries(rawMap)) {
    const trimmedKey = key.trim().slice(0, 60);
    if (!trimmedKey) continue;
    if (typeof val === 'string' && LIFE_AREA_IDS.includes(val as LifeAreaId)) {
      categoryAreaMap[trimmedKey] = val as LifeAreaId;
    }
  }

  const journalOpenedDates = Array.isArray(rec.journalOpenedDates)
    ? Array.from(
        new Set(
          rec.journalOpenedDates
            .map((d) => normalizeDateKey(d))
            .filter((d): d is string => Boolean(d))
        )
      )
        .sort()
        .slice(-120)
    : [];

  return {
    studyWeeklyGoalHours,
    categoryAreaMap,
    journalOpenedDates,
  };
}

export function validateCountdowns(raw: unknown): CountdownItem[] {
  if (!Array.isArray(raw)) return [];
  const validIconSet = new Set<string>(VALID_COUNTDOWN_ICONS);
  const seen = new Set<string>();
  const items: CountdownItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const id = typeof rec.id === 'string' && rec.id.trim() ? rec.id.trim().slice(0, 128) : '';
    const title =
      typeof rec.title === 'string' && rec.title.trim() ? rec.title.trim().slice(0, 160) : '';
    const targetDate = normalizeDateKey(rec.targetDate);
    if (!id || !title || !targetDate || seen.has(id)) continue;
    seen.add(id);

    const icon: CountdownIconId =
      typeof rec.icon === 'string' && validIconSet.has(rec.icon)
        ? (rec.icon as CountdownIconId)
        : 'Calendar';

    items.push({
      id,
      title,
      targetDate,
      icon,
      pinned: Boolean(rec.pinned),
      createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : undefined,
      updatedAt: typeof rec.updatedAt === 'string' ? rec.updatedAt : undefined,
    });
  }

  // Ensure at most one pinned item
  let foundPinned = false;
  return items.map((item) => {
    if (item.pinned) {
      if (!foundPinned) {
        foundPinned = true;
        return item;
      }
      return { ...item, pinned: false };
    }
    return item;
  });
}

function parseYmdParts(key: string): { y: number; m: number; d: number } | null {
  const clean = normalizeDateKey(key);
  if (!clean) return null;
  const [y, m, d] = clean.split('-').map(Number);
  return { y, m, d };
}

function dateKeyToEpochDay(key: string): number {
  const parts = parseYmdParts(key);
  if (!parts) return 0;
  return Math.floor(Date.UTC(parts.y, parts.m - 1, parts.d) / MS_PER_DAY);
}

function epochDayToDateKey(epochDay: number): string {
  return new Date(epochDay * MS_PER_DAY).toISOString().slice(0, 10);
}

function addYearsClampedEpochDay(birthKey: string, years: number): number {
  const parts = parseYmdParts(birthKey);
  if (!parts) return 0;
  const targetYear = parts.y + years;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, parts.m, 0)).getUTCDate();
  const clampedDay = Math.min(parts.d, daysInTargetMonth);
  return Math.floor(Date.UTC(targetYear, parts.m - 1, clampedDay) / MS_PER_DAY);
}

export interface LifeWeekCell {
  index: number; // 0 .. lifeExpectancy * 52 - 1
  yearIndex: number; // 0 .. lifeExpectancy - 1
  weekIndex: number; // 0 .. 51
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'past' | 'current' | 'future';
  chapter: ChapterItem | null;
}

export interface LifePosterGrid {
  birthDate: string;
  lifeExpectancy: number;
  totalWeeks: number;
  pastWeeks: number;
  currentWeekIndex: number | null;
  weeks: LifeWeekCell[];
}

export function buildLifePosterWeeks(
  profile: LifeProfileSettings,
  chapters: ChapterItem[],
  now = new Date()
): LifePosterGrid {
  const birthDate = normalizeDateKey(profile.birthDate) ?? DEFAULT_LIFE_PROFILE.birthDate;
  const lifeExpectancy =
    typeof profile.lifeExpectancy === 'number' && Number.isFinite(profile.lifeExpectancy)
      ? Math.max(1, Math.min(150, Math.round(profile.lifeExpectancy)))
      : DEFAULT_LIFE_PROFILE.lifeExpectancy;

  const todayKey = formatDateKey(now);
  const todayEpoch = dateKeyToEpochDay(todayKey);

  const chapterSpans = validateChapters(chapters).map((chapter) => ({
    chapter,
    startEpoch: dateKeyToEpochDay(chapter.startDate),
    endEpoch: dateKeyToEpochDay(chapter.endDate),
  }));

  const totalWeeks = lifeExpectancy * 52;
  const weeks: LifeWeekCell[] = new Array(totalWeeks);
  let pastWeeks = 0;
  let currentWeekIndex: number | null = null;
  let cellIdx = 0;

  for (let yearIndex = 0; yearIndex < lifeExpectancy; yearIndex += 1) {
    const rowStartEpoch = addYearsClampedEpochDay(birthDate, yearIndex);
    const nextRowStartEpoch = addYearsClampedEpochDay(birthDate, yearIndex + 1);
    const rowEndEpoch = Math.max(rowStartEpoch, nextRowStartEpoch - 1);

    for (let weekIndex = 0; weekIndex < 52; weekIndex += 1) {
      const wStartEpoch = rowStartEpoch + weekIndex * 7;
      const wEndEpoch =
        weekIndex === 51
          ? Math.max(wStartEpoch, rowEndEpoch)
          : Math.min(rowEndEpoch, wStartEpoch + 6);

      let status: 'past' | 'current' | 'future';
      if (wEndEpoch < todayEpoch) {
        status = 'past';
        pastWeeks += 1;
      } else if (wStartEpoch > todayEpoch) {
        status = 'future';
      } else {
        status = 'current';
        if (currentWeekIndex === null) {
          currentWeekIndex = cellIdx;
        }
      }

      let matchedChapter: ChapterItem | null = null;
      let bestOverlap = 0;
      for (const span of chapterSpans) {
        if (span.endEpoch < wStartEpoch) continue;
        if (span.startEpoch > wEndEpoch) break;
        const overlap =
          Math.min(wEndEpoch, span.endEpoch) - Math.max(wStartEpoch, span.startEpoch) + 1;
        if (overlap > bestOverlap || (overlap === bestOverlap && overlap > 0)) {
          bestOverlap = overlap;
          matchedChapter = span.chapter;
        }
      }

      weeks[cellIdx] = {
        index: cellIdx,
        yearIndex,
        weekIndex,
        startDate: epochDayToDateKey(wStartEpoch),
        endDate: epochDayToDateKey(wEndEpoch),
        status,
        chapter: matchedChapter,
      };
      cellIdx += 1;
    }
  }

  return {
    birthDate,
    lifeExpectancy,
    totalWeeks,
    pastWeeks,
    currentWeekIndex,
    weeks,
  };
}

export const MOOD_STEP_VALUES: readonly number[] = [
  1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10,
] as const;

export function getMoodScaleColor(rating: number): string {
  const safe = normalizeMoodRating(rating);
  const t = (safe - 1) / 9;
  if (t <= 0.5) {
    const pct = Math.round((t / 0.5) * 100);
    return `color-mix(in oklab, var(--cadence-mood-scale-start) ${100 - pct}%, var(--cadence-mood-scale-mid) ${pct}%)`;
  }
  const pct = Math.round(((t - 0.5) / 0.5) * 100);
  return `color-mix(in oklab, var(--cadence-mood-scale-mid) ${100 - pct}%, var(--cadence-mood-scale-end) ${pct}%)`;
}

export interface YearPixelDay {
  monthIndex: number; // 0 .. 11
  dayOfMonth: number; // 1 .. 31
  dateKey: string; // YYYY-MM-DD
  status: 'past' | 'today' | 'future';
  rating: number | null;
}

export interface MonthMoodSummary {
  monthIndex: number; // 0 .. 11
  shortLabel: string; // 'Jan' .. 'Dec'
  ratedCount: number;
  average: number | null;
}

export interface YearPixelsData {
  year: number;
  isLeapYear: boolean;
  daysByMonth: Array<Array<YearPixelDay | null>>;
  monthSummaries: MonthMoodSummary[];
  ratedCount: number;
  yearAverage: number | null;
}

const MONTH_SHORT_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function buildYearPixelsGrid(
  year: number,
  moodRatings: MoodRatingRecord[],
  now = new Date()
): YearPixelsData {
  const safeYear = Number.isFinite(year)
    ? Math.max(1900, Math.min(2200, Math.round(year)))
    : now.getFullYear();
  const isLeapYear = (safeYear % 4 === 0 && safeYear % 100 !== 0) || safeYear % 400 === 0;
  const todayKey = formatDateKey(now);

  const moodMap = new Map<string, number>();
  for (const rec of moodRatings) {
    const key = normalizeDateKey(rec.dateKey);
    if (key && typeof rec.rating === 'number' && Number.isFinite(rec.rating)) {
      moodMap.set(key, normalizeMoodRating(rec.rating));
    }
  }

  const daysByMonth: Array<Array<YearPixelDay | null>> = [];
  const monthSummaries: MonthMoodSummary[] = [];
  let yearSum = 0;
  let yearCount = 0;

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const daysInMonth = new Date(Date.UTC(safeYear, monthIndex + 1, 0)).getUTCDate();
    const monthDays: Array<YearPixelDay | null> = [];
    let monthSum = 0;
    let monthCount = 0;
    const monthStr = String(monthIndex + 1).padStart(2, '0');

    for (let dayOfMonth = 1; dayOfMonth <= 31; dayOfMonth += 1) {
      if (dayOfMonth > daysInMonth) {
        monthDays.push(null);
        continue;
      }
      const dateKey = `${safeYear}-${monthStr}-${String(dayOfMonth).padStart(2, '0')}`;
      const status: 'past' | 'today' | 'future' =
        dateKey > todayKey ? 'future' : dateKey === todayKey ? 'today' : 'past';
      const rating = moodMap.get(dateKey) ?? null;
      if (rating !== null) {
        monthSum += rating;
        monthCount += 1;
        yearSum += rating;
        yearCount += 1;
      }
      monthDays.push({
        monthIndex,
        dayOfMonth,
        dateKey,
        status,
        rating,
      });
    }

    daysByMonth.push(monthDays);
    monthSummaries.push({
      monthIndex,
      shortLabel: MONTH_SHORT_LABELS[monthIndex],
      ratedCount: monthCount,
      average: monthCount > 0 ? Math.round((monthSum / monthCount) * 10) / 10 : null,
    });
  }

  return {
    year: safeYear,
    isLeapYear,
    daysByMonth,
    monthSummaries,
    ratedCount: yearCount,
    yearAverage: yearCount > 0 ? Math.round((yearSum / yearCount) * 10) / 10 : null,
  };
}

