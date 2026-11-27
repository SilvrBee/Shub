import { useMemo } from 'react';
import { ArrowLeft, Check, Flame, Sliders } from 'lucide-react';
import { formatDateKey, getTodayKey } from '../data/initialData';
import {
  AppSettings,
  AreaSettings,
  DashboardView,
  FocusSession,
  HabitItem,
  LIFE_AREA_IDS,
  LifeAreaId,
  MoodRatingRecord,
  TaskItem,
} from '../types/dashboard';
import {
  AreaPulseResult,
  getMappedCategoriesForArea,
  LIFE_AREA_META,
  resolveCategoryToArea,
} from '../utils/lifeUtils';
import { formatShortDateLabel, formatTimeShort } from '../utils/taskUtils';
import { LifeAreaIcon, PulseTrendBadge } from './LifeAreaIcon';
import { PriorityFlagDisplay } from './PriorityFlag';
import { TaskCheckButton } from './TaskCheckButton';
import { CategoryBadge } from './ui/CategoryBadge';

interface AreaDetailViewProps {
  areaId: LifeAreaId;
  pulses: AreaPulseResult[];
  tasks: TaskItem[];
  habits: HabitItem[];
  focusSessions: FocusSession[];
  moodRatings: MoodRatingRecord[];
  settings: AppSettings;
  areaSettings: AreaSettings;
  onSelectArea: (areaId: LifeAreaId) => void;
  onBackHome: () => void;
  onToggleTask: (id: string) => void;
  onEditTask: (task: TaskItem) => void;
  onToggleHabitDay: (habitId: string, dayIndex: number) => void;
  onNavigate: (view: DashboardView) => void;
}

