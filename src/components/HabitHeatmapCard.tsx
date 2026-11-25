import { useMemo, useState } from 'react';
import { HabitItem } from '../types/dashboard';
import { formatDateKey, getCurrentWeekDateKeys, getTodayKey } from '../data/initialData';

interface HabitHeatmapCardProps {
  habits: HabitItem[];
  onToggleHabitDate?: (habitId: string, dateKey: string) => void;
}

interface HeatmapCell {
  dateKey: string;
  label: string;
  isFuture: boolean;
  completedCount: number;
  totalHabits: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const WEEKDAY_ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

function getIntensityClass(level: 0 | 1 | 2 | 3 | 4, isFuture: boolean): string {
  if (isFuture) {
    return 'bg-slate-100/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 cursor-default';
  }
  switch (level) {
    case 0:
      return 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60';
    case 1:
      return 'bg-blue-200 dark:bg-blue-950 border border-blue-300/60 dark:border-blue-900';
    case 2:
      return 'bg-blue-300 dark:bg-blue-800 border border-blue-400/50 dark:border-blue-700';
    case 3:
      return 'bg-blue-500 dark:bg-blue-600 border border-blue-600/30 dark:border-blue-500';
    case 4:
      return 'bg-blue-600 dark:bg-blue-400 border border-blue-700/30 dark:border-blue-300';
  }
}

export function HabitHeatmapCard({ habits, onToggleHabitDate }: HabitHeatmapCardProps) {
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  const todayKey = getTodayKey();
  const weekKeys = useMemo(() => getCurrentWeekDateKeys(), []);

  // Resolve effective date set per habit (syncing current week booleans + completedDates history)
  const habitDateSets = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const h of habits) {
      const set = new Set<string>(h.completedDates ?? []);
      // Ensure current week Mon..Sun matches completedDays booleans
      weekKeys.forEach((dk, idx) => {
        if (h.completedDays[idx]) {
          set.add(dk);
        } else {
          set.delete(dk);
        }
      });
      map.set(h.id, set);
    }
    return map;
  }, [habits, weekKeys]);

  const activeHabits = useMemo(() => {
    if (selectedHabitId === 'all') return habits;
    const found = habits.find((h) => h.id === selectedHabitId);
    return found ? [found] : habits;
  }, [habits, selectedHabitId]);

  const effectiveFilterId =
    selectedHabitId !== 'all' && !habits.some((h) => h.id === selectedHabitId)
      ? 'all'
      : selectedHabitId;

  // Build 12 columns (weeks) x 7 rows (Mon..Sun)
  const { weeks, monthLabels, totalCheckIns, activeDays } = useMemo(() => {
    const currentMonday = new Date(`${weekKeys[0]}T00:00:00`);
    const startMonday = new Date(
      currentMonday.getFullYear(),
      currentMonday.getMonth(),
      currentMonday.getDate() - 11 * 7
    );

    const cols: HeatmapCell[][] = [];
    const months: Array<{ colIndex: number; label: string }> = [];
    let lastMonth = -1;
    let checkIns = 0;
    let daysWithProgress = 0;

    for (let w = 0; w < 12; w++) {
      const weekCol: HeatmapCell[] = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(
          startMonday.getFullYear(),
          startMonday.getMonth(),
          startMonday.getDate() + w * 7 + d
        );
        const dateKey = formatDateKey(dt);
        const isFuture = dateKey > todayKey;

        if (d === 0 && dt.getMonth() !== lastMonth) {
          lastMonth = dt.getMonth();
          months.push({
            colIndex: w,
            label: dt.toLocaleDateString('en-US', { month: 'short' }),
          });
        }

        let completedCount = 0;
        const totalHabits = activeHabits.length;

        if (!isFuture && totalHabits > 0) {
          for (const h of activeHabits) {
            if (habitDateSets.get(h.id)?.has(dateKey)) {
              completedCount += 1;
            }
          }
          checkIns += completedCount;
          if (completedCount > 0) daysWithProgress += 1;
        }

        let level: 0 | 1 | 2 | 3 | 4 = 0;
        if (!isFuture && totalHabits > 0 && completedCount > 0) {
          const ratio = completedCount / totalHabits;
          if (ratio <= 0.25) level = 1;
          else if (ratio <= 0.5) level = 2;
          else if (ratio <= 0.75) level = 3;
          else level = 4;
        }

        const label = dt.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });

        weekCol.push({
          dateKey,
          label,
          isFuture,
          completedCount,
          totalHabits,
          level,
        });
      }
      cols.push(weekCol);
    }

    return {
      weeks: cols,
      monthLabels: months,
      totalCheckIns: checkIns,
      activeDays: daysWithProgress,
    };
  }, [activeHabits, habitDateSets, todayKey, weekKeys]);

  const canClickCell = effectiveFilterId !== 'all' && Boolean(onToggleHabitDate);

  return (
    <section className="editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">01</span>
            <span className="editorial-kicker-text">Continuity Grid</span>
          </span>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            12-Week Consistency Heatmap
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            <span className="font-mono">{totalCheckIns}</span> check-ins across{' '}
            <span className="font-mono">{activeDays}</span> active days in the past 12 weeks
            {canClickCell ? ' · Click any day cell to toggle' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="heatmap-habit-filter" className="sr-only">
            Filter heatmap by habit
          </label>
          <select
            id="heatmap-habit-filter"
            value={effectiveFilterId}
            onChange={(e) => setSelectedHabitId(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-600"
          >
            <option value="all">All Habits ({habits.length})</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* GitHub-style 12-week grid */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex items-center mb-1.5 pl-9">
            <div className="grid grid-cols-12 gap-1.5 flex-1">
              {weeks.map((_, colIdx) => {
                const m = monthLabels.find((item) => item.colIndex === colIdx);
                return (
                  <span
                    key={colIdx}
                    className="text-[11px] text-slate-500 dark:text-slate-400 leading-none h-3.5 whitespace-nowrap"
                  >
                    {m ? m.label : ''}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-stretch gap-2">
            {/* Weekday labels */}
            <div className="grid grid-rows-7 gap-1.5 w-7 shrink-0 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              {WEEKDAY_ROW_LABELS.map((day, idx) => (
                <span key={idx} className="flex items-center leading-none h-4 sm:h-5">
                  {day}
                </span>
              ))}
            </div>

            {/* 12 weeks x 7 days */}
            <div className="grid grid-cols-12 gap-1.5 flex-1">
              {weeks.map((weekCol, wIdx) => (
                <div key={wIdx} className="grid grid-rows-7 gap-1.5">
                  {weekCol.map((cell) => {
                    const isToday = cell.dateKey === todayKey;
                    const tooltipText = cell.isFuture
                      ? `${cell.label} · Upcoming`
                      : `${cell.label} · ${cell.completedCount}/${cell.totalHabits} completed`;
                    return (
                      <button
                        key={cell.dateKey}
                        type="button"
                        disabled={cell.isFuture || !canClickCell}
                        onClick={() => {
                          if (!cell.isFuture && canClickCell && onToggleHabitDate) {
                            onToggleHabitDate(effectiveFilterId, cell.dateKey);
                          }
                        }}
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        onFocus={() => setHoveredCell(cell)}
                        onBlur={() => setHoveredCell(null)}
                        title={tooltipText}
                        aria-label={tooltipText}
                        className={`w-full min-w-[14px] h-4 sm:h-5 rounded-[4px] transition-transform ${getIntensityClass(
                          cell.level,
                          cell.isFuture
                        )} ${
                          isToday
                            ? 'editorial-ring-offset ring-1 ring-offset-1 ring-slate-900 dark:ring-slate-100 dark:ring-offset-[#121927]'
                            : ''
                        } ${
                          canClickCell && !cell.isFuture
                            ? 'hover:scale-110 cursor-pointer'
                            : 'cursor-default'
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer readout + legend */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-mono tabular-nums min-h-[1rem]">
          {hoveredCell
            ? hoveredCell.isFuture
              ? `${hoveredCell.label} · Upcoming`
              : `${hoveredCell.label} · ${hoveredCell.completedCount}/${hoveredCell.totalHabits} completed`
            : 'Hover a day square to inspect daily completion'}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          <span>Less</span>
          {([0, 1, 2, 3, 4] as const).map((lvl) => (
            <span
              key={lvl}
              aria-hidden="true"
              className={`w-3.5 h-3.5 rounded-[3px] inline-block ${getIntensityClass(lvl, false)}`}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </section>
  );
}
