import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  Flame,
  Minus,
  Pin,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  AppSettings,
  AreaSettings,
  ChapterItem,
  CountdownItem,
  DashboardView,
  FocusSession,
  HabitItem,
  LifeAreaId,
  LifeProfileSettings,
  MoodRatingRecord,
  TaskItem,
} from '../types/dashboard';
import { formatDateKey } from '../data/initialData';
import {
  computeAreaPulses,
  computeChapterStatus,
  computeTimeProgressBars,
  formatMoodValue,
  getChapterColorVar,
  getCountdownDisplay,
  getHabitsDueToday,
  getNextUpCountdowns,
  getPinnedCountdown,
  getTodayTasksSorted,
  normalizeMoodRating,
} from '../utils/lifeUtils';
import { formatShortDateLabel, formatTimeShort } from '../utils/taskUtils';
import { DoodleHeaderScene } from './DoodleKit';
import { CountdownIcon, LifeAreaIcon, PulseTrendBadge } from './LifeAreaIcon';
import { LifeWheel } from './LifeWheel';
import { PriorityFlagDisplay } from './PriorityFlag';
import { TaskCheckButton } from './TaskCheckButton';
import { CategoryBadge } from './ui/CategoryBadge';

interface HomeViewProps {
  tasks: TaskItem[];
  habits: HabitItem[];
  focusSessions: FocusSession[];
  settings: AppSettings;
  activeChapter: ChapterItem | null;
  lifeProfile: LifeProfileSettings;
  areaSettings: AreaSettings;
  moodRatings: MoodRatingRecord[];
  countdowns: CountdownItem[];
  userFirstName?: string | null;
  onToggleTask: (id: string) => void;
  onToggleHabitDay: (habitId: string, dayIndex: number) => void;
  onSetMoodRating: (dateKey: string, rating: number | null) => void;
  onSelectArea: (areaId: LifeAreaId) => void;
  onNavigate: (view: DashboardView) => void;
  onOpenLifeChapters: () => void;
}

const SORT_MODE_LABELS: Record<AppSettings['smartSortMode'], string> = {
  balanced: 'Balanced',
  priority: 'Priority',
  deadline: 'Deadline',
  'quick-wins': 'Quick wins',
};

function formatPinnedChapterChip(
  title: string,
  targetDate: string,
  now: Date
): string {
  const { daysRemaining } = getCountdownDisplay(targetDate, now);
  if (daysRemaining === 0) return `${title} - Today`;
  if (daysRemaining === 1) return `${title} - 1 day`;
  if (daysRemaining > 1) return `${title} - ${daysRemaining} days`;
  return `${title} - ${Math.abs(daysRemaining)}d ago`;
}