export function AreaDetailView({
  areaId,
  pulses,
  tasks,
  habits,
  focusSessions,
  moodRatings,
  settings,
  areaSettings,
  onSelectArea,
  onBackHome,
  onToggleTask,
  onEditTask,
  onToggleHabitDay,
  onNavigate,
}: AreaDetailViewProps) {
  const now = new Date();
  const todayKey = getTodayKey();
  const todayIndex = (now.getDay() + 6) % 7;

  const meta = LIFE_AREA_META[areaId];
  const pulse = pulses.find((p) => p.id === areaId) ?? pulses[0];

  const mappedCategories = useMemo(
    () =>
      getMappedCategoriesForArea(
        areaId,
        areaSettings,
        settings.categories.map((c) => c.name)
      ),
    [areaId, areaSettings, settings.categories]
  );

  const areaTasks = useMemo(
    () =>
      tasks
        .filter((t) => resolveCategoryToArea(t.category, areaSettings) === areaId)
        .sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return (a.dueDate || '9999-99-99').localeCompare(b.dueDate || '9999-99-99');
        }),
    [tasks, areaSettings, areaId]
  );

  const areaHabits = useMemo(() => {
    return habits.filter((h) => {
      const mapped = resolveCategoryToArea(h.category, areaSettings) === areaId;
      if (mapped) return true;
      if (areaId === 'body' && /(steps|walk|run|cardio|strength|health|water)/i.test(`${h.name} ${h.category}`)) {
        return true;
      }
      if (areaId === 'study' && /(study|reading|learn|focus|deep work)/i.test(`${h.name} ${h.category}`)) {
        return true;
      }
      if (areaId === 'mind' && /(journal|meditat|sleep|recovery|screens)/i.test(`${h.name} ${h.category}`)) {
        return true;
      }
      return false;
    });
  }, [habits, areaSettings, areaId]);

  const last7Keys = useMemo(() => {
    const keys: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      keys.push(formatDateKey(d));
    }
    return keys;
  }, [todayKey]);

  const statsCards = useMemo(() => {
    const keySet = new Set(last7Keys);
    const openTasks = areaTasks.filter((t) => !t.completed).length;
    const completedTasks = areaTasks.filter((t) => t.completed).length;
    const habitChecks = areaHabits.reduce(
      (sum, h) => sum + h.completedDays.filter(Boolean).length,
      0
    );
    const habitTargets = areaHabits.reduce((sum, h) => sum + h.targetDaysPerWeek, 0);
    const habitPct = habitTargets > 0 ? Math.min(100, Math.round((habitChecks / habitTargets) * 100)) : null;

    if (areaId === 'study') {
      const studySessions = focusSessions.filter((s) => keySet.has(s.dateKey));
      const hours7d = studySessions.reduce((s, x) => s + x.minutes, 0) / 60;
      return [
        {
          label: 'Focus Hours (7d)',
          value: `${hours7d.toFixed(1).replace(/\.0$/, '')}h`,
          sub: `Goal ${areaSettings.studyWeeklyGoalHours}h/wk`,
        },
        {
          label: 'Sessions (7d)',
          value: String(studySessions.length),
          sub: studySessions.length > 0 ? 'Logged focus blocks' : 'No sessions in 7d',
        },
        {
          label: 'Related Tasks',
          value: `${completedTasks}/${areaTasks.length}`,
          sub: `${openTasks} open`,
        },
        {
          label: 'Habit Progress',
          value: habitPct !== null ? `${habitPct}%` : '—',
          sub: habitTargets > 0 ? `${habitChecks}/${habitTargets} checks` : 'No linked habits',
        },
      ];
    }

    if (areaId === 'mind') {
      const moods7d = moodRatings.filter((m) => keySet.has(m.dateKey)).map((m) => m.rating);
      const avgMood =
        moods7d.length > 0
          ? (moods7d.reduce((s, v) => s + v, 0) / moods7d.length).toFixed(1)
          : null;
      const journalSet = new Set(areaSettings.journalOpenedDates);
      const checkInDays = last7Keys.filter(
        (k) => journalSet.has(k) || moodRatings.some((m) => m.dateKey === k)
      ).length;
      return [
        {
          label: 'Check-In Days (7d)',
          value: `${checkInDays}/7`,
          sub: 'Journal opened or mood rated',
        },
        {
          label: 'Avg Mood (7d)',
          value: avgMood ? `${avgMood}/10` : '—',
          sub: moods7d.length > 0 ? `${moods7d.length} rating(s)` : 'No ratings in 7d',
        },
        {
          label: 'Related Tasks',
          value: `${completedTasks}/${areaTasks.length}`,
          sub: `${openTasks} open`,
        },
        {
          label: 'Habit Progress',
          value: habitPct !== null ? `${habitPct}%` : '—',
          sub: habitTargets > 0 ? `${habitChecks}/${habitTargets} checks` : 'No linked habits',
        },
      ];
    }

    return [
      {
        label: '7-Day Pulse',
        value: pulse.hasData && pulse.score !== null ? `${pulse.score}/100` : 'No data',
        sub: pulse.summaryLabel,
      },
      {
        label: 'Related Tasks',
        value: areaTasks.length > 0 ? `${completedTasks}/${areaTasks.length}` : '0',
        sub: areaTasks.length > 0 ? `${openTasks} open` : 'None in mapped categories',
      },
      {
        label: 'Active Habits',
        value: String(areaHabits.length),
        sub: habitTargets > 0 ? `${habitChecks}/${habitTargets} this week` : 'No linked habits',
      },
      {
        label: 'Mapped Categories',
        value: String(mappedCategories.length),
        sub: mappedCategories.length > 0 ? mappedCategories.join(', ') : 'Unassigned',
      },
    ];
  }, [
    areaId,
    areaTasks,
    areaHabits,
    focusSessions,
    moodRatings,
    areaSettings,
    last7Keys,
    pulse,
    mappedCategories,
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Bar: Back + Quick Area Switcher */}
      <div className="editorial-rise editorial-rise-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors self-start"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Home</span>
        </button>

        <div
          className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/70"
          role="tablist"
          aria-label="Switch life area"
        >
          {LIFE_AREA_IDS.map((id) => {
            const active = id === areaId;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectArea(id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-[#121927] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span
                  style={{
                    color: active ? LIFE_AREA_META[id].colorVar : undefined,
                  }}
                >
                  <LifeAreaIcon areaId={id} className="w-3.5 h-3.5" />
                </span>
                <span>{LIFE_AREA_META[id].label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Area Header Card */}
      <section className="editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 shrink-0"
              style={{
                color: pulse.hasData ? meta.colorVar : 'var(--cadence-area-muted)',
              }}
            >
              <LifeAreaIcon areaId={areaId} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {meta.label}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {meta.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {mappedCategories.length > 0
                    ? `Mapped categories: ${mappedCategories.join(', ')}`
                    : 'No task categories mapped yet'}
                </span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => onNavigate(DashboardView.Settings)}
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  <Sliders className="w-3 h-3" aria-hidden="true" />
                  <span>Configure in Settings</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-2 shrink-0 min-w-[180px]">
            <div className="flex items-center gap-2.5">
              <span
                className={`font-mono text-2xl font-semibold tabular-nums ${
                  pulse.hasData
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {pulse.hasData && pulse.score !== null ? `${pulse.score}/100` : 'No data yet'}
              </span>
              <PulseTrendBadge trend={pulse.trend} delta={pulse.delta} />
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${pulse.hasData && pulse.score !== null ? Math.max(2, pulse.score) : 0}%`,
                  backgroundColor: pulse.hasData ? meta.colorVar : 'var(--cadence-area-muted)',
                }}
              />
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {pulse.summaryLabel}
            </span>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section
        aria-label={`${meta.label} statistics`}
        className="editorial-rise editorial-rise-3 grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statsCards.map((stat) => (
          <div
            key={stat.label}
            className="cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-4"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {stat.label}
            </p>
            <p className="font-mono text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
              {stat.value}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
              {stat.sub}
            </p>
          </div>
        ))}
      </section>

      {/* Related Tasks + Related Habits */}
      <div className="editorial-rise editorial-rise-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Related Tasks */}
        <section className="lg:col-span-7 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Related Tasks
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tasks in categories mapped to {meta.label}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(DashboardView.Tasks)}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              Open Tasks
            </button>
          </div>

          <div className="p-5">
            {areaTasks.length === 0 ? (
              <div className="editorial-subtle-box rounded-lg border border-dashed border-slate-200 dark:border-slate-800 px-4 py-8 text-center space-y-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No tasks linked to {meta.label} yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Map task categories to {meta.label} in Settings or create a task in a mapped category.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800">
                {areaTasks.map((task) => (
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
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        className="min-w-0 text-left group"
                      >
                        <p
                          className={`text-sm font-medium truncate group-hover:underline ${
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
                          {task.dueDate && (
                            <span className="font-mono tabular-nums">
                              {formatShortDateLabel(task.dueDate)}
                              {task.dueTime ? ` · ${formatTimeShort(task.dueTime, settings.timeFormat)}` : ''}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                    <PriorityFlagDisplay priority={task.priority} compact />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Related Habits */}
        <section className="lg:col-span-5 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Related Habits
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Weekly habits aligned with {meta.label}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(DashboardView.Habits)}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              Open Habits
            </button>
          </div>

          <div className="p-5">
            {areaHabits.length === 0 ? (
              <div className="editorial-subtle-box rounded-lg border border-dashed border-slate-200 dark:border-slate-800 px-4 py-8 text-center space-y-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No habits linked to {meta.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Habits with matching categories or focus keywords appear here.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {areaHabits.map((habit) => {
                  const doneWeek = habit.completedDays.filter(Boolean).length;
                  const doneToday = Boolean(habit.completedDays[todayIndex]);
                  return (
                    <li key={habit.id}>
                      <button
                        type="button"
                        onClick={() => onToggleHabitDay(habit.id, todayIndex)}
                        aria-pressed={doneToday}
                        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border text-left transition-colors ${
                          doneToday
                            ? 'border-blue-200 dark:border-blue-800/60 bg-blue-50/50 dark:bg-blue-950/20'
                            : 'editorial-subtle-box border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                              doneToday
                                ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                            }`}
                          >
                            {doneToday && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                          </span>
                          <span className="min-w-0">
                            <span
                              className={`block text-sm font-medium truncate ${
                                doneToday
                                  ? 'text-slate-500 dark:text-slate-400 line-through'
                                  : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {habit.name}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {habit.category}
                            </span>
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                          <Flame className="w-3 h-3 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                          <span>
                            {doneWeek}/{habit.targetDaysPerWeek}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
