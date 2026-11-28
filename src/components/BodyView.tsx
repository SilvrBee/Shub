import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Droplets,
  Flame,
  Footprints,
  Moon,
  Pencil,
  Plus,
  Scale,
  Timer,
  Trash2,
} from 'lucide-react';
import { getTodayKey } from '../data/initialData';
import { useCadenceStyle } from '../hooks/useCadenceStyle';
import {
  BodyLogEntry,
  BodySettings,
  DashboardView,
} from '../types/dashboard';
import {
  bodyLogHasAnyMetric,
  buildBodyChartSeries,
  computeWalkStreak,
  sanitizeBodyLogEntry,
} from '../utils/lifeUtils';
import { DoodleHeaderScene } from './DoodleKit';
import { EmptyStateIllustration } from './EmptyStateIllustration';

interface BodyViewProps {
  bodyLogs: BodyLogEntry[];
  bodySettings: BodySettings;
  onUpsertBodyLog: (entry: BodyLogEntry) => void;
  onDeleteBodyLog: (dateKey: string) => void;
  onUpdateBodySettings: (settings: BodySettings) => void;
}

interface BodyFormState {
  steps: string;
  walkMinutes: string;
  sleepHours: string;
  weight: string;
  waterGlasses: string;
}

function entryToFormState(entry: BodyLogEntry | undefined): BodyFormState {
  return {
    steps: entry?.steps !== undefined ? String(entry.steps) : '',
    walkMinutes: entry?.walkMinutes !== undefined ? String(entry.walkMinutes) : '',
    sleepHours: entry?.sleepHours !== undefined ? String(entry.sleepHours) : '',
    weight: entry?.weight !== undefined ? String(entry.weight) : '',
    waterGlasses: entry?.waterGlasses !== undefined ? String(entry.waterGlasses) : '',
  };
}

function parseOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : undefined;
}

