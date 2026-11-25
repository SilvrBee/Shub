import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { AppStyleId, HabitItem } from '../types/dashboard';
import { HabitHeatmapCard } from './HabitHeatmapCard';
import { EmptyStateIllustration } from './EmptyStateIllustration';

interface HabitsViewProps {
  habits: HabitItem[];
  style?: AppStyleId;
  reducedMotion?: boolean;
  onToggleHabitDay: (habitId: string, dayIndex: number) => void;
  onToggleHabitDate: (habitId: string, dateKey: string) => void;
  onAddHabit: (name: string, category: string, targetDaysPerWeek: number) => void;
  onDeleteHabit: (habitId: string) => void;
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CONFETTI_PARTICLES = [
  { tx: '-26px', ty: '-22px', rot: '-40deg', color: '#10b981' },
  { tx: '24px', ty: '-24px', rot: '55deg', color: '#3b82f6' },
  { tx: '-32px', ty: '-4px', rot: '-85deg', color: '#f59e0b' },
  { tx: '30px', ty: '-6px', rot: '90deg', color: '#10b981' },
  { tx: '-18px', ty: '-30px', rot: '-25deg', color: '#6366f1' },
  { tx: '14px', ty: '-32px', rot: '35deg', color: '#f43f5e' },
  { tx: '-20px', ty: '16px', rot: '-120deg', color: '#3b82f6' },
  { tx: '22px', ty: '14px', rot: '130deg', color: '#f59e0b' },
  { tx: '0px', ty: '-34px', rot: '180deg', color: '#10b981' },
];

export function HabitsView({
  habits,
  style = 'classic',
  reducedMotion = false,
  onToggleHabitDay,
  onToggleHabitDate,
  onAddHabit,
  onDeleteHabit,
}: HabitsViewProps) {
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('Focus');
  const [newHabitTarget, setNewHabitTarget] = useState(5);
  const [celebratingHabitId, setCelebratingHabitId] = useState<string | null>(null);
  const celebrationTimerRef = useRef<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) {
        window.clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

  const triggerCelebration = (habitId: string) => {
    setCelebratingHabitId(habitId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cadence:shooting-star'));
    }
    if (celebrationTimerRef.current) {
      window.clearTimeout(celebrationTimerRef.current);
    }
    celebrationTimerRef.current = window.setTimeout(() => {
      setCelebratingHabitId(null);
    }, 900);
  };

  const handleDayClick = (habit: HabitItem, dayIndex: number) => {
    const wasDone = habit.completedDays[dayIndex];
    const currentCount = habit.completedDays.filter(Boolean).length;
    const nextCount = wasDone ? currentCount - 1 : currentCount + 1;
    if (!wasDone && currentCount < habit.targetDaysPerWeek && nextCount >= habit.targetDaysPerWeek) {
      triggerCelebration(habit.id);
    }
    onToggleHabitDay(habit.id, dayIndex);
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newHabitName.trim();
    if (!trimmed) return;
    onAddHabit(trimmed, newHabitCategory.trim() || 'Routine', newHabitTarget);
    setNewHabitName('');
  };

  return (
    <div className="space-y-6">
      <div className="editorial-rise editorial-rise-1">
        <span className="editorial-kicker">
          <span className="editorial-marker" aria-hidden="true">EDITION</span>
          <span className="editorial-kicker-text">Rituals &amp; Pace</span>
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Habits
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Build weekly consistency and monitor your 12-week completion heatmap
        </p>
      </div>

      {/* GitHub-Style 12-Week Heatmap / Celestial Night Sky Constellation */}
      {habits.length > 0 && (
        <HabitHeatmapCard
          habits={habits}
          style={style}
          reducedMotion={reducedMotion}
          onToggleHabitDate={onToggleHabitDate}
        />
      )}

      {/* Weekly Habit Tracker Matrix */}
      <section className="editorial-rise editorial-rise-3 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">02</span>
            <span className="editorial-kicker-text">Weekly Ledger</span>
          </span>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Weekly Habit Matrix
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click any day cell to log completion for this week
          </p>
        </div>

        {habits.length === 0 ? (
          <EmptyStateIllustration
            kind="habits"
            title="No habits tracked yet"
            description="Create your first weekly routine below to unlock the 12-week consistency heatmap and target tracking."
            action={
              <button
                type="button"
                onClick={() => nameInputRef.current?.focus()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Habit</span>
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 pl-6 pr-3">Habit</th>
                  {WEEK_DAYS.map((day) => (
                    <th key={day} className="py-3 px-2 text-center w-10">
                      {day}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right">Pace</th>
                  <th className="py-3 pl-2 pr-6 text-right w-12">
                    <span className="sr-only">Delete</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {habits.map((habit) => {
                  const doneCount = habit.completedDays.filter(Boolean).length;
                  const metGoal = doneCount >= habit.targetDaysPerWeek;
                  const isCelebrating = celebratingHabitId === habit.id;

                  return (
                    <tr
                      key={habit.id}
                      className={`transition-colors ${
                        isCelebrating
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/25'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-3.5 pl-6 pr-3">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {habit.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {habit.category} · Target {habit.targetDaysPerWeek}/wk
                        </p>
                      </td>
                      {habit.completedDays.map((done, idx) => (
                        <td key={idx} className="py-3.5 px-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDayClick(habit, idx)}
                            aria-label={`Toggle ${habit.name} for ${WEEK_DAYS[idx]}`}
                            className={`w-7 h-7 rounded-md border inline-flex items-center justify-center transition-all active:scale-95 ${
                              done
                                ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500 text-white'
                                : 'editorial-subtle-box border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50 dark:bg-[#0B0F17]'
                            }`}
                          >
                            {done && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                          </button>
                        </td>
                      ))}
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                        <div className="relative inline-flex items-center justify-end">
                          {isCelebrating && (
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible"
                            >
                              {CONFETTI_PARTICLES.map((p, idx) => (
                                <span
                                  key={idx}
                                  className="confetti-particle absolute w-1.5 h-1.5 rounded-[2px]"
                                  style={
                                    {
                                      backgroundColor: p.color,
                                      '--tx': p.tx,
                                      '--ty': p.ty,
                                      '--rot': p.rot,
                                    } as React.CSSProperties
                                  }
                                />
                              ))}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors ${
                              metGoal
                                ? 'text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-500/10'
                                : 'text-slate-600 dark:text-slate-400'
                            } ${isCelebrating ? 'habit-target-pulse' : ''}`}
                          >
                            {metGoal && <Check className="w-3 h-3" strokeWidth={2.5} />}
                            <span>
                              {doneCount}/{habit.targetDaysPerWeek}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 pl-2 pr-6 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteHabit(habit.id)}
                          aria-label={`Delete habit "${habit.name}"`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <form
          onSubmit={handleAddHabit}
          className="editorial-transparent-band p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50/50 dark:bg-[#0B0F17]/40"
        >
          <input
            ref={nameInputRef}
            type="text"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="New habit name (e.g., 20 min mobility)"
            aria-label="New habit name"
            className="flex-1 px-3 py-2 rounded-lg text-sm bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
          <input
            type="text"
            value={newHabitCategory}
            onChange={(e) => setNewHabitCategory(e.target.value)}
            placeholder="Category"
            aria-label="Habit category"
            className="sm:w-28 px-3 py-2 rounded-lg text-sm bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
          />
          <select
            aria-label="Weekly target days"
            value={newHabitTarget}
            onChange={(e) => setNewHabitTarget(Number(e.target.value))}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-600"
          >
            {[3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n} days/wk
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!newHabitName.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Habit</span>
          </button>
        </form>
      </section>
    </div>
  );
}
