import { ComponentType, useEffect, useMemo, useState } from 'react';
import {
  BookMarked,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Film,
  Flame,
  Footprints,
  Gamepad2,
  Heart,
  Smile,
  Timer,
  Type,
} from 'lucide-react';
import { useCadenceStyle } from '../hooks/useCadenceStyle';
import {
  AreaSettings,
  BodyLogEntry,
  DashboardView,
  FocusSession,
  HabitItem,
  JournalDayStat,
  MoodRatingRecord,
  TaskItem,
} from '../types/dashboard';
import {
  StudyChartMode,
  buildStudyHoursSeries,
  computeLifetimeStats,
} from '../utils/lifeUtils';
import { DoodleHeaderScene } from './DoodleKit';

interface StatsViewProps {
  focusSessions: FocusSession[];
  tasks: TaskItem[];
  habits: HabitItem[];
  bodyLogs: BodyLogEntry[];
  moodRatings: MoodRatingRecord[];
  journalStats?: JournalDayStat[];
  areaSettings: AreaSettings;
  reducedMotion?: boolean;
}

function useCountUp(
  target: number,
  options: { decimals?: number; durationMs?: number; disabled?: boolean } = {}
): number {
  const { decimals = 0, durationMs = 650, disabled = false } = options;
  const [displayValue, setDisplayValue] = useState<number>(() =>
    disabled || target <= 0 ? target : 0
  );

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (disabled || prefersReduced || target <= 0) {
      setDisplayValue(target);
      return;
    }

    let frameId = 0;
    let startTs: number | null = null;
    const factor = 10 ** decimals;

    const step = (ts: number) => {
      if (startTs === null) startTs = ts;
      const elapsed = ts - startTs;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(target * eased * factor) / factor;
      setDisplayValue(next);
      if (t < 1) {
        frameId = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(target);
      }
    };

    frameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frameId);
  }, [target, decimals, durationMs, disabled]);

  return displayValue;
}

type DoodleMotif =
  | 'clock'
  | 'star'
  | 'flame'
  | 'steps'
  | 'squiggle'
  | 'smile'
  | 'heart'
  | 'book'
  | 'quill'
  | 'letters';

