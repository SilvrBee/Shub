import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import { formatDateKey, getTodayKey } from '../../data/initialData';
import { formatShortDateLabel, formatTimeShort } from '../../utils/taskUtils';
import { PortalPopover } from './PortalPopover';

interface DatePickerFieldProps {
  value?: string; // YYYY-MM-DD
  onChange: (value?: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

const WEEKDAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function parseDateValue(dateStr?: string): Date | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  value,
  onChange,
  placeholder = 'Pick date',
  ariaLabel = 'Choose date',
  id,
  disabled = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const todayKey = getTodayKey();

  const initialCursor = useMemo(() => {
    const parsed = parseDateValue(value);
    return parsed ?? new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState(initialCursor.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialCursor.getMonth());

  useEffect(() => {
    if (open) {
      const target = parseDateValue(value) ?? new Date();
      setViewYear(target.getFullYear());
      setViewMonth(target.getMonth());
    }
  }, [open, value]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startOffset = firstDay.getDay();
    const startDate = new Date(viewYear, viewMonth, 1 - startOffset);

    const cells: Array<{ key: string; day: number; inMonth: boolean }> = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
      cells.push({
        key: formatDateKey(d),
        day: d.getDate(),
        inMonth: d.getMonth() === viewMonth,
      });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const stepMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const formattedLabel = useMemo(() => {
    if (!value) return '';
    const short = formatShortDateLabel(value, todayKey);
    const parsed = parseDateValue(value);
    if (!parsed) return value;
    if (short === 'Today' || short === 'Tomorrow' || short === 'Yesterday') {
      return `${short} · ${parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return parsed.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: parsed.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  }, [value, todayKey]);

  return (
    <>
      <div className={`relative inline-flex items-center w-full ${className}`}>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={`cadence-control w-full min-h-[40px] pl-3 ${
            value ? 'pr-8' : 'pr-3'
          } py-2 text-sm inline-flex items-center gap-2 text-left transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'
          }`}
        >
          <Calendar
            aria-hidden="true"
            className="w-4 h-4 shrink-0 text-slate-400"
          />
          <span
            className={`truncate flex-1 ${
              value ? 'font-medium' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {formattedLabel || placeholder}
          </span>
        </button>

        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            aria-label="Clear date"
            className="absolute right-2 p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <PortalPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorEl={triggerRef.current}
        minWidth={280}
        maxWidth={310}
        maxHeight={360}
        role="dialog"
        ariaLabel={ariaLabel}
      >
        <div className="p-3 select-none">
          <div className="flex items-center justify-between mb-2.5">
            <button
              type="button"
              onClick={() => stepMonth(-1)}
              aria-label="Previous month"
              className="cadence-popover-item p-1.5 rounded-[var(--cadence-radius-sm)] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="text-sm font-semibold">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => stepMonth(1)}
              aria-label="Next month"
              className="cadence-popover-item p-1.5 rounded-[var(--cadence-radius-sm)] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAY_HEADERS.map((wd) => (
              <div
                key={wd}
                className="text-center text-[11px] font-semibold py-1"
                style={{ color: 'var(--cadence-popover-muted)' }}
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {calendarCells.map((cell) => {
              const isSelected = value === cell.key;
              const isToday = todayKey === cell.key;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    onChange(cell.key);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  aria-label={cell.key}
                  aria-pressed={isSelected}
                  className={`h-8 w-full rounded-[var(--cadence-radius-sm)] text-xs font-mono tabular-nums transition-colors cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold'
                      : isToday
                        ? 'ring-1 ring-inset ring-blue-500 font-semibold cadence-popover-item'
                        : cell.inMonth
                          ? 'cadence-popover-item'
                          : 'cadence-popover-item opacity-40'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div
            className="mt-2.5 pt-2 border-t flex items-center justify-between gap-2"
            style={{ borderColor: 'var(--cadence-border-subtle)' }}
          >
            <button
              type="button"
              onClick={() => {
                onChange(todayKey);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="cadence-popover-item px-2.5 py-1 rounded-[var(--cadence-radius-sm)] text-xs font-medium text-blue-600 dark:text-blue-400 cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="cadence-popover-item px-2.5 py-1 rounded-[var(--cadence-radius-sm)] text-xs font-medium cursor-pointer"
              style={{ color: 'var(--cadence-popover-muted)' }}
            >
              Clear
            </button>
          </div>
        </div>
      </PortalPopover>
    </>
  );
};

interface TimePickerFieldProps {
  value?: string; // HH:MM
  onChange: (value?: string) => void;
  timeFormat?: '24h' | '12h';
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_STEP_5 = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

function formatHourLabel(hour24: string, timeFormat: '24h' | '12h'): string {
  if (timeFormat === '24h') return hour24;
  const h = Number(hour24);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

export const TimePickerField: React.FC<TimePickerFieldProps> = ({
  value,
  onChange,
  timeFormat = '24h',
  placeholder = 'Pick time',
  ariaLabel = 'Choose time',
  id,
  allowClear = true,
  disabled = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [draftText, setDraftText] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [selectedHour, selectedMinute] = useMemo(() => {
    if (value && /^\d{2}:\d{2}$/.test(value)) {
      return value.split(':');
    }
    return ['09', '00'];
  }, [value]);

  useEffect(() => {
    if (open) {
      setDraftText(value ?? '');
    }
  }, [open, value]);

  const applyTime = (h: string, m: string, closeAfter = false) => {
    const next = `${h}:${m}`;
    setDraftText(next);
    onChange(next);
    if (closeAfter) {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const commitDraftText = () => {
    const trimmed = draftText.trim();
    if (!trimmed) {
      if (allowClear) onChange(undefined);
      return;
    }
    const match24 = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
    if (match24) {
      const h = match24[1].padStart(2, '0');
      const m = match24[2];
      onChange(`${h}:${m}`);
    }
  };

  const displayLabel = value ? formatTimeShort(value, timeFormat) : '';

  return (
    <>
      <div className={`relative inline-flex items-center w-full ${className}`}>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={`cadence-control w-full min-h-[40px] pl-3 ${
            value && allowClear ? 'pr-8' : 'pr-3'
          } py-2 text-sm inline-flex items-center gap-2 text-left transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'
          }`}
        >
          <Clock aria-hidden="true" className="w-4 h-4 shrink-0 text-slate-400" />
          <span
            className={`truncate flex-1 font-mono tabular-nums ${
              displayLabel ? 'font-medium' : 'font-sans text-slate-400 dark:text-slate-500'
            }`}
          >
            {displayLabel || placeholder}
          </span>
        </button>

        {value && allowClear && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            aria-label="Clear time"
            className="absolute right-2 p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700/70 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <PortalPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorEl={triggerRef.current}
        minWidth={256}
        maxWidth={290}
        maxHeight={320}
        role="dialog"
        ariaLabel={ariaLabel}
      >
        <div className="p-2.5 flex flex-col gap-2 min-h-0 flex-1">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onBlur={commitDraftText}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitDraftText();
                  setOpen(false);
                  triggerRef.current?.focus();
                }
              }}
              placeholder="HH:MM (24h)"
              aria-label="Type time in HH:MM format"
              className="cadence-control flex-1 px-2.5 py-1.5 text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {(['09:00', '14:00', '17:00'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  const [ph, pm] = preset.split(':');
                  applyTime(ph, pm, true);
                }}
                className="cadence-popover-item px-2 py-1.5 rounded-[var(--cadence-radius-sm)] text-[11px] font-mono tabular-nums cursor-pointer"
              >
                {timeFormat === '24h' ? preset : formatTimeShort(preset, '12h').replace(':00 ', '')}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5 min-h-0 flex-1">
            <div className="flex flex-col min-h-0">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-1.5 pb-1"
                style={{ color: 'var(--cadence-popover-muted)' }}
              >
                Hour
              </span>
              <div className="overflow-y-auto max-h-44 space-y-0.5 pr-0.5">
                {HOURS_24.map((hr) => {
                  const active = value ? selectedHour === hr : false;
                  return (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => applyTime(hr, selectedMinute)}
                      className={`w-full px-2 py-1.5 rounded-[var(--cadence-radius-sm)] text-xs font-mono tabular-nums text-left cursor-pointer transition-colors ${
                        active ? 'bg-blue-600 text-white font-semibold' : 'cadence-popover-item'
                      }`}
                    >
                      {formatHourLabel(hr, timeFormat)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col min-h-0">
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-1.5 pb-1"
                style={{ color: 'var(--cadence-popover-muted)' }}
              >
                Min
              </span>
              <div className="overflow-y-auto max-h-44 space-y-0.5 pr-0.5">
                {MINUTES_STEP_5.map((min) => {
                  const active = value ? selectedMinute === min : false;
                  return (
                    <button
                      key={min}
                      type="button"
                      onClick={() => applyTime(selectedHour, min, true)}
                      className={`w-full px-2 py-1.5 rounded-[var(--cadence-radius-sm)] text-xs font-mono tabular-nums text-left cursor-pointer transition-colors ${
                        active ? 'bg-blue-600 text-white font-semibold' : 'cadence-popover-item'
                      }`}
                    >
                      :{min}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className="pt-1.5 border-t flex items-center justify-between gap-2 shrink-0"
            style={{ borderColor: 'var(--cadence-border-subtle)' }}
          >
            {allowClear ? (
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="cadence-popover-item px-2.5 py-1 rounded-[var(--cadence-radius-sm)] text-xs font-medium cursor-pointer"
                style={{ color: 'var(--cadence-popover-muted)' }}
              >
                Clear
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => {
                commitDraftText();
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="px-2.5 py-1 rounded-[var(--cadence-radius-sm)] text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </PortalPopover>
    </>
  );
};
