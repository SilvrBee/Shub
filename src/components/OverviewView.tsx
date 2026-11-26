import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Clock, Pin, Plus } from 'lucide-react';
import {
  AppSettings,
  DashboardView,
  FocusSession,
  HabitItem,
  ScheduleBlock,
  TaskItem,
  TaskPriority,
} from '../types/dashboard';
import { formatDateKey, getTodayKey } from '../data/initialData';
import { FocusTimerCard } from './FocusTimerCard';
import { GoogleSignInButton } from './GoogleSignInButton';
import { TaskCheckButton } from './TaskCheckButton';
import { EmptyStateIllustration } from './EmptyStateIllustration';
import { ErrorBoundary } from './ErrorBoundary';
import { AnimatedMetricValue, AuroraProgressRing } from './AuroraMetrics';
import { useDoodleCelebratePulse } from '../hooks/useCadenceStyle';
import { DoodleHeaderScene, DoodleSquiggle } from './DoodleKit';
import { PriorityFlagDisplay } from './PriorityFlag';
import { CategoryBadge } from './ui/CategoryBadge';
import {
  estimateTaskDuration,
  findSimilarOpenTasks,
  formatDurationLabel,
  formatShortDateLabel,
  sortTasksSmart,
} from '../utils/taskUtils';

interface OverviewViewProps {
  tasks: TaskItem[];
  schedule: ScheduleBlock[];
  habits: HabitItem[];
  focusSessions: FocusSession[];
  scratchpad: string;
  settings: AppSettings;
  userFirstName?: string | null;
  isSignedIn: boolean;
  hasWorkspaceToken: boolean;
  isSigningIn: boolean;
  onSignIn: () => void;
  onUpdateScratchpad: (value: string) => void;
  onToggleTask: (id: string) => void;
  onQuickAddTask: (title: string, category: string, priority: TaskPriority) => void;
  onOpenMultiAddWithText: (text: string) => void;
  onCompleteFocusSession: (minutes: number, label: string) => void;
  onNavigate: (view: DashboardView) => void;
  onOpenNewTaskModal: () => void;
}

