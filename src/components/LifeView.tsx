import { FormEvent, useMemo, useState } from 'react';
import { Calendar, Check, Pencil, Pin, PinOff, Plus, Trash2, X } from 'lucide-react';
import { useCadenceStyle } from '../hooks/useCadenceStyle';
import { CountdownIconId, CountdownItem, DashboardView } from '../types/dashboard';
import {
  COUNTDOWN_ICON_LABELS,
  getCountdownDisplay,
  VALID_COUNTDOWN_ICONS,
} from '../utils/lifeUtils';
import { formatShortDateLabel } from '../utils/taskUtils';
import { DoodleHeaderScene } from './DoodleKit';
import { EmptyStateIllustration } from './EmptyStateIllustration';
import { CountdownIcon } from './LifeAreaIcon';

interface LifeViewProps {
  countdowns: CountdownItem[];
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
}

export function LifeView({
  countdowns,
  onAddCountdown,
  onUpdateCountdown,
  onTogglePinCountdown,
  onDeleteCountdown,
}: LifeViewProps) {
  const activeStyle = useCadenceStyle();

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
            Countdowns to exams, launches, trips, and important milestones
          </p>
        </div>

        {activeStyle === 'doodle' && <DoodleHeaderScene tab={DashboardView.Life} />}
      </div>

      {/* Countdowns Section */}
      <section
        aria-label="Countdowns"
        className="editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Countdowns
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pin one countdown to your chapter banner. Your 2 nearest other upcoming countdowns appear in Next up on Home.
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
                <span>Pin to chapter banner</span>
              </label>
            </div>
          </form>

          {/* Countdown List or Empty State */}
          {sortedCountdowns.length === 0 ? (
            <EmptyStateIllustration
              kind="life"
              title="No countdowns yet"
              description="Add key dates above to pin your primary milestone in the chapter banner and preview the next two on Home."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800">
              {sortedCountdowns.map((item) => {
                const display = getCountdownDisplay(item.targetDate);
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
                        title={item.pinned ? 'Unpin from chapter banner' : 'Pin to chapter banner'}
                        aria-label={
                          item.pinned
                            ? `Unpin "${item.title}" from chapter banner`
                            : `Pin "${item.title}" to chapter banner`
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
    </div>
  );
}