function CounterDoodleMotif({ motif }: { motif: DoodleMotif }) {
  switch (motif) {
    case 'clock':
      return (
        <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <circle
            cx="18"
            cy="18"
            r="12"
            fill="var(--cadence-doodle-paper)"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="2"
          />
          <path
            d="M18 10 A8 8 0 0 1 26 18"
            stroke="var(--cadence-doodle-accent)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M18 18 V13 M18 18 L22 20"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'star':
      return (
        <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path
            d="M18 5 L21.2 12.6 L29.5 13.4 L23.2 18.8 L25.1 27 L18 22.6 L10.9 27 L12.8 18.8 L6.5 13.4 L14.8 12.6 Z"
            fill="var(--cadence-doodle-sun)"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'flame':
      return (
        <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path
            d="M18 29 V17"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M18 20 C12 18, 11 11, 16 9 C19 8, 19 14, 18 20 Z"
            fill="var(--cadence-doodle-mint)"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path
            d="M18 22 C24 20, 26 13, 21 10 C18 9, 18 15, 18 22 Z"
            fill="var(--cadence-doodle-sun)"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'steps':
      return (
        <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <ellipse
            cx="13"
            cy="20"
            rx="4.2"
            ry="6.5"
            transform="rotate(-14 13 20)"
            fill="var(--cadence-doodle-mint)"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="1.9"
          />
          <ellipse
            cx="23"
            cy="14"
            rx="4.2"
            ry="6.5"
            transform="rotate(12 23 14)"
            fill="var(--cadence-doodle-accent)"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="1.9"
          />
        </svg>
      );
    case 'squiggle':
      return (
        <svg width="36" height="34" viewBox="0 0 38 34" fill="none" aria-hidden="true">
          <path
            d="M4 21 Q9 10, 15 19 T26 16 T34 12"
            stroke="var(--cadence-doodle-coral)"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle
            cx="32"
            cy="11"
            r="3"
            fill="var(--cadence-doodle-sun)"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="1.6"
          />
        </svg>
      );
    case 'smile':
      return (
        <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <circle
            cx="18"
            cy="18"
            r="11.5"
            fill="var(--cadence-doodle-sun)"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="2"
          />
          <circle cx="14.5" cy="15.5" r="1.6" fill="var(--cadence-doodle-ink)" />
          <circle cx="21.5" cy="15.5" r="1.6" fill="var(--cadence-doodle-ink)" />
          <path
            d="M14 21 Q18 25 22 21"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'heart':
      return (
        <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path
            d="M18 27 C18 27, 8 20.5, 8 13.5 C8 9.8, 11 7.5, 14 7.5 C16.2 7.5, 17.5 8.8, 18 10.2 C18.5 8.8, 19.8 7.5, 22 7.5 C25 7.5, 28 9.8, 28 13.5 C28 20.5, 18 27, 18 27 Z"
            fill="var(--cadence-doodle-coral)"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'book':
      return (
        <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path
            d="M7 10 C11 8.5, 15 9, 18 11 C21 9, 25 8.5, 29 10 V25.5 C25 24, 21 24.5, 18 26.5 C15 24.5, 11 24, 7 25.5 Z"
            fill="var(--cadence-doodle-paper)"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M18 11 V26.5 M10.5 14.5 H15 M21 14.5 H25.5"
            stroke="var(--cadence-doodle-accent)"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'quill':
      return (
        <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <path
            d="M27 7 C20 8, 13 15, 11 24 L8 28 L12 25 C21 23, 27 16, 27 7 Z"
            fill="var(--cadence-doodle-mint)"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M11 24 L21 14"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'letters':
      return (
        <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-hidden="true">
          <rect
            x="6"
            y="8"
            width="24"
            height="20"
            rx="4"
            fill="var(--cadence-doodle-paper)"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="2"
          />
          <path
            d="M11 22 L15 13 L19 22 M12.2 19.2 H17.8"
            stroke="var(--cadence-doodle-coral)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M22 14 H26 M24 14 V22"
            stroke="var(--cadence-doodle-ink)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

interface CounterCardProps {
  label: string;
  targetValue: number;
  decimals?: number;
  suffix?: string;
  isNoData?: boolean;
  noDataText?: string;
  sublabel: string;
  icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accentVar: string;
  motif: DoodleMotif;
  reducedMotion: boolean;
}

function LifetimeCounterCard({
  label,
  targetValue,
  decimals = 0,
  suffix = '',
  isNoData = false,
  noDataText = 'No data yet',
  sublabel,
  icon: Icon,
  accentVar,
  motif,
  reducedMotion,
}: CounterCardProps) {
  const animated = useCountUp(isNoData ? 0 : targetValue, {
    decimals,
    disabled: reducedMotion,
  });

  const formattedValue = isNoData
    ? noDataText
    : decimals > 0
      ? `${animated.toFixed(decimals)}${suffix}`
      : `${Math.round(animated).toLocaleString()}${suffix}`;

  return (
    <div className="cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-2">
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            backgroundColor: `color-mix(in srgb, ${accentVar} 14%, transparent)`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: accentVar }} />
        </span>
        <CounterDoodleMotif motif={motif} />
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p
          className={`mt-1 font-mono tabular-nums font-semibold ${
            isNoData
              ? 'text-base text-slate-400 dark:text-slate-500'
              : 'text-2xl text-slate-900 dark:text-slate-100'
          }`}
        >
          {formattedValue}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sublabel}</p>
      </div>
    </div>
  );
}

const COMING_SOON_CARDS = [
  { id: 'books', label: 'Books', icon: BookMarked },
  { id: 'movies', label: 'Movies', icon: Film },
  { id: 'games', label: 'Games finished', icon: Gamepad2 },
] as const;

export function StatsView({
  focusSessions,
  tasks,
  habits,
  bodyLogs,
  moodRatings,
  journalStats = [],
  areaSettings,
  reducedMotion = false,
}: StatsViewProps) {
  const activeStyle = useCadenceStyle();
  const [studyMode, setStudyMode] = useState<StudyChartMode>('week');
  const [hoveredBarKey, setHoveredBarKey] = useState<string | null>(null);

  const studySeries = useMemo(
    () =>
      buildStudyHoursSeries(
        focusSessions,
        studyMode,
        areaSettings.studyWeeklyGoalHours
      ),
    [focusSessions, studyMode, areaSettings.studyWeeklyGoalHours]
  );

  const lifetime = useMemo(
    () =>
      computeLifetimeStats({
        focusSessions,
        tasks,
        habits,
        bodyLogs,
        moodRatings,
        journalStats,
      }),
    [focusSessions, tasks, habits, bodyLogs, moodRatings, journalStats]
  );

  const hoveredBar = useMemo(
    () => studySeries.bars.find((b) => b.key === hoveredBarKey) ?? null,
    [studySeries.bars, hoveredBarKey]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="editorial-rise editorial-rise-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">EDITION</span>
            <span className="editorial-kicker-text">Analytics</span>
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Stats
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Study output from focus blocks and lifetime counters across your workspace
          </p>
        </div>

        {activeStyle === 'doodle' && <DoodleHeaderScene tab={DashboardView.Stats} />}
      </div>

      {/* Study Hours Card (Focus-session time only, no per-subject tracking) */}
      <section
        aria-label="Study hours"
        className="editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Study hours
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {hoveredBar
                ? `${hoveredBar.rangeLabel}: ${hoveredBar.hours}h (${hoveredBar.minutes} min)`
                : `Total so far: ${studySeries.totalHours}h · Weekly goal: ${studySeries.weeklyGoalHours}h`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono tabular-nums text-sm font-semibold text-slate-900 dark:text-slate-100">
              {studySeries.totalHours}h total
            </span>

            <div
              role="group"
              aria-label="Study hours grouping"
              className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100/70 dark:bg-slate-800/70"
            >
              {(['day', 'week', 'month'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setStudyMode(mode);
                    setHoveredBarKey(null);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                    studyMode === mode
                      ? 'bg-white dark:bg-[#121927] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(() => {
          const bars = studySeries.bars;
          const svgW = 720;
          const svgH = 192;
          const padTop = 18;
          const padBottom = 26;
          const plotH = svgH - padTop - padBottom;
          const slotW = svgW / bars.length;
          const barW = Math.max(12, Math.min(34, slotW * 0.56));
          const goalY =
            studyMode === 'week'
              ? padTop +
                plotH -
                Math.min(1, studySeries.weeklyGoalHours / studySeries.maxHours) * plotH
              : null;

          return (
            <div className="space-y-2">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full h-48 overflow-visible"
                role="img"
                aria-label={`Study hours by ${studyMode}`}
              >
                <line
                  x1={0}
                  y1={padTop + plotH}
                  x2={svgW}
                  y2={padTop + plotH}
                  stroke="var(--cadence-border-color)"
                  strokeWidth="1"
                />

                {goalY !== null && (
                  <>
                    <line
                      x1={0}
                      y1={goalY}
                      x2={svgW}
                      y2={goalY}
                      stroke="var(--cadence-area-study)"
                      strokeWidth="1.5"
                      strokeDasharray="5 4"
                      opacity="0.85"
                    />
                    <text
                      x={svgW - 4}
                      y={Math.max(12, goalY - 5)}
                      textAnchor="end"
                      fontSize="10.5"
                      fill="var(--cadence-area-study)"
                      className="font-mono tabular-nums"
                    >
                      Weekly goal ({studySeries.weeklyGoalHours}h)
                    </text>
                  </>
                )}

                {bars.map((bar, idx) => {
                  const ratio = Math.min(1, bar.hours / studySeries.maxHours);
                  const barH = bar.minutes > 0 ? Math.max(4, ratio * plotH) : 2;
                  const x = idx * slotW + (slotW - barW) / 2;
                  const y = padTop + plotH - barH;
                  const isHovered = hoveredBarKey === bar.key;
                  const metWeeklyGoal =
                    studyMode === 'week' && bar.hours >= studySeries.weeklyGoalHours;
                  const fill =
                    bar.minutes === 0
                      ? 'var(--cadence-border-color)'
                      : metWeeklyGoal
                        ? 'var(--cadence-area-study)'
                        : 'color-mix(in srgb, var(--cadence-area-study) 72%, var(--cadence-bg-card))';
                  const showLabel = studyMode !== 'day' || idx % 2 === 0 || idx === bars.length - 1;

                  return (
                    <g
                      key={bar.key}
                      onMouseEnter={() => setHoveredBarKey(bar.key)}
                      onMouseLeave={() => setHoveredBarKey(null)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={idx * slotW}
                        y={0}
                        width={slotW}
                        height={svgH}
                        fill="transparent"
                      />
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={barH}
                        rx={Math.min(5, barW / 2)}
                        fill={fill}
                        opacity={isHovered ? 1 : bar.minutes === 0 ? 0.45 : 0.92}
                      />
                      {showLabel && (
                        <text
                          x={idx * slotW + slotW / 2}
                          y={svgH - 6}
                          textAnchor="middle"
                          fontSize="10.5"
                          fill="var(--cadence-popover-muted)"
                        >
                          {bar.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {focusSessions.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  No focus sessions logged yet. Complete a block in Focus to chart your study hours.
                </p>
              )}
            </div>
          );
        })()}
      </section>

      {/* Lifetime Counters */}
      <section aria-label="Lifetime counters" className="editorial-rise editorial-rise-3 space-y-3">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Lifetime counters
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real totals computed directly from your logged activity
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <LifetimeCounterCard
            label="Total focus hours"
            targetValue={lifetime.totalFocusHours}
            decimals={1}
            suffix="h"
            sublabel={`${lifetime.totalFocusMinutes.toLocaleString()} minutes logged`}
            icon={Clock}
            accentVar="var(--cadence-area-study)"
            motif="clock"
            reducedMotion={reducedMotion}
          />

          <LifetimeCounterCard
            label="Tasks completed"
            targetValue={lifetime.tasksCompleted}
            sublabel="Finished items in Tasks"
            icon={CheckCircle2}
            accentVar="var(--cadence-area-projects)"
            motif="star"
            reducedMotion={reducedMotion}
          />

          <LifetimeCounterCard
            label="Longest habit streak"
            targetValue={lifetime.longestHabitStreak}
            suffix="d"
            sublabel="Best consecutive day run"
            icon={Flame}
            accentVar="var(--cadence-area-people)"
            motif="flame"
            reducedMotion={reducedMotion}
          />

          <LifetimeCounterCard
            label="Total steps"
            targetValue={lifetime.totalSteps}
            sublabel="Logged in Body"
            icon={Footprints}
            accentVar="var(--cadence-area-body)"
            motif="steps"
            reducedMotion={reducedMotion}
          />

          <LifetimeCounterCard
            label="Total walk minutes"
            targetValue={lifetime.totalWalkMinutes}
            suffix=" min"
            sublabel="Logged walk duration"
            icon={Timer}
            accentVar="var(--cadence-area-skills)"
            motif="squiggle"
            reducedMotion={reducedMotion}
          />

          <LifetimeCounterCard
            label="Days with mood rating"
            targetValue={lifetime.moodRatedDays}
            sublabel="Daily check-ins recorded"
            icon={Smile}
            accentVar="var(--cadence-area-mind)"
            motif="smile"
            reducedMotion={reducedMotion}
          />

          <LifetimeCounterCard
            label="Average mood"
            targetValue={lifetime.averageMood ?? 0}
            decimals={1}
            suffix=" / 10"
            isNoData={lifetime.averageMood === null}
            noDataText="No data yet"
            sublabel={
              lifetime.averageMood !== null
                ? `Across ${lifetime.moodRatedDays} rated ${lifetime.moodRatedDays === 1 ? 'day' : 'days'}`
                : 'Rate a day on Home or Life'
            }
            icon={Heart}
            accentVar="var(--cadence-area-mind)"
            motif="heart"
            reducedMotion={reducedMotion}
          />

          <LifetimeCounterCard
            label="Journal entries"
            targetValue={lifetime.journalEntries}
            sublabel="Days written in Google Docs"
            icon={BookOpen}
            accentVar="var(--cadence-area-mind)"
            motif="book"
            reducedMotion={reducedMotion}
          />

          <LifetimeCounterCard
            label="Journal words"
            targetValue={lifetime.journalWords}
            sublabel="Across connected years"
            icon={FileText}
            accentVar="var(--cadence-area-study)"
            motif="quill"
            reducedMotion={reducedMotion}
          />

          <LifetimeCounterCard
            label="Journal letters"
            targetValue={lifetime.journalLetters}
            sublabel="Alphabetic characters written"
            icon={Type}
            accentVar="var(--cadence-area-skills)"
            motif="letters"
            reducedMotion={reducedMotion}
          />
        </div>
      </section>

      {/* Coming Soon Placeholders */}
      <section aria-label="Upcoming counters" className="editorial-rise editorial-rise-4 space-y-3">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            More life counters
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Upcoming modules will populate these cards automatically
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {COMING_SOON_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="cadence-card bg-slate-50/70 dark:bg-[#121927]/70 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 opacity-80"
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon
                    className="w-4 h-4"
                    style={{ color: 'var(--cadence-area-muted)' }}
                  />
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    Coming soon
                  </span>
                </div>
                <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {card.label}
                </p>
                <p className="mt-1 font-mono tabular-nums text-lg font-semibold text-slate-300 dark:text-slate-600">
                  —
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