export function OverviewView({
  tasks,
  schedule,
  habits,
  focusSessions,
  scratchpad,
  settings,
  userFirstName,
  isSignedIn,
  hasWorkspaceToken,
  isSigningIn,
  onSignIn,
  onUpdateScratchpad,
  onToggleTask,
  onQuickAddTask,
  onOpenMultiAddWithText,
  onCompleteFocusSession,
  onNavigate,
  onOpenNewTaskModal,
}: OverviewViewProps) {
  const [now, setNow] = useState(() => new Date());
  const [taskFilter, setTaskFilter] = useState<'all' | 'active' | 'done'>('active');
  const [quickTitle, setQuickTitle] = useState('');
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const todayKey = getTodayKey();

  const greeting = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, [now]);

  const formattedDate = useMemo(() => {
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [now]);

  const formattedTime = useMemo(() => {
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: settings.timeFormat === '12h',
    });
  }, [now, settings.timeFormat]);

  // KPI metrics computed directly from live workspace state
  const todayTasks = useMemo(
    () => tasks.filter((t) => t.dueDate === todayKey),
    [tasks, todayKey]
  );
  const remainingTodayCount = todayTasks.filter((t) => !t.completed).length;
  const completedTotal = tasks.filter((t) => t.completed).length;
  const completionRate = tasks.length > 0 ? Math.round((completedTotal / tasks.length) * 100) : 0;

  const todayFocusMinutes = useMemo(
    () =>
      focusSessions
        .filter((s) => s.dateKey === todayKey)
        .reduce((sum, s) => sum + s.minutes, 0),
    [focusSessions, todayKey]
  );

  const weeklyFocusMinutes = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffKey = formatDateKey(cutoff);
    return focusSessions
      .filter((s) => s.dateKey >= cutoffKey)
      .reduce((sum, s) => sum + s.minutes, 0);
  }, [focusSessions]);

  const habitConsistency = useMemo(() => {
    if (habits.length === 0) return 0;
    const totalChecks = habits.reduce(
      (sum, h) => sum + h.completedDays.filter(Boolean).length,
      0
    );
    const totalTargets = habits.reduce((sum, h) => sum + h.targetDaysPerWeek, 0);
    return totalTargets > 0 ? Math.min(100, Math.round((totalChecks / totalTargets) * 100)) : 0;
  }, [habits]);

  // 7-day chart data computed from focusSessions
  const weeklyChartData = useMemo(() => {
    const days: { dateKey: string; label: string; minutes: number }[] = [];
    for (let offset = -6; offset <= 0; offset++) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const key = formatDateKey(d);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const minutes = focusSessions
        .filter((s) => s.dateKey === key)
        .reduce((sum, s) => sum + s.minutes, 0);
      days.push({ dateKey: key, label, minutes });
    }
    return days;
  }, [focusSessions]);

  const maxMinutes = Math.max(90, ...weeklyChartData.map((d) => d.minutes));

  const nextUpTasks = useMemo(
    () =>
      sortTasksSmart(
        tasks.filter((t) => !t.completed),
        settings.smartSortMode,
        settings.quickWinMinutes,
        todayKey,
        settings.defaultDurationEstimateMinutes
      ).slice(0, 3),
    [
      tasks,
      settings.smartSortMode,
      settings.quickWinMinutes,
      todayKey,
      settings.defaultDurationEstimateMinutes,
    ]
  );

  const quickSimilarTasks = useMemo(
    () => findSimilarOpenTasks(quickTitle, tasks),
    [quickTitle, tasks]
  );

  const visibleTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const weight: Record<TaskPriority, number> = {
        [TaskPriority.High]: 0,
        [TaskPriority.Medium]: 1,
        [TaskPriority.Low]: 2,
        [TaskPriority.None]: 3,
      };
      return (weight[a.priority] ?? 3) - (weight[b.priority] ?? 3);
    });
    if (taskFilter === 'active') return sorted.filter((t) => !t.completed).slice(0, 6);
    if (taskFilter === 'done') return sorted.filter((t) => t.completed).slice(0, 6);
    return sorted.slice(0, 6);
  }, [tasks, taskFilter]);

  const sortedSchedule = useMemo(
    () => [...schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [schedule]
  );

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) return;
    onQuickAddTask(trimmed, settings.defaultTaskCategory, settings.defaultTaskPriority);
    setQuickTitle('');
  };

  const isAurora = settings.style === 'aurora';
  const isDoodle = settings.style === 'doodle';
  const isDoodleCelebrating = useDoodleCelebratePulse(1900);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animateAuroraMetrics = isAurora && !settings.reducedMotion && !prefersReducedMotion;

  const todayTaskProgress =
    todayTasks.length > 0
      ? (todayTasks.length - remainingTodayCount) / todayTasks.length
      : 1;
  const todayFocusGoalProgress = Math.min(1, todayFocusMinutes / 120);

  return (
    <div className="space-y-6">
      {/* Editorial Daily Header / Aurora Cinematic Header */}
      <div className="aurora-hero-header editorial-rise editorial-rise-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">EDITION</span>
            <span className="editorial-kicker-text">Daily Briefing</span>
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
            {userFirstName ? `${greeting}, ${userFirstName}` : greeting}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {formattedDate}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <div className="flex items-center gap-3 justify-end">
              <span className="font-mono tabular-nums text-sm font-medium text-slate-700 dark:text-slate-300">
                {formattedTime} Local
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {remainingTodayCount} {remainingTodayCount === 1 ? 'priority' : 'priorities'} due today
              </span>
            </div>
            {isDoodle && (
              <div className="hidden sm:flex justify-end mt-1">
                <DoodleSquiggle width={52} />
              </div>
            )}
          </div>
          {isDoodle && (
            <DoodleHeaderScene
              tab={DashboardView.Overview}
              mascotOverride={isDoodleCelebrating ? 'celebrating' : 'waving'}
            />
          )}
        </div>
      </div>

      {/* 4-Column KPI Strip (single elevation, hairline dividers, zero nested cards) */}
      <section
        aria-label="Daily Metrics Summary"
        className="editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800"
      >
        <div className="aurora-kpi-card p-5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="editorial-kpi-label text-xs font-medium text-slate-500 dark:text-slate-400">
              Due Today
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="editorial-kpi-value font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
                <AnimatedMetricValue value={remainingTodayCount} animate={animateAuroraMetrics} />
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                of {todayTasks.length} scheduled
              </span>
            </div>
          </div>
          {isAurora && (
            <AuroraProgressRing
              progress={todayTaskProgress}
              animate={animateAuroraMetrics}
              label={`Today's tasks completion ${Math.round(todayTaskProgress * 100)}%`}
            />
          )}
        </div>

        <div className="aurora-kpi-card p-5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="editorial-kpi-label text-xs font-medium text-slate-500 dark:text-slate-400">
              Task Completion
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="editorial-kpi-value font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
                <AnimatedMetricValue
                  value={completionRate}
                  suffix="%"
                  animate={animateAuroraMetrics}
                />
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {completedTotal} of {tasks.length} done
              </span>
            </div>
          </div>
          {isAurora && (
            <AuroraProgressRing
              progress={completionRate / 100}
              animate={animateAuroraMetrics}
              label={`Overall task completion ${completionRate}%`}
            />
          )}
        </div>

        <div className="aurora-kpi-card p-5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="editorial-kpi-label text-xs font-medium text-slate-500 dark:text-slate-400">
              Focus Logged Today
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="editorial-kpi-value font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
                <AnimatedMetricValue
                  value={todayFocusMinutes / 60}
                  decimals={1}
                  suffix="h"
                  animate={animateAuroraMetrics}
                />
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {(weeklyFocusMinutes / 60).toFixed(1)}h past 7 days
              </span>
            </div>
          </div>
          {isAurora && (
            <AuroraProgressRing
              progress={todayFocusGoalProgress}
              animate={animateAuroraMetrics}
              label={`Daily focus goal ${Math.round(todayFocusGoalProgress * 100)}%`}
            />
          )}
        </div>

        <div className="aurora-kpi-card p-5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="editorial-kpi-label text-xs font-medium text-slate-500 dark:text-slate-400">
              Weekly Habit Pace
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="editorial-kpi-value font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
                <AnimatedMetricValue
                  value={habitConsistency}
                  suffix="%"
                  animate={animateAuroraMetrics}
                />
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {habits.length} active habits
              </span>
            </div>
          </div>
          {isAurora && (
            <AuroraProgressRing
              progress={habitConsistency / 100}
              animate={animateAuroraMetrics}
              label={`Weekly habit pace ${habitConsistency}%`}
            />
          )}
        </div>
      </section>

      {/* Main 2-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Priority Queue + Weekly Focus Chart */}
        <div className="lg:col-span-7 space-y-6">
          {/* Today's Priority Queue */}
          <section className="editorial-rise editorial-rise-3 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="editorial-kicker">
                  <span className="editorial-marker" aria-hidden="true">01</span>
                  <span className="editorial-kicker-text">Action Index</span>
                </span>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Priority Queue
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Check off tasks or add a quick item below
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
                {(['active', 'done', 'all'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTaskFilter(tab)}
                    className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 ${
                      taskFilter === tab
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab === 'done' ? 'Completed' : tab}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleQuickSubmit}
              className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 space-y-1.5"
            >
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  onPaste={(e) => {
                    const pasted = e.clipboardData?.getData('text') ?? '';
                    const nonEmptyLines = pasted
                      .split(/\r?\n/)
                      .map((l) => l.trim())
                      .filter(Boolean);
                    if (nonEmptyLines.length >= 2) {
                      e.preventDefault();
                      onOpenMultiAddWithText(pasted);
                    }
                  }}
                  placeholder="Quick add a task for today (or paste multiple lines)..."
                  aria-label="Quick add task"
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!quickTitle.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
              {quickSimilarTasks.length > 0 && (
                <p
                  role="status"
                  className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300"
                >
                  <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>
                    Similar open task: &ldquo;{quickSimilarTasks[0].title}&rdquo;
                  </span>
                </p>
              )}
            </form>

            {visibleTasks.length === 0 ? (
              <EmptyStateIllustration
                compact
                kind="tasks"
                title={
                  taskFilter === 'active'
                    ? 'All caught up'
                    : 'No tasks in this view'
                }
                description={
                  taskFilter === 'active'
                    ? 'No pending priorities remain in your queue.'
                    : 'Add a quick task above or create a detailed one.'
                }
                action={
                  <button
                    type="button"
                    onClick={onOpenNewTaskModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Task</span>
                  </button>
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {visibleTasks.map((task) => {
                  const subtasks = task.subtasks ?? [];
                  const doneSubs = subtasks.filter((s) => s.completed).length;
                  const isPartial =
                    !task.completed && doneSubs > 0 && doneSubs < subtasks.length;
                  const durEst = estimateTaskDuration(
                    task,
                    tasks,
                    settings.defaultDurationEstimateMinutes
                  );
                  return (
                    <ErrorBoundary
                      key={task.id}
                      inline
                      resetKey={`${task.id}-${task.title}`}
                      fallbackTitle="Unable to display this task"
                    >
                    <li
                      className="px-6 py-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <TaskCheckButton
                          checked={task.completed}
                          indeterminate={isPartial}
                          label={
                            task.completed
                              ? `Mark "${task.title}" incomplete`
                              : `Mark "${task.title}" complete`
                          }
                          onToggle={() => onToggleTask(task.id)}
                        />

                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium leading-snug ${
                              task.completed
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <PriorityFlagDisplay priority={task.priority} compact />
                            {task.durationMinutes ? (
                              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                <Clock className="w-3 h-3" aria-hidden="true" />
                                {formatDurationLabel(task.durationMinutes)}
                              </span>
                            ) : (
                              durEst.source === 'category-median' && (
                                <span
                                  className="inline-flex items-center gap-1 font-mono tabular-nums italic"
                                  title={`Estimated ~${durEst.minutes}m from ${durEst.sampleCount} completed ${task.category} tasks`}
                                >
                                  <Clock className="w-3 h-3" aria-hidden="true" />
                                  ~{durEst.minutes}m
                                </span>
                              )
                            )}
                            {(task.deadlineDate || task.dueDate) && (
                              <span className="font-mono tabular-nums">
                                {task.deadlineDate
                                  ? `Due by ${formatShortDateLabel(task.deadlineDate, todayKey)}`
                                  : formatShortDateLabel(task.dueDate, todayKey)}
                              </span>
                            )}
                            {task.category && (
                              <CategoryBadge
                                name={task.category}
                                categories={settings.categories}
                                compact
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                    </ErrorBoundary>
                  );
                })}
              </ul>
            )}

            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Showing {visibleTasks.length} of {tasks.length} total tasks
              </span>
              <button
                type="button"
                onClick={() => onNavigate(DashboardView.Tasks)}
                className="editorial-link inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                <span>View all tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* 7-Day Focus Output Chart */}
          {settings.showFocusChart && (
            <section className="editorial-rise editorial-rise-4 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="editorial-kicker">
                    <span className="editorial-marker" aria-hidden="true">02</span>
                    <span className="editorial-kicker-text">Output Ledger</span>
                  </span>
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                    7-Day Focus Output
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Minutes of uninterrupted work logged per day
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono tabular-nums text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {weeklyFocusMinutes} min
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">7-day total</p>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-3 items-end h-44 pt-4">
                {weeklyChartData.map((day, idx) => {
                  const heightPct = Math.max(6, Math.round((day.minutes / maxMinutes) * 100));
                  const isToday = day.dateKey === todayKey;
                  const isHovered = hoveredDayIndex === idx;
                  return (
                    <div
                      key={day.dateKey}
                      onMouseEnter={() => setHoveredDayIndex(idx)}
                      onMouseLeave={() => setHoveredDayIndex(null)}
                      className="flex flex-col items-center h-full justify-end gap-2 group"
                    >
                      <span
                        className={`font-mono tabular-nums text-[11px] transition-opacity ${
                          isHovered || isToday
                            ? 'opacity-100 text-slate-900 dark:text-slate-100 font-medium'
                            : 'opacity-70 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {day.minutes}m
                      </span>
                      <div className="w-full max-w-[36px] flex-1 flex items-end">
                        <div
                          className={`w-full rounded-t-md transition-colors ${
                            isToday
                              ? 'bg-blue-600 dark:bg-blue-500'
                              : 'bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300 dark:group-hover:bg-slate-600'
                          }`}
                          style={{ height: `${heightPct}%` }}
                          title={`${day.label}: ${day.minutes} min`}
                        />
                      </div>
                      <span
                        className={`text-xs ${
                          isToday
                            ? 'font-semibold text-blue-600 dark:text-blue-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Next Up + Schedule + Focus Timer + Quick Scratchpad */}
        <div className="lg:col-span-5 space-y-6">
          {/* Next Up Top 3 by Smart Order */}
          <section
            aria-label="Next up tasks"
            className="editorial-rise editorial-rise-3 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl"
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <span className="editorial-kicker">
                  <span className="editorial-marker" aria-hidden="true">NEXT</span>
                  <span className="editorial-kicker-text">Smart Order</span>
                </span>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Next up
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Top 3 open tasks by smart priority &amp; urgency
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(DashboardView.Tasks)}
                className="editorial-link inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                <span>All tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {nextUpTasks.length === 0 ? (
              <div className="px-6 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No open tasks queued right now.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {nextUpTasks.map((task, idx) => {
                  const subtasks = task.subtasks ?? [];
                  const doneSubs = subtasks.filter((s) => s.completed).length;
                  const isPartial =
                    !task.completed && doneSubs > 0 && doneSubs < subtasks.length;
                  const nextDurEst = estimateTaskDuration(
                    task,
                    tasks,
                    settings.defaultDurationEstimateMinutes
                  );
                  return (
                    <ErrorBoundary
                      key={task.id}
                      inline
                      resetKey={`${task.id}-${task.title}`}
                      fallbackTitle="Unable to display this task"
                    >
                    <li
                      className="px-6 py-3 flex items-start gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-400 dark:text-slate-500 pt-1 w-4 shrink-0">
                        {idx + 1}.
                      </span>
                      <TaskCheckButton
                        checked={task.completed}
                        indeterminate={isPartial}
                        label={`Mark "${task.title}" complete`}
                        onToggle={() => onToggleTask(task.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {task.pinned && (
                            <Pin className="w-3 h-3 text-blue-600 dark:text-blue-400 fill-current shrink-0" />
                          )}
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {task.title}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <PriorityFlagDisplay priority={task.priority} compact />
                          {task.durationMinutes ? (
                            <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                              <Clock className="w-3 h-3" aria-hidden="true" />
                              {formatDurationLabel(task.durationMinutes)}
                            </span>
                          ) : (
                            nextDurEst.source === 'category-median' && (
                              <span
                                className="inline-flex items-center gap-1 font-mono tabular-nums italic"
                                title={`Estimated ~${nextDurEst.minutes}m from ${nextDurEst.sampleCount} completed ${task.category} tasks`}
                              >
                                <Clock className="w-3 h-3" aria-hidden="true" />
                                ~{nextDurEst.minutes}m
                              </span>
                            )
                          )}
                          {(task.deadlineDate || task.dueDate) && (
                            <span className="font-mono tabular-nums">
                              {task.deadlineDate
                                ? `Due by ${formatShortDateLabel(task.deadlineDate, todayKey)}`
                                : formatShortDateLabel(task.dueDate, todayKey)}
                            </span>
                          )}
                          {task.category && (
                            <CategoryBadge
                              name={task.category}
                              categories={settings.categories}
                              compact
                            />
                          )}
                        </div>
                      </div>
                    </li>
                    </ErrorBoundary>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Today's Agenda */}
          <section className="editorial-rise editorial-rise-3 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <span className="editorial-kicker">
                  <span className="editorial-marker" aria-hidden="true">03</span>
                  <span className="editorial-kicker-text">Day Sheet</span>
                </span>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  Today&apos;s Schedule
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  {sortedSchedule.length} time blocks planned
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate(DashboardView.Schedule)}
                className="editorial-link text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                Manage
              </button>
            </div>

            {sortedSchedule.length === 0 ? (
              <EmptyStateIllustration
                compact
                kind="schedule"
                title="No blocks scheduled"
                description="Reserve deep work or meetings on your daily timeline."
                action={
                  <button
                    type="button"
                    onClick={() => onNavigate(DashboardView.Schedule)}
                    className="editorial-link text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Plan Schedule
                  </button>
                }
              />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {sortedSchedule.slice(0, 5).map((block) => (
                  <li key={block.id} className="px-6 py-3.5 flex items-start gap-4">
                    <div className="w-24 shrink-0 font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                      {block.startTime} – {block.endTime}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {block.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <CategoryBadge
                          name={block.category}
                          categories={settings.categories}
                          compact
                        />
                        {block.location && <span>· {block.location}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Compact Focus Timer */}
          {settings.showFocusTimer && (
            <FocusTimerCard
              compact
              style={settings.style}
              reducedMotion={settings.reducedMotion}
              onCompleteSession={onCompleteFocusSession}
              defaultMinutes={settings.defaultFocusMinutes}
              defaultLabel={settings.defaultFocusLabel}
            />
          )}

          {/* Quick Scratchpad */}
          {settings.showScratchpad && (
            <section className="editorial-rise editorial-rise-5 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <span className="editorial-kicker">
                    <span className="editorial-marker" aria-hidden="true">05</span>
                    <span className="editorial-kicker-text">Margin Notes</span>
                  </span>
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                    Scratchpad
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Auto-saved locally as you type
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate(DashboardView.Notes)}
                  className="editorial-link text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                >
                  Open Notes
                </button>
              </div>
              <label htmlFor="overview-scratchpad" className="sr-only">
                Quick scratchpad notes
              </label>
              <textarea
                id="overview-scratchpad"
                rows={4}
                value={scratchpad}
                onChange={(e) => onUpdateScratchpad(e.target.value)}
                placeholder="Capture fleeting thoughts, reminders, or meeting notes..."
                className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400 resize-y leading-relaxed"
              />
            </section>
          )}

          {/* Google Account & Workspace Access */}
          {settings.showGoogleCard && (
            <section className="editorial-rise editorial-rise-6 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="editorial-kicker">
                    <span className="editorial-marker" aria-hidden="true">06</span>
                    <span className="editorial-kicker-text">Connected Suite</span>
                  </span>
                  <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                    Google Workspace
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {hasWorkspaceToken || isSignedIn
                      ? 'Drive, Calendar, Docs & Gmail linked'
                      : 'Sign in to personalize your name & access Google Apps'}
                  </p>
                </div>

                {hasWorkspaceToken || isSignedIn ? (
                  <button
                    type="button"
                    onClick={() => onNavigate(DashboardView.GoogleWorkspace)}
                    className="editorial-link inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                  >
                    <span>Open Apps</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <GoogleSignInButton
                    onClick={onSignIn}
                    disabled={isSigningIn}
                    label={isSigningIn ? 'Connecting...' : 'Sign in with Google'}
                  />
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
