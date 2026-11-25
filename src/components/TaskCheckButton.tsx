import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useCadenceStyle } from '../hooks/useCadenceStyle';
import { DoodleConfettiBurst } from './DoodleKit';

interface TaskCheckButtonProps {
  checked: boolean;
  label: string;
  onToggle: () => void;
}

export function TaskCheckButton({ checked, label, onToggle }: TaskCheckButtonProps) {
  const [animating, setAnimating] = useState(false);
  const prevCheckedRef = useRef(checked);
  const activeStyle = useCadenceStyle();

  useEffect(() => {
    if (!prevCheckedRef.current && checked) {
      setAnimating(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cadence:doodle-celebrate', { detail: { source: 'task' } }));
      }
      const t = window.setTimeout(() => setAnimating(false), 680);
      prevCheckedRef.current = checked;
      return () => window.clearTimeout(t);
    }
    prevCheckedRef.current = checked;
  }, [checked]);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className={`relative mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
        checked
          ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500 text-white'
          : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400'
      } ${animating ? 'task-check-pop' : ''}`}
    >
      {animating && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-md border-2 border-blue-500 dark:border-blue-400 pointer-events-none task-check-ripple"
        />
      )}
      {animating && activeStyle === 'doodle' && <DoodleConfettiBurst />}
      {checked && (
        <Check
          className={`w-3.5 h-3.5 ${animating ? 'task-check-draw' : ''}`}
          strokeWidth={2.5}
        />
      )}
    </button>
  );
}
