import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { MoodRatingRecord } from '../types/dashboard';
import {
  buildYearPixelsGrid,
  formatMoodValue,
  getMoodScaleColor,
  MOOD_STEP_VALUES,
  normalizeMoodRating,
  YearPixelDay,
} from '../utils/lifeUtils';
import { formatShortDateLabel, parseDateKeyLocal } from '../utils/taskUtils';

interface YearInPixelsViewProps {
  moodRatings: MoodRatingRecord[];
  birthDate: string;
  now: Date;
  onSetMoodRating: (dateKey: string, rating: number | null) => void;
}

function formatFullDayLabel(dateKey: string): string {
  const dt = parseDateKeyLocal(dateKey);
  if (!dt) return formatShortDateLabel(dateKey);
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function YearInPixelsView({
  moodRatings,
  birthDate,
  now,
  onSetMoodRating,
}: YearInPixelsViewProps) {
  const currentYear = now.getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const yearOptions = useMemo(() => {
    const birthYear = parseDateKeyLocal(birthDate)?.getFullYear() ?? currentYear;
    let earliestMoodYear = currentYear;
    let latestMoodYear = currentYear;
    for (const r of moodRatings) {
      const yr = Number(r.dateKey.slice(0, 4));
      if (Number.isFinite(yr) && yr >= 1900 && yr <= 2200) {
        if (yr < earliestMoodYear) earliestMoodYear = yr;
        if (yr > latestMoodYear) latestMoodYear = yr;
      }
    }
    const minYear = Math.max(birthYear, Math.min(currentYear - 4, earliestMoodYear));
    const maxYear = Math.max(currentYear + 1, latestMoodYear);
    const years: number[] = [];
    for (let y = maxYear; y >= minYear; y -= 1) {
      years.push(y);
    }
    return years;
  }, [birthDate, currentYear, moodRatings]);

  const minSelectableYear = yearOptions[yearOptions.length - 1] ?? currentYear;
  const maxSelectableYear = yearOptions[0] ?? currentYear + 1;

  const grid = useMemo(
    () => buildYearPixelsGrid(selectedYear, moodRatings, now),
    [selectedYear, moodRatings, now]
  );

  const selectedDay: YearPixelDay | null = useMemo(() => {
    if (!selectedDateKey) return null;
    for (const monthDays of grid.daysByMonth) {
      for (const day of monthDays) {
        if (day && day.dateKey === selectedDateKey) {
          return day;
        }
      }
    }
    return null;
  }, [grid.daysByMonth, selectedDateKey]);

  const handleSelectYear = (nextYear: number) => {
    setSelectedYear(nextYear);
    setSelectedDateKey(null);
  };

  const stepSelectedMood = (delta: number) => {
    if (!selectedDay || selectedDay.status === 'future') return;
    if (selectedDay.rating === null) {
      onSetMoodRating(selectedDay.dateKey, 5);
      return;
    }
    const next = normalizeMoodRating(selectedDay.rating + delta);
    onSetMoodRating(selectedDay.dateKey, next);
  };

  return (
    <section
      aria-label="Year in pixels mood grid"
      className="editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
    >
      {/* Header + Year selector */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Year in pixels
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
            {grid.ratedCount > 0 ? (
              <>
                {grid.ratedCount} rated {grid.ratedCount === 1 ? 'day' : 'days'}
                <span aria-hidden="true"> · </span>
                Avg {grid.yearAverage !== null ? grid.yearAverage.toFixed(1) : '—'}
              </>
            ) : (
              'Older unrated days stay muted · Ratings start from now'
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={selectedYear <= minSelectableYear}
            onClick={() => handleSelectYear(selectedYear - 1)}
            aria-label="Previous year"
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          <select
            aria-label="Select year"
            value={selectedYear}
            onChange={(e) => handleSelectYear(Number(e.target.value))}
            className="cadence-input h-8 px-2.5 rounded-lg text-xs font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100"
          >
            {yearOptions.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={selectedYear >= maxSelectableYear}
            onClick={() => handleSelectYear(selectedYear + 1)}
            aria-label="Next year"
            className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              1
            </span>
            <div
              className="flex items-center gap-0.5"
              role="img"
              aria-label="Smooth mood color scale from 1 to 10 in 0.5 steps"
            >
              {MOOD_STEP_VALUES.map((val) => (
                <span
                  key={val}
                  title={`Mood ${formatMoodValue(val)}`}
                  className="w-2.5 h-3 first:rounded-l-[3px] last:rounded-r-[3px]"
                  style={{ backgroundColor: getMoodScaleColor(val) }}
                />
              ))}
            </div>
            <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
              10
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              (0.5 steps)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-[3px] shrink-0"
                style={{ backgroundColor: 'var(--cadence-mood-empty)' }}
                aria-hidden="true"
              />
              <span>Unrated</span>
            </div>
            <div className="inline-flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-[3px] shrink-0 border"
                style={{ borderColor: 'var(--cadence-mood-future-stroke)' }}
                aria-hidden="true"
              />
              <span>Future</span>
            </div>
          </div>
        </div>

        {/* 12 Months x 31 Days Matrix + Monthly Averages directly below */}
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[440px] max-w-[640px] mx-auto">
            {/* Month column headers */}
            <div className="grid grid-cols-[26px_repeat(12,minmax(0,1fr))] gap-1.5 mb-2 items-center">
              <span aria-hidden="true" />
              {grid.monthSummaries.map((m) => (
                <span
                  key={m.monthIndex}
                  className="text-center text-[11px] font-medium text-slate-500 dark:text-slate-400"
                >
                  {m.shortLabel}
                </span>
              ))}
            </div>

            {/* 31 Day rows */}
            <div className="space-y-1.5">
              {Array.from({ length: 31 }, (_, rowIdx) => {
                const dayNumber = rowIdx + 1;
                const showRowLabel =
                  dayNumber === 1 || dayNumber % 5 === 0 || dayNumber === 31;

                return (
                  <div
                    key={dayNumber}
                    className="grid grid-cols-[26px_repeat(12,minmax(0,1fr))] gap-1.5 items-center"
                  >
                    <span className="text-right pr-1 font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-500 select-none">
                      {showRowLabel ? dayNumber : ''}
                    </span>

                    {grid.daysByMonth.map((monthDays, monthIdx) => {
                      const day = monthDays[rowIdx];
                      if (!day) {
                        return (
                          <div
                            key={`${monthIdx}-${dayNumber}`}
                            className="aspect-square w-full max-w-[24px] mx-auto"
                            aria-hidden="true"
                          />
                        );
                      }

                      const isSelected = selectedDateKey === day.dateKey;
                      const isFuture = day.status === 'future';
                      const isToday = day.status === 'today';

                      const fillStyle = isFuture
                        ? {
                            backgroundColor: 'transparent',
                            border: '1.5px solid var(--cadence-mood-future-stroke)',
                          }
                        : day.rating !== null
                          ? {
                              backgroundColor: getMoodScaleColor(day.rating),
                            }
                          : {
                              backgroundColor: 'var(--cadence-mood-empty)',
                            };

                      const tooltipText = isFuture
                        ? `${formatFullDayLabel(day.dateKey)} · Future`
                        : day.rating !== null
                          ? `${formatFullDayLabel(day.dateKey)} · Mood ${formatMoodValue(day.rating)}/10`
                          : `${formatFullDayLabel(day.dateKey)} · Unrated`;

                      return (
                        <button
                          key={day.dateKey}
                          type="button"
                          onClick={() =>
                            setSelectedDateKey((prev) =>
                              prev === day.dateKey ? null : day.dateKey
                            )
                          }
                          title={tooltipText}
                          aria-label={tooltipText}
                          aria-pressed={isSelected}
                          style={fillStyle}
                          className={`aspect-square w-full max-w-[24px] mx-auto rounded-[4px] transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 ${
                            isSelected
                              ? 'ring-2 ring-slate-900 dark:ring-white ring-offset-1 ring-offset-white dark:ring-offset-[#121927]'
                              : isToday
                                ? 'ring-1 ring-blue-600 dark:ring-blue-400 ring-offset-1 ring-offset-white dark:ring-offset-[#121927]'
                                : ''
                          }`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Monthly averages row directly under the grid */}
            <div className="grid grid-cols-[26px_repeat(12,minmax(0,1fr))] gap-1.5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 items-center">
              <span className="text-right pr-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Avg
              </span>
              {grid.monthSummaries.map((m) => (
                <div
                  key={`avg-${m.monthIndex}`}
                  title={
                    m.average !== null
                      ? `${m.shortLabel} average: ${m.average.toFixed(1)} (${m.ratedCount} ${
                          m.ratedCount === 1 ? 'day' : 'days'
                        })`
                      : `${m.shortLabel}: No rated days`
                  }
                  className="text-center font-mono text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-200"
                >
                  {m.average !== null ? (
                    m.average.toFixed(1)
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 font-normal">—</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Click-to-view / edit selected day bar */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
          {selectedDay ? (
            selectedDay.status === 'future' ? (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 px-4 py-3 text-xs">
                <div>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {formatFullDayLabel(selectedDay.dateKey)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 ml-2">
                    Future day — mood ratings can be added once this day arrives.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDateKey(null)}
                  aria-label="Close day inspector"
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-4 h-4 rounded-[4px] shrink-0"
                    style={{
                      backgroundColor:
                        selectedDay.rating !== null
                          ? getMoodScaleColor(selectedDay.rating)
                          : 'var(--cadence-mood-empty)',
                    }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                        {formatFullDayLabel(selectedDay.dateKey)}
                      </span>
                      {selectedDay.status === 'today' && (
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                      {selectedDay.rating !== null
                        ? `Mood: ${formatMoodValue(selectedDay.rating)} / 10`
                        : 'Unrated · Slide or step to log mood'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => stepSelectedMood(-0.5)}
                    disabled={selectedDay.rating !== null && selectedDay.rating <= 1}
                    aria-label="Decrease selected day mood by 0.5"
                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>

                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={0.5}
                    value={selectedDay.rating ?? 5}
                    aria-label={`Mood rating for ${selectedDay.dateKey}`}
                    aria-valuetext={
                      selectedDay.rating !== null
                        ? `${formatMoodValue(selectedDay.rating)} out of 10`
                        : 'Unrated'
                    }
                    onChange={(e) =>
                      onSetMoodRating(selectedDay.dateKey, Number(e.target.value))
                    }
                    className="w-28 sm:w-32 accent-blue-600 dark:accent-blue-500 cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => stepSelectedMood(0.5)}
                    disabled={selectedDay.rating !== null && selectedDay.rating >= 10}
                    aria-label="Increase selected day mood by 0.5"
                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>

                  {selectedDay.rating !== null && (
                    <button
                      type="button"
                      onClick={() => onSetMoodRating(selectedDay.dateKey, null)}
                      title="Clear rating"
                      aria-label={`Clear mood rating for ${selectedDay.dateKey}`}
                      className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800/70 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      <span>Clear</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedDateKey(null)}
                    aria-label="Close day editor"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any past or current day square above to view or edit its mood rating.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
