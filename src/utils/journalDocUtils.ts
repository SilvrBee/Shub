import { formatDateKey } from '../data/initialData';
import {
  JournalDayStat,
  JournalDocConnection,
  JournalLiveEntry,
} from '../types/dashboard';
import { normalizeDateKey } from './taskUtils';

const MONTH_ALIASES: Record<string, number> = {
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

const MONTH_SHORT_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const MONTH_FULL_LABELS = [
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
] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function extractGoogleDocId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(
    /docs\.google\.com\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{10,200})/i
  );
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  if (/^[a-zA-Z0-9_-]{10,200}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function buildGoogleDocUrl(
  docId: string,
  tabId?: string,
  headingId?: string
): string {
  const cleanId = encodeURIComponent(docId.trim());
  const tabQuery = tabId ? `?tab=${encodeURIComponent(tabId)}` : '';
  const headingHash = headingId ? `#heading=${encodeURIComponent(headingId)}` : '';
  return `https://docs.google.com/document/d/${cleanId}/edit${tabQuery}${headingHash}`;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return false;
  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(day) || day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

/**
 * Parses a journal heading into YYYY-MM-DD using `docYear` as the authoritative year.
 * Tolerates "Nov 22", "22 Nov", "Nov 22, 2026", "November 22nd", "22 November 2026", etc.
 * Non-date headings return null and are ignored.
 */
export function parseJournalHeadingDate(
  headingText: string,
  docYear: number
): string | null {
  if (!Number.isInteger(docYear) || docYear < 1900 || docYear > 2200) return null;
  const cleaned = headingText
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[:.\-–—]+$/g, '')
    .trim();

  if (!cleaned) return null;

  let monthNum: number | undefined;
  let dayNum: number | undefined;

  // Format A: "Nov 22", "Nov. 22", "Nov 22nd", "Nov 22, 2026", "November 22 2026"
  const monthFirst = cleaned.match(
    /^([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?$/i
  );
  if (monthFirst) {
    monthNum = MONTH_ALIASES[monthFirst[1].toLowerCase()];
    dayNum = Number(monthFirst[2]);
  } else {
    // Format B: "22 Nov", "22nd Nov", "22 Nov 2026", "22 November, 2026"
    const dayFirst = cleaned.match(
      /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?(?:\s*,?\s*(\d{4}))?$/i
    );
    if (dayFirst) {
      dayNum = Number(dayFirst[1]);
      monthNum = MONTH_ALIASES[dayFirst[2].toLowerCase()];
    }
  }

  if (!monthNum || !dayNum) return null;
  if (!isValidCalendarDate(docYear, monthNum, dayNum)) return null;

  return `${String(docYear).padStart(4, '0')}-${String(monthNum).padStart(2, '0')}-${String(
    dayNum
  ).padStart(2, '0')}`;
}

export function extractMonthFromTabTitle(title: string): number | null {
  const cleaned = title.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!cleaned) return null;

  const words = cleaned.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  for (const w of words) {
    if (MONTH_ALIASES[w]) {
      return MONTH_ALIASES[w];
    }
  }
  return null;
}

interface DocsTextRun {
  content?: string;
}

interface DocsParagraphElement {
  textRun?: DocsTextRun;
  richLink?: { richLinkProperties?: { title?: string } };
}

interface DocsParagraph {
  elements?: DocsParagraphElement[];
  paragraphStyle?: {
    namedStyleType?: string;
    headingId?: string;
  };
}

interface DocsStructuralElement {
  paragraph?: DocsParagraph;
  table?: {
    tableRows?: Array<{
      tableCells?: Array<{
        content?: DocsStructuralElement[];
      }>;
    }>;
  };
}

interface DocsTab {
  tabProperties?: {
    tabId?: string;
    title?: string;
  };
  documentTab?: {
    body?: {
      content?: DocsStructuralElement[];
    };
  };
  childTabs?: DocsTab[];
}

interface DocsDocumentShape {
  documentId?: string;
  title?: string;
  body?: {
    content?: DocsStructuralElement[];
  };
  tabs?: DocsTab[];
}

function extractParagraphRawText(paragraph: DocsParagraph | undefined): string {
  if (!paragraph?.elements) return '';
  let out = '';
  for (const el of paragraph.elements) {
    if (typeof el.textRun?.content === 'string') {
      out += el.textRun.content;
    } else if (typeof el.richLink?.richLinkProperties?.title === 'string') {
      out += el.richLink.richLinkProperties.title;
    }
  }
  return out.replace(/\r?\n$/g, '');
}

function isHeadingStyle(namedStyleType: string | undefined): boolean {
  if (!namedStyleType) return false;
  return /^HEADING_[1-6]$/.test(namedStyleType);
}

function countWordsInText(text: string): number {
  const tokens = text
    .trim()
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token));
  return tokens.length;
}

