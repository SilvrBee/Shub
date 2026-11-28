import { describe, expect, it } from 'vitest';
import {
  buildGoogleDocUrl,
  buildJournalMonthlyWords,
  buildJournalYearHeatmap,
  computeJournalSummaryStats,
  extractGoogleDocId,
  extractMonthFromTabTitle,
  findOnThisDayEntries,
  parseGoogleDocJournal,
  parseJournalHeadingDate,
  resolveTodayJournalUrl,
  validateJournalDocs,
  validateJournalStats,
} from '../journalDocUtils';
import { JournalDayStat, JournalDocConnection } from '../../types/dashboard';

describe('extractGoogleDocId & buildGoogleDocUrl', () => {
  it('extracts Google Doc IDs from standard share/edit URLs, account-scoped URLs, and raw IDs', () => {
    expect(
      extractGoogleDocId('https://docs.google.com/document/d/1AbCdEfGhIjKlMnOpQrStUvWxYz123456/edit#heading=h.123')
    ).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz123456');

    expect(
      extractGoogleDocId('https://docs.google.com/document/u/0/d/doc_id-9876543210/view')
    ).toBe('doc_id-9876543210');

    expect(extractGoogleDocId('1AbCdEfGhIjKlMnOpQrStUvWxYz123456')).toBe(
      '1AbCdEfGhIjKlMnOpQrStUvWxYz123456'
    );

    expect(extractGoogleDocId('https://example.com/not-a-doc')).toBeNull();
    expect(extractGoogleDocId('   ')).toBeNull();
  });

  it('builds edit URLs targeting tab and heading anchors when present', () => {
    expect(buildGoogleDocUrl('doc1234567890')).toBe(
      'https://docs.google.com/document/d/doc1234567890/edit'
    );
    expect(buildGoogleDocUrl('doc1234567890', 't.nov', 'h.abc')).toBe(
      'https://docs.google.com/document/d/doc1234567890/edit?tab=t.nov#heading=h.abc'
    );
  });
});

describe('parseJournalHeadingDate & extractMonthFromTabTitle', () => {
  it('parses Nov 22, 22 Nov, Nov 22, 2026, full month names, and ordinals using docYear', () => {
    expect(parseJournalHeadingDate('Nov 22', 2026)).toBe('2026-11-22');
    expect(parseJournalHeadingDate('22 Nov', 2026)).toBe('2026-11-22');
    expect(parseJournalHeadingDate('Nov 22, 2026', 2026)).toBe('2026-11-22');
    expect(parseJournalHeadingDate('November 22nd, 2025', 2026)).toBe('2026-11-22');
    expect(parseJournalHeadingDate('22nd Nov 2026:', 2026)).toBe('2026-11-22');
    expect(parseJournalHeadingDate('Sept 5', 2026)).toBe('2026-09-05');
  });

  it('validates calendar dates including leap days and rejects non-date headings', () => {
    expect(parseJournalHeadingDate('Feb 29', 2024)).toBe('2024-02-29');
    expect(parseJournalHeadingDate('Feb 29', 2026)).toBeNull();
    expect(parseJournalHeadingDate('Feb 30', 2026)).toBeNull();
    expect(parseJournalHeadingDate('Monthly Review', 2026)).toBeNull();
    expect(parseJournalHeadingDate('Goals for November', 2026)).toBeNull();
  });

  it('extracts month index (1..12) from tab titles', () => {
    expect(extractMonthFromTabTitle('November 2026')).toBe(11);
    expect(extractMonthFromTabTitle('01 - Jan')).toBe(1);
    expect(extractMonthFromTabTitle('Overview')).toBeNull();
  });
});

function makeHeading(text: string, headingId: string, level: 1 | 2 | 3 = 2) {
  return {
    paragraph: {
      paragraphStyle: {
        namedStyleType: `HEADING_${level}`,
        headingId,
      },
      elements: [{ textRun: { content: `${text}\n` } }],
    },
  };
}

function makePara(text: string) {
  return {
    paragraph: {
      paragraphStyle: {
        namedStyleType: 'NORMAL_TEXT',
      },
      elements: [{ textRun: { content: `${text}\n` } }],
    },
  };
}

