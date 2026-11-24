export enum DashboardView {
  Overview = 'overview',
  Journal = 'journal',
  AskMyLife = 'ask',
  People = 'people',
  Commitments = 'commitments',
  Timeline = 'timeline',
  Vault = 'vault',
  Tasks = 'tasks',
  Schedule = 'schedule',
  FocusHabits = 'focus',
  Notes = 'notes',
  GoogleWorkspace = 'workspace',
}

export enum TaskPriority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export enum TaskCategory {
  Work = 'Work',
  Personal = 'Personal',
  Health = 'Health',
  Finance = 'Finance',
}

export interface TaskItem {
  id: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  notes?: string;
  createdAt: string;
}

export interface ScheduleBlock {
  id: string;
  title: string;
  startTime: string; // HH:MM (24h)
  endTime: string;   // HH:MM (24h)
  category: TaskCategory;
  location?: string;
}

export interface HabitItem {
  id: string;
  name: string;
  category: string;
  targetDaysPerWeek: number;
  // Array of 7 booleans representing Mon..Sun of current week
  completedDays: boolean[];
}

export interface FocusSession {
  id: string;
  label: string;
  minutes: number;
  completedAt: string; // ISO string
  dateKey: string;     // YYYY-MM-DD
}

export interface NoteItem {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt: string; // ISO string
}

export interface DaySummary {
  dateKey: string;
  label: string;
  focusMinutes: number;
  tasksCompleted: number;
}

export interface JournalConfig {
  journalDocId?: string;
  journalDocName?: string;
  journalDocUrl?: string;
  autoSyncEnabled?: boolean;
  autoSyncOnOpen?: boolean;
  aiPrivacyAcknowledged?: boolean;
  syncTime?: string;     // HH:MM
  syncTimezone?: string; // IANA timezone
  lastSyncedAt?: string;
  lastProcessedEntryDate?: string;
  lastProcessedEntryHash?: string;
  lastSyncError?: string;
}

export interface JournalEntrySummary {
  id: string;
  docId: string;
  docUrl?: string;
  entryDate: string;
  heading: string;
  contentHash: string;
  summary: string;
  themes: string[];
  mentionedPeople: string[];
  entrySnippet?: string;
  syncedAt: string;
}

export type ReviewSuggestionKind =
  | 'sleep'
  | 'spending'
  | 'vault_link'
  | 'vault_song'
  | 'vault_note';

export interface ReviewSuggestion {
  id: string;
  kind: ReviewSuggestionKind;
  status: 'pending' | 'confirmed' | 'dismissed';
  title: string;
  proposedValue: string;
  amount?: number;
  currency?: string;
  category?: string;
  entryDate: string;
  sourceEntryId?: string;
  excerpt: string;
  fingerprint: string;
}

export interface ActivityLog {
  id: string;
  kind: 'sleep' | 'spending';
  entryDate: string;
  title: string;
  value: string;
  amount?: number;
  currency?: string;
  category?: string;
  notes?: string;
  excerpt?: string;
  sourceEntryId?: string;
  fingerprint?: string;
}

export interface PersonProfile {
  id: string;
  name: string;
  aliases: string[];
  birthday?: string;
  relationship?: string;
  lastMentionedDate?: string;
  mentionCount: number;
  memories: string[];
  notes?: string;
  sourceEntryIds: string[];
}

export interface PersonSuggestion {
  id: string;
  name: string;
  relationship?: string;
  birthday?: string;
  memory?: string;
  excerpt: string;
  entryDate: string;
  sourceEntryId?: string;
  status: 'pending' | 'confirmed' | 'dismissed';
  fingerprint: string;
}

export interface CommitmentItem {
  id: string;
  title: string;
  originalStatement?: string;
  context?: string;
  dateMentioned: string;
  dueDate?: string;
  status: 'pending' | 'approved' | 'completed' | 'dismissed';
  sourceEntryId?: string;
  fingerprint: string;
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  category?: string;
  excerpt?: string;
  sourceEntryId?: string;
  docUrl?: string;
  status: 'pending' | 'approved' | 'dismissed';
  fingerprint: string;
}

export type VaultItemKind = 'link' | 'song' | 'note';

export interface VaultItem {
  id: string;
  kind: VaultItemKind;
  title: string;
  description?: string;
  url?: string;
  artist?: string;
  dateAdded: string;
  tags: string[];
  personId?: string;
  personName?: string;
  timelineEventId?: string;
  timelineEventTitle?: string;
  sourceEntryId?: string;
}

export interface GeminiJournalAnalysis {
  summary: string;
  themes: string[];
  sleepFindings: Array<{
    title: string;
    proposedValue: string;
    excerpt: string;
  }>;
  spendingFindings: Array<{
    title: string;
    proposedValue: string;
    amount?: number;
    currency?: string;
    category?: string;
    excerpt: string;
  }>;
  peopleMentions: Array<{
    name: string;
    relationship?: string;
    birthday?: string;
    memory?: string;
    excerpt: string;
  }>;
  commitments: Array<{
    title: string;
    originalStatement: string;
    context?: string;
    dueDate?: string;
  }>;
  timelineCandidates: Array<{
    title: string;
    description: string;
    category?: string;
    excerpt: string;
  }>;
  vaultSuggestions: Array<{
    kind: 'link' | 'song' | 'note';
    title: string;
    description: string;
    url?: string;
    artist?: string;
    excerpt: string;
    tags?: string[];
  }>;
}

export interface AskLifeReference {
  entryDate: string;
  heading: string;
  kind: 'journal' | 'people' | 'timeline' | 'commitment' | 'vault' | 'log';
  excerpt?: string;
}

export interface AskLifeAnswer {
  answer: string;
  facts: string[];
  interpretations: string[];
  references: AskLifeReference[];
}

export interface AskLifeChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  structured?: AskLifeAnswer;
  timestamp: string;
}
