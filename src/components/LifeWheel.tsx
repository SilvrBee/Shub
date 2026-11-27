import { useState } from 'react';
import { LifeAreaId } from '../types/dashboard';
import { AreaPulseResult } from '../utils/lifeUtils';
import { LifeAreaIcon, PulseTrendBadge } from './LifeAreaIcon';

interface LifeWheelProps {
  pulses: AreaPulseResult[];
  onSelectArea: (areaId: LifeAreaId) => void;
}

const CENTER = 140;
const INNER_RADIUS = 38;
const MAX_RADIUS = 104;
const LABEL_RADIUS = 122;
const GAP_DEG = 3.5;

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = degToRad(angleDeg);
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function buildSectorPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const p1 = polarToCartesian(cx, cy, outerRadius, startAngle);
  const p2 = polarToCartesian(cx, cy, outerRadius, endAngle);
  const p3 = polarToCartesian(cx, cy, innerRadius, endAngle);
  const p4 = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export function LifeWheel({ pulses, onSelectArea }: LifeWheelProps) {
  const [hoveredId, setHoveredId] = useState<LifeAreaId | null>(null);

  const count = Math.max(1, pulses.length);
  const sliceDeg = 360 / count;

  const activePulses = pulses.filter((p) => p.hasData && p.score !== null);
  const averageScore =
    activePulses.length > 0
      ? Math.round(
          activePulses.reduce((sum, p) => sum + (p.score ?? 0), 0) / activePulses.length
        )
      : null;

  const hoveredPulse = hoveredId ? pulses.find((p) => p.id === hoveredId) ?? null : null;

  return (
    <section
      aria-label="Life Wheel"
      className="editorial-rise editorial-rise-4 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between h-full"
    >
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">AREAS</span>
            <span className="editorial-kicker-text">7-Day Pulse</span>
          </span>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Life Wheel
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Hover for exact score · Click a segment to inspect
          </p>
        </div>

        <div className="text-right shrink-0">
          {hoveredPulse ? (
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {hoveredPulse.label}
              </span>
              <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                {hoveredPulse.hasData && hoveredPulse.score !== null
                  ? `${hoveredPulse.score} / 100`
                  : hoveredPulse.summaryLabel}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Avg Pulse
              </span>
              <span className="font-mono text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                {averageScore !== null ? `${averageScore} / 100` : '—'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col items-center justify-center relative">
        <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
          <svg
            viewBox="0 0 280 280"
            className="w-full h-full overflow-visible select-none"
            role="img"
            aria-label="Radial chart of your six life areas sized by 7-day pulse"
          >
            {/* Subtle concentric guide rings (25%, 50%, 75%, 100%) */}
            {[0.25, 0.5, 0.75, 1].map((ratio) => (
              <circle
                key={ratio}
                cx={CENTER}
                cy={CENTER}
                r={INNER_RADIUS + (MAX_RADIUS - INNER_RADIUS) * ratio}
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray={ratio < 1 ? '2 3' : undefined}
                className="text-slate-200 dark:text-slate-800"
              />
            ))}

            {pulses.map((pulse, index) => {
              const baseStart = -90 + index * sliceDeg + GAP_DEG / 2;
              const baseEnd = -90 + (index + 1) * sliceDeg - GAP_DEG / 2;
              const midAngle = (baseStart + baseEnd) / 2;
              const isHovered = hoveredId === pulse.id;

              const trackPath = buildSectorPath(
                CENTER,
                CENTER,
                INNER_RADIUS,
                MAX_RADIUS,
                baseStart,
                baseEnd
              );

              const hasScore = pulse.hasData && pulse.score !== null;
              const valueOuterRadius = hasScore
                ? INNER_RADIUS +
                  ((MAX_RADIUS - INNER_RADIUS) * Math.max(4, pulse.score ?? 0)) / 100
                : INNER_RADIUS;

              const valuePath = hasScore
                ? buildSectorPath(
                    CENTER,
                    CENTER,
                    INNER_RADIUS,
                    valueOuterRadius,
                    baseStart,
                    baseEnd
                  )
                : null;

              const labelPos = polarToCartesian(CENTER, CENTER, LABEL_RADIUS, midAngle);

              return (
                <g
                  key={pulse.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${pulse.label}: ${
                    hasScore ? `${pulse.score} out of 100` : pulse.summaryLabel
                  }. Open ${pulse.label} details`}
                  onMouseEnter={() => setHoveredId(pulse.id)}
                  onMouseLeave={() => setHoveredId((prev) => (prev === pulse.id ? null : prev))}
                  onFocus={() => setHoveredId(pulse.id)}
                  onBlur={() => setHoveredId((prev) => (prev === pulse.id ? null : prev))}
                  onClick={() => onSelectArea(pulse.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectArea(pulse.id);
                    }
                  }}
                  className="cursor-pointer focus:outline-none group"
                >
                  {/* Full-sector hit & track wedge */}
                  <path
                    d={trackPath}
                    fill={isHovered ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.09)'}
                    stroke="currentColor"
                    strokeWidth={isHovered ? 1.5 : 1}
                    className={
                      isHovered
                        ? 'text-slate-400 dark:text-slate-500 transition-colors duration-150'
                        : 'text-slate-200 dark:text-slate-800 transition-colors duration-150'
                    }
                  />

                  {/* Sized pulse fill */}
                  {valuePath && (
                    <path
                      d={valuePath}
                      fill={pulse.colorVar}
                      fillOpacity={isHovered ? 0.92 : 0.78}
                      stroke={pulse.colorVar}
                      strokeWidth={isHovered ? 1.8 : 1}
                      className="transition-[fill-opacity,stroke-width] duration-150"
                    />
                  )}

                  {/* Outer radial text label */}
                  <text
                    x={labelPos.x}
                    y={labelPos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={`text-[11px] font-medium transition-colors duration-150 ${
                      isHovered
                        ? 'fill-slate-900 dark:fill-slate-100 font-semibold'
                        : 'fill-slate-500 dark:fill-slate-400'
                    }`}
                  >
                    {pulse.label}
                  </text>
                </g>
              );
            })}

            {/* Inner hub circle */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={INNER_RADIUS - 3}
              className="fill-white dark:fill-[#121927] stroke-slate-200 dark:stroke-slate-800"
              strokeWidth="1"
            />
          </svg>

          {/* Center hub readout */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-[66px] h-[66px] rounded-full flex flex-col items-center justify-center text-center px-1">
              {hoveredPulse ? (
                <>
                  <span
                    className="inline-flex items-center justify-center"
                    style={{
                      color: hoveredPulse.hasData
                        ? hoveredPulse.colorVar
                        : 'var(--cadence-area-muted)',
                    }}
                  >
                    <LifeAreaIcon areaId={hoveredPulse.id} className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100 leading-tight mt-0.5">
                    {hoveredPulse.hasData && hoveredPulse.score !== null
                      ? hoveredPulse.score
                      : '—'}
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate max-w-full leading-tight">
                    {hoveredPulse.hasData ? hoveredPulse.label : 'No data'}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100 leading-tight">
                    {averageScore !== null ? averageScore : '—'}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                    Pulse
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Exact Hover Readout Bar */}
        <div
          aria-live="polite"
          className="mt-2 w-full min-h-[32px] px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
        >
          {hoveredPulse ? (
            <>
              <span className="flex items-center gap-1.5 min-w-0">
                <span
                  style={{
                    color: hoveredPulse.hasData
                      ? hoveredPulse.colorVar
                      : 'var(--cadence-area-muted)',
                  }}
                  className="shrink-0"
                >
                  <LifeAreaIcon areaId={hoveredPulse.id} className="w-3.5 h-3.5" />
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {hoveredPulse.label}
                </span>
                <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-500 dark:text-slate-400 truncate">
                  {hoveredPulse.summaryLabel}
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {hoveredPulse.hasData && hoveredPulse.score !== null
                    ? `${hoveredPulse.score}/100`
                    : 'No data'}
                </span>
                <PulseTrendBadge
                  trend={hoveredPulse.trend}
                  delta={hoveredPulse.delta}
                  compact
                />
              </span>
            </>
          ) : (
            <span className="text-slate-500 dark:text-slate-400 w-full text-center">
              Hover a wedge to inspect its 7-day score
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
