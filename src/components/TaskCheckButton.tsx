import { useEffect, useRef, useState } from 'react';
import { useCadenceStyle } from '../hooks/useCadenceStyle';
import { DoodleConfettiBurst } from './DoodleKit';

interface TaskCheckButtonProps {
  checked: boolean;
  indeterminate?: boolean;
  label: string;
  onToggle: () => void;
}

export function TaskCheckButton({
  checked,
  indeterminate = false,
  label,
  onToggle,
}: TaskCheckButtonProps) {
  const [animating, setAnimating] = useState(false);
  const prevCheckedRef = useRef(checked);
  const activeStyle = useCadenceStyle();

  useEffect(() => {
    if (!prevCheckedRef.current && checked) {
      setAnimating(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cadence:doodle-celebrate', { detail: { source: 'task' } })
        );
      }
      const t = window.setTimeout(() => setAnimating(false), 680);
      prevCheckedRef.current = checked;
      return () => window.clearTimeout(t);
    }
    prevCheckedRef.current = checked;
  }, [checked]);

  const isMixed = !checked && indeterminate;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isMixed ? 'mixed' : checked}
      onClick={onToggle}
      aria-label={label}
      style={{
        borderRadius: 'var(--cadence-radius-sm)',
        borderWidth: 'var(--cadence-border-width)',
      }}
      className={`relative mt-0.5 w-5 h-5 flex items-center justify-center shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
        checked
          ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500 text-white'
          : isMixed
            ? 'bg-blue-500/15 border-blue-600 dark:bg-blue-500/20 dark:border-blue-400 text-blue-600 dark:text-blue-400'
            : 'bg-white dark:bg-[#0B0F17] border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 text-transparent'
      } ${animating ? 'task-check-pop' : ''}`}
    >
      {animating && (
        <span
          aria-hidden="true"
          style={{ borderRadius: 'var(--cadence-radius-sm)' }}
          className="absolute inset-0 border-2 border-blue-500 dark:border-blue-400 pointer-events-none task-check-ripple"
        />
      )}
      {animating && activeStyle === 'doodle' && <DoodleConfettiBurst />}
      {(checked || isMixed) && (
        <svg
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          className={`w-3.5 h-3.5 ${animating ? 'task-check-draw' : ''}`}
        >
          {checked ? (
            <path
              d="M2.5 7.4L5.6 10.4L11.5 3.6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <line
              x1="3"
              y1="7"
              x2="11"
              y2="7"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          )}
        </svg>
      )}
    </button>
  );
}