function formatReadableDate(dateKey: string): string {
  const dt = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return dateKey;
  return dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function BodyView({
  bodyLogs,
  bodySettings,
  onUpsertBodyLog,
  onDeleteBodyLog,
  onUpdateBodySettings,
}: BodyViewProps) {
  const activeStyle = useCadenceStyle();
  const todayKey = getTodayKey();

  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const existingForSelectedDate = useMemo(
    () => bodyLogs.find((entry) => entry.dateKey === selectedDateKey),
    [bodyLogs, selectedDateKey]
  );

  const [form, setForm] = useState<BodyFormState>(() =>
    entryToFormState(existingForSelectedDate)
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<7 | 30>(7);
  const [hoveredStepKey, setHoveredStepKey] = useState<string | null>(null);
  const [hoveredWalkKey, setHoveredWalkKey] = useState<string | null>(null);

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState<string>(String(bodySettings.dailyStepsGoal));
  const [showAllLogs, setShowAllLogs] = useState(false);

  useEffect(() => {
    setForm(entryToFormState(existingForSelectedDate));
  }, [existingForSelectedDate, selectedDateKey]);

  useEffect(() => {
    setGoalDraft(String(bodySettings.dailyStepsGoal));
  }, [bodySettings.dailyStepsGoal]);

  useEffect(() => {
    if (!savedNotice) return;
    const id = window.setTimeout(() => setSavedNotice(null), 2200);
    return () => window.clearTimeout(id);
  }, [savedNotice]);

  const walkStreak = useMemo(() => computeWalkStreak(bodyLogs), [bodyLogs]);
  const chartSeries = useMemo(
    () => buildBodyChartSeries(bodyLogs, chartRange),
    [bodyLogs, chartRange]
  );

  const activeBodyDaysLast7 = useMemo(() => {
    const last7 = buildBodyChartSeries(bodyLogs, 7);
    return last7.filter((p) => (p.steps ?? 0) > 0 || (p.walkMinutes ?? 0) > 0).length;
  }, [bodyLogs]);

  const stepsGoal = bodySettings.dailyStepsGoal;
  const maxChartSteps = useMemo(() => {
    const maxLogged = Math.max(0, ...chartSeries.map((p) => p.steps ?? 0));
    return Math.max(stepsGoal * 1.15, maxLogged * 1.1, 2000);
  }, [chartSeries, stepsGoal]);

  const maxChartWalk = useMemo(() => {
    const maxLogged = Math.max(0, ...chartSeries.map((p) => p.walkMinutes ?? 0));
    return Math.max(30, maxLogged * 1.15);
  }, [chartSeries]);

  const totalStepsInRange = useMemo(
    () => chartSeries.reduce((sum, p) => sum + (p.steps ?? 0), 0),
    [chartSeries]
  );
  const totalWalkInRange = useMemo(
    () => chartSeries.reduce((sum, p) => sum + (p.walkMinutes ?? 0), 0),
    [chartSeries]
  );

  const hoveredStepPoint = useMemo(
    () => chartSeries.find((p) => p.dateKey === hoveredStepKey) ?? null,
    [chartSeries, hoveredStepKey]
  );
  const hoveredWalkPoint = useMemo(
    () => chartSeries.find((p) => p.dateKey === hoveredWalkKey) ?? null,
    [chartSeries, hoveredWalkKey]
  );

  const handleSaveLog = (e: FormEvent) => {
    e.preventDefault();
    const candidate = sanitizeBodyLogEntry({
      id: selectedDateKey,
      dateKey: selectedDateKey,
      source: 'manual',
      steps: parseOptionalNumber(form.steps),
      walkMinutes: parseOptionalNumber(form.walkMinutes),
      sleepHours: parseOptionalNumber(form.sleepHours),
      weight: parseOptionalNumber(form.weight),
      waterGlasses: parseOptionalNumber(form.waterGlasses),
      updatedAt: new Date().toISOString(),
    });

    if (!candidate) return;

    if (!bodyLogHasAnyMetric(candidate)) {
      if (existingForSelectedDate) {
        onDeleteBodyLog(selectedDateKey);
        setSavedNotice(`Cleared log for ${selectedDateKey}`);
      } else {
        setSavedNotice('Enter at least one metric to save');
      }
      return;
    }

    onUpsertBodyLog(candidate);
    setSavedNotice(
      selectedDateKey === todayKey ? 'Saved today’s log' : `Saved log for ${selectedDateKey}`
    );
  };

  const handleQuickBump = (
    field: 'steps' | 'walkMinutes' | 'waterGlasses',
    delta: number
  ) => {
    setForm((prev) => {
      const current = Number(prev[field] || 0);
      const next = Math.max(0, (Number.isFinite(current) ? current : 0) + delta);
      return { ...prev, [field]: String(next) };
    });
  };

  const handleSaveStepsGoal = (e: FormEvent) => {
    e.preventDefault();
    const parsed = Number(goalDraft);
    const nextGoal = Number.isFinite(parsed)
      ? Math.max(1000, Math.min(100_000, Math.round(parsed)))
      : bodySettings.dailyStepsGoal;
    onUpdateBodySettings({ dailyStepsGoal: nextGoal });
    setGoalDraft(String(nextGoal));
    setEditingGoal(false);
  };

  const visibleLogs = showAllLogs ? bodyLogs : bodyLogs.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="editorial-rise editorial-rise-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">EDITION</span>
            <span className="editorial-kicker-text">Vitality</span>
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Body
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daily steps, walk duration, sleep, weight, and hydration baselines
          </p>
        </div>

        {activeStyle === 'doodle' && <DoodleHeaderScene tab={DashboardView.Body} />}
      </div>

      {/* Fast Log Today Card */}
      <section
        aria-label="Log today's body metrics"
        className="editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6"
      >
        <form onSubmit={handleSaveLog} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {selectedDateKey === todayKey
                  ? 'Log today'
                  : `Log for ${formatReadableDate(selectedDateKey)}`}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Every field is optional · Source:{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {existingForSelectedDate?.source === 'sync' ? 'Sync' : 'Manual'}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="body-log-date" className="sr-only">
                Log date
              </label>
              <input
                id="body-log-date"
                type="date"
                value={selectedDateKey}
                max={todayKey}
                onChange={(e) => {
                  if (e.target.value) setSelectedDateKey(e.target.value);
                }}
                className="cadence-input px-2.5 py-1.5 text-xs font-mono tabular-nums"
              />
              {selectedDateKey !== todayKey && (
                <button
                  type="button"
                  onClick={() => setSelectedDateKey(todayKey)}
                  className="cadence-control px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Steps */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <label
                  htmlFor="body-steps"
                  className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <Footprints
                    className="w-3.5 h-3.5"
                    style={{ color: 'var(--cadence-area-body)' }}
                  />
                  Steps
                </label>
                <button
                  type="button"
                  onClick={() => handleQuickBump('steps', 1000)}
                  className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  +1k
                </button>
              </div>
              <input
                id="body-steps"
                type="number"
                inputMode="numeric"
                min={0}
                max={200000}
                step={1}
                placeholder="e.g. 8000"
                value={form.steps}
                onChange={(e) => setForm((prev) => ({ ...prev, steps: e.target.value }))}
                className="cadence-input w-full px-3 py-2 text-sm font-mono tabular-nums"
              />
            </div>

            {/* Walk Minutes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-1">
                <label
                  htmlFor="body-walk"
                  className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <Timer
                    className="w-3.5 h-3.5"
                    style={{ color: 'var(--cadence-area-study)' }}
                  />
                  Walk (min)
                </label>
                <button
                  type="button"
                  onClick={() => handleQuickBump('walkMinutes', 15)}
                  className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  +15m
                </button>
              </div>
              <input
                id="body-walk"
                type="number"
                inputMode="numeric"
                min={0}
                max={1440}
                step={1}
                placeholder="e.g. 30"
                value={form.walkMinutes}
                onChange={(e) => setForm((prev) => ({ ...prev, walkMinutes: e.target.value }))}
                className="cadence-input w-full px-3 py-2 text-sm font-mono tabular-nums"
              />
            </div>

            {/* Sleep Hours */}
            <div className="space-y-1.5">
              <label
                htmlFor="body-sleep"
                className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
              >
                <Moon
                  className="w-3.5 h-3.5"
                  style={{ color: 'var(--cadence-area-mind)' }}
                />
                Sleep (hrs)
              </label>
              <input
                id="body-sleep"
                type="number"
                inputMode="decimal"
                min={0}
                max={24}
                step={0.1}
                placeholder="e.g. 7.5"
                value={form.sleepHours}
                onChange={(e) => setForm((prev) => ({ ...prev, sleepHours: e.target.value }))}
                className="cadence-input w-full px-3 py-2 text-sm font-mono tabular-nums"
              />
            </div>

            {/* Weight */}
            <div className="space-y-1.5">
              <label
                htmlFor="body-weight"
                className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
              >
                <Scale
                  className="w-3.5 h-3.5"
                  style={{ color: 'var(--cadence-area-people)' }}
                />
                Weight (kg)
              </label>
              <input
                id="body-weight"
                type="number"
                inputMode="decimal"
                min={10}
                max={500}
                step={0.1}
                placeholder="e.g. 68.5"
                value={form.weight}
                onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
                className="cadence-input w-full px-3 py-2 text-sm font-mono tabular-nums"
              />
            </div>

            {/* Water Glasses */}
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between gap-1">
                <label
                  htmlFor="body-water"
                  className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <Droplets
                    className="w-3.5 h-3.5"
                    style={{ color: 'var(--cadence-area-skills)' }}
                  />
                  Water (glasses)
                </label>
                <button
                  type="button"
                  onClick={() => handleQuickBump('waterGlasses', 1)}
                  className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />1
                </button>
              </div>
              <input
                id="body-water"
                type="number"
                inputMode="numeric"
                min={0}
                max={50}
                step={1}
                placeholder="e.g. 8"
                value={form.waterGlasses}
                onChange={(e) => setForm((prev) => ({ ...prev, waterGlasses: e.target.value }))}
                className="cadence-input w-full px-3 py-2 text-sm font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400" role="status" aria-live="polite">
              {savedNotice ?? 'Logging steps or walk minutes updates your Body area pulse on Home.'}
            </p>

            <div className="flex items-center gap-2">
              {existingForSelectedDate && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteBodyLog(selectedDateKey);
                    setSavedNotice(`Removed entry for ${selectedDateKey}`);
                  }}
                  className="cadence-control px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400"
                >
                  Clear day
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-opacity hover:opacity-95 inline-flex items-center gap-1.5"
                style={{ backgroundColor: 'var(--cadence-area-body)' }}
              >
                <Check className="w-4 h-4" />
                {existingForSelectedDate ? 'Update log' : 'Save log'}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Streak & Steps Goal KPI Strip */}
      <section
        aria-label="Walk streak and body goals"
        className="editorial-rise editorial-rise-3 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800"
      >
        <div className="aurora-kpi-card p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="editorial-kpi-label text-xs font-medium text-slate-500 dark:text-slate-400">
              Walk streak
            </p>
            <Flame
              className="w-4 h-4"
              style={{
                color:
                  walkStreak.currentStreak > 0
                    ? 'var(--cadence-area-body)'
                    : 'var(--cadence-area-muted)',
              }}
            />
          </div>
          <p className="editorial-kpi-value mt-2 font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {walkStreak.currentStreak} {walkStreak.currentStreak === 1 ? 'day' : 'days'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {walkStreak.longestStreak > 0
              ? `Longest streak: ${walkStreak.longestStreak}d`
              : 'Log walk minutes to start a streak'}
          </p>
        </div>

        <div className="aurora-kpi-card p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="editorial-kpi-label text-xs font-medium text-slate-500 dark:text-slate-400">
              Active days (7d)
            </p>
            <Footprints
              className="w-4 h-4"
              style={{ color: 'var(--cadence-area-body)' }}
            />
          </div>
          <p className="editorial-kpi-value mt-2 font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {activeBodyDaysLast7} / 7
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Days with steps or a walk logged
          </p>
        </div>

        <div className="aurora-kpi-card p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="editorial-kpi-label text-xs font-medium text-slate-500 dark:text-slate-400">
              Daily steps goal
            </p>
            {!editingGoal && (
              <button
                type="button"
                onClick={() => setEditingGoal(true)}
                className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>

          {editingGoal ? (
            <form onSubmit={handleSaveStepsGoal} className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1000}
                max={100000}
                step={500}
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                aria-label="Daily steps goal"
                className="cadence-input w-28 px-2.5 py-1.5 text-sm font-mono tabular-nums"
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 text-xs font-medium rounded-md text-white"
                style={{ backgroundColor: 'var(--cadence-area-body)' }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setGoalDraft(String(bodySettings.dailyStepsGoal));
                  setEditingGoal(false);
                }}
                className="text-xs text-slate-500 dark:text-slate-400 px-1.5 py-1"
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <p className="editorial-kpi-value mt-2 font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {stepsGoal.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Shown as the dashed goal line below
              </p>
            </>
          )}
        </div>
      </section>

      {/* 7-Day / 30-Day Charts */}
      <section aria-label="Body activity charts" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Movement trends
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Steps and walk minutes across the last {chartRange} days
            </p>
          </div>

          <div
            role="group"
            aria-label="Chart timeframe"
            className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100/70 dark:bg-slate-800/70"
          >
            <button
              type="button"
              onClick={() => setChartRange(7)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                chartRange === 7
                  ? 'bg-white dark:bg-[#121927] text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Last 7 days
            </button>
            <button
              type="button"
              onClick={() => setChartRange(30)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                chartRange === 30
                  ? 'bg-white dark:bg-[#121927] text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Last 30 days
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Steps Bar Chart with Goal Line */}
          <div className="cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Daily Steps
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  {hoveredStepPoint
                    ? `${formatReadableDate(hoveredStepPoint.dateKey)}: ${
                        hoveredStepPoint.steps !== null
                          ? `${hoveredStepPoint.steps.toLocaleString()} steps`
                          : 'No steps logged'
                      }`
                    : `Goal: ${stepsGoal.toLocaleString()} / day`}
                </p>
              </div>
              <span className="font-mono tabular-nums text-xs font-semibold text-slate-700 dark:text-slate-300">
                {totalStepsInRange.toLocaleString()} total
              </span>
            </div>

            {(() => {
              const svgW = 460;
              const svgH = 156;
              const padTop = 14;
              const padBottom = 22;
              const plotH = svgH - padTop - padBottom;
              const slotW = svgW / chartSeries.length;
              const barW = Math.max(5, Math.min(28, slotW * 0.62));
              const goalY =
                padTop + plotH - Math.min(1, stepsGoal / maxChartSteps) * plotH;
              const labelEvery = chartRange === 30 ? 5 : 1;

              return (
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full h-40 overflow-visible"
                  role="img"
                  aria-label={`Steps over last ${chartRange} days`}
                >
                  {/* Baseline */}
                  <line
                    x1={0}
                    y1={padTop + plotH}
                    x2={svgW}
                    y2={padTop + plotH}
                    stroke="var(--cadence-border-color)"
                    strokeWidth="1"
                  />

                  {/* Goal line */}
                  <line
                    x1={0}
                    y1={goalY}
                    x2={svgW}
                    y2={goalY}
                    stroke="var(--cadence-area-body)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.85"
                  />
                  <text
                    x={svgW - 2}
                    y={Math.max(10, goalY - 4)}
                    textAnchor="end"
                    fontSize="9.5"
                    fill="var(--cadence-area-body)"
                    className="font-mono tabular-nums"
                  >
                    Goal {stepsGoal.toLocaleString()}
                  </text>

                  {chartSeries.map((point, idx) => {
                    const value = point.steps ?? 0;
                    const ratio = Math.min(1, value / maxChartSteps);
                    const barH = point.steps !== null && value > 0 ? Math.max(3, ratio * plotH) : 2;
                    const x = idx * slotW + (slotW - barW) / 2;
                    const y = padTop + plotH - barH;
                    const metGoal = (point.steps ?? 0) >= stepsGoal;
                    const isHovered = hoveredStepKey === point.dateKey;
                    const fill =
                      point.steps === null || point.steps === 0
                        ? 'var(--cadence-border-color)'
                        : metGoal
                          ? 'var(--cadence-area-body)'
                          : 'color-mix(in srgb, var(--cadence-area-body) 58%, var(--cadence-bg-card))';

                    return (
                      <g
                        key={point.dateKey}
                        onMouseEnter={() => setHoveredStepKey(point.dateKey)}
                        onMouseLeave={() => setHoveredStepKey(null)}
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
                          rx={Math.min(4, barW / 2)}
                          fill={fill}
                          opacity={isHovered ? 1 : point.steps === null ? 0.45 : 0.92}
                        />
                        {idx % labelEvery === 0 && (
                          <text
                            x={idx * slotW + slotW / 2}
                            y={svgH - 4}
                            textAnchor="middle"
                            fontSize="9.5"
                            fill="var(--cadence-popover-muted)"
                          >
                            {point.shortLabel}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
          </div>

          {/* Walk Minutes Bar Chart */}
          <div className="cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Walk Duration
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  {hoveredWalkPoint
                    ? `${formatReadableDate(hoveredWalkPoint.dateKey)}: ${
                        hoveredWalkPoint.walkMinutes !== null
                          ? `${hoveredWalkPoint.walkMinutes} min`
                          : 'No walk logged'
                      }`
                    : 'Minutes walked per day'}
                </p>
              </div>
              <span className="font-mono tabular-nums text-xs font-semibold text-slate-700 dark:text-slate-300">
                {totalWalkInRange} min total
              </span>
            </div>

            {(() => {
              const svgW = 460;
              const svgH = 156;
              const padTop = 14;
              const padBottom = 22;
              const plotH = svgH - padTop - padBottom;
              const slotW = svgW / chartSeries.length;
              const barW = Math.max(5, Math.min(28, slotW * 0.62));
              const labelEvery = chartRange === 30 ? 5 : 1;

              return (
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full h-40 overflow-visible"
                  role="img"
                  aria-label={`Walk minutes over last ${chartRange} days`}
                >
                  <line
                    x1={0}
                    y1={padTop + plotH}
                    x2={svgW}
                    y2={padTop + plotH}
                    stroke="var(--cadence-border-color)"
                    strokeWidth="1"
                  />

                  {chartSeries.map((point, idx) => {
                    const value = point.walkMinutes ?? 0;
                    const ratio = Math.min(1, value / maxChartWalk);
                    const barH =
                      point.walkMinutes !== null && value > 0
                        ? Math.max(3, ratio * plotH)
                        : 2;
                    const x = idx * slotW + (slotW - barW) / 2;
                    const y = padTop + plotH - barH;
                    const isHovered = hoveredWalkKey === point.dateKey;
                    const fill =
                      point.walkMinutes === null || point.walkMinutes === 0
                        ? 'var(--cadence-border-color)'
                        : 'var(--cadence-area-study)';

                    return (
                      <g
                        key={point.dateKey}
                        onMouseEnter={() => setHoveredWalkKey(point.dateKey)}
                        onMouseLeave={() => setHoveredWalkKey(null)}
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
                          rx={Math.min(4, barW / 2)}
                          fill={fill}
                          opacity={isHovered ? 1 : point.walkMinutes === null ? 0.45 : 0.9}
                        />
                        {idx % labelEvery === 0 && (
                          <text
                            x={idx * slotW + slotW / 2}
                            y={svgH - 4}
                            textAnchor="middle"
                            fontSize="9.5"
                            fill="var(--cadence-popover-muted)"
                          >
                            {point.shortLabel}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Recent Body Logs */}
      <section
        aria-label="Body log history"
        className="cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Recent logs
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any entry to edit its metrics
            </p>
          </div>
          {bodyLogs.length > 0 && (
            <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
              {bodyLogs.length} {bodyLogs.length === 1 ? 'day' : 'days'}
            </span>
          )}
        </div>

        {bodyLogs.length === 0 ? (
          <EmptyStateIllustration
            kind="body"
            title="No body logs recorded yet"
            description="Use the quick log form above to record steps, a walk, sleep, weight, or water."
          />
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {visibleLogs.map((entry) => (
              <div
                key={entry.dateKey}
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                  <span className="font-mono tabular-nums text-xs font-semibold text-slate-800 dark:text-slate-200 w-28 shrink-0">
                    {entry.dateKey}
                  </span>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                    {entry.steps !== undefined && (
                      <span>{entry.steps.toLocaleString()} steps</span>
                    )}
                    {entry.walkMinutes !== undefined && (
                      <span>{entry.walkMinutes}m walk</span>
                    )}
                    {entry.sleepHours !== undefined && (
                      <span>{entry.sleepHours}h sleep</span>
                    )}
                    {entry.weight !== undefined && (
                      <span>{entry.weight} kg</span>
                    )}
                    {entry.waterGlasses !== undefined && (
                      <span>{entry.waterGlasses} glasses</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {entry.source === 'sync' ? 'Sync' : 'Manual'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDateKey(entry.dateKey)}
                    className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteBodyLog(entry.dateKey)}
                    aria-label={`Delete log for ${entry.dateKey}`}
                    className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {bodyLogs.length > 10 && (
              <div className="px-5 py-3 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllLogs((prev) => !prev)}
                  className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                >
                  {showAllLogs ? 'Show recent 10' : `Show all ${bodyLogs.length} logs`}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
