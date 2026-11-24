import { getGenerativeModel, Schema } from 'firebase/ai';
import { firebaseAI } from './googleAuth';
import {
  ActivityLog,
  AskLifeAnswer,
  AskLifeChatMessage,
  CommitmentItem,
  GeminiJournalAnalysis,
  JournalEntrySummary,
  NoteItem,
  PersonProfile,
  TaskItem,
  TimelineEvent,
  VaultItem,
} from '../types/dashboard';
import { ParsedJournalEntry } from './journalDocsService';

const MODEL_NAME = 'gemini-4-hydrogen';

const JOURNAL_SYSTEM_INSTRUCTION = `You are analyzing someone's personal journal. Be warm, thoughtful, observant, specific, and non-judgmental.

Pay attention to small details, recurring themes, people, experiences, changes in interests, personal reflections, and meaningful moments.

Be emotionally intelligent and empathetic.

Do not give generic motivational advice or unnecessary praise.

Do not moralize, criticize, or make the user feel guilty about missed goals, habits, or inconsistencies.

Do not make psychological diagnoses.

Do not assume that something is important just because it sounds dramatic. Equally, do not overlook small details that may be meaningful to the writer.

Distinguish clearly between explicitly stated facts and your interpretations.

Never invent events, dates, people, conversations, feelings, or information.

When extracting information, retain supporting excerpts from the original writing.

When uncertain, express uncertainty rather than presenting guesses as facts.

Respect the user's writing style and personal perspective.

The goal is to help the user understand, organize, and revisit their own life, not judge or optimize it.

Additional extraction rules:
- For sleep/wake findings: only extract sleep or wake details explicitly stated. If the writer says they were awake at 2 AM, do NOT guess or assume they fell asleep at 2 AM.
- For spending findings: only extract purchases or financial details explicitly mentioned. Never calculate or invent amounts not written.
- For commitments ("Things I Said I'd Do"): distinguish genuine intentions, promises, or plans from hypothetical musings or casual remarks. Only include dueDate if explicitly stated.
- For timeline milestones: be selective. Only suggest genuinely meaningful moments, decisions, achievements, experiences, or turning points—not ordinary daily routines.
- For people: match names against knownPeople when clearly referring to the same person, and only include birthday or relationship if explicitly written.
- For vault suggestions: only suggest meaningful links, songs, or notes worth revisiting (never quotes or photos).`;

const ASK_MY_LIFE_SYSTEM_INSTRUCTION = `You are the user's private "Ask My Life" reflection assistant, helping them search and revisit their own personal journal, summaries, People Directory, Timeline milestones, commitments, confirmed sleep/spending logs, and Vault.

Strict grounding rules:
1. Be warm, thoughtful, specific, and non-judgmental. Never lecture, criticize, or diagnose.
2. NEVER invent events, dates, people, quotes, or details that are not present in the provided context.
3. Explicitly separate observed facts (what the user actually wrote or saved, with dates/headings) from your interpretations or patterns noticed.
4. If the provided records do not contain enough information to answer, say so clearly and honestly.
5. Reference exact journal entry dates and headings (or record names) in the "references" list.`;

const JOURNAL_ANALYSIS_SCHEMA = Schema.object({
  properties: {
    summary: Schema.string({
      description:
        'Warm, specific, faithful 2-4 sentence reflection summarizing what happened and what felt meaningful without scoring or judging.',
    }),
    themes: Schema.array({
      items: Schema.string(),
      description: 'Up to 5 concise themes present in the entry.',
    }),
    sleepFindings: Schema.array({
      items: Schema.object({
        properties: {
          title: Schema.string(),
          proposedValue: Schema.string(),
          excerpt: Schema.string(),
        },
      }),
    }),
    spendingFindings: Schema.array({
      items: Schema.object({
        properties: {
          title: Schema.string(),
          proposedValue: Schema.string(),
          amount: Schema.number(),
          currency: Schema.string(),
          category: Schema.string(),
          excerpt: Schema.string(),
        },
        optionalProperties: ['amount', 'currency', 'category'],
      }),
    }),
    peopleMentions: Schema.array({
      items: Schema.object({
        properties: {
          name: Schema.string(),
          relationship: Schema.string(),
          birthday: Schema.string(),
          memory: Schema.string(),
          excerpt: Schema.string(),
        },
        optionalProperties: ['relationship', 'birthday', 'memory'],
      }),
    }),
    commitments: Schema.array({
      items: Schema.object({
        properties: {
          title: Schema.string(),
          originalStatement: Schema.string(),
          context: Schema.string(),
          dueDate: Schema.string(),
        },
        optionalProperties: ['context', 'dueDate'],
      }),
    }),
    timelineCandidates: Schema.array({
      items: Schema.object({
        properties: {
          title: Schema.string(),
          description: Schema.string(),
          category: Schema.string(),
          excerpt: Schema.string(),
        },
        optionalProperties: ['category'],
      }),
    }),
    vaultSuggestions: Schema.array({
      items: Schema.object({
        properties: {
          kind: Schema.enumString({ enum: ['link', 'song', 'note'] }),
          title: Schema.string(),
          description: Schema.string(),
          url: Schema.string(),
          artist: Schema.string(),
          excerpt: Schema.string(),
          tags: Schema.array({ items: Schema.string() }),
        },
        optionalProperties: ['url', 'artist', 'tags'],
      }),
    }),
  },
});

