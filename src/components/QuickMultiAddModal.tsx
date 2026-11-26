import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ListPlus, Plus, Trash2, X } from 'lucide-react';
import { CategoryItem, TaskItem, TaskPriority } from '../types/dashboard';
import { parseQuickAddLines } from '../utils/quickAddParser';
import { findSimilarOpenTasks } from '../utils/taskUtils';
import { PriorityFlagPicker } from './PriorityFlag';
import { CustomSelect } from './ui/CustomSelect';
import { DatePickerField } from './ui/CustomDateTimePicker';
import { CategoryIcon } from './ui/CategoryBadge';

export interface QuickMultiAddRow {
  localId: string;
  title: string;
  priority: TaskPriority;
  category: string;
  dueDate: string;
  durationMinutes: string;
}

interface QuickMultiAddModalProps {
  isOpen: boolean;
  initialText?: string;
  categories: CategoryItem[];
  defaultPriority: TaskPriority;
  existingTasks: TaskItem[];
  onClose: () => void;
  onSaveBatch: (
    items: Array<{
      title: string;
      priority: TaskPriority;
      category?: string;
      dueDate?: string;
      durationMinutes?: number;
    }>
  ) => void;
}

function makeRowId(idx: number): string {
  return `qma_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
}

export function QuickMultiAddModal({
  isOpen,
  initialText = '',
  categories,
  defaultPriority,
  existingTasks,
  onClose,
  onSaveBatch,
}: QuickMultiAddModalProps) {
  const [rawText, setRawText] = useState(initialText);
  const [rows, setRows] = useState<QuickMultiAddRow[]>([]);
  const [step, setStep] = useState<'paste' | 'review'>('paste');

  const parseToRows = (text: string): QuickMultiAddRow[] => {
    const parsed = parseQuickAddLines(text, categories, new Date(), defaultPriority);
    return parsed.map((item, idx) => ({
      localId: makeRowId(idx),
      title: item.title,
      priority: item.priority,
      category: item.category ?? '',
      dueDate: item.dueDate ?? '',
      durationMinutes: item.durationMinutes ? String(item.durationMinutes) : '',
    }));
  };

  useEffect(() => {
    if (!isOpen) return;
    if (initialText.trim()) {
      setRawText(initialText);
      setRows(parseToRows(initialText));
      setStep('review');
    } else {
      setRawText('');
      setRows([]);
      setStep('paste');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialText]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !e.defaultPrevented &&
        !document.querySelector('[data-portal-popover="true"]')
      ) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'None' },
      ...categories.map((cat) => ({
        value: cat.name,
        label: cat.name,
        color: cat.color,
        icon: <CategoryIcon icon={cat.icon} className="w-3.5 h-3.5" />,
      })),
    ],
    [categories]
  );

  if (!isOpen) return null;

  const handleParseLines = () => {
    const parsed = parseToRows(rawText);
    if (parsed.length === 0) return;
    setRows(parsed);
    setStep('review');
  };

  const handleConfirmSave = () => {
    const cleanItems = rows
      .map((r) => {
        const title = r.title.trim();
        if (!title) return null;
        const parsedDur = Number(r.durationMinutes);
        const validDur =
          r.durationMinutes.trim() && Number.isFinite(parsedDur) && parsedDur > 0
            ? Math.min(1440, Math.round(parsedDur))
            : undefined;
        return {
          title,
          priority: r.priority,
          category: r.category || undefined,
          dueDate: r.dueDate || undefined,
          durationMinutes: validDur,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (cleanItems.length === 0) return;
    onSaveBatch(cleanItems);
    onClose();
  };

  const validCount = rows.filter((r) => r.title.trim().length > 0).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-multi-add-title"
    >
      <div className="cadence-card editorial-preserve-pad w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <ListPlus className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <h2
                id="quick-multi-add-title"
                className="font-display text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Quick Multi-Add
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paste one task per line — supports today, tomorrow, Mon–Sun, Nov 30, !high/!med/!low, #category, 30m/2h
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Quick Multi-Add"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'paste' ? (
          <div className="p-6 space-y-4 overflow-y-auto">
            <div>
              <label
                htmlFor="quick-multi-add-textarea"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Task Lines
              </label>
              <textarea
                id="quick-multi-add-textarea"
                rows={7}
                autoFocus
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Prepare Q4 deck tomorrow !high #Work 45m\nBook dentist appointment Friday #Health 15m\nPay utility bill Nov 30 !med #Finance 10m`}
                className="cadence-input w-full px-3.5 py-2.5 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 font-sans leading-relaxed resize-y"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {rawText
                  .split(/\r?\n/)
                  .filter((l) => l.trim().length > 0).length}{' '}
                lines detected
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rawText.trim()}
                  onClick={handleParseLines}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  Parse &amp; Review
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep('paste')}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                &larr; Edit raw lines
              </button>
              <button
                type="button"
                onClick={() =>
                  setRows((prev) => [
                    ...prev,
                    {
                      localId: makeRowId(prev.length),
                      title: '',
                      priority: defaultPriority,
                      category: '',
                      dueDate: '',
                      durationMinutes: '',
                    },
                  ])
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            <ul className="space-y-3">
              {rows.map((row, idx) => {
                const similar = findSimilarOpenTasks(row.title, existingTasks);
                return (
                  <li
                    key={row.localId}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B0F17]/60 space-y-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400 w-5 shrink-0">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRows((prev) =>
                            prev.map((item) =>
                              item.localId === row.localId ? { ...item, title: val } : item
                            )
                          );
                        }}
                        aria-label={`Task ${idx + 1} title`}
                        placeholder="Task title..."
                        className="cadence-input flex-1 px-3 py-1.5 rounded-md text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setRows((prev) => prev.filter((item) => item.localId !== row.localId))
                        }
                        aria-label={`Remove row ${idx + 1}`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pl-7">
                      <PriorityFlagPicker
                        priority={row.priority}
                        taskTitle={row.title || `Task ${idx + 1}`}
                        compact
                        onChange={(nextPrio) =>
                          setRows((prev) =>
                            prev.map((item) =>
                              item.localId === row.localId ? { ...item, priority: nextPrio } : item
                            )
                          )
                        }
                      />

                      <div className="w-36">
                        <CustomSelect
                          ariaLabel={`Task ${idx + 1} category`}
                          value={row.category}
                          onChange={(val) =>
                            setRows((prev) =>
                              prev.map((item) =>
                                item.localId === row.localId ? { ...item, category: val } : item
                              )
                            )
                          }
                          options={categoryOptions}
                          size="sm"
                          placeholder="Category"
                          className="w-full"
                        />
                      </div>

                      <div className="w-40">
                        <DatePickerField
                          ariaLabel={`Task ${idx + 1} due date`}
                          value={row.dueDate || undefined}
                          onChange={(val) =>
                            setRows((prev) =>
                              prev.map((item) =>
                                item.localId === row.localId
                                  ? { ...item, dueDate: val ?? '' }
                                  : item
                              )
                            )
                          }
                          placeholder="Due date"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={1440}
                          value={row.durationMinutes}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRows((prev) =>
                              prev.map((item) =>
                                item.localId === row.localId
                                  ? { ...item, durationMinutes: val }
                                  : item
                              )
                            );
                          }}
                          aria-label={`Task ${idx + 1} duration minutes`}
                          placeholder="Min"
                          className="cadence-input w-20 px-2.5 py-1.5 rounded-md text-xs font-mono tabular-nums text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400">min</span>
                      </div>
                    </div>

                    {similar.length > 0 && (
                      <div className="pl-7 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Similar open task: &ldquo;{similar[0].title}&rdquo;
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={validCount === 0}
                onClick={handleConfirmSave}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                Create {validCount} {validCount === 1 ? 'Task' : 'Tasks'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
