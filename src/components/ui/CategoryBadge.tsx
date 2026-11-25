import React from 'react';
import {
  BookOpen,
  Briefcase,
  Calendar,
  Clock,
  Code,
  Dumbbell,
  FileText,
  Flag,
  Folder,
  HeartPulse,
  Home,
  Layers,
  Mail,
  Music,
  Phone,
  Plane,
  Shield,
  ShoppingBag,
  Star,
  Target,
  User,
  Utensils,
  Wallet,
  Wrench,
} from 'lucide-react';
import { CategoryItem } from '../../types/dashboard';
import { findCategoryByName } from '../../utils/categoryUtils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Briefcase,
  User,
  HeartPulse,
  Wallet,
  Home,
  BookOpen,
  Code,
  Dumbbell,
  ShoppingBag,
  Plane,
  Calendar,
  Folder,
  Target,
  Layers,
  Utensils,
  Music,
  Phone,
  Mail,
  FileText,
  Shield,
  Wrench,
  Star,
  Flag,
  Clock,
};

export const CategoryIcon: React.FC<{ icon?: string; className?: string }> = ({
  icon,
  className = 'w-3.5 h-3.5',
}) => {
  const IconComp = (icon && ICON_MAP[icon]) || Folder;
  return <IconComp className={className} aria-hidden="true" />;
};

interface CategoryBadgeProps {
  name?: string;
  categories: CategoryItem[];
  compact?: boolean;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  name,
  categories,
  compact = false,
  className = '',
}) => {
  if (!name) return null;
  const matched = findCategoryByName(categories, name);
  const color = matched?.color ?? '#64748b';
  const iconName = matched?.icon ?? 'Folder';

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap ${
        compact ? 'text-[11px]' : 'text-xs'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span style={{ color }} className="inline-flex items-center shrink-0">
        <CategoryIcon icon={iconName} className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      </span>
      <span className="truncate max-w-[120px]">{matched?.name ?? name}</span>
    </span>
  );
};
