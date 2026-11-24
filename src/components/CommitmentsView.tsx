import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { CommitmentItem } from '../types/dashboard';

interface CommitmentsViewProps {
  items: CommitmentItem[];
  onCreateItem: (item: { title: string; context?: string; dueDate?: string }) => void;
  onUpdateItem: (id: string, patch: Partial<CommitmentItem>) => void;
  onDeleteItem: (id: string) => void;
}

export function CommitmentsView({
  items,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
}: CommitmentsViewProps) {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'completed' | 'all'>('pending');
  const [quickTitle, setQuickTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContext, setEditContext] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  const filtered = useMemo(() => {
    return [...items]
      .filter((item) => {
        if (item.status === 'dismissed' && filter !== 'all') return false;
        if (filter === 'all') return item.status !== 'dismissed';
        return item.status === filter;
      })
      .sort((a, b) => b.dateMentioned.localeCompare(a.dateMentioned));
  }, [items, filter]);

  const counts = useMemo(
    () => ({
      pending: items.filter((i) => i.status === 'pending').length,
      approved: items.filter((i) => i.status === 'approved').length,
      completed: items.filter((i) => i.status === 'completed').length,
    }),
    [items]
  );

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onCreateItem({ title: quickTitle.trim() });
    setQuickTitle('');
    setFilter('approved');
  };

  const startEdit = (item: CommitmentItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditContext(item.context || '');
    setEditDueDate(item.dueDate || '');
  };

  const saveEdit = (item: CommitmentItem) => {
    if (!editTitle.trim()) return;
    onUpdateItem(item.id, {
      title: editTitle.trim(),
      context: editContext.trim() || undefined,
      dueDate: editDueDate.trim() || undefined,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Things I Said I&apos;d Do
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {counts.pending} awaiting review · {counts.approved} in inbox · {counts.completed} completed
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg self-start sm:self-auto">
          {([
            { id: 'pending', label: `Suggested (${counts.pending})` },
            { id: 'approved', label: `Inbox (${counts.approved})` },
            { id: 'completed', label: 'Done' },
            { id: 'all', label: 'All' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lightweight Manual Capture */}
      <form
        onSubmit={handleQuickAdd}
        className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-3.5 flex items-center gap-3"
      >
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Add a personal promise or intention directly to your inbox..."
          aria-label="Add promise or intention"
          className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!quickTitle.trim()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Save to Inbox</span>
        </button>
      </form>

      {/* Lightweight Inbox List */}
      <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            {filter === 'pending'
              ? 'No new promises or intentions waiting for review.'
              : 'Nothing in this view right now.'}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filtered.map((item) => {
              const isEditing = editingId === item.id;
              return (
                <li key={item.id} className="px-6 py-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      {!isEditing ? (
                        <>
                          <p
                            className={`text-sm font-medium ${
                              item.status === 'completed'
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {item.title}
                          </p>
                          {item.originalStatement && (
                            <p className="text-xs italic text-slate-500 dark:text-slate-400">
                              &ldquo;{item.originalStatement}&rdquo;
                            </p>
                          )}
                          {item.context && (
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              {item.context}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500 pt-0.5">
                            <span>Mentioned {item.dateMentioned}</span>
                            {item.dueDate && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-amber-600 dark:text-amber-400">
                                  Due {item.dueDate}
                                </span>
                              </>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            placeholder="Title"
                            className="sm:col-span-2 px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                          />
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                          />
                          <input
                            type="text"
                            value={editContext}
                            onChange={(e) => setEditContext(e.target.value)}
                            placeholder="Context (optional)"
                            className="sm:col-span-3 px-3 py-1.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isEditing ? (
                        <>
                          {item.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => onUpdateItem(item.id, { status: 'approved' })}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Keep</span>
                            </button>
                          )}
                          {item.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => onUpdateItem(item.id, { status: 'completed' })}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            >
                              Done
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            aria-label="Edit item"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {item.status === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => onUpdateItem(item.id, { status: 'dismissed' })}
                              aria-label="Dismiss suggestion"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.id)}
                              aria-label="Delete item"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(item)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                          >
                            Save
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
        )}
      </section>
    </div>
  );
}
