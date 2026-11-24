import { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { FocusSession, HabitItem } from '../types/dashboard';
import { FocusTimerCard } from './FocusTimerCard';

interface FocusHabitsViewProps {
  habits: HabitItem[];
  focusSessions: FocusSession[];
  onToggleHabitDay: (habitId: string, dayIndex: number) => void;
  onAddHabit: (name: string, category: string, targetDaysPerWeek: number) => void;
  onDeleteHabit: (habitId: string) => void;
  onCompleteFocusSession: (minutes: number, label: string) => void;
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function FocusHabitsView({
  habits,
  focusSessions,
  onToggleHabitDay,
  onAddHabit,
  onDeleteHabit,
  onCompleteFocusSession,
}: FocusHabitsViewProps) {
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('Focus');
  const [newHabitTarget, setNewHabitTarget] = useState(5);

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newHabitName.trim();
    if (!trimmed) return;
    onAddHabit(trimmed, newHabitCategory.trim() || 'Routine', newHabitTarget);
    setNewHabitName('');
  };

  const recentSessions = [...focusSessions]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Focus &amp; Habits
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Build deep work momentum and track weekly consistency
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-6">
          <FocusTimerCard onCompleteSession={onCompleteFocusSession} />

          <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Recent Focus Log
              </h2>
            </div>
            {recentSessions.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Complete a timer block to record your first session.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {recentSessions.map((session) => (
                  <li key={session.id} className="px-6 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {session.label}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5">
                        {session.dateKey}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                      {session.minutes} min
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Weekly Habit Tracker Matrix */}
        <section className="lg:col-span-7 bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Weekly Habit Matrix
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click any day cell to log completion for this week
            </p>
          </div>

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
                  return (
                    <tr key={habit.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
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
                            onClick={() => onToggleHabitDay(habit.id, idx)}
                            aria-label={`Toggle ${habit.name} for ${WEEK_DAYS[idx]}`}
                            className={`w-7 h-7 rounded-md border inline-flex items-center justify-center transition-colors ${
                              done
                                ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500 text-white'
                                : 'border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50 dark:bg-[#0B0F17]'
                            }`}
                          >
                            {done && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                          </button>
                        </td>
                      ))}
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                        <span
                          className={
                            metGoal
                              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                              : 'text-slate-600 dark:text-slate-400'
                          }
                        >
                          {doneCount}/{habit.targetDaysPerWeek}
                        </span>
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

          <form
            onSubmit={handleAddHabit}
            className="p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50/50 dark:bg-[#0B0F17]/40"
          >
            <input
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
    </div>
  );
}
