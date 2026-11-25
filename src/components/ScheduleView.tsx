import { useEffect, useMemo, useState } from 'react';
import { Plus, Settings2, Trash2 } from 'lucide-react';
import { CategoryItem, DashboardView, ScheduleBlock } from '../types/dashboard';
import { EmptyStateIllustration } from './EmptyStateIllustration';
import { useCadenceStyle } from '../hooks/useCadenceStyle';
import { DoodleHeaderScene } from './DoodleKit';
import { CustomSelect } from './ui/CustomSelect';
import { TimePickerField } from './ui/CustomDateTimePicker';
import { CategoryBadge, CategoryIcon } from './ui/CategoryBadge';
import { formatTimeShort } from '../utils/taskUtils';

interface ScheduleViewProps {
  schedule: ScheduleBlock[];
  categories: CategoryItem[];
  defaultCategory?: string;
  timeFormat?: '12h' | '24h';
  onOpenCategoryManager: () => void;
  onAddBlock: (block: Omit<ScheduleBlock, 'id'>) => void;
  onDeleteBlock: (id: string) => void;
}

function calcDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export function ScheduleView({
  schedule,
  categories,
  defaultCategory,
  timeFormat = '24h',
  onOpenCategoryManager,
  onAddBlock,
  onDeleteBlock,
}: ScheduleViewProps) {
  const activeStyle = useCadenceStyle();
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:00');
  const [category, setCategory] = useState<string>(
    defaultCategory || categories[0]?.name || 'Work'
  );
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (categories.length === 0) return;
    if (!categories.some((c) => c.name === category)) {
      setCategory(defaultCategory && categories.some((c) => c.name === defaultCategory)
        ? defaultCategory
        : categories[0].name);
    }
  }, [categories, category, defaultCategory]);

  const sortedBlocks = useMemo(
    () => [...schedule].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [schedule]
  );

  const totalPlannedMinutes = useMemo(
    () =>
      sortedBlocks.reduce(
        (sum, b) => sum + calcDurationMinutes(b.startTime, b.endTime),
        0
      ),
    [sortedBlocks]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Enter a block title.');
      return;
    }
    if (!startTime || !endTime || calcDurationMinutes(startTime, endTime) <= 0) {
      setError('End time must be later than start time.');
      return;
    }
    setError('');
    onAddBlock({
      title: trimmed,
      startTime,
      endTime,
      category: category || categories[0]?.name || 'Work',
      location: location.trim() || undefined,
    });
    setTitle('');
    setLocation('');
  };

  return (
    <div className="space-y-6">
      <div className="editorial-rise editorial-rise-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">EDITION</span>
            <span className="editorial-kicker-text">Chronology</span>
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Daily Schedule
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {sortedBlocks.length} blocks · {(totalPlannedMinutes / 60).toFixed(1)} hours allocated
          </p>
        </div>

        {activeStyle === 'doodle' && <DoodleHeaderScene tab={DashboardView.Schedule} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chronological Timeline */}
        <section className="editorial-rise editorial-rise-2 lg:col-span-8 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <span className="editorial-kicker">
              <span className="editorial-marker" aria-hidden="true">01</span>
              <span className="editorial-kicker-text">Agenda Ledger</span>
            </span>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Time Blocks
            </h2>
          </div>

          {sortedBlocks.length === 0 ? (
            <EmptyStateIllustration
              kind="schedule"
              title="Your day is unscheduled"
              description="Use the form on the right to allocate focused time blocks for deep work, meetings, or exercise."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {sortedBlocks.map((block) => {
                const duration = calcDurationMinutes(block.startTime, block.endTime);
                return (
                  <li
                    key={block.id}
                    className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 min-w-0">
                      <div className="w-36 shrink-0">
                        <span className="font-mono tabular-nums text-sm font-medium text-slate-900 dark:text-slate-100">
                          {formatTimeShort(block.startTime, timeFormat)} –{' '}
                          {formatTimeShort(block.endTime, timeFormat)}
                        </span>
                        <p className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {duration} min
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {block.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <CategoryBadge
                            name={block.category}
                            categories={categories}
                          />
                          {block.location && <span>· {block.location}</span>}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteBlock(block.id)}
                      aria-label={`Remove "${block.title}"`}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Add Time Block Form */}
        <section className="editorial-rise editorial-rise-3 lg:col-span-4 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6">
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">02</span>
            <span className="editorial-kicker-text">Allocation</span>
          </span>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Add Time Block
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Reserve a dedicated slot on today&apos;s calendar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="block-title" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Activity
              </label>
              <input
                id="block-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Code review & PR triage"
                className="cadence-input w-full px-3.5 py-2.5 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="block-start" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Start
                </label>
                <TimePickerField
                  id="block-start"
                  ariaLabel="Start time"
                  value={startTime}
                  onChange={(v) => setStartTime(v || '16:00')}
                  timeFormat={timeFormat}
                  allowClear={false}
                />
              </div>
              <div>
                <label htmlFor="block-end" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  End
                </label>
                <TimePickerField
                  id="block-end"
                  ariaLabel="End time"
                  value={endTime}
                  onChange={(v) => setEndTime(v || '17:00')}
                  timeFormat={timeFormat}
                  allowClear={false}
                />
              </div>
            </div>

            <div>
              <label htmlFor="block-category" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <CustomSelect
                id="block-category"
                ariaLabel="Schedule block category"
                value={category}
                onChange={setCategory}
                options={categories.map((cat) => ({
                  value: cat.name,
                  label: cat.name,
                  color: cat.color,
                  icon: <CategoryIcon icon={cat.icon} className="w-3.5 h-3.5" />,
                }))}
                className="w-full"
                size="md"
                footerAction={{
                  label: 'Manage categories',
                  icon: <Settings2 className="w-3.5 h-3.5" />,
                  onClick: onOpenCategoryManager,
                }}
              />
            </div>

            <div>
              <label htmlFor="block-location" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Location (optional)
              </label>
              <input
                id="block-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Study or Video Call"
                className="cadence-input w-full px-3.5 py-2.5 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
              />
            </div>

            {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Schedule</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
