import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { PortalPopover } from './PortalPopover';

export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  color?: string;
  description?: string;
  keywords?: string;
  disabled?: boolean;
}

export interface CustomSelectFooterAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: CustomSelectOption<T>[];
  placeholder?: string;
  prefixLabel?: string;
  ariaLabel?: string;
  id?: string;
  size?: 'sm' | 'md';
  searchable?: boolean;
  searchPlaceholder?: string;
  footerAction?: CustomSelectFooterAction;
  disabled?: boolean;
  align?: 'start' | 'end';
  matchTriggerWidth?: boolean;
  minPopoverWidth?: number;
  className?: string;
}

export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  prefixLabel,
  ariaLabel,
  id,
  size = 'md',
  searchable,
  searchPlaceholder = 'Search...',
  footerAction,
  disabled = false,
  align = 'start',
  matchTriggerWidth = true,
  minPopoverWidth = 190,
  className = '',
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const typeaheadRef = useRef<{ buffer: string; timer: number | null }>({
    buffer: '',
    timer: null,
  });

  const generatedId = useId();
  const listboxId = `${id || generatedId}-listbox`;

  const showSearch = searchable ?? options.length >= 7;

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) ?? null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const hay = `${opt.label} ${opt.description ?? ''} ${opt.keywords ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, searchQuery]);

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      return;
    }
    const currentIdx = filteredOptions.findIndex((o) => o.value === value && !o.disabled);
    const firstEnabled = filteredOptions.findIndex((o) => !o.disabled);
    setHighlightedIndex(currentIdx >= 0 ? currentIdx : Math.max(0, firstEnabled));
  }, [open, filteredOptions, value]);

  useEffect(() => {
    if (!open) return;
    if (showSearch) {
      const idRaf = window.requestAnimationFrame(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(idRaf);
    }
    return undefined;
  }, [open, showSearch]);

  useEffect(() => {
    if (!open) return;
    const node = optionRefs.current[highlightedIndex];
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  const selectOption = (opt: CustomSelectOption<T>) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveHighlight = (delta: number) => {
    if (filteredOptions.length === 0) return;
    let next = highlightedIndex;
    for (let i = 0; i < filteredOptions.length; i += 1) {
      next = (next + delta + filteredOptions.length) % filteredOptions.length;
      if (!filteredOptions[next]?.disabled) {
        setHighlightedIndex(next);
        return;
      }
    }
  };

  const handleTypeahead = (char: string) => {
    const state = typeaheadRef.current;
    if (state.timer !== null) window.clearTimeout(state.timer);
    state.buffer += char.toLowerCase();
    state.timer = window.setTimeout(() => {
      state.buffer = '';
    }, 500);

    const list = open ? filteredOptions : options;
    const matchIdx = list.findIndex(
      (opt) => !opt.disabled && opt.label.toLowerCase().startsWith(state.buffer)
    );
    if (matchIdx >= 0) {
      if (open) {
        setHighlightedIndex(matchIdx);
      } else {
        onChange(list[matchIdx].value);
      }
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((prev) => !prev);
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      handleTypeahead(e.key);
    }
  };

  const handlePopoverKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveHighlight(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveHighlight(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      const first = filteredOptions.findIndex((o) => !o.disabled);
      if (first >= 0) setHighlightedIndex(first);
    } else if (e.key === 'End') {
      e.preventDefault();
      for (let i = filteredOptions.length - 1; i >= 0; i -= 1) {
        if (!filteredOptions[i]?.disabled) {
          setHighlightedIndex(i);
          break;
        }
      }
    } else if (e.key === 'Enter') {
      const target = filteredOptions[highlightedIndex];
      if (target && !target.disabled) {
        e.preventDefault();
        selectOption(target);
      }
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (!showSearch && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      handleTypeahead(e.key);
    }
  };

  const sizeClasses =
    size === 'sm'
      ? 'min-h-[34px] px-2.5 py-1.5 text-xs gap-1.5'
      : 'min-h-[40px] px-3 py-2 text-sm gap-2';

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={`cadence-control inline-flex items-center justify-between text-left transition-colors ${sizeClasses} ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'
        } ${className}`}
      >
        <span className="inline-flex items-center gap-2 min-w-0 flex-1">
          {selectedOption?.color && (
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          {selectedOption?.icon && (
            <span className="shrink-0 inline-flex items-center" style={selectedOption.color ? { color: selectedOption.color } : undefined}>
              {selectedOption.icon}
            </span>
          )}
          {prefixLabel && (
            <span className="text-slate-500 dark:text-slate-400 shrink-0 font-normal">
              {prefixLabel}
            </span>
          )}
          <span className="truncate font-medium">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <PortalPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorEl={triggerRef.current}
        align={align}
        matchAnchorWidth={matchTriggerWidth}
        minWidth={minPopoverWidth}
        maxWidth={340}
        maxHeight={320}
      >
        <div onKeyDown={handlePopoverKeyDown} className="flex flex-col min-h-0 flex-1">
          {showSearch && (
            <div
              className="p-2 border-b shrink-0"
              style={{ borderColor: 'var(--cadence-border-subtle)' }}
            >
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  className="cadence-control w-full pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          <div
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel || placeholder}
            className="overflow-y-auto p-1.5 space-y-0.5 flex-1 min-h-0"
          >
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">
                No matching options
              </p>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={opt.value}
                    ref={(el) => {
                      optionRefs.current[idx] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    data-highlighted={isHighlighted ? 'true' : 'false'}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => selectOption(opt)}
                    className={`cadence-popover-item w-full flex items-center justify-between gap-2.5 px-2.5 py-2 text-left rounded-[var(--cadence-radius-sm)] text-sm transition-colors ${
                      opt.disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
                    } ${isSelected ? 'font-semibold' : 'font-normal'}`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0 flex-1">
                      {opt.color && (
                        <span
                          aria-hidden="true"
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: opt.color }}
                        />
                      )}
                      {opt.icon && (
                        <span
                          className="shrink-0 inline-flex items-center"
                          style={opt.color ? { color: opt.color } : undefined}
                        >
                          {opt.icon}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{opt.label}</span>
                        {opt.description && (
                          <span
                            className="block text-[11px] truncate"
                            style={{ color: 'var(--cadence-popover-muted)' }}
                          >
                            {opt.description}
                          </span>
                        )}
                      </span>
                    </span>
                    {isSelected && (
                      <Check
                        aria-hidden="true"
                        className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {footerAction && (
            <div
              className="p-1.5 border-t shrink-0"
              style={{ borderColor: 'var(--cadence-border-subtle)' }}
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  footerAction.onClick();
                }}
                className="cadence-popover-item w-full flex items-center gap-2 px-2.5 py-2 rounded-[var(--cadence-radius-sm)] text-xs font-medium text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
              >
                {footerAction.icon && <span className="shrink-0">{footerAction.icon}</span>}
                <span className="truncate">{footerAction.label}</span>
              </button>
            </div>
          )}
        </div>
      </PortalPopover>
    </>
  );
}