function countLettersInText(text: string): number {
  const matches = text.match(/\p{L}/gu);
  return matches ? matches.length : 0;
}

function buildLiveSnippet(paragraphs: string[], maxLen = 200): string {
  const flat = paragraphs.join(' ').replace(/\s+/g, ' ').trim();
  if (flat.length <= maxLen) return flat;
  return `${flat.slice(0, maxLen - 1).trimEnd()}…`;
}

export interface ParsedGoogleDocJournal {
  docId: string;
  docTitle: string;
  year: number;
  stats: JournalDayStat[];
  liveEntries: Record<string, JournalLiveEntry>;
  monthTabIds: Record<number, string>;
}

interface ActiveDayAccumulator {
  dateKey: string;
  tabId?: string;
  headingId?: string;
  headingText: string;
  paragraphs: string[];
}

export function parseGoogleDocJournal(
  rawDoc: unknown,
  docYear: number
): ParsedGoogleDocJournal {
  const docObj = (rawDoc && typeof rawDoc === 'object' ? rawDoc : {}) as DocsDocumentShape;
  const docId = typeof docObj.documentId === 'string' ? docObj.documentId : '';
  const docTitle = typeof docObj.title === 'string' ? docObj.title : `Journal ${docYear}`;
  const monthTabIds: Record<number, string> = {};
  const accumulators = new Map<string, ActiveDayAccumulator>();

  const processBodyContent = (
    elements: DocsStructuralElement[] | undefined,
    tabId: string | undefined
  ) => {
    if (!Array.isArray(elements)) return;
    let active: ActiveDayAccumulator | null = null;

    const pushParagraphText = (rawText: string) => {
      if (!active) return;
      const trimmed = rawText.trim();
      if (!trimmed) return;
      active.paragraphs.push(trimmed);
    };

    for (const el of elements) {
      if (el.paragraph) {
        const namedStyle = el.paragraph.paragraphStyle?.namedStyleType;
        const rawText = extractParagraphRawText(el.paragraph);

        if (isHeadingStyle(namedStyle)) {
          const parsedDate = parseJournalHeadingDate(rawText, docYear);
          if (parsedDate) {
            const existing = accumulators.get(parsedDate);
            if (existing) {
              active = existing;
            } else {
              active = {
                dateKey: parsedDate,
                tabId,
                headingId: el.paragraph.paragraphStyle?.headingId,
                headingText: rawText.trim(),
                paragraphs: [],
              };
              accumulators.set(parsedDate, active);
            }
          } else {
            // Non-date heading terminates any prior entry so subsequent prose isn't misattributed.
            active = null;
          }
          continue;
        }

        pushParagraphText(rawText);
      } else if (el.table && active) {
        for (const row of el.table.tableRows ?? []) {
          for (const cell of row.tableCells ?? []) {
            for (const cellEl of cell.content ?? []) {
              if (cellEl.paragraph) {
                pushParagraphText(extractParagraphRawText(cellEl.paragraph));
              }
            }
          }
        }
      }
    }
  };

  const traverseTab = (tab: DocsTab) => {
    const tabId = tab.tabProperties?.tabId;
    const tabTitle = tab.tabProperties?.title ?? '';
    if (tabId && tabTitle) {
      const m = extractMonthFromTabTitle(tabTitle);
      if (m && monthTabIds[m] === undefined) {
        monthTabIds[m] = tabId;
      }
    }
    processBodyContent(tab.documentTab?.body?.content, tabId);
    for (const child of tab.childTabs ?? []) {
      traverseTab(child);
    }
  };

  if (Array.isArray(docObj.tabs) && docObj.tabs.length > 0) {
    for (const tab of docObj.tabs) {
      traverseTab(tab);
    }
  } else if (docObj.body?.content) {
    processBodyContent(docObj.body.content, undefined);
  }

  const stats: JournalDayStat[] = [];
  const liveEntries: Record<string, JournalLiveEntry> = {};

  for (const acc of accumulators.values()) {
    if (acc.paragraphs.length === 0) continue;
    const joined = acc.paragraphs.join('\n');
    const words = countWordsInText(joined);
    if (words === 0) continue;
    const letters = countLettersInText(joined);
    const characters = acc.paragraphs.reduce((sum, p) => sum + p.length, 0);
    const paragraphs = acc.paragraphs.length;

    stats.push({
      id: acc.dateKey,
      dateKey: acc.dateKey,
      year: docYear,
      words,
      letters,
      characters,
      paragraphs,
      ...(docId ? { docId } : {}),
      ...(acc.tabId ? { tabId: acc.tabId } : {}),
      ...(acc.headingId ? { headingId: acc.headingId } : {}),
    });

    liveEntries[acc.dateKey] = {
      dateKey: acc.dateKey,
      year: docYear,
      docId,
      tabId: acc.tabId,
      headingId: acc.headingId,
      headingText: acc.headingText,
      snippet: buildLiveSnippet(acc.paragraphs, 200),
      words,
      letters,
      characters,
      paragraphs,
    };
  }

  stats.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  return {
    docId,
    docTitle,
    year: docYear,
    stats,
    liveEntries,
    monthTabIds,
  };
}

