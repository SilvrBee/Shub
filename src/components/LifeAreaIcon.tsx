import React from 'react';
import {
  BookOpen,
  Brain,
  Calendar,
  Compass,
  Flag,
  FolderKanban,
  GraduationCap,
  HeartPulse,
  Minus,
  Plane,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react';
import { CountdownIconId, LifeAreaId } from '../types/dashboard';
import { AreaPulseResult } from '../utils/lifeUtils';

const AREA_ICON_MAP: Record<LifeAreaId, React.ComponentType<{ className?: string }>> = {
  study: BookOpen,
  body: HeartPulse,
  mind: Brain,
  people: Users,
  skills: Wrench,
  projects: FolderKanban,
};

const COUNTDOWN_ICON_MAP: Record<CountdownIconId, React.ComponentType<{ className?: string }>> = {
  Calendar,
  Flag,
  GraduationCap,
  Plane,
  Trophy,
  Target,
  Compass,
  BookOpen,
  Star,
  Sparkles,
};

export function LifeAreaIcon({
  areaId,
  className = 'w-4 h-4',
}: {
  areaId: LifeAreaId;
  className?: string;
}) {
  const IconComp = AREA_ICON_MAP[areaId] || Compass;
  return <IconComp className={className} aria-hidden="true" />;
}

export function CountdownIcon({
  icon,
  className = 'w-4 h-4',
}: {
  icon: CountdownIconId | string;
  className?: string;
}) {
  const IconComp = COUNTDOWN_ICON_MAP[icon as CountdownIconId] || Calendar;
  return <IconComp className={className} aria-hidden="true" />;
}

export function PulseTrendBadge({
  trend,
  delta,
  compact = false,
}: {
  trend: AreaPulseResult['trend'];
  delta: number | null;
  compact?: boolean;
}) {
  if (trend === 'none' || delta === null) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 font-mono tabular-nums text-slate-400 dark:text-slate-500 ${
          compact ? 'text-[11px]' : 'text-xs'
        }`}
        aria-label="No previous 7-day baseline"
      >
        <Minus className="w-3 h-3" aria-hidden="true" />
      </span>
    );
  }

  if (trend === 'up') {
    return (
      <span
        className={`inline-flex items-center gap-0.5 font-mono font-medium tabular-nums text-emerald-600 dark:text-emerald-400 ${
          compact ? 'text-[11px]' : 'text-xs'
        }`}
        aria-label={`Up ${delta} points vs previous 7 days`}
      >
        <TrendingUp className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>+{delta}</span>
      </span>
    );
  }

  if (trend === 'down') {
    return (
      <span
        className={`inline-flex items-center gap-0.5 font-mono font-medium tabular-nums text-rose-600 dark:text-rose-400 ${
          compact ? 'text-[11px]' : 'text-xs'
        }`}
        aria-label={`Down ${Math.abs(delta)} points vs previous 7 days`}
      >
        <TrendingDown className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>{delta}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono tabular-nums text-slate-500 dark:text-slate-400 ${
        compact ? 'text-[11px]' : 'text-xs'
      }`}
      aria-label="Unchanged vs previous 7 days"
    >
      <Minus className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>0</span>
    </span>
  );
}
