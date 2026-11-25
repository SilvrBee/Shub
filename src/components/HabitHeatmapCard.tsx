import { useMemo, useState } from 'react';
import { AppStyleId, HabitItem } from '../types/dashboard';
import { formatDateKey, getCurrentWeekDateKeys, getTodayKey } from '../data/initialData';
import { CustomSelect } from './ui/CustomSelect';

interface HabitHeatmapCardProps {
  habits: HabitItem[];
  style?: AppStyleId;
  reducedMotion?: boolean;
  onToggleHabitDate?: (habitId: string, dateKey: string) => void;
}

interface HeatmapCell {
  dateKey: string;
  label: string;
  isFuture: boolean;
  completedCount: number;
  totalHabits: number;
  completedHabitNames: string[];
  level: 0 | 1 | 2 | 3 | 4;
}

interface ConstellationStar extends HeatmapCell {
  weekIndex: number;
  dayIndex: number;
  cx: number;
  cy: number;
}

const WEEKDAY_ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

function hashDateJitter(dateKey: string): { dx: number; dy: number } {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const rx = ((hash >>> 0) % 100) / 100 - 0.5;
  const ry = (((hash >>> 8) & 0xff) % 100) / 100 - 0.5;
  return { dx: rx * 7, dy: ry * 5.5 };
}

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

