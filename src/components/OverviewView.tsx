import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Plus } from 'lucide-react';
import {
  AppSettings,
  DashboardView,
  FocusSession,
  HabitItem,
  ScheduleBlock,
  TaskCategory,
  TaskItem,
  TaskPriority,
} from '../types/dashboard';
import { formatDateKey, getTodayKey } from '../data/initialData';
import { FocusTimerCard } from './FocusTimerCard';
import { GoogleSignInButton } from './GoogleSignInButton';

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
  onQuickAddTask: (title: string, category: TaskCategory, priority: TaskPriority) => void;
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

  const visibleTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const weight = { High: 0, Medium: 1, Low: 2 };
      return weight[a.priority] - weight[b.priority];
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

  const priorityColorClass = (priority: TaskPriority) => {
    if (priority === TaskPriority.High) return 'text-rose-600 dark:text-rose-400';
    if (priority === TaskPriority.Medium) return 'text-amber-600 dark:text-amber-400';
    return 'text-slate-500 dark:text-slate-400';
  };

  return (
    <div className="space-y-6">
      {/* Editorial Daily Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
            {userFirstName ? `${greeting}, ${userFirstName}` : greeting}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {formattedDate}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-mono tabular-nums text-sm font-medium text-slate-700 dark:text-slate-300">
            {formattedTime} Local
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {remainingTodayCount} {remainingTodayCount === 1 ? 'priority' : 'priorities'} due today
          </span>
        </div>
      </div>

      {/* 4-Column KPI Strip (single elevation, hairline dividers, zero nested cards) */}
      <section
        aria-label="Daily Metrics Summary"
        className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800"
      >
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Due Today
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {remainingTodayCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              of {todayTasks.length} scheduled
            </span>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Task Completion
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {completionRate}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {completedTotal} of {tasks.length} done
            </span>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Focus Logged Today
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {(todayFocusMinutes / 60).toFixed(1)}h
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {(weeklyFocusMinutes / 60).toFixed(1)}h past 7 days
            </span>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Weekly Habit Pace
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {habitConsistency}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {habits.length} active habits
            </span>
          </div>
        </div>
      </section>

      {/* Main 2-Column Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Priority Queue + Weekly Focus Chart */}
        <div className="lg:col-span-7 space-y-6">
          {/* Today's Priority Queue */}
          <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
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
              className="px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-3"
            >
              <input
                type="text"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Quick add a task for today..."
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
            </form>

            {visibleTasks.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {taskFilter === 'active'
                    ? 'All caught up — no pending tasks in this view.'
                    : 'No tasks match this filter yet.'}
                </p>
                <button
                  type="button"
                  onClick={onOpenNewTaskModal}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Task</span>
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {visibleTasks.map((task) => (
                  <li
                    key={task.id}
                    className="px-6 py-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => onToggleTask(task.id)}
                        aria-label={task.completed ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          task.completed
                            ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400'
                        }`}
                      >
                        {task.completed && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                      </button>

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
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span>{task.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className={`font-medium ${priorityColorClass(task.priority)}`}>
                            {task.priority} priority
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{task.dueDate}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Showing {visibleTasks.length} of {tasks.length} total tasks
              </span>
              <button
                type="button"
                onClick={() => onNavigate(DashboardView.Tasks)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                <span>View all tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* 7-Day Focus Output Chart */}
          {settings.showFocusChart && (
            <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
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

        {/* Right Column: Schedule + Focus Timer + Quick Scratchpad */}
        <div className="lg:col-span-5 space-y-6">
          {/* Today's Agenda */}
          <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
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
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                Manage
              </button>
            </div>

            {sortedSchedule.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No time blocks scheduled for today.
                </p>
              </div>
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
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {block.category}
                        {block.location ? ` · ${block.location}` : ''}
                      </p>
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
              onCompleteSession={onCompleteFocusSession}
              defaultMinutes={settings.defaultFocusMinutes}
              defaultLabel={settings.defaultFocusLabel}
            />
          )}

          {/* Quick Scratchpad */}
          {settings.showScratchpad && (
            <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
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
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
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
            <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
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
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
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