export function validateJournalDocs(raw: unknown): JournalDocConnection[] {
  if (!Array.isArray(raw)) return [];
  const byYear = new Map<number, JournalDocConnection>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const yearNum =
      typeof rec.year === 'number'
        ? Math.round(rec.year)
        : typeof rec.id === 'string' && /^\d{4}$/.test(rec.id)
          ? Number(rec.id)
          : NaN;
    if (!Number.isInteger(yearNum) || yearNum < 1900 || yearNum > 2200) continue;
    const docId =
      typeof rec.docId === 'string' && rec.docId.trim()
        ? rec.docId.trim().slice(0, 200)
        : '';
    if (!docId) continue;

    byYear.set(yearNum, {
      id: String(yearNum),
      year: yearNum,
      docId,
      ...(typeof rec.docUrl === 'string' && rec.docUrl.trim()
        ? { docUrl: rec.docUrl.trim().slice(0, 500) }
        : {}),
      ...(typeof rec.docTitle === 'string' && rec.docTitle.trim()
        ? { docTitle: rec.docTitle.trim().slice(0, 300) }
        : {}),
      ...(typeof rec.lastSyncedAt === 'string' && rec.lastSyncedAt.trim()
        ? { lastSyncedAt: rec.lastSyncedAt.trim().slice(0, 64) }
        : {}),
      ...(typeof rec.createdAt === 'string' ? { createdAt: rec.createdAt } : {}),
      ...(typeof rec.updatedAt === 'string' ? { updatedAt: rec.updatedAt } : {}),
    });
  }
  return Array.from(byYear.values()).sort((a, b) => b.year - a.year);
}

