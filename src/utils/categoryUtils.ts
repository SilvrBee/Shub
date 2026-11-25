import { CategoryItem, DEFAULT_CATEGORIES } from '../types/dashboard';

export interface CategoryColorOption {
  value: string;
  label: string;
}

export const CATEGORY_COLOR_OPTIONS: CategoryColorOption[] = [
  { value: '#2563eb', label: 'Cobalt' },
  { value: '#4f46e5', label: 'Indigo' },
  { value: '#7c3aed', label: 'Violet' },
  { value: '#e11d48', label: 'Rose' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#d97706', label: 'Amber' },
  { value: '#059669', label: 'Emerald' },
  { value: '#0d9488', label: 'Teal' },
  { value: '#0284c7', label: 'Sky' },
  { value: '#475569', label: 'Slate' },
];

export interface CategoryIconOption {
  name: string;
  label: string;
}

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { name: 'Briefcase', label: 'Briefcase' },
  { name: 'User', label: 'Personal' },
  { name: 'HeartPulse', label: 'Health' },
  { name: 'Wallet', label: 'Finance' },
  { name: 'Home', label: 'Home' },
  { name: 'BookOpen', label: 'Reading' },
  { name: 'Code', label: 'Engineering' },
  { name: 'Dumbbell', label: 'Fitness' },
  { name: 'ShoppingBag', label: 'Errands' },
  { name: 'Plane', label: 'Travel' },
  { name: 'Calendar', label: 'Events' },
  { name: 'Folder', label: 'Projects' },
  { name: 'Target', label: 'Goals' },
  { name: 'Layers', label: 'Systems' },
  { name: 'Utensils', label: 'Meals' },
  { name: 'Music', label: 'Music' },
  { name: 'Phone', label: 'Calls' },
  { name: 'Mail', label: 'Inbox' },
  { name: 'FileText', label: 'Writing' },
  { name: 'Shield', label: 'Security' },
  { name: 'Wrench', label: 'Maintenance' },
  { name: 'Star', label: 'Priority' },
  { name: 'Flag', label: 'Milestones' },
  { name: 'Clock', label: 'Time' },
];

const VALID_COLORS = new Set(CATEGORY_COLOR_OPTIONS.map((c) => c.value.toLowerCase()));
const VALID_ICONS = new Set(CATEGORY_ICON_OPTIONS.map((i) => i.name));

export function isValidCategoryColor(color: unknown): color is string {
  return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color.trim());
}

export function normalizeCategoryColor(color: unknown, fallbackIndex = 0): string {
  if (isValidCategoryColor(color)) {
    const trimmed = color.trim().toLowerCase();
    if (VALID_COLORS.has(trimmed)) return trimmed;
    return trimmed;
  }
  return CATEGORY_COLOR_OPTIONS[fallbackIndex % CATEGORY_COLOR_OPTIONS.length].value;
}

export function normalizeCategoryIcon(icon: unknown): string {
  if (typeof icon === 'string' && VALID_ICONS.has(icon)) {
    return icon;
  }
  return 'Folder';
}

export function normalizeCategories(raw: unknown): CategoryItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  }

  const seenNames = new Set<string>();
  const seenIds = new Set<string>();
  const result: CategoryItem[] = [];

  raw.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const candidate = item as Partial<CategoryItem>;
    const rawName = typeof candidate.name === 'string' ? candidate.name.trim().slice(0, 60) : '';
    if (!rawName) return;
    const nameKey = rawName.toLowerCase();
    if (seenNames.has(nameKey)) return;
    seenNames.add(nameKey);

    let id =
      typeof candidate.id === 'string' && candidate.id.trim()
        ? candidate.id.trim().slice(0, 64)
        : `cat-${nameKey.replace(/[^a-z0-9]+/g, '-') || index}`;
    if (seenIds.has(id)) {
      id = `${id}-${index}`;
    }
    seenIds.add(id);

    result.push({
      id,
      name: rawName,
      icon: normalizeCategoryIcon(candidate.icon),
      color: normalizeCategoryColor(candidate.color, index),
    });
  });

  if (result.length === 0) {
    return DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  }
  return result;
}

export function findCategoryByName(
  categories: CategoryItem[],
  name: string | undefined
): CategoryItem | undefined {
  if (!name) return undefined;
  const trimmed = name.trim().toLowerCase();
  return categories.find((c) => c.name.trim().toLowerCase() === trimmed);
}

export function makeCategoryId(name: string, existingIds: string[]): string {
  const base =
    'cat-' +
    (name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'custom');
  const taken = new Set(existingIds);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
