export enum DashboardView {
  Overview = 'overview',
  Tasks = 'tasks',
  Schedule = 'schedule',
  Focus = 'focus',
  Habits = 'habits',
  Notes = 'notes',
  GoogleWorkspace = 'workspace',
  Settings = 'settings',
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
  // YYYY-MM-DD history for the 12-week heatmap
  completedDates?: string[];
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

export type AppThemeId = 'cobalt' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'nord';
export type AppStyleId = 'classic' | 'editorial' | 'aurora-glass' | 'celestial';
export type ColorMode = 'light' | 'dark' | 'system';
export type LayoutDensity = 'comfortable' | 'compact';

export interface AppSettings {
  colorMode: ColorMode;
  style: AppStyleId;
  theme: AppThemeId;
  highContrast: boolean;
  density: LayoutDensity;
  reducedMotion: boolean;
  defaultView: DashboardView;
  timeFormat: '24h' | '12h';
  defaultFocusMinutes: 15 | 25 | 50;
  defaultFocusLabel: string;
  defaultTaskCategory: TaskCategory;
  defaultTaskPriority: TaskPriority;
  showFocusChart: boolean;
  showFocusTimer: boolean;
  showScratchpad: boolean;
  showGoogleCard: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  colorMode: 'light',
  style: 'classic',
  theme: 'cobalt',
  highContrast: false,
  density: 'comfortable',
  reducedMotion: false,
  defaultView: DashboardView.Overview,
  timeFormat: '24h',
  defaultFocusMinutes: 25,
  defaultFocusLabel: 'Deep work sprint',
  defaultTaskCategory: TaskCategory.Work,
  defaultTaskPriority: TaskPriority.Medium,
  showFocusChart: true,
  showFocusTimer: true,
  showScratchpad: true,
  showGoogleCard: true,
};

// Retained for backwards-compatible Firestore profile typing
export interface JournalConfig {
  journalDocId?: string;
  journalDocName?: string;
  journalDocUrl?: string;
  autoSyncEnabled?: boolean;
  autoSyncOnOpen?: boolean;
  aiPrivacyAcknowledged?: boolean;
  syncTime?: string;
  syncTimezone?: string;
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
