import { BellRing, X } from 'lucide-react';
import { ReminderRecord } from '../types/dashboard';
import { PriorityFlagDisplay } from './PriorityFlag';

interface ReminderOverlayProps {
  toasts: ReminderRecord[];
  onOpenTask: (reminder: ReminderRecord) => void;
  onDismissToast: (triggerKey: string) => void;
}

export function ReminderOverlay({
  toasts,
  onOpenTask,
  onDismissToast,
}: ReminderOverlayProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Task reminder notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.slice(-4).map((toast) => (
        <div
          key={toast.triggerKey}
          role="status"
          className="pointer-events-auto cadence-card editorial-preserve-pad rounded-xl bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-700 shadow-lg p-3.5 flex items-start gap-3"
        >
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
            <BellRing className="w-4 h-4" aria-hidden="true" />
          </div>

          <button
            type="button"
            onClick={() => onOpenTask(toast)}
            className="min-w-0 flex-1 text-left group"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {toast.kind === 'deadline-heads-up' ? 'Deadline Heads-Up' : 'Task Reminder'}
            </p>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate group-hover:underline mt-0.5">
              {toast.taskTitle}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span>{toast.subtitle}</span>
              <PriorityFlagDisplay priority={toast.priority} compact />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onDismissToast(toast.triggerKey)}
            aria-label={`Dismiss reminder for "${toast.taskTitle}"`}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
