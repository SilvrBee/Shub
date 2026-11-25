import { ReactNode } from 'react';

export type EmptyIllustrationKind =
  | 'tasks'
  | 'schedule'
  | 'focus'
  | 'habits'
  | 'notes'
  | 'workspace';

interface EmptyStateIllustrationProps {
  kind: EmptyIllustrationKind;
  title?: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function IllustrationSvg({ kind }: { kind: EmptyIllustrationKind }) {
  switch (kind) {
    case 'tasks':
      return (
        <svg
          viewBox="0 0 120 92"
          fill="none"
          aria-hidden="true"
          className="w-28 h-22 mx-auto text-slate-300 dark:text-slate-700"
        >
          <rect
            x="22"
            y="10"
            width="76"
            height="72"
            rx="10"
            className="fill-slate-50 dark:fill-slate-900/80 stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <rect
            x="44"
            y="5"
            width="32"
            height="10"
            rx="4"
            className="fill-slate-200 dark:fill-slate-700"
          />
          <rect
            x="33"
            y="27"
            width="12"
            height="12"
            rx="3.5"
            className="fill-blue-600/15 dark:fill-blue-500/20 stroke-blue-600 dark:stroke-blue-400"
            strokeWidth="1.5"
          />
          <path
            d="M36 33l2.2 2.2 4-4.2"
            className="stroke-blue-600 dark:stroke-blue-400"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="52" y="30" width="34" height="5" rx="2.5" className="fill-slate-200 dark:fill-slate-700" />
          <rect
            x="33"
            y="47"
            width="12"
            height="12"
            rx="3.5"
            className="stroke-slate-300 dark:stroke-slate-600"
            strokeWidth="1.5"
          />
          <rect x="52" y="50" width="26" height="5" rx="2.5" className="fill-slate-200 dark:fill-slate-700" />
          <rect
            x="33"
            y="65"
            width="12"
            height="8"
            rx="3"
            className="stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <rect x="52" y="67" width="20" height="4.5" rx="2.25" className="fill-slate-100 dark:fill-slate-800" />
        </svg>
      );

    case 'schedule':
      return (
        <svg
          viewBox="0 0 120 92"
          fill="none"
          aria-hidden="true"
          className="w-28 h-22 mx-auto"
        >
          <rect
            x="16"
            y="14"
            width="88"
            height="66"
            rx="10"
            className="fill-slate-50 dark:fill-slate-900/80 stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <line
            x1="16"
            y1="30"
            x2="104"
            y2="30"
            className="stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <circle cx="28" cy="22" r="2.5" className="fill-blue-600 dark:fill-blue-400" />
          <rect x="36" y="20" width="28" height="4" rx="2" className="fill-slate-200 dark:fill-slate-700" />
          <rect
            x="26"
            y="38"
            width="42"
            height="12"
            rx="4"
            className="fill-blue-600/15 dark:fill-blue-500/20 stroke-blue-600 dark:stroke-blue-400"
            strokeWidth="1.5"
          />
          <rect x="44" y="55" width="48" height="12" rx="4" className="fill-slate-200/70 dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.25" strokeDasharray="3 2" />
          <circle cx="88" cy="40" r="10" className="fill-white dark:fill-[#121927] stroke-slate-300 dark:stroke-slate-600" strokeWidth="1.5" />
          <path d="M88 35.5v4.5l3 2" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 'focus':
      return (
        <svg
          viewBox="0 0 120 92"
          fill="none"
          aria-hidden="true"
          className="w-28 h-22 mx-auto"
        >
          <circle
            cx="60"
            cy="48"
            r="32"
            className="fill-slate-50 dark:fill-slate-900/80 stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <circle
            cx="60"
            cy="48"
            r="23"
            className="stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <path
            d="M60 25 A23 23 0 0 1 83 48"
            className="stroke-blue-600 dark:stroke-blue-400"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <rect x="53" y="8" width="14" height="5" rx="2.5" className="fill-slate-300 dark:fill-slate-600" />
          <circle cx="60" cy="48" r="3.5" className="fill-blue-600 dark:fill-blue-400" />
          <line
            x1="60"
            y1="48"
            x2="60"
            y2="34"
            className="stroke-slate-700 dark:stroke-slate-200"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="60"
            y1="48"
            x2="70"
            y2="52"
            className="stroke-blue-600 dark:stroke-blue-400"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'habits':
      return (
        <svg
          viewBox="0 0 120 92"
          fill="none"
          aria-hidden="true"
          className="w-28 h-22 mx-auto"
        >
          <rect
            x="16"
            y="14"
            width="88"
            height="64"
            rx="10"
            className="fill-slate-50 dark:fill-slate-900/80 stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          {[0, 1, 2, 3, 4].map((col) =>
            [0, 1, 2].map((row) => {
              const lit = (col === 0 && row < 2) || (col === 1 && row > 0) || col === 2 || (col === 3 && row === 1) || (col === 4 && row === 0);
              return (
                <rect
                  key={`${col}-${row}`}
                  x={26 + col * 14}
                  y={26 + row * 14}
                  width="10"
                  height="10"
                  rx="2.5"
                  className={
                    lit
                      ? 'fill-blue-600/80 dark:fill-blue-400/80'
                      : 'fill-slate-200 dark:fill-slate-700'
                  }
                />
              );
            })
          )}
        </svg>
      );

    case 'notes':
      return (
        <svg
          viewBox="0 0 120 92"
          fill="none"
          aria-hidden="true"
          className="w-28 h-22 mx-auto"
        >
          <rect
            x="30"
            y="16"
            width="62"
            height="66"
            rx="8"
            transform="rotate(-4 30 16)"
            className="fill-slate-100 dark:fill-slate-800/80 stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <rect
            x="28"
            y="12"
            width="64"
            height="68"
            rx="8"
            className="fill-slate-50 dark:fill-slate-900/90 stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <rect x="39" y="25" width="32" height="5" rx="2.5" className="fill-blue-600/70 dark:fill-blue-400/70" />
          <rect x="39" y="37" width="42" height="3.5" rx="1.75" className="fill-slate-200 dark:fill-slate-700" />
          <rect x="39" y="45" width="38" height="3.5" rx="1.75" className="fill-slate-200 dark:fill-slate-700" />
          <rect x="39" y="53" width="28" height="3.5" rx="1.75" className="fill-slate-200 dark:fill-slate-700" />
          <path
            d="M78 58l10-10 5 5-10 10-6 1 1-6z"
            className="fill-blue-600/15 dark:fill-blue-500/20 stroke-blue-600 dark:stroke-blue-400"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'workspace':
      return (
        <svg
          viewBox="0 0 120 92"
          fill="none"
          aria-hidden="true"
          className="w-28 h-22 mx-auto"
        >
          <rect
            x="16"
            y="18"
            width="52"
            height="42"
            rx="8"
            className="fill-slate-50 dark:fill-slate-900/80 stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="1.5"
          />
          <rect x="24" y="27" width="20" height="4" rx="2" className="fill-blue-600/70 dark:fill-blue-400/70" />
          <rect x="24" y="36" width="34" height="3.5" rx="1.75" className="fill-slate-200 dark:fill-slate-700" />
          <rect x="24" y="43" width="26" height="3.5" rx="1.75" className="fill-slate-200 dark:fill-slate-700" />
          <rect
            x="52"
            y="34"
            width="52"
            height="42"
            rx="8"
            className="fill-white dark:fill-[#121927] stroke-blue-600/40 dark:stroke-blue-400/40"
            strokeWidth="1.5"
          />
          <circle cx="66" cy="49" r="6" className="fill-blue-600/15 dark:fill-blue-500/20 stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.5" />
          <rect x="77" y="47" width="18" height="4" rx="2" className="fill-slate-300 dark:fill-slate-600" />
          <rect x="61" y="61" width="33" height="3.5" rx="1.75" className="fill-slate-200 dark:fill-slate-700" />
        </svg>
      );
  }
}

export function EmptyStateIllustration({
  kind,
  title,
  description,
  action,
  compact = false,
}: EmptyStateIllustrationProps) {
  return (
    <div
      className={`text-center flex flex-col items-center justify-center ${
        compact ? 'px-5 py-8' : 'px-6 py-12'
      }`}
    >
      <div className={`${title || description || action ? (compact ? 'mb-3 scale-90' : 'mb-4') : ''}`}>
        <IllustrationSvg kind={kind} />
      </div>
      {title && (
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 text-balance">
          {title}
        </p>
      )}
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