describe('parseGoogleDocJournal', () => {
  it('parses month tabs and nested childTabs, ignores empty & non-date headings, and computes exact counts', () => {
    const mockDoc = {
      documentId: 'doc_2026_journal',
      title: 'Journal 2026',
      tabs: [
        {
          tabProperties: { tabId: 't.nov', title: 'November' },
          documentTab: {
            body: {
              content: [
                makeHeading('Monthly Intentions', 'h.intent', 1),
                makePara('Prose before any date heading must be ignored.'),
                makeHeading('Nov 20', 'h.nov20'),
                makePara('   '), // Empty whitespace-only entry -> counts as not written
                makeHeading('Nov 22', 'h.nov22'),
                makePara('Hello world 123!'),
                makePara('Second paragraph.'),
                makeHeading('Reflection Summary', 'h.nonDate', 2),
                makePara('Prose under a non-date heading must NOT attach to Nov 22.'),
              ],
            },
          },
          childTabs: [
            {
              tabProperties: { tabId: 't.dec', title: 'December' },
              documentTab: {
                body: {
                  content: [
                    makeHeading('1 Dec, 2026', 'h.dec1'),
                    makePara('Crisp morning.'),
                  ],
                },
              },
            },
          ],
        },
        {
          tabProperties: { tabId: 't.oct', title: 'October' },
          documentTab: {
            body: {
              content: [makeHeading('Oct 5', 'h.oct5')], // heading with no body under it
            },
          },
        },
      ],
    };

    const parsed = parseGoogleDocJournal(mockDoc, 2026);
    expect(parsed.docTitle).toBe('Journal 2026');
    expect(parsed.monthTabIds).toEqual({ 10: 't.oct', 11: 't.nov', 12: 't.dec' });
    expect(parsed.stats.map((s) => s.dateKey)).toEqual(['2026-11-22', '2026-12-01']);

    const nov22 = parsed.stats[0];
    // "Hello world 123!" (3 words, 10 letters, 16 chars) + "Second paragraph." (2 words, 15 letters, 17 chars)
    expect(nov22.words).toBe(5);
    expect(nov22.letters).toBe(25);
    expect(nov22.characters).toBe(33);
    expect(nov22.paragraphs).toBe(2);
    expect(nov22.tabId).toBe('t.nov');
    expect(nov22.headingId).toBe('h.nov22');

    expect(parsed.liveEntries['2026-11-22'].snippet).toBe('Hello world 123! Second paragraph.');
    expect(parsed.liveEntries['2026-11-20']).toBeUndefined();
    expect(parsed.liveEntries['2026-10-05']).toBeUndefined();
  });

  it('strips unexpected text fields during validation so stats/docs remain privacy-safe', () => {
    const docs = validateJournalDocs([
      {
        year: 2026,
        docId: 'doc_2026_journal',
        docTitle: 'Journal 2026',
        secretText: 'should be stripped',
      },
    ]);
    expect(docs).toHaveLength(1);
    expect((docs[0] as unknown as Record<string, unknown>).secretText).toBeUndefined();

    const stats = validateJournalStats([
      {
        id: '2026-11-22',
        dateKey: '2026-11-22',
        year: 2026,
        words: 120,
        letters: 550,
        characters: 680,
        paragraphs: 3,
        snippet: 'must never persist',
        content: 'must never persist',
      },
      {
        id: '2026-11-23',
        dateKey: '2026-11-23',
        year: 2025, // mismatched year rejected
        words: 10,
      },
    ]);
    expect(stats).toHaveLength(1);
    expect((stats[0] as unknown as Record<string, unknown>).snippet).toBeUndefined();
    expect((stats[0] as unknown as Record<string, unknown>).content).toBeUndefined();
  });
});