export function HabitHeatmapCard({
  habits,
  style = 'classic',
  onToggleHabitDate,
}: HabitHeatmapCardProps) {
  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [hoveredStar, setHoveredStar] = useState<ConstellationStar | null>(null);

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

        const completedHabitNames: string[] = [];
        const totalHabits = activeHabits.length;

        if (!isFuture && totalHabits > 0) {
          for (const h of activeHabits) {
            if (habitDateSets.get(h.id)?.has(dateKey)) {
              completedHabitNames.push(h.name);
            }
          }
          checkIns += completedHabitNames.length;
          if (completedHabitNames.length > 0) daysWithProgress += 1;
        }

        const completedCount = completedHabitNames.length;
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
          completedHabitNames,
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

  const isCelestial = style === 'celestial';
  const canClickCell = effectiveFilterId !== 'all' && Boolean(onToggleHabitDate);

  // Night Sky Constellation layout geometry for Celestial style
  const constellationData = useMemo(() => {
    if (!isCelestial) return null;
    const svgWidth = 760;
    const svgHeight = 206;
    const leftPad = 46;
    const rightPad = 24;
    const topPad = 28;
    const bottomPad = 18;
    const colStep = (svgWidth - leftPad - rightPad) / 11;
    const rowStep = (svgHeight - topPad - bottomPad) / 6;

    const stars: ConstellationStar[] = [];
    for (let w = 0; w < 12; w++) {
      for (let d = 0; d < 7; d++) {
        const cell = weeks[w][d];
        const jitter = hashDateJitter(cell.dateKey);
        const cx = leftPad + w * colStep + jitter.dx;
        const cy = topPad + d * rowStep + jitter.dy;
        stars.push({
          ...cell,
          weekIndex: w,
          dayIndex: d,
          cx,
          cy,
        });
      }
    }

    // Chronological order (w * 7 + d): link consecutive completed calendar days into constellations
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; key: string; bright: boolean }> = [];
    for (let i = 0; i < stars.length - 1; i++) {
      const curr = stars[i];
      const next = stars[i + 1];
      if (!curr.isFuture && !next.isFuture && curr.completedCount > 0 && next.completedCount > 0) {
        lines.push({
          x1: curr.cx,
          y1: curr.cy,
          x2: next.cx,
          y2: next.cy,
          key: `${curr.dateKey}-${next.dateKey}`,
          bright: curr.level >= 3 || next.level >= 3,
        });
      }
    }

    return {
      svgWidth,
      svgHeight,
      leftPad,
      topPad,
      colStep,
      rowStep,
      stars,
      lines,
    };
  }, [isCelestial, weeks]);

  const activeInspection = hoveredStar ?? hoveredCell;

  return (
    <section className="editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">01</span>
            <span className="editorial-kicker-text">
              {isCelestial ? 'Night Sky Chart' : 'Continuity Grid'}
            </span>
          </span>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            {isCelestial ? '12-Week Habit Constellation' : '12-Week Consistency Heatmap'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            <span className="font-mono">{totalCheckIns}</span> check-ins across{' '}
            <span className="font-mono">{activeDays}</span> active days in the past 12 weeks
            {canClickCell ? ` · Click any ${isCelestial ? 'star' : 'day cell'} to toggle` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CustomSelect
            id="heatmap-habit-filter"
            ariaLabel="Filter heatmap by habit"
            value={effectiveFilterId}
            onChange={setSelectedHabitId}
            matchTriggerWidth={false}
            align="end"
            className="min-w-[160px]"
            options={[
              { value: 'all', label: `All Habits (${habits.length})` },
              ...habits.map((h) => ({ value: h.id, label: h.name })),
            ]}
          />
        </div>
      </div>

      {isCelestial && constellationData ? (
        <div className="celestial-sky-panel overflow-x-auto">
          <div className="relative min-w-[620px]">
            <svg
              viewBox={`0 0 ${constellationData.svgWidth} ${constellationData.svgHeight}`}
              className="w-full h-auto block select-none"
              role="img"
              aria-label="12-week habit constellation sky chart"
            >
              <defs>
                <filter id="celestial-star-glow" x="-120%" y="-120%" width="340%" height="340%">
                  <feGaussianBlur stdDeviation="2.6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <radialGradient id="celestial-star-halo" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--color-blue-200)" stopOpacity="0.65" />
                  <stop offset="45%" stopColor="var(--color-blue-400)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--color-blue-500)" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Subtle month sky markers */}
              {monthLabels.map((m) => (
                <text
                  key={`${m.colIndex}-${m.label}`}
                  x={constellationData.leftPad + m.colIndex * constellationData.colStep}
                  y={14}
                  fill="#93a4c8"
                  fontSize="10"
                  fontFamily="var(--cadence-font-sans)"
                  letterSpacing="0.08em"
                >
                  {m.label}
                </text>
              ))}

              {/* Weekday row labels */}
              {WEEKDAY_ROW_LABELS.map((dayLabel, dIdx) =>
                dayLabel ? (
                  <text
                    key={dIdx}
                    x={4}
                    y={constellationData.topPad + dIdx * constellationData.rowStep + 3.5}
                    fill="#7788ad"
                    fontSize="9.5"
                    fontFamily="var(--cadence-font-mono)"
                  >
                    {dayLabel}
                  </text>
                ) : null
              )}

              {/* Thin glowing constellation lines joining consecutive streak days */}
              {constellationData.lines.map((line) => (
                <line
                  key={line.key}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={
                    line.bright
                      ? 'color-mix(in srgb, var(--color-blue-300) 68%, rgba(255,255,255,0.45))'
                      : 'rgba(186, 210, 255, 0.36)'
                  }
                  strokeWidth={line.bright ? 1.3 : 0.95}
                  strokeLinecap="round"
                />
              ))}

              {/* Stars for every day */}
              {constellationData.stars.map((star) => {
                const isToday = star.dateKey === todayKey;
                const isHovered = hoveredStar?.dateKey === star.dateKey;
                const completedNamesText =
                  star.completedHabitNames.length > 0
                    ? star.completedHabitNames.join(', ')
                    : 'No habits completed';
                const tooltipText = star.isFuture
                  ? `${star.label} · Upcoming`
                  : `${star.label} · ${star.completedCount}/${star.totalHabits} (${completedNamesText})`;

                // Brightness & star radius scale with habits completed
                const radiusByLevel = [1.5, 2.5, 3.2, 4.0, 4.9][star.level];
                const haloRadius = star.level === 0 ? 0 : 7 + star.level * 3.2;
                const starFill =
                  star.level === 0
                    ? 'rgba(160, 178, 214, 0.25)'
                    : star.level === 1
                      ? '#bfd6ff'
                      : star.level === 2
                        ? '#dce9ff'
                        : star.level === 3
                          ? '#f0f5ff'
                          : '#ffffff';

                return (
                  <g
                    key={star.dateKey}
                    className={`celestial-star-node ${
                      canClickCell && !star.isFuture ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    tabIndex={star.isFuture ? -1 : 0}
                    role={canClickCell && !star.isFuture ? 'button' : 'img'}
                    aria-label={tooltipText}
                    onClick={() => {
                      if (!star.isFuture && canClickCell && onToggleHabitDate) {
                        onToggleHabitDate(effectiveFilterId, star.dateKey);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (
                        (e.key === 'Enter' || e.key === ' ') &&
                        !star.isFuture &&
                        canClickCell &&
                        onToggleHabitDate
                      ) {
                        e.preventDefault();
                        onToggleHabitDate(effectiveFilterId, star.dateKey);
                      }
                    }}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(null)}
                    onFocus={() => setHoveredStar(star)}
                    onBlur={() => setHoveredStar(null)}
                  >
                    {/* Generous invisible hit area for effortless hovering */}
                    <circle cx={star.cx} cy={star.cy} r={11} fill="transparent" />

                    {/* Soft outer star halo for completed days */}
                    {!star.isFuture && haloRadius > 0 && (
                      <circle
                        cx={star.cx}
                        cy={star.cy}
                        r={isHovered ? haloRadius * 1.25 : haloRadius}
                        fill="url(#celestial-star-halo)"
                        opacity={0.45 + star.level * 0.14}
                      />
                    )}

                    {/* Delicate 4-point star flare on level 3-4 radiant days */}
                    {!star.isFuture && star.level >= 3 && (
                      <path
                        d={`M ${star.cx} ${star.cy - radiusByLevel * 2.2} L ${star.cx + 0.9} ${star.cy - 0.9} L ${star.cx + radiusByLevel * 2.2} ${star.cy} L ${star.cx + 0.9} ${star.cy + 0.9} L ${star.cx} ${star.cy + radiusByLevel * 2.2} L ${star.cx - 0.9} ${star.cy + 0.9} L ${star.cx - radiusByLevel * 2.2} ${star.cy} L ${star.cx - 0.9} ${star.cy - 0.9} Z`}
                        fill="rgba(245, 250, 255, 0.85)"
                        opacity={star.level === 4 ? 0.92 : 0.65}
                      />
                    )}

                    {/* Today reticle ring */}
                    {isToday && (
                      <circle
                        cx={star.cx}
                        cy={star.cy}
                        r={radiusByLevel + 4.5}
                        fill="none"
                        stroke="var(--color-blue-300)"
                        strokeWidth="1"
                        strokeDasharray="2.5 2.5"
                        opacity="0.85"
                      />
                    )}

                    {/* Star core */}
                    {star.isFuture ? (
                      <circle
                        cx={star.cx}
                        cy={star.cy}
                        r={1.3}
                        fill="none"
                        stroke="rgba(148, 175, 224, 0.2)"
                        strokeWidth="0.8"
                      />
                    ) : (
                      <circle
                        cx={star.cx}
                        cy={star.cy}
                        r={isHovered ? radiusByLevel + 1.1 : radiusByLevel}
                        fill={starFill}
                        filter={star.level > 0 ? 'url(#celestial-star-glow)' : undefined}
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Floating astronomical star tooltip on hover/focus */}
            {hoveredStar && (
              <div
                role="status"
                className="pointer-events-none absolute z-30 px-3 py-2 rounded-lg border border-blue-300/25 bg-[#060b1c]/95 shadow-lg backdrop-blur-md text-xs max-w-[260px]"
                style={{
                  left: `${Math.min(78, Math.max(4, (hoveredStar.cx / constellationData.svgWidth) * 100))}%`,
                  top: hoveredStar.cy > 110 ? `${Math.max(4, hoveredStar.cy - 68)}px` : `${hoveredStar.cy + 16}px`,
                  transform: 'translateX(-30%)',
                }}
              >
                <p className="font-mono text-[11px] font-medium text-slate-100">
                  {hoveredStar.label}
                </p>
                {hoveredStar.isFuture ? (
                  <p className="text-[11px] text-slate-400 mt-0.5">Upcoming day</p>
                ) : (
                  <>
                    <p className="text-[11px] text-blue-300 font-mono mt-0.5">
                      {hoveredStar.completedCount}/{hoveredStar.totalHabits} habits completed
                    </p>
                    {hoveredStar.completedHabitNames.length > 0 && (
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        {hoveredStar.completedHabitNames.join(' · ')}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* GitHub-style 12-week grid (Classic, Editorial Atelier, Aurora Glass) */
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
      )}

      {/* Footer readout + legend */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-mono tabular-nums min-h-[1rem]">
          {activeInspection
            ? activeInspection.isFuture
              ? `${activeInspection.label} · Upcoming`
              : `${activeInspection.label} · ${activeInspection.completedCount}/${activeInspection.totalHabits} completed${
                  isCelestial && activeInspection.completedHabitNames.length > 0
                    ? ` (${activeInspection.completedHabitNames.join(', ')})`
                    : ''
                }`
            : isCelestial
              ? 'Hover any star to see date and completed habits'
              : 'Hover a day square to inspect daily completion'}
        </span>

        {isCelestial ? (
          <div className="flex items-center gap-2.5 shrink-0 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400/40 inline-block" aria-hidden="true" />
              <span>Dim</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full bg-white inline-block shadow-[0_0_8px_rgba(220,234,255,0.9)]"
                aria-hidden="true"
              />
              <span>Bright</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-[1.5px] bg-blue-300/70 inline-block" aria-hidden="true" />
              <span>Streak link</span>
            </span>
          </div>
        ) : (
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
        )}
      </div>
    </section>
  );
}
