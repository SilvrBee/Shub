import { KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { TaskPriority } from '../types/dashboard';
import { PortalPopover } from './ui/PortalPopover';

export const FLAG_META: Record<
  TaskPriority,
  {
    label: string;
    shortLabel: string;
    ariaLabel: string;
    colorClass: string;
  }
> = {
  [TaskPriority.High]: {
    label: 'High',
    shortLabel: 'High',
    ariaLabel: 'High priority flag (solid)',
    colorClass: 'cadence-flag-high',
  },
  [TaskPriority.Medium]: {
    label: 'Medium',
    shortLabel: 'Med',
    ariaLabel: 'Medium priority flag (half-filled)',
    colorClass: 'cadence-flag-medium',
  },
  [TaskPriority.Low]: {
    label: 'Low',
    shortLabel: 'Low',
    ariaLabel: 'Low priority flag (outlined with dot)',
    colorClass: 'cadence-flag-low',
  },
  [TaskPriority.None]: {
    label: 'None',
    shortLabel: 'None',
    ariaLabel: 'No priority flag (dashed outline)',
    colorClass: 'cadence-flag-none',
  },
};

export const PRIORITY_ORDER: TaskPriority[] = [
  TaskPriority.High,
  TaskPriority.Medium,
  TaskPriority.Low,
  TaskPriority.None,
];

/**
 * Distinct shape + fill treatment per priority level so flags remain
 * immediately distinguishable without relying on color alone:
 * - High: Solid filled pennant
 * - Medium: Half-filled (striped diagonal/bottom fill + crisp outline)
 * - Low: Hollow outline with center dot
 * - None: Faint dashed outline
 */
export function PriorityFlagGlyph({
  priority,
  className = 'w-3.5 h-3.5 shrink-0',
}: {
  priority: TaskPriority;
  className?: string;
}) {
  const meta = FLAG_META[priority] ?? FLAG_META[TaskPriority.None];

  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={`${className} ${meta.colorClass}`}
    >
      {/* Flag pole */}
      <path
        d="M3 2.25V14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity={priority === TaskPriority.None ? 0.72 : 1}
      />

      {priority === TaskPriority.High && (
        <path
          d="M3.5 2.5H13.2L11.1 5.9L13.2 9.3H3.5V2.5Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      )}

      {priority === TaskPriority.Medium && (
        <>
          <path
            d="M3.5 2.5H13.2L11.1 5.9L13.2 9.3H3.5V2.5Z"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
          <path
            d="M3.5 5.9H11.1L13.2 9.3H3.5V5.9Z"
            fill="currentColor"
            fillOpacity="0.88"
          />
        </>
      )}

      {priority === TaskPriority.Low && (
        <>
          <path
            d="M3.5 2.5H13.2L11.1 5.9L13.2 9.3H3.5V2.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
          <circle cx="7.4" cy="5.9" r="1.25" fill="currentColor" />
        </>
      )}

      {priority === TaskPriority.None && (
        <path
          d="M3.5 2.5H13.2L11.1 5.9L13.2 9.3H3.5V2.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeDasharray="2 1.7"
          strokeLinejoin="round"
          opacity="0.72"
        />
      )}
    </svg>
  );
}

interface PriorityFlagDisplayProps {
  priority: TaskPriority;
  compact?: boolean;
}

export function PriorityFlagDisplay({
  priority,
  compact = false,
}: PriorityFlagDisplayProps) {
  const meta = FLAG_META[priority] ?? FLAG_META[TaskPriority.None];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.colorClass}`}
      aria-label={meta.ariaLabel}
    >
      <PriorityFlagGlyph priority={priority} />
      <span>{compact ? meta.shortLabel : meta.label}</span>
    </span>
  );
}

interface PriorityFlagPickerProps {
  priority: TaskPriority;
  taskTitle: string;
  compact?: boolean;
  onChange: (nextPriority: TaskPriority) => void;
}

export function PriorityFlagPicker({
  priority,
  taskTitle,
  compact = false,
  onChange,
}: PriorityFlagPickerProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(() =>
    Math.max(0, PRIORITY_ORDER.indexOf(priority))
  );
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const meta = FLAG_META[priority] ?? FLAG_META[TaskPriority.None];

  useEffect(() => {
    if (!open) return;
    const currentIdx = Math.max(0, PRIORITY_ORDER.indexOf(priority));
    setHighlightedIdx(currentIdx);
    const t = window.setTimeout(() => {
      itemRefs.current[currentIdx]?.focus();
    }, 15);
    return () => window.clearTimeout(t);
  }, [open, priority]);

  const handleMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (highlightedIdx + 1) % PRIORITY_ORDER.length;
      setHighlightedIdx(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = (highlightedIdx - 1 + PRIORITY_ORDER.length) % PRIORITY_ORDER.length;
      setHighlightedIdx(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlightedIdx(0);
      itemRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = PRIORITY_ORDER.length - 1;
      setHighlightedIdx(last);
      itemRefs.current[last]?.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Set priority flag for "${taskTitle}" (currently ${meta.label})`}
        title={`Priority: ${meta.label} — click to change`}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors whitespace-nowrap ${meta.colorClass}`}
      >
        <PriorityFlagGlyph priority={priority} />
        <span>{compact ? meta.shortLabel : meta.label}</span>
      </button>

      <PortalPopover
        open={open}
        anchorEl={triggerRef.current}
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
        minWidth={150}
        maxWidth={190}
        maxHeight={220}
        role="menu"
        ariaLabel={`Priority options for ${taskTitle}`}
        className="p-1"
      >
        <div onKeyDown={handleMenuKeyDown} className="space-y-0.5">
          {PRIORITY_ORDER.map((option, idx) => {
            const optMeta = FLAG_META[option];
            const active = priority === option;
            return (
              <button
                key={option}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                data-highlighted={idx === highlightedIdx ? 'true' : undefined}
                onMouseEnter={() => setHighlightedIdx(idx)}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(option);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="cadence-popover-item w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <PriorityFlagGlyph priority={option} />
                  <span className={optMeta.colorClass}>{optMeta.label}</span>
                </span>
                {active && (
                  <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </PortalPopover>
    </>
  );
}