describe('Journal analytics, heatmap, monthly bars, On this day, and Today URL', () => {
  const now = new Date(2026, 10, 27, 10, 0, 0); // 2026-11-27
  const stats: JournalDayStat[] = [
    { id: '2024-11-27', dateKey: '2024-11-27', year: 2024, words: 210, letters: 900, characters: 1120, paragraphs: 2, docId: 'd24', tabId: 't24', headingId: 'h24' },
    { id: '2025-11-27', dateKey: '2025-11-27', year: 2025, words: 350, letters: 1500, characters: 1900, paragraphs: 4, docId: 'd25', tabId: 't25', headingId: 'h25' },
    { id: '2026-11-24', dateKey: '2026-11-24', year: 2026, words: 100, letters: 450, characters: 560, paragraphs: 1, docId: 'd26' },
    { id: '2026-11-25', dateKey: '2026-11-25', year: 2026, words: 200, letters: 900, characters: 1100, paragraphs: 2, docId: 'd26' },
    { id: '2026-11-26', dateKey: '2026-11-26', year: 2026, words: 300, letters: 1350, characters: 1650, paragraphs: 3, docId: 'd26' },
    { id: '2026-01-10', dateKey: '2026-01-10', year: 2026, words: 400, letters: 1800, characters: 2200, paragraphs: 4, docId: 'd26' },
  ];

  it('computes summary stats, year totals, and active/longest streaks', () => {
    const summary = computeJournalSummaryStats(stats, 2026, now);
    expect(summary.entriesWritten).toBe(4);
    expect(summary.totalWords).toBe(1000);
    expect(summary.totalLetters).toBe(4500);
    expect(summary.averageWords).toBe(250);
    // Nov 24, 25, 26 are consecutive ending yesterday relative to Nov 27
    expect(summary.currentStreak).toBe(3);
    expect(summary.longestStreak).toBe(3);
    expect(summary.lifetimeEntries).toBe(6);
    expect(summary.lifetimeWords).toBe(1560);
  });

  it('builds heatmap cells and monthly word buckets accurately', () => {
    const heatmap = buildJournalYearHeatmap(stats, 2026, now);
    const flat = heatmap.weeks.flat().filter((c): c is NonNullable<typeof c> => Boolean(c));
    expect(flat).toHaveLength(365);

    const jan10 = flat.find((c) => c.dateKey === '2026-01-10');
    const nov27 = flat.find((c) => c.dateKey === '2026-11-27');
    const dec15 = flat.find((c) => c.dateKey === '2026-12-15');
    expect(jan10?.level).toBe(4);
    expect(nov27?.status).toBe('today');
    expect(nov27?.level).toBe(0);
    expect(dec15?.status).toBe('future');

    const monthly = buildJournalMonthlyWords(stats, 2026);
    expect(monthly[0].words).toBe(400);
    expect(monthly[10].words).toBe(600);
    expect(monthly[10].entries).toBe(3);
  });

  it('finds On this day entries from prior connected years and resolves Today Docs URL', () => {
    const docs: JournalDocConnection[] = [
      { id: '2026', year: 2026, docId: 'd26' },
      { id: '2025', year: 2025, docId: 'd25' },
      { id: '2024', year: 2024, docId: 'd24' },
    ];
    const memories = findOnThisDayEntries('2026-11-27', docs, stats, {
      '2025-11-27': {
        dateKey: '2025-11-27',
        year: 2025,
        docId: 'd25',
        tabId: 't25',
        headingId: 'h25',
        headingText: 'Nov 27',
        snippet: 'Live snippet from 2025.',
        words: 350,
        letters: 1500,
        characters: 1900,
        paragraphs: 4,
      },
    });
    expect(memories.map((m) => m.year)).toEqual([2025, 2024]);
    expect(memories[0].snippet).toBe('Live snippet from 2025.');
    expect(memories[0].isLoadedLive).toBe(true);
    expect(memories[1].snippet).toBeNull();
    expect(memories[1].isLoadedLive).toBe(false);

    // Fallback to November month tab when Today doesn't yet have its own heading
    expect(resolveTodayJournalUrl('2026-11-27', docs, stats, { 2026: { 11: 't.nov26' } })).toBe(
      'https://docs.google.com/document/d/d26/edit?tab=t.nov26'
    );
  });
});
