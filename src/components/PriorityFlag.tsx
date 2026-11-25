import { useEffect, useRef, useState } from 'react';
import { Flag } from 'lucide-react';
import { FieldSource, TaskPriority } from '../types/dashboard';

export const FLAG_META: Record<
  TaskPriority,
  {
    label: string;
    shortLabel: string;
    ariaLabel: string;
    iconClass: string;
    fillClass: string;
    textClass: string;
  }
> = {
  [TaskPriority.High]: {
    label: 'High',
    shortLabel: 'High',
    ariaLabel: 'High priority flag',
    iconClass: 'text-rose-600 dark:text-rose-400',
    fillClass: 'fill-rose-600/20 dark:fill-rose-400/25',
    textClass: 'text-rose-700 dark:text-rose-300',
  },
  [TaskPriority.Medium]: {
    label: 'Medium',
    shortLabel: 'Med',
    ariaLabel: 'Medium priority flag',
    iconClass: 'text-orange-500 dark:text-orange-400',
    fillClass: 'fill-orange-500/20 dark:fill-orange-400/25',
    textClass: 'text-orange-700 dark:text-orange-300',
  },
  [TaskPriority.Low]: {
    label: 'Low',
    shortLabel: 'Low',
    ariaLabel: 'Low priority flag',
    iconClass: 'text-blue-600 dark:text-blue-400',
    fillClass: 'fill-blue-600/20 dark:fill-blue-400/25',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
  [TaskPriority.None]: {
    label: 'None',
    shortLabel: 'None',
    ariaLabel: 'No priority flag',
    iconClass: 'text-slate-400 dark:text-slate-500',
    fillClass: '',
    textClass: 'text-slate-500 dark:text-slate-400',
  },
};

export const PRIORITY_ORDER: TaskPriority[] = [
  TaskPriority.High,
  TaskPriority.Medium,
  TaskPriority.Low,
  TaskPriority.None,
];

export function AiSourceBadge({ label = 'AI' }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono font-semibold uppercase tracking-wider bg-indigo-500/12 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300 border border-indigo-500/25 leading-none shrink-0"
      title="Suggested by AI"
    >
      {label}
    </span>
  );
}

interface PriorityFlagDisplayProps {
  priority: TaskPriority;
  source?: FieldSource;
  compact?: boolean;
}

export function PriorityFlagDisplay({
  priority,
  source,
  compact = false,
}: PriorityFlagDisplayProps) {
  const meta = FLAG_META[priority] ?? FLAG_META[TaskPriority.None];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.textClass}`}
      aria-label={meta.ariaLabel}
    >
      <Flag
        className={`w-3.5 h-3.5 shrink-0 ${meta.iconClass} ${meta.fillClass}`}
        aria-hidden="true"
      />
      <span>{compact ? meta.shortLabel : meta.label}</span>
      {source === 'ai' && priority !== TaskPriority.None && <AiSourceBadge />}
    </span>
  );
}

interface PriorityFlagPickerProps {
  priority: TaskPriority;
  source?: FieldSource;
  taskTitle: string;
  compact?: boolean;
  onChange: (nextPriority: TaskPriority) => void;
}

export function PriorityFlagPicker({
  priority,
  source,
  taskTitle,
  compact = false,
  onChange,
}: PriorityFlagPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const meta = FLAG_META[priority] ?? FLAG_META[TaskPriority.None];

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Set priority flag for "${taskTitle}" (currently ${meta.label})`}
        title={`Priority: ${meta.label} — click to change`}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors whitespace-nowrap ${meta.textClass}`}
      >
        <Flag
          className={`w-3.5 h-3.5 shrink-0 ${meta.iconClass} ${meta.fillClass}`}
          aria-hidden="true"
        />
        <span>{compact ? meta.shortLabel : meta.label}</span>
        {source === 'ai' && priority !== TaskPriority.None && <AiSourceBadge />}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`Priority options for ${taskTitle}`}
          className="absolute left-0 top-full mt-1 z-40 min-w-[132px] p-1 rounded-lg bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-700 shadow-lg"
        >
          {PRIORITY_ORDER.map((option) => {
            const optMeta = FLAG_META[option];
            const active = priority === option;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(option);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition-colors ${
                  active
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Flag
                    className={`w-3.5 h-3.5 shrink-0 ${optMeta.iconClass} ${optMeta.fillClass}`}
                    aria-hidden="true"
                  />
                  <span>{optMeta.label}</span>
                </span>
                {active && (
                  <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
