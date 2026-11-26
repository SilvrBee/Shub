import { formatDateKey } from '../data/initialData';
import { CategoryItem, TaskPriority } from '../types/dashboard';
import { MAX_TASK_DURATION_MINUTES, parseDateKeyLocal } from './taskUtils';

export interface ParsedQuickAddTask {
  rawLine: string;
  title: string;
  priority: TaskPriority;
  category?: string;
  dueDate?: string;
  durationMinutes?: number;
}

const WEEKDAY_NAMES: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function makeStrictDateKey(year: number, month: number, day: number): string | undefined {
  const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return parseDateKeyLocal(key) ? key : undefined;
}

function addDays(base: Date, delta: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta);
  return formatDateKey(d);
}

function resolveNextWeekday(base: Date, targetDow: number, forceNextWeek: boolean): string {
  const currentDow = base.getDay();
  let diff = (targetDow - currentDow + 7) % 7;
  if (diff === 0) {
    diff = 7;
  } else if (forceNextWeek && diff < 7) {
    diff += 7;
  }
  return addDays(base, diff);
}

function resolveMonthDay(
  month: number,
  day: number,
  explicitYear: number | undefined,
  nowDate: Date
): string | undefined {
  if (explicitYear !== undefined) {
    const fullYear = explicitYear < 100 ? 2000 + explicitYear : explicitYear;
    return makeStrictDateKey(fullYear, month, day);
  }
  const thisYear = nowDate.getFullYear();
  const candThisYear = makeStrictDateKey(thisYear, month, day);
  if (!candThisYear) return undefined;
  const todayKey = formatDateKey(nowDate);
  if (candThisYear >= todayKey) return candThisYear;
  return makeStrictDateKey(thisYear + 1, month, day) ?? candThisYear;
}

/**
 * Parses a single quick-add line with optional rule-based tokens:
 * - Priority: !high, !med, !medium, !low, !none
 * - Category: #Work, #personal (case-insensitive match to configured categories)
 * - Dates: today, tomorrow/tmr, weekday names (mon..sunday, optional this/next),
 *          YYYY-MM-DD, MM/DD(/YYYY), Month Day (e.g., Nov 30, Dec 5)
 * - Durations: 30m, 45min, 2h, 1.5h, 1h30m
 */
