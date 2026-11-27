import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Check,
  Compass,
  Hourglass,
  LayoutGrid,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import { formatDateKey } from '../data/initialData';
import { useCadenceStyle } from '../hooks/useCadenceStyle';
import {
  ChapterColorId,
  ChapterItem,
  CountdownIconId,
  CountdownItem,
  DashboardView,
  DEFAULT_CHAPTER_COLOR,
  LifeProfileSettings,
  MoodRatingRecord,
} from '../types/dashboard';
import {
  CHAPTER_COLOR_OPTIONS,
  computeChapterStatus,
  computeLifeProgressBar,
  COUNTDOWN_ICON_LABELS,
  findOverlappingChapter,
  getChapterColorVar,
  getCountdownDisplay,
  VALID_COUNTDOWN_ICONS,
} from '../utils/lifeUtils';
import { formatShortDateLabel } from '../utils/taskUtils';
import { DoodleHeaderScene } from './DoodleKit';
import { EmptyStateIllustration } from './EmptyStateIllustration';
import { CountdownIcon } from './LifeAreaIcon';
import { LifePosterView } from './LifePosterView';
import { YearInPixelsView } from './YearInPixelsView';

export type ChapterInput = Omit<ChapterItem, 'id' | 'createdAt' | 'updatedAt'>;
export type LifeSubTab = 'poster' | 'year' | 'chapters' | 'countdowns';

const LIFE_SUB_TABS: ReadonlyArray<{
  id: LifeSubTab;
  label: string;
  icon: typeof LayoutGrid;
}> = [
  { id: 'poster', label: 'Poster', icon: LayoutGrid },
  { id: 'year', label: 'Year', icon: CalendarDays },
  { id: 'chapters', label: 'Chapters', icon: Compass },
  { id: 'countdowns', label: 'Countdowns', icon: Timer },
] as const;

interface LifeViewProps {
  lifeProfile: LifeProfileSettings;
  chapters: ChapterItem[];
  countdowns: CountdownItem[];
  moodRatings: MoodRatingRecord[];
  activeSubTab?: LifeSubTab;
  onSelectSubTab?: (tab: LifeSubTab) => void;
  onSetMoodRating: (dateKey: string, rating: number | null) => void;
  onAddChapter: (input: ChapterInput) => { error?: string };
  onUpdateChapter: (id: string, input: ChapterInput) => { error?: string };
  onDeleteChapter: (id: string) => void;
  onAddCountdown: (input: {
    title: string;
    targetDate: string;
    icon: CountdownIconId;
    pinned: boolean;
  }) => void;
  onUpdateCountdown: (
    id: string,
    patch: Partial<Pick<CountdownItem, 'title' | 'targetDate' | 'icon' | 'pinned'>>
  ) => void;
  onTogglePinCountdown: (id: string) => void;
  onDeleteCountdown: (id: string) => void;
  onNavigate: (view: DashboardView) => void;
}

