import { FormEvent, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  Flame,
  Link2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Type,
} from 'lucide-react';
import { getTodayKey } from '../data/initialData';
import { useCadenceStyle } from '../hooks/useCadenceStyle';
import { JournalFetchError } from '../services/googleDocsJournal';
import {
  DashboardView,
  JournalDayStat,
  JournalDocConnection,
  JournalLiveEntry,
} from '../types/dashboard';
import {
  buildGoogleDocUrl,
  buildJournalMonthlyWords,
  buildJournalYearHeatmap,
  computeJournalSummaryStats,
  extractGoogleDocId,
  findOnThisDayEntries,
  resolveTodayJournalUrl,
} from '../utils/journalDocUtils';
import { formatShortDateLabel } from '../utils/taskUtils';
import { DoodleHeaderScene } from './DoodleKit';
import { EmptyStateIllustration } from './EmptyStateIllustration';

interface JournalViewProps {
  connectedDocs: JournalDocConnection[];
  journalStats: JournalDayStat[];
  liveEntries: Record<string, JournalLiveEntry>;
  monthTabIdsByYear: Record<number, Record<number, string>>;
  isRefreshing: boolean;
  syncError: JournalFetchError | null;
  lastRefreshedAt: string | null;
  hasGoogleToken: boolean;
  isSigningIn: boolean;
  onReconnectGoogle: () => void;
  onRefresh: () => void;
  onConnectDoc: (year: number, input: string) => Promise<{ error?: string }>;
  onDisconnectDoc: (year: number) => void;
}

const HEATMAP_LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'var(--cadence-mood-empty)',
  1: 'color-mix(in oklab, var(--cadence-bg-card) 72%, var(--cadence-area-mind) 28%)',
  2: 'color-mix(in oklab, var(--cadence-bg-card) 48%, var(--cadence-area-mind) 52%)',
  3: 'color-mix(in oklab, var(--cadence-bg-card) 24%, var(--cadence-area-mind) 76%)',
  4: 'var(--cadence-area-mind)',
};

const WEEKDAY_ROW_LABELS: Array<{ row: number; label: string }> = [
  { row: 0, label: 'Mon' },
  { row: 2, label: 'Wed' },
  { row: 4, label: 'Fri' },
];

