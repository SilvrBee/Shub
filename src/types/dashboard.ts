export enum DashboardView {
  Home = 'home',
  Tasks = 'tasks',
  Focus = 'focus',
  Habits = 'habits',
  Journal = 'journal',
  Body = 'body',
  Life = 'life',
  Stats = 'stats',
  Reports = 'reports',
  Settings = 'settings',
  Overview = 'overview',
  Schedule = 'schedule',
  Notes = 'notes',
  GoogleWorkspace = 'workspace',
}

export enum TaskPriority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
  None = 'None',
}

export type TaskCategory = string;

export const TaskCategory = {
  Work: 'Work',
  Personal: 'Personal',
  Health: 'Health',
  Finance: 'Finance',
} as const;

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'cat-work', name: 'Work', icon: 'Briefcase', color: '#2563eb' },
  { id: 'cat-personal', name: 'Personal', icon: 'User', color: '#7c3aed' },
  { id: 'cat-health', name: 'Health', icon: 'HeartPulse', color: '#059669' },
  { id: 'cat-finance', name: 'Finance', icon: 'Wallet', color: '#d97706' },
];

export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export type TaskRepeatFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type FieldSource = 'user' | 'auto';
export type DefaultReminderOffset = '0' | '10' | '30' | '60' | '1440';
export type TaskReminderOverride = 'default' | 'none' | DefaultReminderOffset;

export interface TaskItem {
  id: string;
  title: string;
  category?: string;
  priority: TaskPriority;
  prioritySource?: FieldSource;
  priorityAutoPrev?: TaskPriority;
  priorityAutoReason?: string;
  priorityAutoLocked?: boolean;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  deadlineDate?: string; // YYYY-MM-DD
  deadlineTime?: string; // HH:MM
  completed: boolean;
  details?: string;
  notes?: string; // legacy alias preserved for migration/compatibility
  subtasks?: SubtaskItem[];
  repeat?: TaskRepeatFrequency;
  repeatWeekdays?: number[]; // 0 (Sun) .. 6 (Sat)
  recurrenceChildId?: string;
  durationMinutes?: number;
  reminderOffset?: TaskReminderOverride;
  pinned?: boolean;
  createdAt: string;
}

export type ReminderKind = 'due' | 'deadline-heads-up';

export interface ReminderTrigger {
  triggerKey: string;
  taskId: string;
  taskTitle: string;
  kind: ReminderKind;
  triggerAtMs: number;
  targetAtMs?: number;
  targetDate: string;
  targetTime?: string;
  category?: string;
  priority: TaskPriority;
  subtitle: string;
}

export interface ReminderRecord extends ReminderTrigger {
  firedAtMs: number;
  status: 'live' | 'missed';
  read: boolean;
}

export type SmartSortMode = 'balanced' | 'priority' | 'deadline' | 'quick-wins';
export type MatrixImportantRule = 'high-medium' | 'high-only';

export interface ScheduleBlock {
  id: string;
  title: string;
  startTime: string; // HH:MM (24h)
  endTime: string; // HH:MM (24h)
  category: string;
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
  dateKey: string; // YYYY-MM-DD
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
export type AppStyleId =
  | 'classic'
  | 'editorial'
  | 'aurora'
  | 'celestial'
  | 'doodle'
  | 'minimalism'
  | 'bento'
  | 'editorial-style'
  | 'brutalism'
  | 'swiss'
  | 'motion-3d'
  | 'retro';
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
  defaultTaskCategory: string;
  defaultTaskPriority: TaskPriority;
  smartSortMode: SmartSortMode;
  quickWinMinutes: number;
  matrixImportantRule: MatrixImportantRule;
  matrixUrgentDays: number;
  categories: CategoryItem[];
  showFocusChart: boolean;
  showFocusTimer: boolean;
  showScratchpad: boolean;
  showGoogleCard: boolean;
  // Task Reminders & Notifications
  notificationsEnabled: boolean;
  defaultReminderOffset: DefaultReminderOffset;
  morningReminderTime: string; // HH:MM
  deadlineHeadsUpEnabled: boolean;
  notificationSoundEnabled: boolean;
  // Rule-based helpers
  autoRaisePriorityEnabled: boolean;
  autoRaiseHighDays: number;
  autoRaiseMediumDays: number;
  defaultDurationEstimateMinutes: number;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  colorMode: 'light',
  style: 'classic',
  theme: 'cobalt',
  highContrast: false,
  density: 'comfortable',
  reducedMotion: false,
  defaultView: DashboardView.Home,
  timeFormat: '24h',
  defaultFocusMinutes: 25,
  defaultFocusLabel: 'Deep work sprint',
  defaultTaskCategory: 'Work',
  defaultTaskPriority: TaskPriority.None,
  smartSortMode: 'balanced',
  quickWinMinutes: 5,
  matrixImportantRule: 'high-medium',
  matrixUrgentDays: 2,
  categories: DEFAULT_CATEGORIES,
  showFocusChart: true,
  showFocusTimer: true,
  showScratchpad: true,
  showGoogleCard: true,
  notificationsEnabled: true,
  defaultReminderOffset: '30',
  morningReminderTime: '09:00',
  deadlineHeadsUpEnabled: true,
  notificationSoundEnabled: true,
  autoRaisePriorityEnabled: false,
  autoRaiseHighDays: 1,
  autoRaiseMediumDays: 3,
  defaultDurationEstimateMinutes: 15,
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

export interface LifeChapter {
  name: string;
  theme: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  goals: string[];
}

export const DEFAULT_LIFE_CHAPTER: LifeChapter = {
  name: 'Drop Year',
  theme: 'Focused growth, deep craft & steady daily momentum',
  startDate: '2026-06-01',
  endDate: '2027-05-31',
  goals: ['Deep work daily', 'Stay consistent', 'Build core projects'],
};

export interface LifeProfileSettings {
  birthDate: string; // YYYY-MM-DD
  lifeExpectancy: number;
}

export const DEFAULT_LIFE_PROFILE: LifeProfileSettings = {
  birthDate: '2007-03-04',
  lifeExpectancy: 80,
};

export interface MoodRatingRecord {
  id: string; // YYYY-MM-DD
  dateKey: string; // YYYY-MM-DD
  rating: number; // 1..10
  updatedAt?: string;
}

export type LifeAreaId =
  | 'study'
  | 'body'
  | 'mind'
  | 'people'
  | 'skills'
  | 'projects';

export const LIFE_AREA_IDS: readonly LifeAreaId[] = [
  'study',
  'body',
  'mind',
  'people',
  'skills',
  'projects',
] as const;

export interface AreaSettings {
  studyWeeklyGoalHours: number; // 1..80
  categoryAreaMap: Record<string, LifeAreaId>;
  journalOpenedDates: string[]; // YYYY-MM-DD
}

export const DEFAULT_AREA_SETTINGS: AreaSettings = {
  studyWeeklyGoalHours: 10,
  categoryAreaMap: {
    Work: 'projects',
    Health: 'body',
    Personal: 'mind',
    Finance: 'skills',
  },
  journalOpenedDates: [],
};

export type CountdownIconId =
  | 'Calendar'
  | 'Flag'
  | 'GraduationCap'
  | 'Plane'
  | 'Trophy'
  | 'Target'
  | 'Compass'
  | 'BookOpen'
  | 'Star'
  | 'Sparkles';

export interface CountdownItem {
  id: string;
  title: string;
  targetDate: string; // YYYY-MM-DD
  icon: CountdownIconId;
  pinned: boolean;
  createdAt?: string;
  updatedAt?: string;
}

