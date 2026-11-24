import {
  CommitmentItem,
  GeminiJournalAnalysis,
  JournalConfig,
  JournalEntrySummary,
  PersonProfile,
  PersonSuggestion,
  ReviewSuggestion,
  TimelineEvent,
} from '../types/dashboard';
import {
  fsCommitments,
  fsJournal,
  fsPeople,
  fsPeopleSuggestions,
  fsReviewSuggestions,
  fsTimeline,
  sanitizeId,
  updateUserJournalConfig,
} from './firestoreService';
import { analyzeJournalEntryWithFirebaseAI } from './firebaseAiService';
import {
  fetchGoogleDocEntries,
  ParsedJournalEntry,
  sha256Hex,
} from './journalDocsService';

export interface SyncSingleResult {
  status: 'synced' | 'up_to_date' | 'modified_detected' | 'empty';
  entryHeading?: string;
  entryDate?: string;
  modifiedEntry?: ParsedJournalEntry;
  newSuggestionsCount?: number;
  allEntries?: ParsedJournalEntry[];
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findMatchingPerson(
  people: PersonProfile[],
  candidateName: string
): PersonProfile | undefined {
  const target = normalizeName(candidateName);
  if (!target) return undefined;
  return people.find((p) => {
    if (normalizeName(p.name) === target) return true;
    return p.aliases.some((a) => normalizeName(a) === target);
  });
}

async function persistAnalysisResults(params: {
  uid: string;
  docId: string;
  docUrl?: string;
  entry: ParsedJournalEntry;
  analysis: GeminiJournalAnalysis;
  existingEntries: JournalEntrySummary[];
  existingSuggestions: ReviewSuggestion[];
  existingPeople: PersonProfile[];
  existingPeopleSuggestions: PersonSuggestion[];
  existingCommitments: CommitmentItem[];
  existingTimeline: TimelineEvent[];
}): Promise<number> {
  const {
    uid,
    docId,
    docUrl,
    entry,
    analysis,
    existingEntries,
    existingSuggestions,
    existingPeople,
    existingPeopleSuggestions,
    existingCommitments,
    existingTimeline,
  } = params;

  const entryId = sanitizeId(`${docId}_${entry.entryDate}`);
  const existsAlready = existingEntries.some((e) => e.id === entryId);
  const nowIso = new Date().toISOString();

  await fsJournal.upsertEntry(
    uid,
    {
      id: entryId,
      docId,
      docUrl,
      entryDate: entry.entryDate,
      heading: entry.heading,
      contentHash: entry.contentHash,
      summary: analysis.summary || 'Entry synced.',
      themes: (analysis.themes ?? []).slice(0, 8),
      mentionedPeople: (analysis.peopleMentions ?? []).map((p) => p.name).slice(0, 25),
      entrySnippet: entry.snippet,
      syncedAt: nowIso,
    },
    existsAlready
  );

  let createdCount = 0;

  const existingSuggestionFps = new Set(existingSuggestions.map((s) => s.fingerprint));
  const existingCommitmentFps = new Set(existingCommitments.map((c) => c.fingerprint));
  const existingTimelineFps = new Set(existingTimeline.map((t) => t.fingerprint));
  const existingPeopleSuggestionFps = new Set(
    existingPeopleSuggestions.map((p) => p.fingerprint)
  );

  // 1. Sleep findings -> Confirmation Inbox
  for (const item of analysis.sleepFindings ?? []) {
    const fp = await sha256Hex(`sleep::${entry.entryDate}::${item.title}::${item.proposedValue}`);
    if (existingSuggestionFps.has(fp)) continue;
    existingSuggestionFps.add(fp);
    await fsReviewSuggestions.create(uid, {
      id: `sug_${fp.slice(0, 24)}`,
      kind: 'sleep',
      status: 'pending',
      title: item.title,
      proposedValue: item.proposedValue,
      category: 'Sleep',
      entryDate: entry.entryDate,
      sourceEntryId: entryId,
      excerpt: item.excerpt,
      fingerprint: fp,
    });
    createdCount++;
  }

  // 2. Spending findings -> Confirmation Inbox
  for (const item of analysis.spendingFindings ?? []) {
    const fp = await sha256Hex(
      `spending::${entry.entryDate}::${item.title}::${item.proposedValue}`
    );
    if (existingSuggestionFps.has(fp)) continue;
    existingSuggestionFps.add(fp);
    await fsReviewSuggestions.create(uid, {
      id: `sug_${fp.slice(0, 24)}`,
      kind: 'spending',
      status: 'pending',
      title: item.title,
      proposedValue: item.proposedValue,
      amount: typeof item.amount === 'number' ? item.amount : undefined,
      currency: item.currency || 'USD',
      category: item.category || 'General',
      entryDate: entry.entryDate,
      sourceEntryId: entryId,
      excerpt: item.excerpt,
      fingerprint: fp,
    });
    createdCount++;
  }

  // 3. Vault suggestions (links, songs, notes) -> Confirmation Inbox
  for (const item of analysis.vaultSuggestions ?? []) {
    const kindMap = {
      link: 'vault_link',
      song: 'vault_song',
      note: 'vault_note',
    } as const;
    const mappedKind = kindMap[item.kind] ?? 'vault_note';
    const fp = await sha256Hex(`${mappedKind}::${entry.entryDate}::${item.title}`);
    if (existingSuggestionFps.has(fp)) continue;
    existingSuggestionFps.add(fp);
    await fsReviewSuggestions.create(uid, {
      id: `sug_${fp.slice(0, 24)}`,
      kind: mappedKind,
      status: 'pending',
      title: item.title,
      proposedValue: item.description,
      category: item.artist || item.url || (item.tags ?? []).join(', '),
      entryDate: entry.entryDate,
      sourceEntryId: entryId,
      excerpt: item.excerpt,
      fingerprint: fp,
    });
    createdCount++;
  }

  // 4. People mentions -> update existing matched profile OR propose new profile
  for (const mention of analysis.peopleMentions ?? []) {
    const matched = findMatchingPerson(existingPeople, mention.name);
    if (matched) {
      const nextEntryIds = Array.from(new Set([...matched.sourceEntryIds, entryId]));
      const nextMemories = mention.memory
        ? Array.from(new Set([...matched.memories, `${entry.entryDate}: ${mention.memory}`]))
        : matched.memories;
      const latestDate =
        (matched.lastMentionedDate || '') >= entry.entryDate
          ? matched.lastMentionedDate
          : entry.entryDate;

      await fsPeople.update(uid, matched.id, {
        sourceEntryIds: nextEntryIds.slice(0, 100),
        mentionCount: nextEntryIds.length,
        lastMentionedDate: latestDate,
        memories: nextMemories.slice(0, 40),
        ...(mention.birthday && !matched.birthday ? { birthday: mention.birthday } : {}),
        ...(mention.relationship && !matched.relationship
          ? { relationship: mention.relationship }
          : {}),
      });
    } else {
      const fp = await sha256Hex(`person::${normalizeName(mention.name)}`);
      if (existingPeopleSuggestionFps.has(fp)) continue;
      existingPeopleSuggestionFps.add(fp);
      await fsPeopleSuggestions.create(uid, {
        id: `psug_${fp.slice(0, 24)}`,
        name: mention.name.trim(),
        relationship: mention.relationship || undefined,
        birthday: mention.birthday || undefined,
        memory: mention.memory || undefined,
        excerpt: mention.excerpt,
        entryDate: entry.entryDate,
        sourceEntryId: entryId,
        status: 'pending',
        fingerprint: fp,
      });
      createdCount++;
    }
  }

  // 5. Commitments ("Things I Said I'd Do")
  for (const item of analysis.commitments ?? []) {
    const fp = await sha256Hex(`commitment::${entry.entryDate}::${item.title}`);
    if (existingCommitmentFps.has(fp)) continue;
    existingCommitmentFps.add(fp);
    await fsCommitments.create(uid, {
      id: `cmt_${fp.slice(0, 24)}`,
      title: item.title,
      originalStatement: item.originalStatement,
      context: item.context || undefined,
      dateMentioned: entry.entryDate,
      dueDate: item.dueDate || undefined,
      status: 'pending',
      sourceEntryId: entryId,
      fingerprint: fp,
    });
    createdCount++;
  }

  // 6. Selective Timeline Milestone Candidates (pending approval)
  for (const item of analysis.timelineCandidates ?? []) {
    const fp = await sha256Hex(`timeline::${entry.entryDate}::${item.title}`);
    if (existingTimelineFps.has(fp)) continue;
    existingTimelineFps.add(fp);
    await fsTimeline.create(uid, {
      id: `tl_${fp.slice(0, 24)}`,
      title: item.title,
      description: item.description,
      eventDate: entry.entryDate,
      category: item.category || 'Milestone',
      excerpt: item.excerpt,
      sourceEntryId: entryId,
      docUrl,
      status: 'pending',
      fingerprint: fp,
    });
    createdCount++;
  }

  return createdCount;
}

export async function syncLatestJournalEntry(params: {
  uid: string;
  accessToken: string;
  journalConfig: JournalConfig;
  existingEntries: JournalEntrySummary[];
  existingSuggestions: ReviewSuggestion[];
  existingPeople: PersonProfile[];
  existingPeopleSuggestions: PersonSuggestion[];
  existingCommitments: CommitmentItem[];
  existingTimeline: TimelineEvent[];
  forceReprocess?: boolean;
}): Promise<SyncSingleResult> {
  const {
    uid,
    accessToken,
    journalConfig,
    existingEntries,
    existingSuggestions,
    existingPeople,
    existingPeopleSuggestions,
    existingCommitments,
    existingTimeline,
    forceReprocess = false,
  } = params;

  if (!journalConfig.journalDocId) {
    throw new Error('Select your Google Docs journal first.');
  }

  try {
    const { entries } = await fetchGoogleDocEntries(journalConfig.journalDocId, accessToken);
    if (entries.length === 0) {
      await updateUserJournalConfig(uid, {
        lastSyncedAt: new Date().toISOString(),
        lastSyncError: '',
      });
      return { status: 'empty' };
    }

    const latest = entries[entries.length - 1];
    const entryId = sanitizeId(`${journalConfig.journalDocId}_${latest.entryDate}`);
    const prevEntry = existingEntries.find((e) => e.id === entryId);

    if (prevEntry && prevEntry.contentHash === latest.contentHash && !forceReprocess) {
      await updateUserJournalConfig(uid, {
        lastSyncedAt: new Date().toISOString(),
        lastSyncError: '',
      });
      return {
        status: 'up_to_date',
        entryDate: latest.entryDate,
        entryHeading: latest.heading,
        allEntries: entries,
      };
    }

    if (prevEntry && prevEntry.contentHash !== latest.contentHash && !forceReprocess) {
      return {
        status: 'modified_detected',
        entryDate: latest.entryDate,
        entryHeading: latest.heading,
        modifiedEntry: latest,
        allEntries: entries,
      };
    }

    const analysis = await analyzeJournalEntryWithFirebaseAI({
      entryDate: latest.entryDate,
      heading: latest.heading,
      entryText: latest.text,
      knownPeople: existingPeople.map((p) => ({ name: p.name, aliases: p.aliases })),
    });

    const newSuggestionsCount = await persistAnalysisResults({
      uid,
      docId: journalConfig.journalDocId,
      docUrl: journalConfig.journalDocUrl,
      entry: latest,
      analysis,
      existingEntries,
      existingSuggestions,
      existingPeople,
      existingPeopleSuggestions,
      existingCommitments,
      existingTimeline,
    });

    await updateUserJournalConfig(uid, {
      lastSyncedAt: new Date().toISOString(),
      lastProcessedEntryDate: latest.entryDate,
      lastProcessedEntryHash: latest.contentHash,
      lastSyncError: '',
    });

    return {
      status: 'synced',
      entryDate: latest.entryDate,
      entryHeading: latest.heading,
      newSuggestionsCount,
      allEntries: entries,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Journal synchronization failed.';
    await updateUserJournalConfig(uid, {
      lastSyncError: message.slice(0, 500),
    });
    throw err;
  }
}

export async function runHistoricalJournalBatch(params: {
  uid: string;
  accessToken: string;
  journalConfig: JournalConfig;
  existingEntries: JournalEntrySummary[];
  existingSuggestions: ReviewSuggestion[];
  existingPeople: PersonProfile[];
  existingPeopleSuggestions: PersonSuggestion[];
  existingCommitments: CommitmentItem[];
  existingTimeline: TimelineEvent[];
  batchSize?: number;
  onProgress?: (processed: number, total: number, heading: string) => void;
}): Promise<{ processedCount: number; totalUnprocessed: number }> {
  const {
    uid,
    accessToken,
    journalConfig,
    existingEntries,
    existingSuggestions,
    existingPeople,
    existingPeopleSuggestions,
    existingCommitments,
    existingTimeline,
    batchSize = 3,
    onProgress,
  } = params;

  if (!journalConfig.journalDocId) {
    throw new Error('Select your Google Docs journal first.');
  }

  const { entries } = await fetchGoogleDocEntries(journalConfig.journalDocId, accessToken);
  const existingMap = new Map(existingEntries.map((e) => [e.id, e]));

  const unprocessed = entries.filter((entry) => {
    const id = sanitizeId(`${journalConfig.journalDocId}_${entry.entryDate}`);
    const prev = existingMap.get(id);
    return !prev || prev.contentHash !== entry.contentHash;
  });

  // Analyze newest unprocessed entries first in manageable batches
  const batch = [...unprocessed].reverse().slice(0, batchSize);
  let processedCount = 0;

  for (const entry of batch) {
    if (onProgress) {
      onProgress(processedCount + 1, batch.length, entry.heading);
    }
    const analysis = await analyzeJournalEntryWithFirebaseAI({
      entryDate: entry.entryDate,
      heading: entry.heading,
      entryText: entry.text,
      knownPeople: existingPeople.map((p) => ({ name: p.name, aliases: p.aliases })),
    });
    await persistAnalysisResults({
      uid,
      docId: journalConfig.journalDocId,
      docUrl: journalConfig.journalDocUrl,
      entry,
      analysis,
      existingEntries,
      existingSuggestions,
      existingPeople,
      existingPeopleSuggestions,
      existingCommitments,
      existingTimeline,
    });
    processedCount++;
  }

  await updateUserJournalConfig(uid, {
    lastSyncedAt: new Date().toISOString(),
    lastSyncError: '',
  });

  return {
    processedCount,
    totalUnprocessed: Math.max(0, unprocessed.length - processedCount),
  };
}