export function LifeView({
  lifeProfile,
  chapters,
  countdowns,
  moodRatings,
  activeSubTab,
  onSelectSubTab,
  onSetMoodRating,
  onAddChapter,
  onUpdateChapter,
  onDeleteChapter,
  onAddCountdown,
  onUpdateCountdown,
  onTogglePinCountdown,
  onDeleteCountdown,
  onNavigate,
}: LifeViewProps) {
  const activeStyle = useCadenceStyle();
  const [internalSubTab, setInternalSubTab] = useState<LifeSubTab>('poster');
  const currentSubTab = activeSubTab ?? internalSubTab;
  const setSubTab = (tab: LifeSubTab) => {
    if (onSelectSubTab) {
      onSelectSubTab(tab);
    } else {
      setInternalSubTab(tab);
    }
  };

  const [now, setNow] = useState(() => new Date());

  // Live update each minute for the Life bar & active chapter days
  useEffect(() => {
    let intervalId: number | undefined;
    const tick = () => setNow(new Date());
    const msUntilNextMinute = Math.max(250, 60_000 - (Date.now() % 60_000));
    const timeoutId = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, 60_000);
    }, msUntilNextMinute);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const todayKey = formatDateKey(now);
  const lifeProgress = useMemo(
    () => computeLifeProgressBar(now, lifeProfile),
    [now, lifeProfile]
  );

  // Chapter state
  const [showNewChapterForm, setShowNewChapterForm] = useState(false);
  const [newChName, setNewChName] = useState('');
  const [newChTheme, setNewChTheme] = useState('');
  const [newChStart, setNewChStart] = useState('');
  const [newChEnd, setNewChEnd] = useState('');
  const [newChColor, setNewChColor] = useState<ChapterColorId>(DEFAULT_CHAPTER_COLOR);
  const [newChGoals, setNewChGoals] = useState<string[]>([]);
  const [newChGoalInput, setNewChGoalInput] = useState('');
  const [newChError, setNewChError] = useState<string | null>(null);

  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editChName, setEditChName] = useState('');
  const [editChTheme, setEditChTheme] = useState('');
  const [editChStart, setEditChStart] = useState('');
  const [editChEnd, setEditChEnd] = useState('');
  const [editChColor, setEditChColor] = useState<ChapterColorId>(DEFAULT_CHAPTER_COLOR);
  const [editChGoals, setEditChGoals] = useState<string[]>([]);
  const [editChGoalInput, setEditChGoalInput] = useState('');
  const [editChError, setEditChError] = useState<string | null>(null);

  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [chapters]);

  const validateChapterForm = (
    id: string | undefined,
    name: string,
    startDate: string,
    endDate: string
  ): string | null => {
    if (!name.trim()) return 'Enter a chapter name.';
    if (!startDate || !endDate) return 'Choose both a start date and an end date.';
    if (endDate < startDate) return 'End date cannot be earlier than the start date.';
    const overlap = findOverlappingChapter(chapters, { id, startDate, endDate });
    if (overlap) {
      return `Dates overlap with "${overlap.name}" (${formatShortDateLabel(
        overlap.startDate
      )} – ${formatShortDateLabel(overlap.endDate)}).`;
    }
    return null;
  };

  const resetNewChapterForm = () => {
    setNewChName('');
    setNewChTheme('');
    setNewChStart('');
    setNewChEnd('');
    setNewChColor(DEFAULT_CHAPTER_COLOR);
    setNewChGoals([]);
    setNewChGoalInput('');
    setNewChError(null);
  };

  const handleAddGoalChip = (
    draft: string,
    list: string[],
    setList: (next: string[]) => void,
    setDraft: (val: string) => void
  ) => {
    const trimmed = draft.trim().slice(0, 80);
    if (!trimmed || list.length >= 10) return;
    if (!list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setDraft('');
  };

  const handleCreateChapter = (e: FormEvent) => {
    e.preventDefault();
    const err = validateChapterForm(undefined, newChName, newChStart, newChEnd);
    if (err) {
      setNewChError(err);
      return;
    }
    const result = onAddChapter({
      name: newChName.trim().slice(0, 120),
      theme: newChTheme.trim().slice(0, 240),
      startDate: newChStart,
      endDate: newChEnd,
      color: newChColor,
      goals: newChGoals,
    });
    if (result.error) {
      setNewChError(result.error);
      return;
    }
    resetNewChapterForm();
    setShowNewChapterForm(false);
  };

  const startEditChapter = (ch: ChapterItem) => {
    setEditingChapterId(ch.id);
    setEditChName(ch.name);
    setEditChTheme(ch.theme);
    setEditChStart(ch.startDate);
    setEditChEnd(ch.endDate);
    setEditChColor(ch.color);
    setEditChGoals(ch.goals);
    setEditChGoalInput('');
    setEditChError(null);
  };

  const handleSaveEditChapter = (e: FormEvent, id: string) => {
    e.preventDefault();
    const err = validateChapterForm(id, editChName, editChStart, editChEnd);
    if (err) {
      setEditChError(err);
      return;
    }
    const result = onUpdateChapter(id, {
      name: editChName.trim().slice(0, 120),
      theme: editChTheme.trim().slice(0, 240),
      startDate: editChStart,
      endDate: editChEnd,
      color: editChColor,
      goals: editChGoals,
    });
    if (result.error) {
      setEditChError(result.error);
      return;
    }
    setEditingChapterId(null);
    setEditChError(null);
  };

  // Countdown state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newIcon, setNewIcon] = useState<CountdownIconId>('Calendar');
  const [newPinned, setNewPinned] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editIcon, setEditIcon] = useState<CountdownIconId>('Calendar');

  const sortedCountdowns = useMemo(() => {
    return [...countdowns].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const dateCmp = a.targetDate.localeCompare(b.targetDate);
      if (dateCmp !== 0) return dateCmp;
      return a.title.localeCompare(b.title);
    });
  }, [countdowns]);

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim().slice(0, 160);
    if (!title || !newDate) return;
    onAddCountdown({
      title,
      targetDate: newDate,
      icon: newIcon,
      pinned: newPinned,
    });
    setNewTitle('');
    setNewDate('');
    setNewIcon('Calendar');
    setNewPinned(false);
  };

  const startEdit = (item: CountdownItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDate(item.targetDate);
    setEditIcon(item.icon);
  };

  const saveEdit = (e: FormEvent, id: string) => {
    e.preventDefault();
    const trimmed = editTitle.trim().slice(0, 160);
    if (!trimmed || !editDate) return;
    onUpdateCountdown(id, {
      title: trimmed,
      targetDate: editDate,
      icon: editIcon,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="editorial-rise editorial-rise-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">DIRECTION</span>
            <span className="editorial-kicker-text">Chapters &amp; Milestones</span>
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Life
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Life horizon, chapters, and countdowns to key milestones
          </p>
        </div>

        {activeStyle === 'doodle' && <DoodleHeaderScene tab={DashboardView.Life} />}
      </div>

      {/* 6) Life Progress Bar at the top of the Life tab */}
      <section
        aria-label="Life progress"
        className="editorial-rise editorial-rise-1 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-4 space-y-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Hourglass className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Life
            </h2>
            <span className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {lifeProgress.percent.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
              {lifeProgress.label}
            </span>
            <button
              type="button"
              onClick={() => onNavigate(DashboardView.Settings)}
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              Edit in Settings
            </button>
          </div>
        </div>

        <div
          className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
          role="progressbar"
          aria-label="Life progress"
          aria-valuenow={Math.round(lifeProgress.percent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-[width] duration-500 ease-out"
            style={{
              width: `${Math.max(lifeProgress.percent > 0 ? 1.5 : 0, Math.min(100, lifeProgress.percent))}%`,
            }}
          />
        </div>
      </section>

      {/* Life Sub-navigation */}
      <nav aria-label="Life sections" className="overflow-x-auto">
        <div
          role="tablist"
          aria-label="Life views"
          className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800"
        >
          {LIFE_SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = currentSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSubTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  selected
                    ? 'bg-white dark:bg-[#121927] text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700/80'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 1) Poster Sub-tab */}
      {currentSubTab === 'poster' && (
        <LifePosterView
          lifeProfile={lifeProfile}
          chapters={chapters}
          now={now}
          onNavigateSettings={() => onNavigate(DashboardView.Settings)}
          onOpenChapters={() => setSubTab('chapters')}
        />
      )}

      {/* 2) Year in Pixels Sub-tab */}
      {currentSubTab === 'year' && (
        <YearInPixelsView
          moodRatings={moodRatings}
          birthDate={lifeProfile.birthDate}
          now={now}
          onSetMoodRating={onSetMoodRating}
        />
      )}

      {/* 5) Chapters Section */}
      {currentSubTab === 'chapters' && (
      <section
        id="life-chapters"
        aria-label="Chapters"
        className="editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Chapters
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Home automatically activates whichever chapter contains today&apos;s date. Date ranges cannot overlap.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'}
            </span>
            <button
              type="button"
              onClick={() => {
                setShowNewChapterForm((prev) => !prev);
                setNewChError(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              {showNewChapterForm ? (
                <>
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Close</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>New chapter</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {showNewChapterForm && (
            <form
              onSubmit={handleCreateChapter}
              className="editorial-subtle-box rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="chapter-new-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Chapter name
                  </label>
                  <input
                    id="chapter-new-name"
                    type="text"
                    maxLength={120}
                    required
                    value={newChName}
                    onChange={(e) => {
                      setNewChName(e.target.value);
                      if (newChError) setNewChError(null);
                    }}
                    placeholder="e.g. Drop Year, First Semester"
                    className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="chapter-new-theme"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Theme line
                  </label>
                  <input
                    id="chapter-new-theme"
                    type="text"
                    maxLength={240}
                    value={newChTheme}
                    onChange={(e) => setNewChTheme(e.target.value)}
                    placeholder="Short intention for this season"
                    className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="chapter-new-start"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Start date
                  </label>
                  <input
                    id="chapter-new-start"
                    type="date"
                    required
                    value={newChStart}
                    onChange={(e) => {
                      setNewChStart(e.target.value);
                      if (newChError) setNewChError(null);
                    }}
                    className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="chapter-new-end"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    End date
                  </label>
                  <input
                    id="chapter-new-end"
                    type="date"
                    required
                    value={newChEnd}
                    onChange={(e) => {
                      setNewChEnd(e.target.value);
                      if (newChError) setNewChError(null);
                    }}
                    className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mr-1">
                  Color:
                </span>
                {CHAPTER_COLOR_OPTIONS.map((opt) => {
                  const selected = newChColor === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setNewChColor(opt.id)}
                      aria-label={opt.label}
                      aria-pressed={selected}
                      title={opt.label}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform ${
                        selected
                          ? 'scale-110 border-slate-900 dark:border-white'
                          : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: opt.colorVar }}
                    >
                      {selected && (
                        <Check className="w-3 h-3 text-white drop-shadow-xs" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Goals (up to 10)
                </p>
                {newChGoals.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {newChGoals.map((goal, idx) => (
                      <span
                        key={`${goal}-${idx}`}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      >
                        <span>{goal}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setNewChGoals((prev) => prev.filter((_, gIdx) => gIdx !== idx))
                          }
                          aria-label={`Remove goal "${goal}"`}
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={80}
                    value={newChGoalInput}
                    onChange={(e) => setNewChGoalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddGoalChip(
                          newChGoalInput,
                          newChGoals,
                          setNewChGoals,
                          setNewChGoalInput
                        );
                      }
                    }}
                    placeholder="Add a chapter goal and press Enter"
                    aria-label="New chapter goal"
                    className="cadence-input flex-1 px-3 py-1.5 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    disabled={!newChGoalInput.trim() || newChGoals.length >= 10}
                    onClick={() =>
                      handleAddGoalChip(
                        newChGoalInput,
                        newChGoals,
                        setNewChGoals,
                        setNewChGoalInput
                      )
                    }
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                  >
                    Add goal
                  </button>
                </div>
              </div>

              {newChError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-rose-200 dark:border-rose-900/70 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{newChError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetNewChapterForm();
                    setShowNewChapterForm(false);
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Save chapter</span>
                </button>
              </div>
            </form>
          )}

          {sortedChapters.length === 0 ? (
            <EmptyStateIllustration
              kind="life"
              title="No chapters yet"
              description="Add a life chapter with a start date, end date, color, and key goals. Today's active chapter will appear automatically on Home."
              action={
                !showNewChapterForm ? (
                  <button
                    type="button"
                    onClick={() => setShowNewChapterForm(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add first chapter</span>
                  </button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-3">
              {sortedChapters.map((ch) => {
                const isActive = ch.startDate <= todayKey && todayKey <= ch.endDate;
                const isPast = ch.endDate < todayKey;
                const status = computeChapterStatus(ch, now);
                const colorVar = getChapterColorVar(ch.color);
                const isEditing = editingChapterId === ch.id;

                if (isEditing) {
                  return (
                    <li
                      key={ch.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4"
                    >
                      <form onSubmit={(e) => handleSaveEditChapter(e, ch.id)} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Chapter name
                            </label>
                            <input
                              type="text"
                              maxLength={120}
                              required
                              value={editChName}
                              onChange={(e) => {
                                setEditChName(e.target.value);
                                if (editChError) setEditChError(null);
                              }}
                              className="cadence-input w-full px-3 py-1.5 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Theme line
                            </label>
                            <input
                              type="text"
                              maxLength={240}
                              value={editChTheme}
                              onChange={(e) => setEditChTheme(e.target.value)}
                              className="cadence-input w-full px-3 py-1.5 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Start date
                            </label>
                            <input
                              type="date"
                              required
                              value={editChStart}
                              onChange={(e) => {
                                setEditChStart(e.target.value);
                                if (editChError) setEditChError(null);
                              }}
                              className="cadence-input w-full px-3 py-1.5 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              End date
                            </label>
                            <input
                              type="date"
                              required
                              value={editChEnd}
                              onChange={(e) => {
                                setEditChEnd(e.target.value);
                                if (editChError) setEditChError(null);
                              }}
                              className="cadence-input w-full px-3 py-1.5 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mr-1">
                            Color:
                          </span>
                          {CHAPTER_COLOR_OPTIONS.map((opt) => {
                            const selected = editChColor === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setEditChColor(opt.id)}
                                aria-label={opt.label}
                                aria-pressed={selected}
                                title={opt.label}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform ${
                                  selected
                                    ? 'scale-110 border-slate-900 dark:border-white'
                                    : 'border-transparent opacity-80 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: opt.colorVar }}
                              >
                                {selected && (
                                  <Check className="w-3 h-3 text-white drop-shadow-xs" aria-hidden="true" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div className="space-y-2">
                          {editChGoals.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {editChGoals.map((goal, idx) => (
                                <span
                                  key={`${goal}-${idx}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                                >
                                  <span>{goal}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditChGoals((prev) =>
                                        prev.filter((_, gIdx) => gIdx !== idx)
                                      )
                                    }
                                    aria-label={`Remove goal "${goal}"`}
                                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={80}
                              value={editChGoalInput}
                              onChange={(e) => setEditChGoalInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddGoalChip(
                                    editChGoalInput,
                                    editChGoals,
                                    setEditChGoals,
                                    setEditChGoalInput
                                  );
                                }
                              }}
                              placeholder="Add a chapter goal"
                              aria-label="Edit chapter goal"
                              className="cadence-input flex-1 px-3 py-1.5 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              disabled={!editChGoalInput.trim() || editChGoals.length >= 10}
                              onClick={() =>
                                handleAddGoalChip(
                                  editChGoalInput,
                                  editChGoals,
                                  setEditChGoals,
                                  setEditChGoalInput
                                )
                              }
                              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                            >
                              Add goal
                            </button>
                          </div>
                        </div>

                        {editChError && (
                          <div
                            role="alert"
                            className="flex items-start gap-2 rounded-lg border border-rose-200 dark:border-rose-900/70 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
                          >
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                            <span>{editChError}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingChapterId(null);
                              setEditChError(null);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Save</span>
                          </button>
                        </div>
                      </form>
                    </li>
                  );
                }

                return (
                  <li
                    key={ch.id}
                    className={`rounded-xl border p-4 space-y-3 ${
                      isActive
                        ? 'border-blue-300 dark:border-blue-800/70 bg-blue-50/30 dark:bg-blue-950/15'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: colorVar }}
                            aria-hidden="true"
                          />
                          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                            {ch.name}
                          </h3>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-600 text-white dark:bg-blue-500">
                              Active today
                            </span>
                          )}
                          {!isActive && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              {isPast ? 'Completed' : 'Upcoming'}
                            </span>
                          )}
                        </div>

                        {ch.theme && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {ch.theme}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 pt-0.5">
                          <span>
                            {formatShortDateLabel(ch.startDate)} –{' '}
                            {formatShortDateLabel(ch.endDate)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{status.dayLabel}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditChapter(ch)}
                          title="Edit chapter"
                          aria-label={`Edit "${ch.name}"`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteChapter(ch.id)}
                          title="Delete chapter"
                          aria-label={`Delete "${ch.name}"`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    {isActive && status.progressPercent !== null && (
                      <div
                        className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full rounded-full transition-[width] duration-500 ease-out"
                          style={{
                            width: `${Math.max(status.progressPercent > 0 ? 2 : 0, Math.min(100, status.progressPercent))}%`,
                            backgroundColor: colorVar,
                          }}
                        />
                      </div>
                    )}

                    {ch.goals.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {ch.goals.map((goal, idx) => (
                          <span
                            key={`${goal}-${idx}`}
                            className="editorial-subtle-box inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80"
                          >
                            {goal}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
      )}

      {/* Countdowns Section */}
      {currentSubTab === 'countdowns' && (
      <section
        aria-label="Countdowns"
        className="editorial-rise editorial-rise-3 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Countdowns
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pin one countdown to your chapter card. Your 2 nearest other upcoming countdowns appear in Next up on Home.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {countdowns.length} {countdowns.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Add Countdown Form */}
          <form
            onSubmit={handleCreate}
            className="editorial-subtle-box rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-4 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <label
                  htmlFor="countdown-new-title"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Title
                </label>
                <input
                  id="countdown-new-title"
                  type="text"
                  maxLength={160}
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Final exam, Marathon, Launch day"
                  className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-4">
                <label
                  htmlFor="countdown-new-date"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Date
                </label>
                <input
                  id="countdown-new-date"
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={!newTitle.trim() || !newDate}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Countdown icon">
                <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Icon:</span>
                {VALID_COUNTDOWN_ICONS.map((iconId) => {
                  const selected = newIcon === iconId;
                  return (
                    <button
                      key={iconId}
                      type="button"
                      onClick={() => setNewIcon(iconId)}
                      title={COUNTDOWN_ICON_LABELS[iconId]}
                      aria-label={COUNTDOWN_ICON_LABELS[iconId]}
                      aria-pressed={selected}
                      className={`p-1.5 rounded-md border transition-colors ${
                        selected
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <CountdownIcon icon={iconId} className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newPinned}
                  onChange={(e) => setNewPinned(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-600"
                />
                <span>Pin to chapter card</span>
              </label>
            </div>
          </form>

          {/* Countdown List or Empty State */}
          {sortedCountdowns.length === 0 ? (
            <EmptyStateIllustration
              kind="life"
              title="No countdowns yet"
              description="Add key dates above to pin your primary milestone in the chapter card and preview the next two on Home."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800">
              {sortedCountdowns.map((item) => {
                const display = getCountdownDisplay(item.targetDate, now);
                const isEditing = editingId === item.id;

                if (isEditing) {
                  return (
                    <li key={item.id} className="p-4 bg-slate-50/70 dark:bg-slate-900/40">
                      <form onSubmit={(e) => saveEdit(e, item.id)} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <input
                            type="text"
                            maxLength={160}
                            required
                            aria-label="Edit countdown title"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="sm:col-span-6 cadence-input px-3 py-1.5 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                          />
                          <input
                            type="date"
                            required
                            aria-label="Edit countdown date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="sm:col-span-4 cadence-input px-3 py-1.5 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                          />
                          <div className="sm:col-span-2 flex items-center gap-1.5 justify-end">
                            <button
                              type="submit"
                              aria-label="Save countdown"
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              aria-label="Cancel editing"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                            >
                              <X className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {VALID_COUNTDOWN_ICONS.map((iconId) => (
                            <button
                              key={iconId}
                              type="button"
                              onClick={() => setEditIcon(iconId)}
                              title={COUNTDOWN_ICON_LABELS[iconId]}
                              aria-label={COUNTDOWN_ICON_LABELS[iconId]}
                              aria-pressed={editIcon === iconId}
                              className={`p-1.5 rounded-md border transition-colors ${
                                editIcon === iconId
                                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              <CountdownIcon icon={iconId} className="w-3.5 h-3.5" />
                            </button>
                          ))}
                        </div>
                      </form>
                    </li>
                  );
                }

                return (
                  <li
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 ${
                          item.pinned
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                            : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <CountdownIcon icon={item.icon} className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {item.title}
                          </p>
                          {item.pinned && (
                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                              Pinned
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                          <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>{formatShortDateLabel(item.targetDate)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{display.detailLabel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                      <span className="font-mono text-xs font-semibold tabular-nums px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                        {display.shortBadge}
                      </span>

                      <button
                        type="button"
                        onClick={() => onTogglePinCountdown(item.id)}
                        title={item.pinned ? 'Unpin from chapter card' : 'Pin to chapter card'}
                        aria-label={
                          item.pinned
                            ? `Unpin "${item.title}" from chapter card`
                            : `Pin "${item.title}" to chapter card`
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          item.pinned
                            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60'
                            : 'text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {item.pinned ? (
                          <PinOff className="w-4 h-4" aria-hidden="true" />
                        ) : (
                          <Pin className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        title="Edit countdown"
                        aria-label={`Edit "${item.title}"`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteCountdown(item.id)}
                        title="Delete countdown"
                        aria-label={`Delete "${item.title}"`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Birthdays will appear alongside countdowns in a future update.
          </p>
        </div>
      </section>
      )}
    </div>
  );
}
