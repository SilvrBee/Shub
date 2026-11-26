import { useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { DashboardView, TaskItem } from '../types/dashboard';
import editorialFeaturePlate from '../assets/images/editorial_feature_plate_1795690657131.jpg';

interface EditorialPrintSpreadProps {
  formattedDate: string;
  remainingTodayCount: number;
  todayFocusMinutes: number;
  habitConsistency: number;
  leadTask?: TaskItem;
  onNavigate: (view: DashboardView) => void;
}

export function EditorialPrintSpread({
  formattedDate,
  remainingTodayCount,
  todayFocusMinutes,
  habitConsistency,
  leadTask,
  onNavigate,
}: EditorialPrintSpreadProps) {
  const [imageError, setImageError] = useState(false);

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - startOfYear.getTime();
  const dayOfYear = Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));

  const headline = leadTask
    ? leadTask.title
    : remainingTodayCount === 0
      ? 'A Clear Desk for Deliberate Work'
      : 'Today’s Priorities in Print';

  const summaryProse = leadTask
    ? `At the top of today’s agenda sits "${leadTask.title}", leading ${remainingTodayCount} remaining ${
        remainingTodayCount === 1 ? 'item' : 'items'
      } across your active queue. With ${todayFocusMinutes} minutes of uninterrupted focus logged so far and ${habitConsistency}% weekly habit cadence, the morning desk is set for measured progress.`
    : `With ${todayFocusMinutes} minutes of focus recorded today and ${habitConsistency}% weekly habit consistency, your workspace stands ready for deep reading, deliberate scheduling, and calm execution.`;

  return (
    <section
      aria-label="Daily Editorial Feature"
      className="editorial-rise editorial-rise-1 editorial-spread py-6 border-b border-slate-900/80 dark:border-slate-200/50"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-5 border-b border-slate-300 dark:border-slate-700 text-[11px] uppercase tracking-[0.16em] font-medium text-slate-600 dark:text-slate-400">
        <span>
          Issue No. {String(dayOfYear).padStart(3, '0')} · Daily Broadsheet
        </span>
        <span>{formattedDate}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-stretch">
        {/* Large Feature Plate */}
        <figure className="lg:col-span-7 flex flex-col">
          <div className="relative overflow-hidden border border-slate-900/20 dark:border-slate-200/20 bg-slate-100 dark:bg-slate-900 aspect-[16/9]">
            {!imageError ? (
              <img
                src={editorialFeaturePlate}
                alt="Architectural sunlight across a study desk with an open notebook and brass fountain pen"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover dark:brightness-90 dark:contrast-105"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950">
                <BookOpen className="w-8 h-8 text-slate-500 dark:text-slate-400 mb-3" />
                <p className="font-display italic text-lg text-slate-700 dark:text-slate-300">
                  Cadence Daily Edition Plate
                </p>
              </div>
            )}
          </div>
          <figcaption className="mt-2.5 flex items-center justify-between gap-4 text-xs font-display italic text-slate-500 dark:text-slate-400">
            <span>Fig. 01 — Morning Desk &amp; Architectural Light, Study Archive</span>
            <span className="font-mono not-italic text-[10px] uppercase tracking-wider">
              Plate I
            </span>
          </figcaption>
        </figure>

        {/* Expressive Editorial Column */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-5 lg:border-l lg:border-slate-300 dark:lg:border-slate-700 lg:pl-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400 mb-2">
              {leadTask ? 'Lead Priority Dispatch' : 'Editorial Overview'}
            </p>
            <h2 className="font-display text-2xl sm:text-[1.75rem] font-bold leading-[1.12] tracking-tight text-slate-900 dark:text-slate-100 text-balance">
              {headline}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300 first-letter:font-display first-letter:text-4xl first-letter:font-bold first-letter:float-left first-letter:mr-2.5 first-letter:leading-[0.88] first-letter:text-slate-900 dark:first-letter:text-slate-100">
              {summaryProse}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onNavigate(DashboardView.Tasks)}
              className="editorial-link inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-900 dark:text-slate-100"
            >
              <span>Inspect Priority Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate(DashboardView.Focus)}
              className="editorial-link inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400"
            >
              <span>Open Focus Chronometer</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
