import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  Palette,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { CategoryItem, ScheduleBlock, TaskItem } from '../../types/dashboard';
import {
  CATEGORY_COLOR_OPTIONS,
  CATEGORY_ICON_OPTIONS,
  makeCategoryId,
} from '../../utils/categoryUtils';
import { CategoryIcon } from './CategoryBadge';
import { CustomSelect } from './CustomSelect';
import { PortalPopover } from './PortalPopover';

interface CategoryManagerProps {
  categories: CategoryItem[];
  tasks: TaskItem[];
  schedule: ScheduleBlock[];
  onAddCategory: (category: CategoryItem) => void;
  onUpdateCategory: (id: string, patch: Partial<CategoryItem>) => void;
  onReorderCategories: (nextOrder: CategoryItem[]) => void;
  onDeleteCategory: (id: string, reassignToName: string) => void;
}

interface IconPickerButtonProps {
  icon: string;
  color: string;
  ariaLabel: string;
  onSelect: (iconName: string) => void;
}

const IconPickerButton: React.FC<IconPickerButtonProps> = ({
  icon,
  color,
  ariaLabel,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORY_ICON_OPTIONS;
    return CATEGORY_ICON_OPTIONS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          setQuery('');
          setOpen((prev) => !prev);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        title="Change icon"
        className="cadence-control w-9 h-9 inline-flex items-center justify-center shrink-0 hover:border-blue-400 transition-colors cursor-pointer"
        style={{ color }}
      >
        <CategoryIcon icon={icon} className="w-4 h-4" />
      </button>

      <PortalPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorEl={btnRef.current}
        minWidth={248}
        maxWidth={280}
        maxHeight={300}
        role="dialog"
        ariaLabel="Choose category icon"
      >
        <div className="p-2.5 flex flex-col gap-2 min-h-0 flex-1">
          <div className="relative shrink-0">
            <Search
              aria-hidden="true"
              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons..."
              aria-label="Search icons"
              className="cadence-control w-full pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="grid grid-cols-6 gap-1 overflow-y-auto max-h-48 p-0.5">
            {filtered.map((item) => {
              const selected = item.name === icon;
              return (
                <button
                  key={item.name}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  aria-pressed={selected}
                  onClick={() => {
                    onSelect(item.name);
                    setOpen(false);
                    btnRef.current?.focus();
                  }}
                  className={`h-8 rounded-[var(--cadence-radius-sm)] flex items-center justify-center transition-colors cursor-pointer ${
                    selected
                      ? 'bg-blue-600 text-white'
                      : 'cadence-popover-item'
                  }`}
                >
                  <CategoryIcon icon={item.name} className="w-4 h-4" />
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-6 py-4 text-center text-xs text-slate-400">
                No icons match &ldquo;{query}&rdquo;
              </p>
            )}
          </div>
        </div>
      </PortalPopover>
    </>
  );
};

interface ColorPickerButtonProps {
  color: string;
  ariaLabel: string;
  onSelect: (hex: string) => void;
}

const ColorPickerButton: React.FC<ColorPickerButtonProps> = ({
  color,
  ariaLabel,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        title="Change color"
        className="cadence-control w-9 h-9 inline-flex items-center justify-center shrink-0 hover:border-blue-400 transition-colors cursor-pointer"
      >
        <span
          aria-hidden="true"
          className="w-4 h-4 rounded-full border border-black/15 dark:border-white/20"
          style={{ backgroundColor: color }}
        />
      </button>

      <PortalPopover
        open={open}
        onClose={() => setOpen(false)}
        anchorEl={btnRef.current}
        minWidth={210}
        maxWidth={232}
        maxHeight={200}
        role="dialog"
        ariaLabel="Choose category color"
      >
        <div className="p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Palette className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--cadence-popover-muted)' }}>
              Category Color
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {CATEGORY_COLOR_OPTIONS.map((opt) => {
              const selected = opt.value.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.label}
                  aria-label={opt.label}
                  aria-pressed={selected}
                  onClick={() => {
                    onSelect(opt.value);
                    setOpen(false);
                    btnRef.current?.focus();
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-105 cursor-pointer border ${
                    selected
                      ? 'border-slate-900 dark:border-white ring-2 ring-blue-500/40'
                      : 'border-black/15 dark:border-white/15'
                  }`}
                  style={{ backgroundColor: opt.value }}
                >
                  {selected && <Check className="w-3.5 h-3.5 text-white drop-shadow" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      </PortalPopover>
    </>
  );
};

interface CategoryRowEditorProps {
  category: CategoryItem;
  index: number;
  totalCount: number;
  usageCount: { tasks: number; schedule: number };
  allCategories: CategoryItem[];
  onRename: (id: string, nextName: string) => string | null;
  onUpdate: (id: string, patch: Partial<CategoryItem>) => void;
  onMove: (index: number, delta: -1 | 1) => void;
  onDelete: (id: string, reassignToName: string) => void;
}

const CategoryRowEditor: React.FC<CategoryRowEditorProps> = ({
  category,
  index,
  totalCount,
  usageCount,
  allCategories,
  onRename,
  onUpdate,
  onMove,
  onDelete,
}) => {
  const [draftName, setDraftName] = useState(category.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);

  const remainingCategories = useMemo(
    () => allCategories.filter((c) => c.id !== category.id),
    [allCategories, category.id]
  );

  const [reassignTarget, setReassignTarget] = useState<string>(
    remainingCategories[0]?.name ?? ''
  );

  React.useEffect(() => {
    setDraftName(category.name);
  }, [category.name]);

  React.useEffect(() => {
    if (remainingCategories.length > 0 && !remainingCategories.some((c) => c.name === reassignTarget)) {
      setReassignTarget(remainingCategories[0].name);
    }
  }, [remainingCategories, reassignTarget]);

  const commitName = () => {
    const trimmed = draftName.trim();
    if (trimmed === category.name) {
      setNameError(null);
      return;
    }
    const err = onRename(category.id, trimmed);
    if (err) {
      setNameError(err);
      setDraftName(category.name);
    } else {
      setNameError(null);
    }
  };

  const totalUsed = usageCount.tasks + usageCount.schedule;
  const canDelete = totalCount > 1;

  const handleDeleteClick = () => {
    if (!canDelete) return;
    if (totalUsed === 0) {
      onDelete(category.id, remainingCategories[0]?.name ?? 'Work');
      return;
    }
    setPendingDelete((prev) => !prev);
  };

  return (
    <div className="editorial-subtle-box rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-2.5 space-y-2">
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
        <ColorPickerButton
          color={category.color}
          ariaLabel={`Choose color for ${category.name}`}
          onSelect={(color) => onUpdate(category.id, { color })}
        />
        <IconPickerButton
          icon={category.icon}
          color={category.color}
          ariaLabel={`Choose icon for ${category.name}`}
          onSelect={(icon) => onUpdate(category.id, { icon })}
        />

        <div className="flex-1 min-w-[140px]">
          <input
            type="text"
            value={draftName}
            maxLength={60}
            aria-label={`Category name for ${category.name}`}
            onChange={(e) => {
              setDraftName(e.target.value);
              if (nameError) setNameError(null);
            }}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitName();
                (e.currentTarget as HTMLInputElement).blur();
              } else if (e.key === 'Escape') {
                setDraftName(category.name);
                setNameError(null);
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            className="cadence-control w-full px-2.5 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 px-1.5 whitespace-nowrap">
          {totalUsed === 0
            ? 'Unused'
            : [
                usageCount.tasks > 0 ? `${usageCount.tasks} task${usageCount.tasks === 1 ? '' : 's'}` : '',
                usageCount.schedule > 0 ? `${usageCount.schedule} block${usageCount.schedule === 1 ? '' : 's'}` : '',
              ]
                .filter(Boolean)
                .join(' · ')}
        </span>

        <div className="flex items-center gap-1 shrink-0 ml-auto">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
            aria-label={`Move ${category.name} up`}
            title="Move up"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={index === totalCount - 1}
            onClick={() => onMove(index, 1)}
            aria-label={`Move ${category.name} down`}
            title="Move down"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={handleDeleteClick}
            aria-label={
              canDelete
                ? `Delete category ${category.name}`
                : 'Cannot delete the last remaining category'
            }
            title={
              canDelete
                ? 'Delete category'
                : 'At least one category must exist'
            }
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-800 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {nameError && (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400 pl-1">
          {nameError}
        </p>
      )}

      {pendingDelete && remainingCategories.length > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-2 justify-between bg-rose-50/70 dark:bg-rose-950/30 -mx-1 px-2.5 py-2 rounded-lg">
          <div className="text-xs text-slate-700 dark:text-slate-200">
            Move <span className="font-semibold">{totalUsed}</span> existing item
            {totalUsed === 1 ? '' : 's'} from <span className="font-semibold">{category.name}</span> to:
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CustomSelect
              size="sm"
              value={reassignTarget}
              onChange={(v) => setReassignTarget(v)}
              ariaLabel={`Reassign items from ${category.name} to`}
              className="min-w-[150px]"
              options={remainingCategories.map((c) => ({
                value: c.name,
                label: c.name,
                color: c.color,
                icon: <CategoryIcon icon={c.icon} className="w-3.5 h-3.5" />,
              }))}
            />
            <button
              type="button"
              onClick={() => {
                onDelete(category.id, reassignTarget);
                setPendingDelete(false);
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-colors whitespace-nowrap"
            >
              Reassign &amp; Delete
            </button>
            <button
              type="button"
              onClick={() => setPendingDelete(false)}
              aria-label="Cancel deletion"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  tasks,
  schedule,
  onAddCategory,
  onUpdateCategory,
  onReorderCategories,
  onDeleteCategory,
}) => {
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('Folder');
  const [newColor, setNewColor] = useState(CATEGORY_COLOR_OPTIONS[0].value);
  const [addError, setAddError] = useState<string | null>(null);

  const usageMap = useMemo(() => {
    const map = new Map<string, { tasks: number; schedule: number }>();
    categories.forEach((c) => map.set(c.name.toLowerCase(), { tasks: 0, schedule: 0 }));

    tasks.forEach((t) => {
      if (!t.category) return;
      const key = t.category.trim().toLowerCase();
      const entry = map.get(key);
      if (entry) entry.tasks += 1;
    });
    schedule.forEach((b) => {
      if (!b.category) return;
      const key = b.category.trim().toLowerCase();
      const entry = map.get(key);
      if (entry) entry.schedule += 1;
    });
    return map;
  }, [categories, tasks, schedule]);

  const handleRename = (id: string, nextName: string): string | null => {
    const trimmed = nextName.trim();
    if (!trimmed) return 'Category name cannot be empty.';
    const duplicate = categories.some(
      (c) => c.id !== id && c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) return `A category named "${trimmed}" already exists.`;
    onUpdateCategory(id, { name: trimmed });
    return null;
  };

  const handleMove = (index: number, delta: -1 | 1) => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    const next = [...categories];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onReorderCategories(next);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim().slice(0, 60);
    if (!trimmed) {
      setAddError('Enter a category name.');
      return;
    }
    const duplicate = categories.some(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setAddError(`"${trimmed}" already exists.`);
      return;
    }
    const id = makeCategoryId(trimmed, categories.map((c) => c.id));
    onAddCategory({
      id,
      name: trimmed,
      icon: newIcon,
      color: newColor,
    });
    setNewName('');
    setAddError(null);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {categories.map((cat, idx) => (
          <CategoryRowEditor
            key={cat.id}
            category={cat}
            index={idx}
            totalCount={categories.length}
            usageCount={usageMap.get(cat.name.trim().toLowerCase()) ?? { tasks: 0, schedule: 0 }}
            allCategories={categories}
            onRename={handleRename}
            onUpdate={onUpdateCategory}
            onMove={handleMove}
            onDelete={onDeleteCategory}
          />
        ))}
      </div>

      <form
        onSubmit={handleAddSubmit}
        className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2"
      >
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <ColorPickerButton
            color={newColor}
            ariaLabel="Choose color for new category"
            onSelect={setNewColor}
          />
          <IconPickerButton
            icon={newIcon}
            color={newColor}
            ariaLabel="Choose icon for new category"
            onSelect={setNewIcon}
          />
          <input
            type="text"
            value={newName}
            maxLength={60}
            onChange={(e) => {
              setNewName(e.target.value);
              if (addError) setAddError(null);
            }}
            placeholder="New category name..."
            aria-label="New category name"
            className="cadence-control flex-1 min-w-[150px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add
          </button>
        </div>
        {addError && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
            {addError}
          </p>
        )}
      </form>
    </div>
  );
};