export function HomeView({
  tasks,
  habits,
  focusSessions,
  settings,
  activeChapter,
  lifeProfile,
  areaSettings,
  moodRatings,
  countdowns,
  userFirstName,
  onToggleTask,
  onToggleHabitDay,
  onSetMoodRating,
  onSelectArea,
  onNavigate,
  onOpenLifeChapters,
}: HomeViewProps) {
  const [now, setNow] = useState(() => new Date());

  // Live update each minute, aligned closely to minute boundaries
  useEffect(() => {
    let intervalId: number | undefined;
    const tick = () => setNow(new Date());

    const msUntilNextMinute = Math.max(250, 60_000 - (Date.now() % 60_000));
    const timeoutId = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, 60_000);
    }, msUntilNextMinute);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const todayKey = formatDateKey(now);

  const activeChapterStatus = useMemo(
    () => (activeChapter ? computeChapterStatus(activeChapter, now) : null),
    [activeChapter, now]
  );

  const timeBars = useMemo(
    () => computeTimeProgressBars(now, lifeProfile),
    [now, lifeProfile]
  );
  const todayBar = timeBars[0];
  const yearBar = timeBars[3];

  const todayTasks = useMemo(
    () => getTodayTasksSorted(tasks, settings, todayKey, 5),
    [tasks, settings, todayKey]
  );

  const todayHabits = useMemo(
    () => getHabitsDueToday(habits, now),
    [habits, now]
  );

  const todayMood = useMemo(
    () => moodRatings.find((m) => m.dateKey === todayKey)?.rating ?? null,
    [moodRatings, todayKey]
  );

  const areaPulses = useMemo(
    () =>
      computeAreaPulses({
        tasks,
        habits,
        focusSessions,
        moodRatings,
        areaSettings,
        now,
      }),
    [tasks, habits, focusSessions, moodRatings, areaSettings, now]
  );

  const pinnedCountdown = useMemo(() => getPinnedCountdown(countdowns), [countdowns]);
  const nextUpCountdowns = useMemo(
    () => getNextUpCountdowns(countdowns, now, 2),
    [countdowns, now]
  );

  const formattedToday = useMemo(
    () =>
      now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
    [now]
  );

  const sliderValue = todayMood ?? 5;

  const stepMood = (delta: number) => {
    const base = todayMood ?? 5;
    const next = normalizeMoodRating(todayMood === null ? 5 : base + delta);
    onSetMoodRating(todayKey, next);
  };

  const chapterColorVar = activeChapter
    ? getChapterColorVar(activeChapter.color)
    : 'var(--cadence-area-study)';

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Top Row: Quiet Welcome + Doodle Scene */}
      <div className="editorial-rise editorial-rise-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">HOME</span>
            <span className="editorial-kicker-text">Dashboard of Life</span>
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
            {userFirstName ? `Welcome back, ${userFirstName}` : 'Home'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {formattedToday}
          </p>
        </div>

        {settings.style === 'doodle' && <DoodleHeaderScene tab={DashboardView.Home} />}
      </div>

      {/* Main 2-Column Layout (~60% Left, ~40% Right on Desktop; Today -> Chapter -> Wheel -> Next up on Mobile) */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
        {/* Left Column (~60% -> 7 of 12 cols) */}
        <div className="contents lg:flex lg:flex-col lg:gap-5 lg:col-span-7">
          {/* 1) Today Card */}
          <section
            aria-label="Today"
            className="order-1 lg:order-none editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="editorial-kicker">
                  <span className="editorial-marker" aria-hidden="true">TODAY</span>
                  <span className="editorial-kicker-text">Daily Focus</span>
                </span>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Today
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sorted by {SORT_MODE_LABELS[settings.smartSortMode]} · Tasks, habits &amp; mood
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate(DashboardView.Journal)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors shrink-0"
              >
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Write journal</span>
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Thin Today Progress Bar inside Today Card */}
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Today
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {todayBar.percent.toFixed(1)}%
                    </span>
                  </div>
                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                    {yearBar.detailLabel}
                  </span>
                </div>
                <div
                  className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
                  role="progressbar"
                  aria-label="Today progress"
                  aria-valuenow={Math.round(todayBar.percent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-[width] duration-500 ease-out"
                    style={{
                      width: `${Math.max(todayBar.percent > 0 ? 1.5 : 0, Math.min(100, todayBar.percent))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Top 3-5 Tasks for Today */}
                <div className="md:col-span-7 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tasks for today
                    </h3>
                    <button
                      type="button"
                      onClick={() => onNavigate(DashboardView.Tasks)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>All tasks</span>
                      <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>

                  {todayTasks.length === 0 ? (
                    <div className="editorial-subtle-box rounded-lg border border-dashed border-slate-200 dark:border-slate-800 px-4 py-5 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No tasks scheduled for today.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800">
                      {todayTasks.map((task) => {
                        const isOverdue =
                          !task.completed && Boolean(task.dueDate && task.dueDate < todayKey);
                        return (
                          <li
                            key={task.id}
                            className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <TaskCheckButton
                                checked={task.completed}
                                onToggle={() => onToggleTask(task.id)}
                                label={`Mark "${task.title}" as ${
                                  task.completed ? 'incomplete' : 'complete'
                                }`}
                              />
                              <div className="min-w-0">
                                <p
                                  className={`text-sm font-medium truncate ${
                                    task.completed
                                      ? 'line-through text-slate-400 dark:text-slate-500'
                                      : 'text-slate-900 dark:text-slate-100'
                                  }`}
                                >
                                  {task.title}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                  {task.category && (
                                    <CategoryBadge
                                      name={task.category}
                                      categories={settings.categories}
                                      compact
                                    />
                                  )}
                                  {task.dueTime && (
                                    <span className="font-mono tabular-nums">
                                      {formatTimeShort(task.dueTime, settings.timeFormat)}
                                    </span>
                                  )}
                                  {isOverdue && task.dueDate && (
                                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                                      Overdue · {formatShortDateLabel(task.dueDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <PriorityFlagDisplay priority={task.priority} compact />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Habits Due Today */}
                <div className="md:col-span-5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Habits due today
                    </h3>
                    <button
                      type="button"
                      onClick={() => onNavigate(DashboardView.Habits)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Habits</span>
                      <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>

                  {todayHabits.length === 0 ? (
                    <div className="editorial-subtle-box rounded-lg border border-dashed border-slate-200 dark:border-slate-800 px-4 py-5 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        All weekly habit targets met or none scheduled.
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {todayHabits.map((entry) => (
                        <li key={entry.habit.id}>
                          <button
                            type="button"
                            onClick={() => onToggleHabitDay(entry.habit.id, entry.todayIndex)}
                            aria-pressed={entry.completedToday}
                            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors ${
                              entry.completedToday
                                ? 'border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20'
                                : 'editorial-subtle-box border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                                  entry.completedToday
                                    ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500'
                                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                }`}
                              >
                                {entry.completedToday && (
                                  <Check className="w-3 h-3" aria-hidden="true" />
                                )}
                              </span>
                              <span
                                className={`text-sm font-medium truncate ${
                                  entry.completedToday
                                    ? 'text-slate-500 dark:text-slate-400 line-through'
                                    : 'text-slate-900 dark:text-slate-100'
                                }`}
                              >
                                {entry.habit.name}
                              </span>
                            </span>

                            <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                              <Flame className="w-3 h-3 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                              <span>
                                {entry.doneThisWeek}/{entry.targetDaysPerWeek}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Mood Row: 1..10 in 0.5 steps with slider, +/- stepper, and clear/unset */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="home-mood-slider"
                      className="text-sm font-medium text-slate-900 dark:text-slate-100"
                    >
                      Mood today
                    </label>
                    <span
                      className={`font-mono text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md ${
                        todayMood !== null
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {todayMood !== null ? `${formatMoodValue(todayMood)} / 10` : 'Unset'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {todayMood !== null
                      ? 'Adjustable in 0.5 steps anytime today'
                      : 'Optional · Slide or step from 1 to 10'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => stepMood(-0.5)}
                    disabled={todayMood !== null && todayMood <= 1}
                    aria-label="Decrease mood rating by 0.5"
                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>

                  <input
                    id="home-mood-slider"
                    type="range"
                    min={1}
                    max={10}
                    step={0.5}
                    value={sliderValue}
                    aria-label="Mood rating from 1 to 10 in 0.5 steps"
                    aria-valuetext={
                      todayMood !== null ? `${formatMoodValue(todayMood)} out of 10` : 'Not set'
                    }
                    onChange={(e) => onSetMoodRating(todayKey, Number(e.target.value))}
                    className="w-28 sm:w-32 accent-blue-600 dark:accent-blue-500 cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => stepMood(0.5)}
                    disabled={todayMood !== null && todayMood >= 10}
                    aria-label="Increase mood rating by 0.5"
                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>

                  {todayMood !== null && (
                    <button
                      type="button"
                      onClick={() => onSetMoodRating(todayKey, null)}
                      title="Clear today's mood rating"
                      aria-label="Clear today's mood rating"
                      className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800/70 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 4) Next Up Card (below Today in left column; 4th on mobile) */}
          <section
            aria-label="Next up countdowns"
            className="order-4 lg:order-none editorial-rise editorial-rise-4 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Next up
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Nearest upcoming countdowns
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(DashboardView.Life)}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                <span>Manage countdowns</span>
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>

            {nextUpCountdowns.length === 0 ? (
              <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {pinnedCountdown
                    ? 'No other upcoming countdowns scheduled.'
                    : 'No upcoming countdowns added yet.'}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate(DashboardView.Life)}
                  className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Add in Life
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 sm:divide-y-0 sm:divide-x sm:grid sm:grid-cols-2">
                {nextUpCountdowns.map((item) => {
                  const display = getCountdownDisplay(item.targetDate, now);
                  return (
                    <div
                      key={item.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                          <CountdownIcon icon={item.icon} className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {item.title}
                          </p>
                          <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {formatShortDateLabel(item.targetDate)}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-semibold tabular-nums px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0">
                        {display.shortBadge}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right Column (~40% -> 5 of 12 cols) */}
        <div className="contents lg:flex lg:flex-col lg:gap-5 lg:col-span-5">
          {/* 2) Compact Chapter Card (2nd on mobile, top-right on desktop) */}
          <section
            aria-label="Current life chapter"
            className="order-2 lg:order-none editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-5"
          >
            {activeChapter && activeChapterStatus ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: chapterColorVar }}
                        aria-hidden="true"
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Chapter
                      </span>
                    </div>
                    <h2 className="font-display text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                      {activeChapter.name}
                    </h2>
                  </div>

                  <span className="font-mono text-xs font-semibold tabular-nums px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0">
                    {activeChapterStatus.dayLabel}
                  </span>
                </div>

                {/* Single thin progress bar for active chapter */}
                <div
                  className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
                  role="progressbar"
                  aria-label={`${activeChapter.name} progress`}
                  aria-valuenow={Math.round(activeChapterStatus.progressPercent ?? 0)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{
                      width: `${Math.max(
                        (activeChapterStatus.progressPercent ?? 0) > 0 ? 2 : 0,
                        Math.min(100, activeChapterStatus.progressPercent ?? 0)
                      )}%`,
                      backgroundColor: chapterColorVar,
                    }}
                  />
                </div>

                {activeChapter.theme && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {activeChapter.theme}
                  </p>
                )}

                {(activeChapter.goals.length > 0 || pinnedCountdown) && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {activeChapter.goals.map((goal, idx) => (
                      <span
                        key={`${goal}-${idx}`}
                        className="editorial-subtle-box inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80"
                      >
                        {goal}
                      </span>
                    ))}

                    {pinnedCountdown && (
                      <button
                        type="button"
                        onClick={() => onNavigate(DashboardView.Life)}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors"
                      >
                        <Pin className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span className="font-mono tabular-nums">
                          {formatPinnedChapterChip(
                            pinnedCountdown.title,
                            pinnedCountdown.targetDate,
                            now
                          )}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>No active chapter</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No chapter covers today&apos;s date yet.
                  </p>
                  {pinnedCountdown && (
                    <button
                      type="button"
                      onClick={() => onNavigate(DashboardView.Life)}
                      className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60"
                    >
                      <Pin className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span className="font-mono tabular-nums">
                        {formatPinnedChapterChip(
                          pinnedCountdown.title,
                          pinnedCountdown.targetDate,
                          now
                        )}
                      </span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onOpenLifeChapters}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                >
                  <span>Chapters</span>
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            )}
          </section>

          {/* 3) Life Wheel + Compact Area Cards below it (3rd on mobile) */}
          <div className="order-3 lg:order-none space-y-4">
            <LifeWheel pulses={areaPulses} onSelectArea={onSelectArea} />

            <section aria-label="Life areas pulse" className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Life Areas · Last 7 Days
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate(DashboardView.Settings)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Map categories
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5">
                {areaPulses.map((pulse) => {
                  const hasScore = pulse.hasData && pulse.score !== null;
                  return (
                    <button
                      key={pulse.id}
                      type="button"
                      onClick={() => onSelectArea(pulse.id)}
                      className="cadence-card text-left bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl p-3 space-y-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="inline-flex items-center gap-1.5 min-w-0">
                          <span
                            style={{
                              color: hasScore
                                ? pulse.colorVar
                                : 'var(--cadence-area-muted)',
                            }}
                            className="shrink-0"
                          >
                            <LifeAreaIcon areaId={pulse.id} className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {pulse.label}
                          </span>
                        </span>
                        <PulseTrendBadge trend={pulse.trend} delta={pulse.delta} compact />
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={`font-mono text-base font-semibold tabular-nums leading-none ${
                            hasScore
                              ? 'text-slate-900 dark:text-slate-100'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {hasScore ? pulse.score : '—'}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                          {pulse.summaryLabel}
                        </span>
                      </div>

                      <div
                        className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{
                            width: `${hasScore && pulse.score !== null ? Math.max(4, pulse.score) : 0}%`,
                            backgroundColor: hasScore
                              ? pulse.colorVar
                              : 'var(--cadence-area-muted)',
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
