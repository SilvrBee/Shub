import { MouseEvent, useMemo, useRef, useState } from 'react';
import { ChapterItem, LifeProfileSettings } from '../types/dashboard';
import {
  buildLifePosterWeeks,
  getChapterColorVar,
  LifeWeekCell,
} from '../utils/lifeUtils';
import { formatShortDateLabel } from '../utils/taskUtils';

interface LifePosterViewProps {
  lifeProfile: LifeProfileSettings;
  chapters: ChapterItem[];
  now: Date;
  onNavigateSettings: () => void;
  onOpenChapters: () => void;
}

const COLS = 52;
const CELL_SIZE = 9;
const CELL_GAP = 3;
const PITCH = CELL_SIZE + CELL_GAP;
const LEFT_PAD = 36;
const TOP_PAD = 20;
const RIGHT_PAD = 12;
const BOTTOM_PAD = 14;
const WEEK_AXIS_TICKS = [1, 13, 26, 39, 52] as const;

interface HoveredState {
  cell: LifeWeekCell;
  leftPx: number;
  topPx: number;
}

export function LifePosterView({
  lifeProfile,
  chapters,
  now,
  onNavigateSettings,
  onOpenChapters,
}: LifePosterViewProps) {
  const poster = useMemo(
    () => buildLifePosterWeeks(lifeProfile, chapters, now),
    [lifeProfile, chapters, now]
  );

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [chapters]
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<HoveredState | null>(null);

  const svgWidth = LEFT_PAD + COLS * PITCH - CELL_GAP + RIGHT_PAD;
  const svgHeight = TOP_PAD + poster.lifeExpectancy * PITCH - CELL_GAP + BOTTOM_PAD;

  const yearMarkers = useMemo(() => {
    const list: number[] = [];
    for (let y = 0; y < poster.lifeExpectancy; y += 5) {
      list.push(y);
    }
    return list;
  }, [poster.lifeExpectancy]);

  const currentCell =
    poster.currentWeekIndex !== null ? poster.weeks[poster.currentWeekIndex] ?? null : null;
  const inspectedCell = hovered?.cell ?? currentCell;

  const updateHoverFromTarget = (target: EventTarget | null, clientX: number, clientY: number) => {
    if (!(target instanceof Element)) return;
    const rawIdx = target.getAttribute('data-week-index');
    if (rawIdx === null) {
      setHovered(null);
      return;
    }
    const idx = Number(rawIdx);
    const cell = poster.weeks[idx];
    if (!cell) return;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) {
      setHovered({ cell, leftPx: 0, topPx: 0 });
      return;
    }

    const rawLeft = clientX - containerRect.left;
    const rawTop = clientY - containerRect.top;
    const clampedLeft = Math.max(96, Math.min(containerRect.width - 96, rawLeft));
    const clampedTop = Math.max(48, rawTop);
    setHovered({ cell, leftPx: clampedLeft, topPx: clampedTop });
  };

  const handleSvgMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    updateHoverFromTarget(e.target, e.clientX, e.clientY);
  };

  const handleSvgClick = (e: MouseEvent<SVGSVGElement>) => {
    updateHoverFromTarget(e.target, e.clientX, e.clientY);
  };

  return (
    <section
      aria-label="Life in weeks poster"
      className="editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Life in weeks
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
            {poster.pastWeeks.toLocaleString()} of {poster.totalWeeks.toLocaleString()} weeks lived
            <span aria-hidden="true"> · </span>
            Born {formatShortDateLabel(poster.birthDate)}
            <span aria-hidden="true"> · </span>
            {poster.lifeExpectancy} yr horizon
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateSettings}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
        >
          Edit horizon in Settings
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Live hovered / current week readout bar (zero layout shift) */}
        <div className="min-h-[36px] px-3.5 py-2 rounded-lg bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          {inspectedCell ? (
            <>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  Age {inspectedCell.yearIndex} · Week {inspectedCell.weekIndex + 1}
                </span>
                <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">
                  /
                </span>
                <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  {formatShortDateLabel(inspectedCell.startDate)} –{' '}
                  {formatShortDateLabel(inspectedCell.endDate)}
                </span>
                {inspectedCell.status === 'current' && (
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    Current week
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                  style={{
                    backgroundColor: inspectedCell.chapter
                      ? getChapterColorVar(inspectedCell.chapter.color)
                      : 'var(--cadence-poster-neutral-fill)',
                  }}
                  aria-hidden="true"
                />
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {inspectedCell.chapter ? inspectedCell.chapter.name : 'Outside chapter'}
                </span>
              </div>
            </>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">
              Hover any square to inspect its week dates and chapter.
            </span>
          )}
        </div>

        {/* Crisp SVG Poster Grid */}
        <div
          ref={containerRef}
          className="relative overflow-x-auto pb-1"
          onMouseLeave={() => setHovered(null)}
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            role="img"
            aria-label={`Life in weeks grid: ${poster.lifeExpectancy} years by 52 weeks`}
            shapeRendering="geometricPrecision"
            onMouseMove={handleSvgMouseMove}
            onClick={handleSvgClick}
            className="w-full min-w-[540px] max-w-[760px] h-auto mx-auto block select-none"
          >
            {/* Column week ticks */}
            {WEEK_AXIS_TICKS.map((tick) => {
              const x = LEFT_PAD + (tick - 1) * PITCH + CELL_SIZE / 2;
              return (
                <text
                  key={`tick-${tick}`}
                  x={x}
                  y={11}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontFamily="var(--cadence-font-mono)"
                  fill="var(--cadence-popover-muted)"
                >
                  W{tick}
                </text>
              );
            })}

            {/* Row year labels every 5 rows */}
            {yearMarkers.map((yearIdx) => {
              const y = TOP_PAD + yearIdx * PITCH + CELL_SIZE / 2 + 3;
              return (
                <text
                  key={`yr-${yearIdx}`}
                  x={LEFT_PAD - 8}
                  y={y}
                  textAnchor="end"
                  fontSize="8.5"
                  fontFamily="var(--cadence-font-mono)"
                  fill="var(--cadence-popover-muted)"
                >
                  {yearIdx}
                </text>
              );
            })}

            {/* Week Squares */}
            {poster.weeks.map((cell) => {
              const x = LEFT_PAD + cell.weekIndex * PITCH;
              const y = TOP_PAD + cell.yearIndex * PITCH;
              const chapterColor = cell.chapter ? getChapterColorVar(cell.chapter.color) : null;

              if (cell.status === 'current') {
                const activeColor = chapterColor ?? 'var(--color-blue-600)';
                return (
                  <g key={cell.index}>
                    <rect
                      x={x - 1.5}
                      y={y - 1.5}
                      width={CELL_SIZE + 3}
                      height={CELL_SIZE + 3}
                      rx={2.5}
                      fill="none"
                      stroke={activeColor}
                      strokeWidth={1.6}
                      className="cadence-week-pulse pointer-events-none"
                    />
                    <rect
                      data-week-index={cell.index}
                      x={x}
                      y={y}
                      width={CELL_SIZE}
                      height={CELL_SIZE}
                      rx={1.75}
                      fill={activeColor}
                      stroke="var(--cadence-bg-card)"
                      strokeWidth={0.75}
                      className="cursor-pointer"
                    />
                  </g>
                );
              }

              if (cell.status === 'future') {
                return (
                  <rect
                    key={cell.index}
                    data-week-index={cell.index}
                    x={x + 0.55}
                    y={y + 0.55}
                    width={CELL_SIZE - 1.1}
                    height={CELL_SIZE - 1.1}
                    rx={1.5}
                    fill="transparent"
                    stroke={chapterColor ?? 'var(--cadence-poster-neutral-stroke)'}
                    strokeWidth={1.05}
                    strokeOpacity={chapterColor ? 0.78 : 0.8}
                    className="cursor-pointer"
                  />
                );
              }

              return (
                <rect
                  key={cell.index}
                  data-week-index={cell.index}
                  x={x}
                  y={y}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={1.5}
                  fill={chapterColor ?? 'var(--cadence-poster-neutral-fill)'}
                  className="cursor-pointer"
                />
              );
            })}

            {/* Subtle hover highlight outline */}
            {hovered && (
              <rect
                x={LEFT_PAD + hovered.cell.weekIndex * PITCH - 1}
                y={TOP_PAD + hovered.cell.yearIndex * PITCH - 1}
                width={CELL_SIZE + 2}
                height={CELL_SIZE + 2}
                rx={2}
                fill="none"
                stroke="var(--cadence-popover-text)"
                strokeWidth={1.3}
                className="pointer-events-none"
              />
            )}
          </svg>

          {/* Floating Tooltip on Hover */}
          {hovered && (
            <div
              role="tooltip"
              style={{
                left: `${hovered.leftPx}px`,
                top: `${hovered.topPx - 12}px`,
              }}
              className="cadence-popover pointer-events-none absolute -translate-x-1/2 -translate-y-full z-20 px-3 py-2 text-xs whitespace-nowrap"
            >
              <p className="font-mono font-semibold tabular-nums">
                {formatShortDateLabel(hovered.cell.startDate)} –{' '}
                {formatShortDateLabel(hovered.cell.endDate)}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] opacity-85">
                <span
                  className="w-2 h-2 rounded-[2px] shrink-0"
                  style={{
                    backgroundColor: hovered.cell.chapter
                      ? getChapterColorVar(hovered.cell.chapter.color)
                      : 'var(--cadence-poster-neutral-fill)',
                  }}
                  aria-hidden="true"
                />
                <span>
                  {hovered.cell.chapter ? hovered.cell.chapter.name : 'Outside chapter'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Yr {hovered.cell.yearIndex}, W{hovered.cell.weekIndex + 1}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Legend listing chapters and week states */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Chapters &amp; key
            </h3>
            <button
              type="button"
              onClick={onOpenChapters}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage chapters
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 dark:text-slate-300">
            {sortedChapters.map((ch) => (
              <div key={ch.id} className="inline-flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-[3px] shrink-0"
                  style={{ backgroundColor: getChapterColorVar(ch.color) }}
                  aria-hidden="true"
                />
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {ch.name}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                  {formatShortDateLabel(ch.startDate)} – {formatShortDateLabel(ch.endDate)}
                </span>
              </div>
            ))}

            <div className="inline-flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-[3px] shrink-0"
                style={{ backgroundColor: 'var(--cadence-poster-neutral-fill)' }}
                aria-hidden="true"
              />
              <span>Outside chapter</span>
            </div>

            <div className="inline-flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-[3px] shrink-0"
                style={{ backgroundColor: 'var(--cadence-poster-neutral-fill)' }}
                aria-hidden="true"
              />
              <span>Past (filled)</span>
            </div>

            <div className="inline-flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-[3px] shrink-0 border"
                style={{ borderColor: 'var(--cadence-poster-neutral-stroke)' }}
                aria-hidden="true"
              />
              <span>Future (outline)</span>
            </div>

            <div className="inline-flex items-center gap-2">
              <span className="relative w-3 h-3 inline-flex items-center justify-center shrink-0">
                <span
                  className="absolute inset-0 rounded-[3px] border cadence-week-pulse"
                  style={{ borderColor: 'var(--color-blue-600)' }}
                  aria-hidden="true"
                />
                <span
                  className="w-2.5 h-2.5 rounded-[2px]"
                  style={{ backgroundColor: 'var(--color-blue-600)' }}
                  aria-hidden="true"
                />
              </span>
              <span>Current week</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
