import { useMemo } from 'react';
import { FocusSession } from '../types/dashboard';
import { formatDateKey, getTodayKey } from '../data/initialData';
import { FocusTimerCard } from './FocusTimerCard';
import { EmptyStateIllustration } from './EmptyStateIllustration';

interface FocusViewProps {
  focusSessions: FocusSession[];
  defaultFocusMinutes?: 15 | 25 | 50;
  defaultFocusLabel?: string;
  onCompleteFocusSession: (minutes: number, label: string) => void;
}

export function FocusView({
  focusSessions,
  defaultFocusMinutes = 25,
  defaultFocusLabel = 'Deep work sprint',
  onCompleteFocusSession,
}: FocusViewProps) {
  const todayKey = getTodayKey();

  const todayMinutes = useMemo(
    () =>
      focusSessions
        .filter((s) => s.dateKey === todayKey)
        .reduce((sum, s) => sum + s.minutes, 0),
    [focusSessions, todayKey]
  );

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

  const weeklyMinutes = useMemo(
    () => weeklyChartData.reduce((sum, d) => sum + d.minutes, 0),
    [weeklyChartData]
  );

  const maxMinutes = Math.max(90, ...weeklyChartData.map((d) => d.minutes));

  const recentSessions = useMemo(
    () =>
      [...focusSessions]
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
        .slice(0, 12),
    [focusSessions]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Focus
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Run uninterrupted work blocks and track daily deep-work output
        </p>
      </div>

      {/* Summary KPI Strip */}
      <section
        aria-label="Focus Metrics Summary"
        className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800"
      >
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Logged Today</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {todayMinutes} min
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Past 7 Days</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {(weeklyMinutes / 60).toFixed(1)}h
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed Blocks</p>
          <p className="mt-2 font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {focusSessions.length}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-6">
          <FocusTimerCard
            onCompleteSession={onCompleteFocusSession}
            defaultMinutes={defaultFocusMinutes}
            defaultLabel={defaultFocusLabel}
          />

          <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  7-Day Focus Output
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Daily minutes logged
                </p>
              </div>
              <span className="font-mono tabular-nums text-xs font-semibold text-slate-700 dark:text-slate-300">
                {weeklyMinutes} min
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2.5 items-end h-36 pt-3">
              {weeklyChartData.map((day) => {
                const heightPct = Math.max(6, Math.round((day.minutes / maxMinutes) * 100));
                const isToday = day.dateKey === todayKey;
                return (
                  <div
                    key={day.dateKey}
                    className="flex flex-col items-center h-full justify-end gap-1.5"
                  >
                    <span className="font-mono tabular-nums text-[10px] text-slate-500 dark:text-slate-400">
                      {day.minutes}m
                    </span>
                    <div className="w-full max-w-[30px] flex-1 flex items-end">
                      <div
                        className={`w-full rounded-t-md ${
                          isToday
                            ? 'bg-blue-600 dark:bg-blue-500'
                            : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                        style={{ height: `${heightPct}%` }}
                        title={`${day.label}: ${day.minutes} min`}
                      />
                    </div>
                    <span
                      className={`text-[11px] ${
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
        </div>

        <section className="lg:col-span-7 bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Focus Session Log
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Completed sprints and manually logged work blocks
              </p>
            </div>
            <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
              {focusSessions.length} total
            </span>
          </div>

          {recentSessions.length === 0 ? (
            <EmptyStateIllustration
              kind="focus"
              title="No focus sessions recorded yet"
              description="Start a timer sprint on the left or use Complete & Log to record your first deep-work block."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentSessions.map((session) => (
                <li
                  key={session.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {session.label}
                    </p>
                    <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                      {session.dateKey}
                    </p>
                  </div>
                  <span className="font-mono tabular-nums text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                    {session.minutes} min
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