const ASK_MY_LIFE_SCHEMA = Schema.object({
  properties: {
    answer: Schema.string({
      description:
        'Clear, warm direct answer to the user question grounded strictly in the provided personal records.',
    }),
    facts: Schema.array({
      items: Schema.string(),
      description:
        'Explicitly stated facts observed in the records (include date/source when available).',
    }),
    interpretations: Schema.array({
      items: Schema.string(),
      description:
        'Careful interpretations, recurring patterns, or uncertainties clearly distinguished from stated facts.',
    }),
    references: Schema.array({
      items: Schema.object({
        properties: {
          entryDate: Schema.string(),
          heading: Schema.string(),
          kind: Schema.enumString({
            enum: ['journal', 'people', 'timeline', 'commitment', 'vault', 'log'],
          }),
          excerpt: Schema.string(),
        },
        optionalProperties: ['excerpt'],
      }),
    }),
  },
});

function formatAiLogicError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('api-not-enabled') || msg.includes('firebaseai')) {
    return new Error(
      'Firebase AI Logic is not yet enabled on this Firebase project. Enable Firebase AI Logic (Gemini Developer API provider) in the Firebase Console.'
    );
  }
  if (msg.includes('appCheck') || msg.includes('App Check')) {
    return new Error(
      'Firebase App Check verification is required. Configure your reCAPTCHA site key in Firebase Console → App Check and firebase-applet-config.json.'
    );
  }
  return err instanceof Error ? err : new Error(msg);
}

export async function analyzeJournalEntryWithFirebaseAI(params: {
  entryDate: string;
  heading: string;
  entryText: string;
  knownPeople: Array<{ name: string; aliases: string[] }>;
}): Promise<GeminiJournalAnalysis> {
  if (!firebaseAI) {
    throw new Error('Firebase AI Logic is not initialized in this browser.');
  }

  const trimmedText = params.entryText.trim().slice(0, 40000);
  if (trimmedText.length < 5) {
    throw new Error('Journal entry text is too short to analyze.');
  }

  const knownPeopleList = params.knownPeople
    .slice(0, 100)
    .map((p) =>
      p.aliases.length > 0 ? `${p.name} (aliases: ${p.aliases.join(', ')})` : p.name
    )
    .join('; ');

  const prompt = [
    `Journal Entry Date: ${params.entryDate}`,
    `Entry Heading: ${params.heading}`,
    knownPeopleList
      ? `Known people already in directory (reuse canonical names where clearly matching): ${knownPeopleList}`
      : 'Known people already in directory: none yet.',
    '',
    '--- JOURNAL ENTRY START ---',
    trimmedText,
    '--- JOURNAL ENTRY END ---',
  ].join('\n');

  try {
    const model = getGenerativeModel(firebaseAI, {
      model: MODEL_NAME,
      systemInstruction: JOURNAL_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: JOURNAL_ANALYSIS_SCHEMA,
      },
    });

    const result = await model.generateContent(prompt);
    const rawJson = result.response.text().trim() || '{}';
    return JSON.parse(rawJson) as GeminiJournalAnalysis;
  } catch (err) {
    throw formatAiLogicError(err);
  }
}

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
}

