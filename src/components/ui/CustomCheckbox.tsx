import React from 'react';

interface CustomCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (nextChecked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  ariaLabel?: string;
  id?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  indeterminate = false,
  onChange,
  label,
  description,
  ariaLabel,
  id,
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const isMixed = !checked && indeterminate;
  const isActive = checked || isMixed;

  const boxSizeClass = size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]';
  const iconSizeClass = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  const handleToggle = () => {
    if (disabled) return;
    onChange(!checked);
  };

  const buttonNode = (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={isMixed ? 'mixed' : checked}
      aria-label={!label ? ariaLabel : undefined}
      disabled={disabled}
      onClick={handleToggle}
      className={`cadence-checkbox-box relative inline-flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${boxSizeClass} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${
        isActive
          ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500 shadow-xs'
          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400'
      }`}
      style={
        !isActive
          ? {
              backgroundColor: 'var(--cadence-bg-input)',
              borderColor: 'var(--cadence-border-color)',
            }
          : undefined
      }
    >
      {checked ? (
        <svg
          key="tick"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className={`${iconSizeClass} cadence-checkbox-tick`}
        >
          <path
            d="M3.2 8.4L6.4 11.4L12.8 4.8"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : isMixed ? (
        <svg
          key="dash"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className={`${iconSizeClass} cadence-checkbox-dash`}
        >
          <line
            x1="3.5"
            y1="8"
            x2="12.5"
            y2="8"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      ) : null}
    </button>
  );

  if (!label && !description) {
    return <span className={`inline-flex items-center ${className}`}>{buttonNode}</span>;
  }

  return (
    <div
      className={`inline-flex items-start gap-2.5 select-none ${
        disabled ? 'opacity-60' : ''
      } ${className}`}
    >
      <span className="pt-0.5 inline-flex">{buttonNode}</span>
      <span
        onClick={handleToggle}
        className={`flex flex-col min-w-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {label && (
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug">
            {label}
          </span>
        )}
        {description && (
          <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
            {description}
          </span>
        )}
      </span>
    </div>
  );
};
