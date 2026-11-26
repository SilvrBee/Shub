import { describe, expect, it } from 'vitest';
import { parseQuickAddLine, parseQuickAddLines } from '../quickAddParser';
import { DEFAULT_CATEGORIES, TaskPriority } from '../../types/dashboard';

describe('quickAddParser', () => {
  // Friday May 15, 2026
  const refNow = new Date(2026, 4, 15, 10, 0, 0);

  it('parses today, tomorrow/tmr, priority flags, categories, and durations', () => {
    const res1 = parseQuickAddLine(
      'Prepare board slides tomorrow !high #work 45m',
      DEFAULT_CATEGORIES,
      refNow
    );
    expect(res1.title).toBe('Prepare board slides');
    expect(res1.dueDate).toBe('2026-05-16');
    expect(res1.priority).toBe(TaskPriority.High);
    expect(res1.category).toBe('Work');
    expect(res1.durationMinutes).toBe(45);

    const res2 = parseQuickAddLine(
      '- Pay electric bill today !med #Finance 1h30m',
      DEFAULT_CATEGORIES,
      refNow
    );
    expect(res2.title).toBe('Pay electric bill');
    expect(res2.dueDate).toBe('2026-05-15');
    expect(res2.priority).toBe(TaskPriority.Medium);
    expect(res2.category).toBe('Finance');
    expect(res2.durationMinutes).toBe(90);

    const res3 = parseQuickAddLine(
      'Stretch and hydrate tmr !low 1.5h',
      DEFAULT_CATEGORIES,
      refNow
    );
    expect(res3.dueDate).toBe('2026-05-16');
    expect(res3.priority).toBe(TaskPriority.Low);
    expect(res3.durationMinutes).toBe(90);
  });

  it('parses weekdays (with next) and explicit month/ISO dates while rejecting invalid dates', () => {
    // From Friday 2026-05-15 -> Monday is 2026-05-18; "next Monday" -> 2026-05-25
    const mon = parseQuickAddLine('Weekly sync monday', DEFAULT_CATEGORIES, refNow);
    expect(mon.dueDate).toBe('2026-05-18');

    const nextMon = parseQuickAddLine('Planning next monday', DEFAULT_CATEGORIES, refNow);
    expect(nextMon.dueDate).toBe('2026-05-25');

    const monthDay = parseQuickAddLine('Renew passport Nov 30 #Personal', DEFAULT_CATEGORIES, refNow);
    expect(monthDay.dueDate).toBe('2026-11-30');
    expect(monthDay.category).toBe('Personal');

    const invalidDate = parseQuickAddLine('Bad date 2026-02-30', DEFAULT_CATEGORIES, refNow);
    expect(invalidDate.dueDate).toBeUndefined();
    expect(invalidDate.title).toContain('2026-02-30');
  });

  it('parses multi-line blocks ignoring blank lines and preserving unknown hashtags in title', () => {
    const parsed = parseQuickAddLines(
      `
      * Follow up on #PR123 #work 2h
      
      Buy groceries #unknownTag
      `,
      DEFAULT_CATEGORIES,
      refNow,
      TaskPriority.Low
    );

    expect(parsed).toHaveLength(2);
    expect(parsed[0].category).toBe('Work');
    expect(parsed[0].title).toBe('Follow up on #PR123');
    expect(parsed[0].durationMinutes).toBe(120);
    expect(parsed[0].priority).toBe(TaskPriority.Low);

    expect(parsed[1].category).toBeUndefined();
    expect(parsed[1].title).toBe('Buy groceries #unknownTag');
  });
});