export function parseQuickAddLine(
  line: string,
  categories: ReadonlyArray<CategoryItem>,
  nowDate = new Date(),
  defaultPriority: TaskPriority = TaskPriority.None
): ParsedQuickAddTask {
  let working = line.replace(/^[\s*\-•[\]]+/, '').trim();
  const rawLine = line.trim();

  let priority: TaskPriority = defaultPriority;
  let category: string | undefined;
  let dueDate: string | undefined;
  let durationMinutes: number | undefined;

  // 1. Priority tokens (!high, !med, !medium, !low, !none)
  working = working.replace(/(^|\s)!(high|medium|med|low|none)\b/gi, (full, lead: string, level: string) => {
    const l = level.toLowerCase();
    if (l === 'high') priority = TaskPriority.High;
    else if (l === 'medium' || l === 'med') priority = TaskPriority.Medium;
    else if (l === 'low') priority = TaskPriority.Low;
    else if (l === 'none') priority = TaskPriority.None;
    return lead;
  });

  // 2. Category tokens (#category)
  working = working.replace(/(^|\s)#([a-zA-Z0-9_-]{1,60})\b/g, (full, lead: string, tag: string) => {
    const matched = categories.find(
      (c) => c.name.trim().toLowerCase() === tag.trim().toLowerCase()
    );
    if (matched) {
      category = matched.name;
      return lead;
    }
    return full;
  });

  // 3. Duration tokens (1h30m, 1.5h, 2h, 45min, 30m)
  working = working.replace(
    /(^|\s)(\d+)\s*h(?:ours?|rs?)?\s*(\d+)\s*m(?:ins?|inutes?)?\b/gi,
    (full, lead: string, hStr: string, mStr: string) => {
      const total = Number(hStr) * 60 + Number(mStr);
      if (Number.isFinite(total) && total > 0) {
        durationMinutes = Math.min(MAX_TASK_DURATION_MINUTES, Math.round(total));
        return lead;
      }
      return full;
    }
  );

  if (durationMinutes === undefined) {
    working = working.replace(
      /(^|\s)(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/gi,
      (full, lead: string, numStr: string, unit: string) => {
        const val = Number(numStr);
        if (!Number.isFinite(val) || val <= 0) return full;
        const mins = unit.toLowerCase().startsWith('h') ? val * 60 : val;
        if (mins > 0) {
          durationMinutes = Math.min(MAX_TASK_DURATION_MINUTES, Math.max(1, Math.round(mins)));
          return lead;
        }
        return full;
      }
    );
  }

  // 4. Explicit YYYY-MM-DD
  if (!dueDate) {
    working = working.replace(/(^|\s)(\d{4}-\d{2}-\d{2})\b/g, (full, lead: string, iso: string) => {
      if (!dueDate && parseDateKeyLocal(iso)) {
        dueDate = iso;
        return lead;
      }
      return full;
    });
  }

  // 5. Explicit MM/DD or MM/DD/YYYY
  if (!dueDate) {
    working = working.replace(
      /(^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g,
      (full, lead: string, mStr: string, dStr: string, yStr?: string) => {
        const m = Number(mStr);
        const d = Number(dStr);
        const y = yStr ? Number(yStr) : undefined;
        const resolved = resolveMonthDay(m, d, y, nowDate);
        if (!dueDate && resolved) {
          dueDate = resolved;
          return lead;
        }
        return full;
      }
    );
  }

  // 6. Explicit Month Name + Day (e.g., Nov 30, November 5, 2026)
  if (!dueDate) {
    working = working.replace(
      /(^|\s)(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/gi,
      (full, lead: string, monStr: string, dStr: string, yStr?: string) => {
        const month = MONTH_NAMES[monStr.toLowerCase()];
        const day = Number(dStr);
        const year = yStr ? Number(yStr) : undefined;
        const resolved = month ? resolveMonthDay(month, day, year, nowDate) : undefined;
        if (!dueDate && resolved) {
          dueDate = resolved;
          return lead;
        }
        return full;
      }
    );
  }

  // 7. Relative keywords: today, tomorrow / tmr
  if (!dueDate) {
    working = working.replace(/(^|\s)(today)\b/gi, (full, lead: string) => {
      if (!dueDate) {
        dueDate = formatDateKey(nowDate);
        return lead;
      }
      return full;
    });
  }

  if (!dueDate) {
    working = working.replace(/(^|\s)(tomorrow|tmr|tmrw)\b/gi, (full, lead: string) => {
      if (!dueDate) {
        dueDate = addDays(nowDate, 1);
        return lead;
      }
      return full;
    });
  }

  // 8. Weekday names with optional "this" / "next"
  if (!dueDate) {
    working = working.replace(
      /(^|\s)(?:(this|next)\s+)?(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)\b/gi,
      (full, lead: string, mod: string | undefined, dayName: string) => {
        const dow = WEEKDAY_NAMES[dayName.toLowerCase()];
        if (!dueDate && dow !== undefined) {
          dueDate = resolveNextWeekday(nowDate, dow, mod?.toLowerCase() === 'next');
          return lead;
        }
        return full;
      }
    );
  }

  const cleanedTitle = working.replace(/\s+/g, ' ').trim();
  return {
    rawLine,
    title: cleanedTitle || rawLine.slice(0, 300),
    priority,
    category,
    dueDate,
    durationMinutes,
  };
}

export function parseQuickAddLines(
  text: string,
  categories: ReadonlyArray<CategoryItem>,
  nowDate = new Date(),
  defaultPriority: TaskPriority = TaskPriority.None
): ParsedQuickAddTask[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => parseQuickAddLine(line, categories, nowDate, defaultPriority));
}