function scoreTextRelevance(text: string, tokens: string[], date?: string): number {
  if (!text) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (lower.includes(t)) score += 3;
  }
  if (date) {
    const ym = date.slice(0, 7);
    if (tokens.some((t) => date.includes(t) || ym.includes(t))) {
      score += 4;
    }
  }
  return score;
}

export async function askMyLifeWithFirebaseAI(params: {
  question: string;
  history: AskLifeChatMessage[];
  journalEntries: JournalEntrySummary[];
  rawDocEntries: ParsedJournalEntry[];
  people: PersonProfile[];
  timelineEvents: TimelineEvent[];
  commitments: CommitmentItem[];
  activityLogs: ActivityLog[];
  vaultItems: VaultItem[];
  notes: NoteItem[];
  tasks: TaskItem[];
}): Promise<AskLifeAnswer> {
  if (!firebaseAI) {
    throw new Error('Firebase AI Logic is not initialized in this browser.');
  }

  const tokens = tokenizeQuery(params.question);

  // Rank raw Google Doc entries (when doc is connected in-session) & processed summaries
  const rawSorted = [...params.rawDocEntries]
    .map((e) => ({
      item: e,
      score: scoreTextRelevance(`${e.heading} ${e.text}`, tokens, e.entryDate),
    }))
    .sort((a, b) => b.score - a.score || b.item.entryDate.localeCompare(a.item.entryDate))
    .slice(0, 8)
    .map((x) => x.item);

  const summarySorted = [...params.journalEntries]
    .map((e) => ({
      item: e,
      score: scoreTextRelevance(
        `${e.heading} ${e.summary} ${e.themes.join(' ')} ${e.mentionedPeople.join(' ')}`,
        tokens,
        e.entryDate
      ),
    }))
    .sort((a, b) => b.score - a.score || b.item.entryDate.localeCompare(a.item.entryDate))
    .slice(0, 12)
    .map((x) => x.item);

  const peopleSorted = [...params.people]
    .map((p) => ({
      item: p,
      score: scoreTextRelevance(
        `${p.name} ${p.aliases.join(' ')} ${p.relationship || ''} ${p.notes || ''} ${p.memories.join(' ')}`,
        tokens
      ),
    }))
    .sort((a, b) => b.score - a.score || b.item.mentionCount - a.item.mentionCount)
    .slice(0, 15)
    .map((x) => x.item);

  const timelineSorted = [...params.timelineEvents]
    .filter((t) => t.status === 'approved')
    .map((t) => ({
      item: t,
      score: scoreTextRelevance(`${t.title} ${t.description} ${t.category || ''}`, tokens, t.eventDate),
    }))
    .sort((a, b) => b.score - a.score || b.item.eventDate.localeCompare(a.item.eventDate))
    .slice(0, 15)
    .map((x) => x.item);

  const commitmentsSorted = [...params.commitments]
    .filter((c) => c.status !== 'dismissed')
    .slice(0, 20);

  const logsSorted = [...params.activityLogs]
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate))
    .slice(0, 25);

  const vaultSorted = [...params.vaultItems]
    .map((v) => ({
      item: v,
      score: scoreTextRelevance(
        `${v.title} ${v.description || ''} ${v.artist || ''} ${v.tags.join(' ')} ${v.personName || ''}`,
        tokens,
        v.dateAdded
      ),
    }))
    .sort((a, b) => b.score - a.score || b.item.dateAdded.localeCompare(a.item.dateAdded))
    .slice(0, 15)
    .map((x) => x.item);

  const notesSorted = [...params.notes]
    .map((n) => ({
      item: n,
      score: scoreTextRelevance(`${n.title} ${n.category} ${n.content}`, tokens),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.item);

  const contextSections: string[] = [];

  if (rawSorted.length > 0) {
    contextSections.push(
      '=== ORIGINAL GOOGLE DOCS JOURNAL ENTRIES (EXACT TEXT EXCERPTS) ===\n' +
        rawSorted
          .map(
            (e) =>
              `[${e.entryDate}] ${e.heading}\n${e.text.slice(0, 2200)}`
          )
          .join('\n\n')
    );
  }

  if (summarySorted.length > 0) {
    contextSections.push(
      '=== PROCESSED JOURNAL SUMMARIES ===\n' +
        summarySorted
          .map(
            (e) =>
              `[${e.entryDate}] ${e.heading} | Themes: ${e.themes.join(', ')} | People: ${e.mentionedPeople.join(', ')}\nSummary: ${e.summary}`
          )
          .join('\n\n')
    );
  }

  if (peopleSorted.length > 0) {
    contextSections.push(
      '=== PEOPLE DIRECTORY ===\n' +
        peopleSorted
          .map(
            (p) =>
              `- ${p.name}${p.aliases.length ? ` (aliases: ${p.aliases.join(', ')})` : ''} | Relationship: ${p.relationship || 'unspecified'} | Birthday: ${p.birthday || 'unknown'} | Last mentioned: ${p.lastMentionedDate || 'never'} | Mentions: ${p.mentionCount}\n  Memories: ${p.memories.slice(0, 8).join(' ; ')}\n  Notes: ${p.notes || 'none'}`
          )
          .join('\n')
    );
  }

  if (timelineSorted.length > 0) {
    contextSections.push(
      '=== PERSONAL TIMELINE MILESTONES ===\n' +
        timelineSorted
          .map(
            (t) => `[${t.eventDate}] ${t.title} (${t.category || 'Milestone'}): ${t.description}`
          )
          .join('\n')
    );
  }

  if (commitmentsSorted.length > 0) {
    contextSections.push(
      '=== THINGS I SAID I WOULD DO ===\n' +
        commitmentsSorted
          .map(
            (c) =>
              `[${c.dateMentioned}] (${c.status}) ${c.title}${c.dueDate ? ` [Due ${c.dueDate}]` : ''}${c.originalStatement ? ` — "${c.originalStatement}"` : ''}`
          )
          .join('\n')
    );
  }

  if (logsSorted.length > 0) {
    contextSections.push(
      '=== CONFIRMED SLEEP & SPENDING LOGS ===\n' +
        logsSorted
          .map(
            (l) =>
              `[${l.entryDate}] (${l.kind}) ${l.title}: ${l.value}${typeof l.amount === 'number' ? ` (${l.currency || 'USD'} ${l.amount})` : ''}`
          )
          .join('\n')
    );
  }

  if (vaultSorted.length > 0) {
    contextSections.push(
      '=== PERSONAL VAULT (LINKS, SONGS, NOTES) ===\n' +
        vaultSorted
          .map(
            (v) =>
              `[${v.dateAdded}] (${v.kind}) ${v.title}${v.artist ? ` by ${v.artist}` : ''}${v.url ? ` (${v.url})` : ''} — ${v.description || ''} | Tags: ${v.tags.join(', ')}${v.personName ? ` | Person: ${v.personName}` : ''}`
          )
          .join('\n')
    );
  }

  if (notesSorted.length > 0) {
    contextSections.push(
      '=== PERSONAL NOTES ===\n' +
        notesSorted
          .map((n) => `[${n.category}] ${n.title}: ${n.content.slice(0, 800)}`)
          .join('\n')
    );
  }

  if (params.tasks.length > 0) {
    contextSections.push(
      '=== ACTIVE & RECENT TASKS ===\n' +
        params.tasks
          .slice(0, 15)
          .map((t) => `- [${t.completed ? 'Done' : 'Open'}] ${t.title} (${t.dueDate})`)
          .join('\n')
    );
  }

  const recentTurns = params.history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n');

  const prompt = [
    contextSections.length > 0
      ? contextSections.join('\n\n')
      : 'No personal journal entries or records have been synced or saved yet.',
    recentTurns ? `\n=== RECENT CONVERSATION ===\n${recentTurns}` : '',
    `\n=== USER QUESTION ===\n${params.question.trim()}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const model = getGenerativeModel(firebaseAI, {
      model: MODEL_NAME,
      systemInstruction: ASK_MY_LIFE_SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: ASK_MY_LIFE_SCHEMA,
      },
    });

    const result = await model.generateContent(prompt);
    const rawJson = result.response.text().trim() || '{}';
    const parsed = JSON.parse(rawJson) as Partial<AskLifeAnswer>;
    return {
      answer: parsed.answer || 'I could not find relevant details in your current records.',
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      interpretations: Array.isArray(parsed.interpretations) ? parsed.interpretations : [],
      references: Array.isArray(parsed.references) ? parsed.references : [],
    };
  } catch (err) {
    throw formatAiLogicError(err);
  }
}