export function JournalView({
  connectedDocs,
  journalStats,
  liveEntries,
  monthTabIdsByYear,
  isRefreshing,
  syncError,
  lastRefreshedAt,
  hasGoogleToken,
  isSigningIn,
  onReconnectGoogle,
  onRefresh,
  onConnectDoc,
  onDisconnectDoc,
}: JournalViewProps) {
  const activeStyle = useCadenceStyle();
  const todayKey = getTodayKey();
  const now = useMemo(() => new Date(), [todayKey]);
  const currentYear = now.getFullYear();

  const availableYears = useMemo(() => {
    const yearSet = new Set<number>([currentYear]);
    for (const d of connectedDocs) yearSet.add(d.year);
    for (const s of journalStats) yearSet.add(s.year);
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [currentYear, connectedDocs, journalStats]);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [hoveredCellDate, setHoveredCellDate] = useState<string | null>(null);
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  const [formYear, setFormYear] = useState<number>(currentYear);
  const [formInput, setFormInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [confirmRemoveYear, setConfirmRemoveYear] = useState<number | null>(null);

  const connectInputRef = useRef<HTMLInputElement | null>(null);

  const activeYear = availableYears.includes(selectedYear) ? selectedYear : currentYear;

  const summary = useMemo(
    () => computeJournalSummaryStats(journalStats, activeYear, now),
    [journalStats, activeYear, now]
  );

  const heatmap = useMemo(
    () => buildJournalYearHeatmap(journalStats, activeYear, now),
    [journalStats, activeYear, now]
  );

  const monthlyBars = useMemo(
    () => buildJournalMonthlyWords(journalStats, activeYear),
    [journalStats, activeYear]
  );

  const onThisDayMemories = useMemo(
    () => findOnThisDayEntries(todayKey, connectedDocs, journalStats, liveEntries),
    [todayKey, connectedDocs, journalStats, liveEntries]
  );

  const currentYearDoc = useMemo(
    () => connectedDocs.find((d) => d.year === currentYear) ?? null,
    [connectedDocs, currentYear]
  );

  const todayStat = useMemo(
    () => journalStats.find((s) => s.dateKey === todayKey) ?? null,
    [journalStats, todayKey]
  );

  const todayWritten = Boolean(todayStat && todayStat.words >= 1);

  const todayDocUrl = useMemo(
    () => resolveTodayJournalUrl(todayKey, connectedDocs, journalStats, monthTabIdsByYear),
    [todayKey, connectedDocs, journalStats, monthTabIdsByYear]
  );

  const hoveredCell = useMemo(() => {
    if (!hoveredCellDate) return null;
    for (const col of heatmap.weeks) {
      for (const cell of col) {
        if (cell && cell.dateKey === hoveredCellDate) return cell;
      }
    }
    return null;
  }, [heatmap.weeks, hoveredCellDate]);

  const hoveredMonth = useMemo(
    () =>
      hoveredMonthIndex !== null
        ? monthlyBars.find((m) => m.monthIndex === hoveredMonthIndex) ?? null
        : null,
    [monthlyBars, hoveredMonthIndex]
  );

  const maxMonthlyWords = useMemo(
    () => Math.max(500, ...monthlyBars.map((m) => m.words)),
    [monthlyBars]
  );

  const formattedToday = useMemo(
    () =>
      now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    [now]
  );

  const formattedLastSync = useMemo(() => {
    if (!lastRefreshedAt) return null;
    const d = new Date(lastRefreshedAt);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [lastRefreshedAt]);

  const needsReconnect =
    syncError?.kind === 'missing_token' ||
    syncError?.kind === 'expired_token' ||
    syncError?.kind === 'missing_scope' ||
    (connectedDocs.length > 0 && !hasGoogleToken);

  const handleConnectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsedId = extractGoogleDocId(formInput);
    if (!parsedId) {
      setFormError('Paste a valid Google Docs link (docs.google.com/document/d/...) or document ID.');
      return;
    }
    if (!Number.isInteger(formYear) || formYear < 1900 || formYear > 2200) {
      setFormError('Enter a valid 4-digit year between 1900 and 2200.');
      return;
    }

    setIsConnecting(true);
    try {
      const res = await onConnectDoc(formYear, formInput);
      if (res.error) {
        setFormError(res.error);
      } else {
        setFormInput('');
        setSelectedYear(formYear);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const scrollToConnect = () => {
    setFormYear(currentYear);
    connectInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => connectInputRef.current?.focus(), 200);
  };

  const statCards = [
    {
      label: 'Entries written',
      value: summary.entriesWritten.toLocaleString(),
      sub: `${activeYear} days logged`,
      icon: BookOpen,
      accentVar: 'var(--cadence-area-mind)',
    },
    {
      label: 'Total words',
      value: summary.totalWords.toLocaleString(),
      sub: `In ${activeYear}`,
      icon: FileText,
      accentVar: 'var(--cadence-area-study)',
    },
    {
      label: 'Total letters',
      value: summary.totalLetters.toLocaleString(),
      sub: 'Alphabetic characters',
      icon: Type,
      accentVar: 'var(--cadence-area-skills)',
    },
    {
      label: 'Current streak',
      value: `${summary.currentStreak}d`,
      sub: summary.currentStreak > 0 ? 'Consecutive days' : 'Start today',
      icon: Flame,
      accentVar: 'var(--cadence-area-people)',
    },
    {
      label: 'Longest streak',
      value: `${summary.longestStreak}d`,
      sub: 'Best consecutive run',
      icon: Trophy,
      accentVar: 'var(--cadence-area-body)',
    },
    {
      label: 'Avg words / entry',
      value: summary.entriesWritten > 0 ? summary.averageWords.toLocaleString() : '—',
      sub: summary.entriesWritten > 0 ? `${summary.entriesWritten} entries` : 'No entries yet',
      icon: Sparkles,
      accentVar: 'var(--cadence-area-projects)',
    },
  ];

  const cellSize = 11;
  const cellGap = 3;
  const step = cellSize + cellGap;
  const leftLabelW = 28;
  const topLabelH = 18;
  const heatmapWidth = leftLabelW + heatmap.weeks.length * step;
  const heatmapHeight = topLabelH + 7 * step;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="editorial-rise editorial-rise-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">EDITION</span>
            <span className="editorial-kicker-text">Reflection</span>
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Journal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Read-only writing telemetry &amp; memories from your yearly Google Docs journals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {formattedLastSync && (
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Synced {formattedLastSync}
            </span>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing || connectedDocs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121927] text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          {activeStyle === 'doodle' && <DoodleHeaderScene tab={DashboardView.Journal} />}
        </div>
      </div>

      {/* Scope / Token / API / Doc Error Callout */}
      {(needsReconnect || syncError) && (
        <section
          role="alert"
          className="cadence-card bg-white dark:bg-[#121927] border border-amber-300/80 dark:border-amber-700/60 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3 min-w-0">
            <span
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--cadence-area-people) 14%, transparent)',
                color: 'var(--cadence-area-people)',
              }}
            >
              <AlertTriangle className="w-4.5 h-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {syncError?.kind === 'api_disabled'
                  ? 'Google Docs API is disabled'
                  : syncError?.kind === 'not_found'
                    ? 'Google Doc could not be found'
                    : needsReconnect
                      ? 'Reconnect Google to read your journal'
                      : 'Unable to refresh journal right now'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {syncError?.message ??
                  'Your Google access token is missing or expired. Reconnect Google with read-only Docs permission to sync stats and live memories.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {needsReconnect ? (
              <button
                type="button"
                onClick={onReconnectGoogle}
                disabled={isSigningIn}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSigningIn ? 'animate-spin' : ''}`} aria-hidden="true" />
                <span>{isSigningIn ? 'Connecting…' : 'Reconnect Google'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Today Box */}
      <section
        aria-label="Today's journal status"
        className="editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-800"
            style={{
              backgroundColor: todayWritten
                ? 'color-mix(in srgb, var(--cadence-area-body) 14%, transparent)'
                : 'color-mix(in srgb, var(--cadence-area-mind) 12%, transparent)',
              color: todayWritten ? 'var(--cadence-area-body)' : 'var(--cadence-area-mind)',
            }}
          >
            {todayWritten ? (
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            ) : (
              <BookOpen className="w-5 h-5" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Today · {formattedToday}
              </h2>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium"
                style={{
                  backgroundColor: todayWritten
                    ? 'color-mix(in srgb, var(--cadence-area-body) 14%, transparent)'
                    : 'var(--cadence-mood-empty)',
                  color: todayWritten
                    ? 'var(--cadence-area-body)'
                    : 'var(--cadence-popover-muted)',
                }}
              >
                {todayWritten ? 'Written today' : 'Not written yet'}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
              {todayStat && todayStat.words > 0
                ? `${todayStat.words.toLocaleString()} ${
                    todayStat.words === 1 ? 'word' : 'words'
                  } · ${todayStat.letters.toLocaleString()} letters · ${
                    todayStat.paragraphs
                  } ${todayStat.paragraphs === 1 ? 'paragraph' : 'paragraphs'}`
                : currentYearDoc
                  ? `0 words recorded for ${formatShortDateLabel(todayKey)} in ${currentYearDoc.docTitle || `Journal ${currentYear}`}`
                  : `Connect your ${currentYear} Google Doc below to track today's writing`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {todayDocUrl ? (
            <a
              href={todayDocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              <span>Open in Docs</span>
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            </a>
          ) : (
            <button
              type="button"
              onClick={scrollToConnect}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Connect {currentYear} Doc</span>
            </button>
          )}
        </div>
      </section>

      {/* Top Row of 6 Small Stat Cards */}
      <section aria-label="Journal summary metrics" className="editorial-rise editorial-rise-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    {card.label}
                  </span>
                  <span
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${card.accentVar} 14%, transparent)`,
                      color: card.accentVar,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                </div>
                <div>
                  <p className="font-mono text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100 leading-tight">
                    {card.value}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {card.sub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Year Heatmap Grid */}
      <section
        aria-label="Journal writing heatmap"
        className="editorial-rise editorial-rise-3 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Writing year · {activeYear}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
              {hoveredCell
                ? hoveredCell.status === 'future'
                  ? `${formatShortDateLabel(hoveredCell.dateKey)} — Upcoming`
                  : hoveredCell.words > 0
                    ? `${formatShortDateLabel(hoveredCell.dateKey)} — ${hoveredCell.words.toLocaleString()} words`
                    : `${formatShortDateLabel(hoveredCell.dateKey)} — No entry`
                : `${summary.entriesWritten} entries · ${summary.totalWords.toLocaleString()} words in ${activeYear}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {availableYears.length > 1 && (
              <div
                role="group"
                aria-label="Select journal year"
                className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100/70 dark:bg-slate-800/70"
              >
                {availableYears.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setSelectedYear(yr);
                      setHoveredCellDate(null);
                      setHoveredMonthIndex(null);
                    }}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                      yr === activeYear
                        ? 'bg-white dark:bg-[#121927] text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Less</span>
              {([0, 1, 2, 3, 4] as const).map((lvl) => (
                <span
                  key={lvl}
                  className="w-2.5 h-2.5 rounded-[2px] inline-block"
                  style={{ backgroundColor: HEATMAP_LEVEL_COLORS[lvl] }}
                  aria-hidden="true"
                />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <svg
            viewBox={`0 0 ${heatmapWidth} ${heatmapHeight}`}
            className="w-full min-w-[660px] h-auto select-none"
            role="img"
            aria-label={`${activeYear} journal activity heatmap`}
          >
            {/* Month labels */}
            {heatmap.monthLabels.map((m) => (
              <text
                key={m.monthIndex}
                x={leftLabelW + m.colIndex * step}
                y={11}
                fontSize="10"
                fill="var(--cadence-popover-muted)"
              >
                {m.label}
              </text>
            ))}

            {/* Weekday labels */}
            {WEEKDAY_ROW_LABELS.map((w) => (
              <text
                key={w.label}
                x={0}
                y={topLabelH + w.row * step + cellSize - 2}
                fontSize="9.5"
                fill="var(--cadence-popover-muted)"
              >
                {w.label}
              </text>
            ))}

            {/* Daily cells */}
            {heatmap.weeks.map((weekCol, colIdx) =>
              weekCol.map((cell, rowIdx) => {
                if (!cell) return null;
                const x = leftLabelW + colIdx * step;
                const y = topLabelH + rowIdx * step;
                const isFuture = cell.status === 'future';
                const isHovered = hoveredCellDate === cell.dateKey;
                const tooltip = isFuture
                  ? `${cell.dateKey}: Upcoming`
                  : cell.words > 0
                    ? `${cell.dateKey}: ${cell.words.toLocaleString()} words`
                    : `${cell.dateKey}: No entry`;

                return (
                  <rect
                    key={cell.dateKey}
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    rx={2.5}
                    fill={isFuture ? 'transparent' : HEATMAP_LEVEL_COLORS[cell.level]}
                    stroke={
                      isHovered
                        ? 'var(--cadence-area-mind)'
                        : isFuture
                          ? 'var(--cadence-mood-future-stroke)'
                          : cell.status === 'today'
                            ? 'var(--cadence-area-mind)'
                            : 'transparent'
                    }
                    strokeWidth={isHovered || cell.status === 'today' ? 1.4 : isFuture ? 1 : 0}
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={() => setHoveredCellDate(cell.dateKey)}
                    onMouseLeave={() => setHoveredCellDate(null)}
                  >
                    <title>{tooltip}</title>
                  </rect>
                );
              })
            )}
          </svg>
        </div>
      </section>

      {/* Monthly Bar Chart + On This Day */}
      <div className="editorial-rise editorial-rise-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Monthly Words Bar Chart */}
        <section
          aria-label="Words per month"
          className="lg:col-span-7 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Words per month · {activeYear}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                {hoveredMonth
                  ? `${hoveredMonth.fullLabel} ${activeYear}: ${hoveredMonth.words.toLocaleString()} words across ${
                      hoveredMonth.entries
                    } ${hoveredMonth.entries === 1 ? 'entry' : 'entries'}`
                  : `Total ${summary.totalWords.toLocaleString()} words written across ${summary.entriesWritten} days`}
              </p>
            </div>
          </div>

          {(() => {
            const svgW = 540;
            const svgH = 190;
            const padTop = 16;
            const padBottom = 26;
            const plotH = svgH - padTop - padBottom;
            const slotW = svgW / 12;
            const barW = Math.min(28, slotW * 0.58);

            return (
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full h-48 overflow-visible"
                role="img"
                aria-label={`Monthly journal word count for ${activeYear}`}
              >
                <line
                  x1={0}
                  y1={padTop + plotH}
                  x2={svgW}
                  y2={padTop + plotH}
                  stroke="var(--cadence-border-color)"
                  strokeWidth="1"
                />

                {monthlyBars.map((m) => {
                  const ratio = m.words / maxMonthlyWords;
                  const barH = m.words > 0 ? Math.max(4, ratio * plotH) : 2;
                  const x = m.monthIndex * slotW + (slotW - barW) / 2;
                  const y = padTop + plotH - barH;
                  const isHovered = hoveredMonthIndex === m.monthIndex;

                  return (
                    <g
                      key={m.label}
                      onMouseEnter={() => setHoveredMonthIndex(m.monthIndex)}
                      onMouseLeave={() => setHoveredMonthIndex(null)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={m.monthIndex * slotW}
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
                        rx={4}
                        fill={
                          m.words === 0
                            ? 'var(--cadence-border-color)'
                            : 'var(--cadence-area-mind)'
                        }
                        opacity={isHovered ? 1 : m.words === 0 ? 0.45 : 0.88}
                      />
                      <text
                        x={m.monthIndex * slotW + slotW / 2}
                        y={svgH - 6}
                        textAnchor="middle"
                        fontSize="10.5"
                        fill="var(--cadence-popover-muted)"
                      >
                        {m.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            );
          })()}
        </section>

        {/* On This Day */}
        <section
          aria-label="On this day in previous years"
          className="lg:col-span-5 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                On this day
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {formatShortDateLabel(todayKey)} in previous connected years
              </p>
            </div>
            <CalendarDays className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </div>

          <div className="p-5">
            {onThisDayMemories.length === 0 ? (
              <EmptyStateIllustration
                kind="journal"
                compact
                title="No past entries on this date yet"
                description="Connect earlier years' journal docs below to revisit what you wrote on this day in past years."
              />
            ) : (
              <ul className="space-y-3">
                {onThisDayMemories.map((mem) => (
                  <li
                    key={mem.dateKey}
                    className="editorial-subtle-box rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md"
                          style={{
                            backgroundColor:
                              'color-mix(in srgb, var(--cadence-area-mind) 14%, transparent)',
                            color: 'var(--cadence-area-mind)',
                          }}
                        >
                          {mem.year}
                        </span>
                        <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {mem.words.toLocaleString()} words
                        </span>
                      </div>

                      <a
                        href={mem.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                      >
                        <span>Open in Docs</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>

                    {mem.snippet ? (
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {mem.snippet}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        {needsReconnect
                          ? 'Reconnect Google or refresh to read live preview.'
                          : 'Click Refresh to load live preview from Google Docs.'}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Connect Journal Section */}
      <section
        aria-label="Connect Google Doc journals"
        className="editorial-rise editorial-rise-4 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Connect journal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Link one Google Doc per year (each month as a document tab, each day as a heading like &ldquo;Nov 22&rdquo;).
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>Read-only · Entry text is never stored</span>
          </div>
        </div>

        <form onSubmit={handleConnectSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
          <div className="sm:col-span-2">
            <label
              htmlFor="journal-year-input"
              className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
            >
              Year
            </label>
            <input
              id="journal-year-input"
              type="number"
              min={1900}
              max={2200}
              value={formYear}
              onChange={(e) => setFormYear(Number(e.target.value))}
              className="cadence-input w-full px-3 py-2 text-sm font-mono tabular-nums"
              required
            />
          </div>

          <div className="sm:col-span-8">
            <label
              htmlFor="journal-doc-link-input"
              className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1"
            >
              Google Doc link or document ID
            </label>
            <input
              ref={connectInputRef}
              id="journal-doc-link-input"
              type="text"
              value={formInput}
              onChange={(e) => {
                setFormInput(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="https://docs.google.com/document/d/.../edit"
              className="cadence-input w-full px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-2 sm:pt-5">
            <button
              type="submit"
              disabled={isConnecting || !formInput.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isConnecting ? 'Linking…' : 'Connect'}</span>
            </button>
          </div>
        </form>

        {formError && (
          <p className="text-xs text-rose-600 dark:text-rose-400">{formError}</p>
        )}

        {connectedDocs.length === 0 ? (
          <div className="editorial-subtle-box rounded-lg border border-dashed border-slate-200 dark:border-slate-800 px-4 py-5 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No Google Docs connected yet. Paste your {currentYear} journal link above to begin.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-800">
            {connectedDocs.map((docConn) => {
              const yearEntries = journalStats.filter(
                (s) => s.year === docConn.year && s.words > 0
              ).length;
              const isConfirming = confirmRemoveYear === docConn.year;
              const openUrl = buildGoogleDocUrl(docConn.docId);

              return (
                <li
                  key={docConn.year}
                  className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {docConn.year}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {docConn.docTitle || `Journal ${docConn.year}`}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {yearEntries} {yearEntries === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate">
                      ID: {docConn.docId}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={openUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                      <span>Open</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>

                    {isConfirming ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onDisconnectDoc(docConn.year);
                            setConfirmRemoveYear(null);
                          }}
                          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 transition-colors"
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveYear(null)}
                          className="px-2 py-1.5 rounded-md text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveYear(docConn.year)}
                        aria-label={`Disconnect ${docConn.year} journal`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
