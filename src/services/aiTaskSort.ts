import { getTodayKey } from '../data/initialData';
import { ScheduleBlock, TaskItem, TaskPriority } from '../types/dashboard';

export interface AiTaskSuggestion {
  id: string;
  suggestedPriority?: TaskPriority.High | TaskPriority.Medium | TaskPriority.Low;
  suggestedDurationMinutes?: number;
}

export interface AiSortResult {
  orderedTaskIds: string[];
  suggestions: AiTaskSuggestion[];
}

const USAGE_STORAGE_KEY = 'cadence_ai_usage_v1';

interface DailyUsageRecord {
  dateKey: string;
  count: number;
}

export function getAiUsageToday(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as DailyUsageRecord;
    if (parsed.dateKey !== getTodayKey()) return 0;
    return typeof parsed.count === 'number' && parsed.count >= 0 ? parsed.count : 0;
  } catch {
    return 0;
  }
}

function incrementAiUsageToday(): number {
  if (typeof window === 'undefined') return 0;
  const today = getTodayKey();
  const next = getAiUsageToday() + 1;
  try {
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify({ dateKey: today, count: next }));
  } catch {
    // ignore storage failures
  }
  return next;
}

export class AiSortError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export async function requestAiTaskSort(params: {
  openTasks: TaskItem[];
  schedule: ScheduleBlock[];
  dailyCap: number;
}): Promise<{ result: AiSortResult; usedToday: number }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new AiSortError('You appear to be offline. Using score order.', 'OFFLINE');
  }

  const used = getAiUsageToday();
  const cap = Math.max(1, params.dailyCap);
  if (used >= cap) {
    throw new AiSortError(
      `Daily AI limit (${cap}) reached. Using score order.`,
      'DAILY_CAP'
    );
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('/api/tasks/ai-sort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        todayDate: getTodayKey(),
        schedule: params.schedule.map((b) => ({
          title: b.title,
          startTime: b.startTime,
          endTime: b.endTime,
          category: b.category,
        })),
        tasks: params.openTasks.map((t) => ({
          id: t.id,
          title: t.title,
          details: t.details,
          dueDate: t.dueDate,
          dueTime: t.dueTime,
          deadlineDate: t.deadlineDate,
          deadlineTime: t.deadlineTime,
          priority: t.priority,
          durationMinutes: t.durationMinutes,
          subtasks: t.subtasks?.map((s) => ({
            title: s.title,
            completed: s.completed,
          })),
          pinned: Boolean(t.pinned),
        })),
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      orderedTaskIds?: unknown;
      suggestions?: unknown;
    };

    if (!response.ok) {
      throw new AiSortError(
        data.error || 'AI sort unavailable right now. Using score order.',
        data.code || 'HTTP_ERROR'
      );
    }

    if (!Array.isArray(data.orderedTaskIds) || !Array.isArray(data.suggestions)) {
      throw new AiSortError('Invalid AI sort response. Using score order.', 'INVALID_SCHEMA');
    }

    const orderedTaskIds = data.orderedTaskIds.filter((id): id is string => typeof id === 'string');
    const suggestions: AiTaskSuggestion[] = [];

    for (const rawSug of data.suggestions) {
      if (!rawSug || typeof rawSug !== 'object') continue;
      const obj = rawSug as Record<string, unknown>;
      if (typeof obj.id !== 'string') continue;

      const sug: AiTaskSuggestion = { id: obj.id };
      if (
        obj.suggestedPriority === 'High' ||
        obj.suggestedPriority === 'Medium' ||
        obj.suggestedPriority === 'Low'
      ) {
        sug.suggestedPriority = obj.suggestedPriority as
          | TaskPriority.High
          | TaskPriority.Medium
          | TaskPriority.Low;
      }
      if (
        typeof obj.suggestedDurationMinutes === 'number' &&
        Number.isFinite(obj.suggestedDurationMinutes) &&
        obj.suggestedDurationMinutes > 0
      ) {
        sug.suggestedDurationMinutes = Math.round(obj.suggestedDurationMinutes);
      }
      if (sug.suggestedPriority || sug.suggestedDurationMinutes) {
        suggestions.push(sug);
      }
    }

    const nextCount = incrementAiUsageToday();
    return {
      result: { orderedTaskIds, suggestions },
      usedToday: nextCount,
    };
  } catch (err) {
    if (err instanceof AiSortError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AiSortError('AI request timed out. Using score order.', 'TIMEOUT');
    }
    throw new AiSortError('Network issue reaching AI sort. Using score order.', 'NETWORK');
  } finally {
    window.clearTimeout(timeout);
  }
}
