import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ScheduleBlock, TaskCategory } from '../types/dashboard';

interface ScheduleViewProps {
  schedule: ScheduleBlock[];
  onAddBlock: (block: Omit<ScheduleBlock, 'id'>) => void;
  onDeleteBlock: (id: string) => void;
}

function calcDurationMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export function ScheduleView({ schedule, onAddBlock, onDeleteBlock }: ScheduleViewProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('17:00');
  const [category, setCategory] = useState<TaskCategory>(TaskCategory.Work);
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

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
    if (calcDurationMinutes(startTime, endTime) <= 0) {
      setError('End time must be later than start time.');
      return;
    }
    setError('');
    onAddBlock({
      title: trimmed,
      startTime,
      endTime,
      category,
      location: location.trim() || undefined,
    });
    setTitle('');
    setLocation('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Daily Schedule
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {sortedBlocks.length} blocks · {(totalPlannedMinutes / 60).toFixed(1)} hours allocated
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chronological Timeline */}
        <section className="lg:col-span-8 bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Time Blocks
            </h2>
          </div>

          {sortedBlocks.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Your day is currently unscheduled.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Use the form on the right to allocate focused time blocks.
              </p>
            </div>
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
                      <div className="w-32 shrink-0">
                        <span className="font-mono tabular-nums text-sm font-medium text-slate-900 dark:text-slate-100">
                          {block.startTime} – {block.endTime}
                        </span>
                        <p className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {duration} min
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {block.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {block.category}
                          {block.location ? ` · ${block.location}` : ''}
                        </p>
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
        <section className="lg:col-span-4 bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl p-6">
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
                className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="block-start" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Start
                </label>
                <input
                  id="block-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
                />
              </div>
              <div>
                <label htmlFor="block-end" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  End
                </label>
                <input
                  id="block-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="block-category" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <select
                id="block-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
              >
                {Object.values(TaskCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
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
                className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-400"
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
