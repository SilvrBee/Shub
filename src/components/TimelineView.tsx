import { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { TimelineEvent } from '../types/dashboard';
import { sanitizeExternalUrl } from '../services/googleWorkspace';

interface TimelineViewProps {
  events: TimelineEvent[];
  onCreateEvent: (item: {
    title: string;
    description: string;
    eventDate: string;
    category?: string;
    docUrl?: string;
  }) => void;
  onUpdateEvent: (id: string, patch: Partial<TimelineEvent>) => void;
  onDeleteEvent: (id: string) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-');
  const monthIdx = Number(m) - 1;
  if (!y || Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    return yearMonth;
  }
  return `${MONTH_NAMES[monthIdx]} ${y}`;
}

export function TimelineView({
  events,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
}: TimelineViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newCategory, setNewCategory] = useState('Milestone');
  const [newDescription, setNewDescription] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  const pendingEvents = useMemo(
    () =>
      events
        .filter((e) => e.status === 'pending')
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
    [events]
  );

  const approvedEvents = useMemo(
    () =>
      events
        .filter((e) => e.status === 'approved')
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
    [events]
  );

  const groupedByYearAndMonth = useMemo(() => {
    const years = new Map<string, Map<string, TimelineEvent[]>>();
    for (const ev of approvedEvents) {
      const datePart = ev.eventDate || 'Unknown';
      const year = /^\d{4}/.test(datePart) ? datePart.slice(0, 4) : 'Undated';
      const yearMonth = /^\d{4}-\d{2}/.test(datePart) ? datePart.slice(0, 7) : `${year}-00`;
      if (!years.has(year)) {
        years.set(year, new Map());
      }
      const months = years.get(year)!;
      if (!months.has(yearMonth)) {
        months.set(yearMonth, []);
      }
      months.get(yearMonth)!.push(ev);
    }

    return Array.from(years.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([year, monthsMap]) => ({
        year,
        months: Array.from(monthsMap.entries()).sort(([a], [b]) => b.localeCompare(a)),
      }));
  }, [approvedEvents]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;
    onCreateEvent({
      title: newTitle.trim(),
      description: newDescription.trim(),
      eventDate: newDate || new Date().toISOString().slice(0, 10),
      category: newCategory.trim() || 'Milestone',
    });
    setNewTitle('');
    setNewDescription('');
    setNewCategory('Milestone');
    setShowAddForm(false);
  };

  const startEdit = (ev: TimelineEvent) => {
    setEditingId(ev.id);
    setEditTitle(ev.title);
    setEditDate(ev.eventDate);
    setEditCategory(ev.category || '');
    setEditDescription(ev.description);
  };

  const saveEdit = (ev: TimelineEvent, alsoApprove = false) => {
    if (!editTitle.trim() || !editDescription.trim()) return;
    onUpdateEvent(ev.id, {
      title: editTitle.trim(),
      eventDate: editDate.trim() || ev.eventDate,
      category: editCategory.trim() || undefined,
      description: editDescription.trim(),
      ...(alsoApprove ? { status: 'approved' as const } : {}),
    });
    setEditingId(null);
  };

  const toggleMonth = (key: string) => {
    setCollapsedMonths((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Personal Timeline
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {approvedEvents.length} {approvedEvents.length === 1 ? 'milestone' : 'milestones'} recorded across{' '}
            {groupedByYearAndMonth.length} {groupedByYearAndMonth.length === 1 ? 'year' : 'years'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Milestone</span>
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleCreateSubmit}
          className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            New Timeline Milestone
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Milestone title *"
              className="sm:col-span-2 px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
            />
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="px-3.5 py-2 rounded-lg text-sm font-mono bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
            />
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category (e.g., Career, Travel)"
              className="px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
            />
          </div>
          <textarea
            rows={3}
            required
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Describe this moment, decision, or turning point..."
            className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Milestone</span>
            </button>
          </div>
        </form>
      )}

      {/* Pending Milestone Candidates */}
      {pendingEvents.length > 0 && (
        <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Suggested Milestones
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Significant turning points or moments detected in your journal—approve to add to your timeline
              </p>
            </div>
            <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
              {pendingEvents.length} pending
            </span>
          </div>

          <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {pendingEvents.map((ev) => {
              const isEditing = editingId === ev.id;
              return (
                <li key={ev.id} className="px-6 py-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      {!isEditing ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                              {ev.eventDate}
                            </span>
                            {ev.category && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                  {ev.category}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {ev.title}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {ev.description}
                          </p>
                          {ev.excerpt && (
                            <p className="text-xs italic text-slate-500 dark:text-slate-400 pt-0.5">
                              &ldquo;{ev.excerpt}&rdquo;
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="sm:col-span-2 px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                          />
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                          />
                          <input
                            type="text"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            placeholder="Category"
                            className="px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                          />
                          <textarea
                            rows={2}
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="sm:col-span-3 px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onUpdateEvent(ev.id, { status: 'approved' })}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(ev)}
                            aria-label="Edit milestone candidate"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateEvent(ev.id, { status: 'dismissed' })}
                            aria-label="Dismiss milestone candidate"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(ev, true)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                          >
                            Save &amp; Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Chronological Timeline: Year + Collapsible Month */}
      {groupedByYearAndMonth.length === 0 ? (
        <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-14 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Your timeline is ready for its first chapter.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Add a milestone manually or approve milestone candidates surfaced from your Google Docs journal.
          </p>
        </section>
      ) : (
        <div className="space-y-8">
          {groupedByYearAndMonth.map(({ year, months }) => (
            <section key={year} className="space-y-4">
              <div className="flex items-baseline justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {year}
                </h2>
                <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                  {months.reduce((acc, [, list]) => acc + list.length, 0)} milestones
                </span>
              </div>

              <div className="space-y-4">
                {months.map(([yearMonth, monthEvents]) => {
                  const isCollapsed = Boolean(collapsedMonths[yearMonth]);
                  return (
                    <div
                      key={yearMonth}
                      className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleMonth(yearMonth)}
                        aria-expanded={!isCollapsed}
                        className="w-full px-6 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {formatMonthLabel(yearMonth)}
                          </span>
                        </div>
                        <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                          {monthEvents.length} {monthEvents.length === 1 ? 'event' : 'events'}
                        </span>
                      </button>

                      {!isCollapsed && (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-slate-200 dark:border-slate-800">
                          {monthEvents.map((ev) => {
                            const isEditing = editingId === ev.id;
                            const safeDocUrl = sanitizeExternalUrl(ev.docUrl);
                            return (
                              <li key={ev.id} className="px-6 py-4">
                                {isEditing ? (
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                      <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="sm:col-span-2 px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                                      />
                                      <input
                                        type="date"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                                      />
                                      <input
                                        type="text"
                                        value={editCategory}
                                        onChange={(e) => setEditCategory(e.target.value)}
                                        placeholder="Category"
                                        className="px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                                      />
                                      <textarea
                                        rows={2}
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        className="sm:col-span-3 px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                                      />
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setEditingId(null)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => saveEdit(ev, false)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                                      >
                                        Save Changes
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="flex items-start gap-5 min-w-0">
                                      <span className="w-24 shrink-0 font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                                        {ev.eventDate}
                                      </span>
                                      <div className="space-y-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {ev.title}
                                          </h3>
                                          {ev.category && (
                                            <span className="text-xs text-blue-600 dark:text-blue-400">
                                              · {ev.category}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                          {ev.description}
                                        </p>
                                        {safeDocUrl && (
                                          <a
                                            href={safeDocUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline pt-1"
                                          >
                                            <span>View in Google Docs</span>
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => startEdit(ev)}
                                        aria-label={`Edit "${ev.title}"`}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onDeleteEvent(ev.id)}
                                        aria-label={`Delete "${ev.title}"`}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