export function validateJournalStats(raw: unknown): JournalDayStat[] {
  if (!Array.isArray(raw)) return [];
  const byDate = new Map<string, JournalDayStat>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const dateKey = normalizeDateKey(rec.dateKey ?? rec.id);
    if (!dateKey) continue;
    const yearFromKey = Number(dateKey.slice(0, 4));
    const year =
      typeof rec.year === 'number' && Number.isInteger(rec.year)
        ? rec.year
        : yearFromKey;
    if (year !== yearFromKey) continue;

    const toNonNegInt = (v: unknown, max: number) =>
      typeof v === 'number' && Number.isFinite(v)
        ? Math.max(0, Math.min(max, Math.round(v)))
        : 0;

    const words = toNonNegInt(rec.words, 500_000);
    const letters = toNonNegInt(rec.letters, 2_500_000);
    const characters = toNonNegInt(rec.characters, 5_000_000);
    const paragraphs = toNonNegInt(rec.paragraphs, 50_000);

    byDate.set(dateKey, {
      id: dateKey,
      dateKey,
      year,
      words,
      letters,
      characters,
      paragraphs,
      ...(typeof rec.docId === 'string' && rec.docId.trim()
        ? { docId: rec.docId.trim().slice(0, 200) }
        : {}),
      ...(typeof rec.tabId === 'string' && rec.tabId.trim()
        ? { tabId: rec.tabId.trim().slice(0, 128) }
        : {}),
      ...(typeof rec.headingId === 'string' && rec.headingId.trim()
        ? { headingId: rec.headingId.trim().slice(0, 200) }
        : {}),
      ...(typeof rec.updatedAt === 'string' ? { updatedAt: rec.updatedAt } : {}),
    });
  }
  return Array.from(byDate.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function dateKeyToEpochDay(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return 0;
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export interface JournalSummaryStats {
  year: number;
  entriesWritten: number;
  totalWords: number;
  totalLetters: number;
  currentStreak: number;
  longestStreak: number;
  averageWords: number;
  lifetimeEntries: number;
  lifetimeWords: number;
  lifetimeLetters: number;
}

export function computeJournalSummaryStats(
  allStats: JournalDayStat[],
  selectedYear: number,
  now = new Date()
): JournalSummaryStats {
  const todayKey = formatDateKey(now);
  const todayEpoch = dateKeyToEpochDay(todayKey);

  const writtenAll = allStats.filter((s) => s.words > 0);
  const writtenForYear = writtenAll.filter((s) => s.year === selectedYear);

  const entriesWritten = writtenForYear.length;
  const totalWords = writtenForYear.reduce((sum, s) => sum + s.words, 0);
  const totalLetters = writtenForYear.reduce((sum, s) => sum + s.letters, 0);
  const averageWords = entriesWritten > 0 ? Math.round(totalWords / entriesWritten) : 0;

  const lifetimeEntries = writtenAll.length;
  const lifetimeWords = writtenAll.reduce((sum, s) => sum + s.words, 0);
  const lifetimeLetters = writtenAll.reduce((sum, s) => sum + s.letters, 0);

  const epochSet = new Set<number>();
  for (const s of writtenAll) {
    if (s.dateKey <= todayKey) {
      epochSet.add(dateKeyToEpochDay(s.dateKey));
    }
  }

  let currentStreak = 0;
  let cursor = epochSet.has(todayEpoch) ? todayEpoch : todayEpoch - 1;
  while (epochSet.has(cursor)) {
    currentStreak += 1;
    cursor -= 1;
  }

  const sortedEpochs = Array.from(epochSet).sort((a, b) => a - b);
  let longestStreak = 0;
  let run = 0;
  let prev: number | null = null;
  for (const ep of sortedEpochs) {
    if (prev !== null && ep === prev + 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prev = ep;
  }

  return {
    year: selectedYear,
    entriesWritten,
    totalWords,
    totalLetters,
    currentStreak,
    longestStreak,
    averageWords,
    lifetimeEntries,
    lifetimeWords,
    lifetimeLetters,
  };
}

export interface JournalHeatmapCell {
  dateKey: string;
  words: number;
  level: 0 | 1 | 2 | 3 | 4;
  status: 'past' | 'today' | 'future';
  monthIndex: number;
  dayOfMonth: number;
}

export interface JournalYearHeatmapData {
  year: number;
  weeks: Array<Array<JournalHeatmapCell | null>>;
  monthLabels: Array<{ monthIndex: number; label: string; colIndex: number }>;
  maxWords: number;
}

export function buildJournalYearHeatmap(
  allStats: JournalDayStat[],
  year: number,
  now = new Date()
): JournalYearHeatmapData {
  const safeYear = Number.isFinite(year)
    ? Math.max(1900, Math.min(2200, Math.round(year)))
    : now.getFullYear();
  const todayKey = formatDateKey(now);

  const wordsByDate = new Map<string, number>();
  let maxWords = 0;
  for (const s of allStats) {
    if (s.year !== safeYear || s.words <= 0) continue;
    wordsByDate.set(s.dateKey, s.words);
    if (s.words > maxWords) maxWords = s.words;
  }

  const scaleCeiling = Math.max(400, maxWords);
  const toLevel = (words: number): 0 | 1 | 2 | 3 | 4 => {
    if (words <= 0) return 0;
    const ratio = words / scaleCeiling;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  const jan1 = new Date(Date.UTC(safeYear, 0, 1));
  const dec31 = new Date(Date.UTC(safeYear, 11, 31));
  // Mon=0 .. Sun=6
  const startOffset = (jan1.getUTCDay() + 6) % 7;
  const totalDays = Math.round((dec31.getTime() - jan1.getTime()) / MS_PER_DAY) + 1;
  const numWeeks = Math.ceil((startOffset + totalDays) / 7);

  const weeks: Array<Array<JournalHeatmapCell | null>> = Array.from(
    { length: numWeeks },
    () => Array.from({ length: 7 }, () => null)
  );
  const monthLabels: Array<{ monthIndex: number; label: string; colIndex: number }> = [];
  const seenMonths = new Set<number>();

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset += 1) {
    const dt = new Date(Date.UTC(safeYear, 0, 1 + dayOffset));
    const gridPos = startOffset + dayOffset;
    const colIndex = Math.floor(gridPos / 7);
    const rowIndex = gridPos % 7;

    const mIdx = dt.getUTCMonth();
    const dNum = dt.getUTCDate();
    const dateKey = `${safeYear}-${String(mIdx + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
    const status: 'past' | 'today' | 'future' =
      dateKey > todayKey ? 'future' : dateKey === todayKey ? 'today' : 'past';
    const words = status === 'future' ? 0 : wordsByDate.get(dateKey) ?? 0;

    if (dNum === 1 && !seenMonths.has(mIdx)) {
      seenMonths.add(mIdx);
      monthLabels.push({
        monthIndex: mIdx,
        label: MONTH_SHORT_LABELS[mIdx],
        colIndex,
      });
    }

    weeks[colIndex][rowIndex] = {
      dateKey,
      words,
      level: status === 'future' ? 0 : toLevel(words),
      status,
      monthIndex: mIdx,
      dayOfMonth: dNum,
    };
  }

  return {
    year: safeYear,
    weeks,
    monthLabels,
    maxWords,
  };
}

export interface JournalMonthlyWordBar {
  monthIndex: number;
  label: string;
  fullLabel: string;
  words: number;
  entries: number;
}

export function buildJournalMonthlyWords(
  allStats: JournalDayStat[],
  year: number
): JournalMonthlyWordBar[] {
  const buckets = MONTH_SHORT_LABELS.map((label, idx) => ({
    monthIndex: idx,
    label,
    fullLabel: MONTH_FULL_LABELS[idx],
    words: 0,
    entries: 0,
  }));

  for (const s of allStats) {
    if (s.year !== year || s.words <= 0) continue;
    const monthIdx = Number(s.dateKey.slice(5, 7)) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      buckets[monthIdx].words += s.words;
      buckets[monthIdx].entries += 1;
    }
  }

  return buckets;
}

export interface OnThisDayJournalMemory {
  dateKey: string;
  year: number;
  docId: string;
  docUrl: string;
  words: number;
  snippet: string | null;
  isLoadedLive: boolean;
}

export function findOnThisDayEntries(
  todayKey: string,
  docs: JournalDocConnection[],
  allStats: JournalDayStat[],
  liveEntries: Record<string, JournalLiveEntry>
): OnThisDayJournalMemory[] {
  const currentYear = Number(todayKey.slice(0, 4));
  const mmDd = todayKey.slice(5, 10);
  const docsByYear = new Map(docs.map((d) => [d.year, d]));
  const statsByDate = new Map(allStats.map((s) => [s.dateKey, s]));

  const memories: OnThisDayJournalMemory[] = [];

  for (const docConn of docs) {
    if (docConn.year >= currentYear) continue;
    const dateKey = `${docConn.year}-${mmDd}`;
    const live = liveEntries[dateKey];
    const stat = statsByDate.get(dateKey);

    if (live && live.words > 0) {
      memories.push({
        dateKey,
        year: docConn.year,
        docId: docConn.docId,
        docUrl: buildGoogleDocUrl(docConn.docId, live.tabId, live.headingId),
        words: live.words,
        snippet: live.snippet,
        isLoadedLive: true,
      });
    } else if (stat && stat.words > 0) {
      memories.push({
        dateKey,
        year: docConn.year,
        docId: docConn.docId,
        docUrl: buildGoogleDocUrl(
          stat.docId || docsByYear.get(docConn.year)?.docId || docConn.docId,
          stat.tabId,
          stat.headingId
        ),
        words: stat.words,
        snippet: null,
        isLoadedLive: false,
      });
    }
  }

  return memories.sort((a, b) => b.year - a.year);
}

export function resolveTodayJournalUrl(
  todayKey: string,
  docs: JournalDocConnection[],
  allStats: JournalDayStat[],
  monthTabIdsByYear: Record<number, Record<number, string>>
): string | null {
  const year = Number(todayKey.slice(0, 4));
  const month = Number(todayKey.slice(5, 7));
  const docConn = docs.find((d) => d.year === year);
  if (!docConn) return null;

  const todayStat = allStats.find((s) => s.dateKey === todayKey && s.docId === docConn.docId);
  if (todayStat?.headingId) {
    return buildGoogleDocUrl(docConn.docId, todayStat.tabId, todayStat.headingId);
  }
  const fallbackTabId = todayStat?.tabId ?? monthTabIdsByYear[year]?.[month];
  return buildGoogleDocUrl(docConn.docId, fallbackTabId);
}
