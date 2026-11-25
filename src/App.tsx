/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  DEFAULT_SCRATCHPAD,
  getTodayKey,
  INITIAL_FOCUS_SESSIONS,
  INITIAL_HABITS,
  INITIAL_NOTES,
  INITIAL_SCHEDULE,
  INITIAL_TASKS,
} from './data/initialData';
import { useLocalStorage } from './hooks/useLocalStorage';
import { clearAccessToken, googleSignIn, initAuth, logout } from './services/googleAuth';
import {
  deleteAllJournalIntelligenceData,
  ensureUserRootProfile,
  fsActivityLogs,
  fsCommitments,
  fsFocus,
  fsHabits,
  fsNotes,
  fsPeople,
  fsPeopleSuggestions,
  fsReviewSuggestions,
  fsSchedule,
  fsTasks,
  fsTimeline,
  fsVault,
  sanitizeId,
  subscribeUserCollection,
  subscribeUserProfile,
  updateUserJournalConfig,
  updateUserScratchpad,
} from './services/firestoreService';
import {
  fetchGoogleDocEntries,
  ParsedJournalEntry,
  pickJournalGoogleDoc,
} from './services/journalDocsService';
import { runHistoricalJournalBatch, syncLatestJournalEntry } from './services/journalSyncEngine';
import { sanitizeExternalUrl } from './services/googleWorkspace';
import {
  ActivityLog,
  CommitmentItem,
  DashboardView,
  FocusSession,
  HabitItem,
  JournalConfig,
  JournalEntrySummary,
  NoteItem,
  PersonProfile,
  PersonSuggestion,
  ReviewSuggestion,
  ScheduleBlock,
  TaskCategory,
  TaskItem,
  TaskPriority,
  TimelineEvent,
  VaultItem,
} from './types/dashboard';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { JournalView } from './components/JournalView';
import { AskMyLifeView } from './components/AskMyLifeView';
import { PeopleView } from './components/PeopleView';
import { CommitmentsView } from './components/CommitmentsView';
import { TimelineView } from './components/TimelineView';
import { VaultView } from './components/VaultView';
import { TasksView } from './components/TasksView';
import { ScheduleView } from './components/ScheduleView';
import { FocusHabitsView } from './components/FocusHabitsView';
import { NotesView } from './components/NotesView';
import { WorkspaceView } from './components/WorkspaceView';
import { TaskModal } from './components/TaskModal';

function makeId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 10);
  return sanitizeId(`${prefix}_${Date.now()}_${rand}`);
}

export default function App() {
  const [activeView, setActiveView] = useState<DashboardView>(DashboardView.Overview);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isCloudSignedIn = Boolean(user && user.emailVerified);
  const uid = isCloudSignedIn && user ? user.uid : null;

  useEffect(() => {
    const unsubscribe = initAuth((authUser, token) => {
      setUser(authUser);
      setAccessToken(token);
    });
    return () => unsubscribe();
  }, []);

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('cadence_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('cadence_theme', 'light');
    }
  }, [isDark]);

  // Local fallback state when signed out
  const [localTasks, setLocalTasks] = useLocalStorage<TaskItem[]>('cadence_tasks', INITIAL_TASKS);
  const [localSchedule, setLocalSchedule] = useLocalStorage<ScheduleBlock[]>(
    'cadence_schedule',
    INITIAL_SCHEDULE
  );
  const [localHabits, setLocalHabits] = useLocalStorage<HabitItem[]>(
    'cadence_habits',
    INITIAL_HABITS
  );
  const [localFocusSessions, setLocalFocusSessions] = useLocalStorage<FocusSession[]>(
    'cadence_focus_sessions',
    INITIAL_FOCUS_SESSIONS
  );
  const [localNotes, setLocalNotes] = useLocalStorage<NoteItem[]>('cadence_notes', INITIAL_NOTES);
  const [localScratchpad, setLocalScratchpad] = useLocalStorage<string>(
    'cadence_scratchpad',
    DEFAULT_SCRATCHPAD
  );

  // Cloud Firestore state when signed in
  const [cloudTasks, setCloudTasks] = useState<TaskItem[]>([]);
  const [cloudSchedule, setCloudSchedule] = useState<ScheduleBlock[]>([]);
  const [cloudHabits, setCloudHabits] = useState<HabitItem[]>([]);
  const [cloudFocusSessions, setCloudFocusSessions] = useState<FocusSession[]>([]);
  const [cloudNotes, setCloudNotes] = useState<NoteItem[]>([]);
  const [cloudScratchpad, setCloudScratchpad] = useState<string>('');
  const [journalConfig, setJournalConfig] = useState<JournalConfig>({});
  const [journalEntries, setJournalEntries] = useState<JournalEntrySummary[]>([]);
  const [reviewSuggestions, setReviewSuggestions] = useState<ReviewSuggestion[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [people, setPeople] = useState<PersonProfile[]>([]);
  const [peopleSuggestions, setPeopleSuggestions] = useState<PersonSuggestion[]>([]);
  const [commitments, setCommitments] = useState<CommitmentItem[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);

  // Journal sync UI status & in-session raw doc cache for Ask My Life
  const [rawDocEntries, setRawDocEntries] = useState<ParsedJournalEntry[]>([]);
  const [isLoadingRawDoc, setIsLoadingRawDoc] = useState(false);
  const [isSyncingJournal, setIsSyncingJournal] = useState(false);
  const [isRunningHistorical, setIsRunningHistorical] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [historicalProgress, setHistoricalProgress] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [modifiedEntryPrompt, setModifiedEntryPrompt] = useState<ParsedJournalEntry | null>(null);

  const scratchpadTimerRef = useRef<number | null>(null);
  const autoSyncTriggeredRef = useRef(false);
  const syncLatestFnRef = useRef<(forceReprocess?: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    if (!uid || !user) {
      setCloudTasks([]);
      setCloudSchedule([]);
      setCloudHabits([]);
      setCloudFocusSessions([]);
      setCloudNotes([]);
      setCloudScratchpad('');
      setJournalConfig({});
      setJournalEntries([]);
      setReviewSuggestions([]);
      setActivityLogs([]);
      setPeople([]);
      setPeopleSuggestions([]);
      setCommitments([]);
      setTimelineEvents([]);
      setVaultItems([]);
      setRawDocEntries([]);
      autoSyncTriggeredRef.current = false;
      return;
    }

    let cancelled = false;
    const unsubs: Array<() => void> = [];

    void ensureUserRootProfile(user)
      .then(() => {
        if (cancelled) return;
        unsubs.push(
          subscribeUserProfile(uid, ({ scratchpad, journalConfig: cfg }) => {
            setCloudScratchpad(scratchpad);
            setJournalConfig(cfg);
          }),
          subscribeUserCollection<TaskItem>(uid, 'tasks', setCloudTasks),
          subscribeUserCollection<ScheduleBlock>(uid, 'schedule', setCloudSchedule),
          subscribeUserCollection<HabitItem>(uid, 'habits', setCloudHabits),
          subscribeUserCollection<FocusSession>(uid, 'focusSessions', setCloudFocusSessions),
          subscribeUserCollection<NoteItem>(uid, 'notes', setCloudNotes),
          subscribeUserCollection<JournalEntrySummary>(uid, 'journalEntries', setJournalEntries),
          subscribeUserCollection<ReviewSuggestion>(uid, 'reviewSuggestions', setReviewSuggestions),
          subscribeUserCollection<ActivityLog>(uid, 'activityLogs', setActivityLogs),
          subscribeUserCollection<PersonProfile>(uid, 'people', setPeople),
          subscribeUserCollection<PersonSuggestion>(uid, 'peopleSuggestions', setPeopleSuggestions),
          subscribeUserCollection<CommitmentItem>(uid, 'commitments', setCommitments),
          subscribeUserCollection<TimelineEvent>(uid, 'timelineEvents', setTimelineEvents),
          subscribeUserCollection<VaultItem>(uid, 'vaultItems', setVaultItems)
        );
      })
      .catch((err) => {
        setSyncError(err instanceof Error ? err.message : 'Unable to connect to Firestore.');
      });

    return () => {
      cancelled = true;
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, [uid, user]);

  // Active workspace datasets
  const tasks = uid ? cloudTasks : localTasks;
  const schedule = uid ? cloudSchedule : localSchedule;
  const habits = uid ? cloudHabits : localHabits;
  const focusSessions = uid ? cloudFocusSessions : localFocusSessions;
  const notes = uid ? cloudNotes : localNotes;
  const scratchpad = uid ? cloudScratchpad : localScratchpad;

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setAccessToken(result.accessToken);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Google sign-in could not be completed.';
      setAuthError(message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setAuthError(null);
    setSyncStatusMessage(null);
    setSyncError(null);
    setModifiedEntryPrompt(null);
    setRawDocEntries([]);
    autoSyncTriggeredRef.current = false;
  };

  // Scratchpad handler (debounced Firestore save when signed in)
  const handleUpdateScratchpad = (value: string) => {
    if (uid) {
      setCloudScratchpad(value);
      if (scratchpadTimerRef.current) {
        window.clearTimeout(scratchpadTimerRef.current);
      }
      scratchpadTimerRef.current = window.setTimeout(() => {
        void updateUserScratchpad(uid, value);
      }, 450);
    } else {
      setLocalScratchpad(value);
    }
  };

  // Task handlers
  const handleToggleTask = (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    if (uid) {
      void fsTasks.update(uid, id, { completed: !target.completed });
    } else {
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      );
    }
  };

  const handleQuickAddTask = (
    title: string,
    category: TaskCategory,
    priority: TaskPriority
  ) => {
    const newTask: TaskItem = {
      id: makeId('task'),
      title,
      category,
      priority,
      dueDate: getTodayKey(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    if (uid) {
      void fsTasks.create(uid, newTask);
    } else {
      setLocalTasks((prev) => [newTask, ...prev]);
    }
  };

  const handleSaveTaskModal = (
    data: Omit<TaskItem, 'id' | 'createdAt' | 'completed'>,
    existingId?: string
  ) => {
    if (existingId) {
      if (uid) {
        void fsTasks.update(uid, existingId, {
          title: data.title.slice(0, 300),
          category: data.category,
          priority: data.priority,
          dueDate: data.dueDate.slice(0, 20),
          notes: (data.notes ?? '').slice(0, 2000),
        });
      } else {
        setLocalTasks((prev) =>
          prev.map((t) => (t.id === existingId ? { ...t, ...data } : t))
        );
      }
    } else {
      const newTask: TaskItem = {
        id: makeId('task'),
        ...data,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      if (uid) {
        void fsTasks.create(uid, newTask);
      } else {
        setLocalTasks((prev) => [newTask, ...prev]);
      }
    }
  };

  const handleDeleteTask = (id: string) => {
    if (uid) {
      void fsTasks.remove(uid, id);
    } else {
      setLocalTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // Schedule handlers
  const handleAddScheduleBlock = (block: Omit<ScheduleBlock, 'id'>) => {
    const newBlock: ScheduleBlock = { id: makeId('sched'), ...block };
    if (uid) {
      void fsSchedule.create(uid, newBlock);
    } else {
      setLocalSchedule((prev) => [...prev, newBlock]);
    }
  };

  const handleDeleteScheduleBlock = (id: string) => {
    if (uid) {
      void fsSchedule.remove(uid, id);
    } else {
      setLocalSchedule((prev) => prev.filter((b) => b.id !== id));
    }
  };

  // Habit & Focus handlers
  const handleToggleHabitDay = (habitId: string, dayIndex: number) => {
    const target = habits.find((h) => h.id === habitId);
    if (!target) return;
    const nextDays = [...target.completedDays];
    nextDays[dayIndex] = !nextDays[dayIndex];
    if (uid) {
      void fsHabits.update(uid, habitId, { completedDays: nextDays });
    } else {
      setLocalHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, completedDays: nextDays } : h))
      );
    }
  };

  const handleAddHabit = (name: string, category: string, targetDaysPerWeek: number) => {
    const newHabit: HabitItem = {
      id: makeId('habit'),
      name,
      category,
      targetDaysPerWeek,
      completedDays: [false, false, false, false, false, false, false],
    };
    if (uid) {
      void fsHabits.create(uid, newHabit);
    } else {
      setLocalHabits((prev) => [...prev, newHabit]);
    }
  };

  const handleDeleteHabit = (habitId: string) => {
    if (uid) {
      void fsHabits.remove(uid, habitId);
    } else {
      setLocalHabits((prev) => prev.filter((h) => h.id !== habitId));
    }
  };

  const handleCompleteFocusSession = (minutes: number, label: string) => {
    const newSession: FocusSession = {
      id: makeId('focus'),
      label,
      minutes,
      completedAt: new Date().toISOString(),
      dateKey: getTodayKey(),
    };
    if (uid) {
      void fsFocus.create(uid, newSession);
    } else {
      setLocalFocusSessions((prev) => [newSession, ...prev]);
    }
  };

  // Notes handlers
  const handleCreateNote = (): string => {
    const newId = makeId('note');
    const newNote: NoteItem = {
      id: newId,
      title: 'Untitled Note',
      category: 'General',
      content: '',
      updatedAt: new Date().toISOString(),
    };
    if (uid) {
      void fsNotes.create(uid, newNote);
    } else {
      setLocalNotes((prev) => [newNote, ...prev]);
    }
    return newId;
  };

  const handleUpdateNote = (
    id: string,
    patch: Partial<Pick<NoteItem, 'title' | 'category' | 'content'>>
  ) => {
    if (uid) {
      void fsNotes.update(uid, id, patch);
    } else {
      setLocalNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
        )
      );
    }
  };

  const handleDeleteNote = (id: string) => {
    if (uid) {
      void fsNotes.remove(uid, id);
    } else {
      setLocalNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const ensureGoogleAccessToken = async (): Promise<string | null> => {
    if (accessToken) return accessToken;
    try {
      const result = await googleSignIn(user?.email);
      setUser(result.user);
      setAccessToken(result.accessToken);
      return result.accessToken;
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'Unable to refresh Google access.'
      );
      return null;
    }
  };

  const handleAuthErrorReset = (err: unknown) => {
    const msg = err instanceof Error ? err.message : '';
    if (msg.toLowerCase().includes('session expired')) {
      clearAccessToken();
      setAccessToken(null);
    }
  };

  // Journal Integration Handlers
  const handleSelectJournalDoc = async () => {
    if (!uid) {
      setSyncError('Sign in with Google before choosing your journal doc.');
      return;
    }
    setSyncError(null);
    const token = await ensureGoogleAccessToken();
    if (!token) return;
    try {
      const picked = await pickJournalGoogleDoc(token);
      if (!picked) return;
      await updateUserJournalConfig(uid, {
        journalDocId: picked.id,
        journalDocName: picked.name,
        journalDocUrl: picked.url,
        lastSyncError: '',
      });
      setSyncStatusMessage(`Connected "${picked.name}". Click Sync Journal to process the latest entry.`);
    } catch (err) {
      handleAuthErrorReset(err);
      setSyncError(err instanceof Error ? err.message : 'Unable to open Google Docs Picker.');
    }
  };

  const handleLoadRawDocEntries = async () => {
    if (!journalConfig.journalDocId) return;
    const token = await ensureGoogleAccessToken();
    if (!token) return;
    setIsLoadingRawDoc(true);
    try {
      const { entries } = await fetchGoogleDocEntries(journalConfig.journalDocId, token);
      setRawDocEntries(entries);
    } catch (err) {
      handleAuthErrorReset(err);
      setSyncError(
        err instanceof Error ? err.message : 'Unable to read the selected Google Doc.'
      );
    } finally {
      setIsLoadingRawDoc(false);
    }
  };

  const handleSyncJournal = async (forceReprocess = false, isAutoTrigger = false) => {
    if (!uid) {
      setSyncError('Sign in with Google to sync your journal.');
      return;
    }
    if (!journalConfig.aiPrivacyAcknowledged) {
      setSyncError('Please review and acknowledge the Gemini free-tier privacy notice first.');
      return;
    }
    const token = isAutoTrigger ? accessToken : await ensureGoogleAccessToken();
    if (!token) return;

    setIsSyncingJournal(true);
    setSyncError(null);
    setSyncStatusMessage(null);
    if (forceReprocess) {
      setModifiedEntryPrompt(null);
    }

    try {
      const result = await syncLatestJournalEntry({
        uid,
        accessToken: token,
        journalConfig,
        existingEntries: journalEntries,
        existingSuggestions: reviewSuggestions,
        existingPeople: people,
        existingPeopleSuggestions: peopleSuggestions,
        existingCommitments: commitments,
        existingTimeline: timelineEvents,
        forceReprocess,
      });

      if (result.allEntries) {
        setRawDocEntries(result.allEntries);
      }

      if (result.status === 'up_to_date') {
        setSyncStatusMessage(
          `Already up to date (${result.entryDate}). No changes detected since last sync.`
        );
      } else if (result.status === 'modified_detected' && result.modifiedEntry) {
        setModifiedEntryPrompt(result.modifiedEntry);
      } else if (result.status === 'empty') {
        setSyncStatusMessage('No journal entries found yet in the selected document.');
      } else if (result.status === 'synced') {
        setSyncStatusMessage(
          `Synced entry for ${result.entryDate}${
            result.newSuggestionsCount
              ? ` · ${result.newSuggestionsCount} new items ready for review.`
              : '.'
          }`
        );
      }
    } catch (err) {
      handleAuthErrorReset(err);
      setSyncError(err instanceof Error ? err.message : 'Journal synchronization failed.');
    } finally {
      setIsSyncingJournal(false);
    }
  };

  syncLatestFnRef.current = (forceReprocess?: boolean) => handleSyncJournal(forceReprocess, true);

  // Optional automatic sync of ONLY the single latest entry on website open
  useEffect(() => {
    if (
      uid &&
      accessToken &&
      journalConfig.journalDocId &&
      journalConfig.autoSyncOnOpen &&
      journalConfig.aiPrivacyAcknowledged &&
      !autoSyncTriggeredRef.current &&
      !isSyncingJournal
    ) {
      autoSyncTriggeredRef.current = true;
      void syncLatestFnRef.current(false);
    }
  }, [
    uid,
    accessToken,
    journalConfig.journalDocId,
    journalConfig.autoSyncOnOpen,
    journalConfig.aiPrivacyAcknowledged,
    isSyncingJournal,
  ]);

  const handleRunHistoricalBatch = async () => {
    if (!uid) {
      setSyncError('Sign in with Google to analyze older entries.');
      return;
    }
    if (!journalConfig.aiPrivacyAcknowledged) {
      setSyncError('Please review and acknowledge the Gemini free-tier privacy notice first.');
      return;
    }
    const token = await ensureGoogleAccessToken();
    if (!token) return;

    setIsRunningHistorical(true);
    setSyncError(null);
    setHistoricalProgress('Scanning document for unprocessed entries...');
    try {
      const res = await runHistoricalJournalBatch({
        uid,
        accessToken: token,
        journalConfig,
        existingEntries: journalEntries,
        existingSuggestions: reviewSuggestions,
        existingPeople: people,
        existingPeopleSuggestions: peopleSuggestions,
        existingCommitments: commitments,
        existingTimeline: timelineEvents,
        batchSize: 3,
        onProgress: (processed, total, heading) => {
          setHistoricalProgress(`Analyzing ${processed} of ${total}: ${heading}`);
        },
      });
      setHistoricalProgress(null);
      setSyncStatusMessage(
        res.processedCount > 0
          ? `Processed ${res.processedCount} older ${
              res.processedCount === 1 ? 'entry' : 'entries'
            }.${res.totalUnprocessed > 0 ? ` ${res.totalUnprocessed} more remaining.` : ''}`
          : 'All entries in this document are already processed.'
      );
    } catch (err) {
      handleAuthErrorReset(err);
      setHistoricalProgress(null);
      setSyncError(err instanceof Error ? err.message : 'Historical analysis failed.');
    } finally {
      setIsRunningHistorical(false);
    }
  };

  const handleConfirmSuggestion = async (
    suggestion: ReviewSuggestion,
    edited?: { title: string; proposedValue: string; amount?: number; category?: string }
  ) => {
    if (!uid) return;
    const title = edited?.title || suggestion.title;
    const proposedValue = edited?.proposedValue || suggestion.proposedValue;
    const amount = edited?.amount ?? suggestion.amount;
    const category = edited?.category ?? suggestion.category;

    if (suggestion.kind === 'sleep' || suggestion.kind === 'spending') {
      await fsActivityLogs.create(uid, {
        id: sanitizeId(`log_${suggestion.id}`),
        kind: suggestion.kind,
        entryDate: suggestion.entryDate,
        title,
        value: proposedValue,
        amount: typeof amount === 'number' ? amount : undefined,
        currency: suggestion.currency,
        category,
        excerpt: suggestion.excerpt,
        sourceEntryId: suggestion.sourceEntryId,
        fingerprint: suggestion.fingerprint,
      });
    } else {
      const kindMap = {
        vault_link: 'link',
        vault_song: 'song',
        vault_note: 'note',
      } as const;
      const mappedKind = kindMap[suggestion.kind];
      const safeUrl =
        mappedKind === 'link' || mappedKind === 'song'
          ? sanitizeExternalUrl(category)
          : undefined;
      await fsVault.create(uid, {
        id: sanitizeId(`vlt_${suggestion.id}`),
        kind: mappedKind,
        title,
        description: proposedValue,
        url: safeUrl,
        artist: mappedKind === 'song' && !safeUrl ? category : undefined,
        dateAdded: suggestion.entryDate,
        tags: [],
        sourceEntryId: suggestion.sourceEntryId,
      });
    }

    await fsReviewSuggestions.update(uid, suggestion.id, {
      ...(edited
        ? {
            title,
            proposedValue,
            ...(typeof amount === 'number' ? { amount } : {}),
            ...(category ? { category } : {}),
          }
        : {}),
      status: 'confirmed',
    });
  };

  const handleDismissSuggestion = async (suggestionId: string) => {
    if (!uid) return;
    await fsReviewSuggestions.update(uid, suggestionId, { status: 'dismissed' });
  };

  const handleDeleteActivityLog = async (logId: string) => {
    if (!uid) return;
    await fsActivityLogs.remove(uid, logId);
  };

  const handleDeleteAllJournalData = async () => {
    if (!uid) return;
    await deleteAllJournalIntelligenceData(uid);
    setSyncStatusMessage('Generated journal summaries, logs, suggestions, and timeline events deleted.');
    setSyncError(null);
    setModifiedEntryPrompt(null);
  };

  // People Directory Handlers
  const handleCreatePerson = async (
    person: Omit<PersonProfile, 'id' | 'mentionCount' | 'memories' | 'sourceEntryIds'>
  ) => {
    if (!uid) return;
    await fsPeople.create(uid, {
      id: makeId('person'),
      ...person,
      mentionCount: 0,
      memories: [],
      sourceEntryIds: [],
    });
  };

  const handleConfirmPersonSuggestion = async (sug: PersonSuggestion, mergeIntoId?: string) => {
    if (!uid) return;
    if (mergeIntoId) {
      const target = people.find((p) => p.id === mergeIntoId);
      if (target) {
        const nextAliases =
          sug.name.toLowerCase() !== target.name.toLowerCase() &&
          !target.aliases.some((a) => a.toLowerCase() === sug.name.toLowerCase())
            ? [...target.aliases, sug.name]
            : target.aliases;
        const nextSourceIds = sug.sourceEntryId
          ? Array.from(new Set([...target.sourceEntryIds, sug.sourceEntryId]))
          : target.sourceEntryIds;
        const nextMemories = sug.memory
          ? Array.from(new Set([...target.memories, `${sug.entryDate}: ${sug.memory}`]))
          : target.memories;
        const latestDate =
          (target.lastMentionedDate || '') >= sug.entryDate
            ? target.lastMentionedDate
            : sug.entryDate;

        await fsPeople.update(uid, target.id, {
          aliases: nextAliases.slice(0, 20),
          sourceEntryIds: nextSourceIds.slice(0, 100),
          mentionCount: Math.max(target.mentionCount, nextSourceIds.length),
          lastMentionedDate: latestDate,
          memories: nextMemories.slice(0, 40),
        });
      }
    } else {
      await fsPeople.create(uid, {
        id: makeId('person'),
        name: sug.name,
        aliases: [],
        relationship: sug.relationship,
        birthday: sug.birthday,
        lastMentionedDate: sug.entryDate,
        mentionCount: sug.sourceEntryId ? 1 : 0,
        memories: sug.memory ? [`${sug.entryDate}: ${sug.memory}`] : [],
        sourceEntryIds: sug.sourceEntryId ? [sug.sourceEntryId] : [],
      });
    }

    await fsPeopleSuggestions.update(uid, sug.id, { status: 'confirmed' });
  };

  const handleMergePeople = async (targetId: string, duplicateId: string) => {
    if (!uid) return;
    const target = people.find((p) => p.id === targetId);
    const duplicate = people.find((p) => p.id === duplicateId);
    if (!target || !duplicate) return;
    await fsPeople.merge(uid, target, duplicate);
  };

  const handleResetWorkspace = () => {
    setLocalTasks(INITIAL_TASKS);
    setLocalSchedule(INITIAL_SCHEDULE);
    setLocalHabits(INITIAL_HABITS);
    setLocalFocusSessions(INITIAL_FOCUS_SESSIONS);
    setLocalNotes(INITIAL_NOTES);
    setLocalScratchpad(DEFAULT_SCRATCHPAD);
  };

  const openNewTaskModal = () => {
    setEditingTask(null);
    setTaskModalOpen(true);
  };

  const openEditTaskModal = (task: TaskItem) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const pendingTaskCount = tasks.filter((t) => !t.completed).length;
  const journalPendingCount = reviewSuggestions.filter((s) => s.status === 'pending').length;
  const peoplePendingCount = peopleSuggestions.filter((s) => s.status === 'pending').length;
  const commitmentsPendingCount = commitments.filter((c) => c.status === 'pending').length;
  const timelinePendingCount = timelineEvents.filter((t) => t.status === 'pending').length;
  const totalLifePendingCount =
    journalPendingCount + peoplePendingCount + commitmentsPendingCount + timelinePendingCount;

  const latestJournalEntry = useMemo(() => {
    if (journalEntries.length === 0) return null;
    return [...journalEntries].sort((a, b) => b.entryDate.localeCompare(a.entryDate))[0];
  }, [journalEntries]);

  const userFirstName =
    user?.displayName?.trim().split(/\s+/)[0] ||
    user?.email?.split('@')[0] ||
    null;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onResetWorkspace={handleResetWorkspace}
        pendingCount={pendingTaskCount}
        journalPendingCount={journalPendingCount}
        peoplePendingCount={peoplePendingCount}
        commitmentsPendingCount={commitmentsPendingCount}
        timelinePendingCount={timelinePendingCount}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        user={user}
        hasWorkspaceToken={Boolean(accessToken)}
        isSigningIn={isSigningIn}
        onSignIn={() => void handleGoogleSignIn()}
        onSignOut={() => void handleGoogleSignOut()}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeView={activeView}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onNewTask={openNewTaskModal}
        />

        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
          {!isCloudSignedIn &&
            (activeView === DashboardView.People ||
              activeView === DashboardView.Commitments ||
              activeView === DashboardView.Timeline ||
              activeView === DashboardView.Vault) && (
              <div className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Sign in with your Google account to save and sync your People directory, commitments, timeline, and Vault privately in Firestore.
                </p>
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={() => void handleGoogleSignIn()}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
                </button>
              </div>
            )}

          {activeView === DashboardView.Overview && (
            <OverviewView
              tasks={tasks}
              schedule={schedule}
              habits={habits}
              focusSessions={focusSessions}
              scratchpad={scratchpad}
              latestJournalEntry={latestJournalEntry}
              pendingLifeReviewCount={totalLifePendingCount}
              userFirstName={userFirstName}
              isSignedIn={Boolean(user)}
              hasWorkspaceToken={Boolean(accessToken)}
              isSigningIn={isSigningIn}
              onSignIn={() => void handleGoogleSignIn()}
              onUpdateScratchpad={handleUpdateScratchpad}
              onToggleTask={handleToggleTask}
              onQuickAddTask={handleQuickAddTask}
              onCompleteFocusSession={handleCompleteFocusSession}
              onNavigate={setActiveView}
              onOpenNewTaskModal={openNewTaskModal}
            />
          )}

          {activeView === DashboardView.Journal && (
            <JournalView
              isSignedIn={isCloudSignedIn}
              hasWorkspaceToken={Boolean(accessToken)}
              isSigningIn={isSigningIn}
              journalConfig={journalConfig}
              entries={journalEntries}
              suggestions={reviewSuggestions}
              activityLogs={activityLogs}
              syncStatusMessage={syncStatusMessage}
              syncError={syncError}
              isSyncing={isSyncingJournal}
              isRunningHistorical={isRunningHistorical}
              historicalProgress={historicalProgress}
              modifiedEntryPrompt={modifiedEntryPrompt}
              onSignIn={() => void handleGoogleSignIn()}
              onSelectJournalDoc={() => void handleSelectJournalDoc()}
              onSyncJournal={(force) => void handleSyncJournal(Boolean(force))}
              onRunHistoricalBatch={() => void handleRunHistoricalBatch()}
              onDismissModifiedPrompt={() => setModifiedEntryPrompt(null)}
              onUpdateJournalConfig={(patch) => {
                if (uid) void updateUserJournalConfig(uid, patch);
              }}
              onConfirmSuggestion={(sug, edited) => void handleConfirmSuggestion(sug, edited)}
              onDismissSuggestion={(id) => void handleDismissSuggestion(id)}
              onDeleteActivityLog={(id) => void handleDeleteActivityLog(id)}
              onDeleteAllJournalData={() => void handleDeleteAllJournalData()}
              onDisconnectGoogle={() => void handleGoogleSignOut()}
            />
          )}

          {activeView === DashboardView.AskMyLife && (
            <AskMyLifeView
              isSignedIn={isCloudSignedIn}
              hasWorkspaceToken={Boolean(accessToken)}
              isSigningIn={isSigningIn}
              journalConfig={journalConfig}
              journalEntries={journalEntries}
              rawDocEntries={rawDocEntries}
              isLoadingRawDoc={isLoadingRawDoc}
              people={people}
              timelineEvents={timelineEvents}
              commitments={commitments}
              activityLogs={activityLogs}
              vaultItems={vaultItems}
              notes={notes}
              tasks={tasks}
              onSignIn={() => void handleGoogleSignIn()}
              onAcknowledgePrivacy={() => {
                if (uid) void updateUserJournalConfig(uid, { aiPrivacyAcknowledged: true });
              }}
              onLoadRawDocEntries={handleLoadRawDocEntries}
            />
          )}

          {activeView === DashboardView.People && (
            <PeopleView
              people={people}
              suggestions={peopleSuggestions}
              journalEntries={journalEntries}
              onCreatePerson={(p) => void handleCreatePerson(p)}
              onUpdatePerson={(id, patch) => {
                if (uid) void fsPeople.update(uid, id, patch);
              }}
              onDeletePerson={(id) => {
                if (uid) void fsPeople.remove(uid, id);
              }}
              onMergePeople={(targetId, duplicateId) => void handleMergePeople(targetId, duplicateId)}
              onConfirmSuggestion={(sug, mergeId) =>
                void handleConfirmPersonSuggestion(sug, mergeId)
              }
              onDismissSuggestion={(id) => {
                if (uid) void fsPeopleSuggestions.update(uid, id, { status: 'dismissed' });
              }}
            />
          )}

          {activeView === DashboardView.Commitments && (
            <CommitmentsView
              items={commitments}
              onCreateItem={(item) => {
                if (!uid) return;
                void fsCommitments.create(uid, {
                  id: makeId('cmt'),
                  title: item.title,
                  context: item.context,
                  dueDate: item.dueDate,
                  dateMentioned: getTodayKey(),
                  status: 'approved',
                  fingerprint: makeId('manual'),
                });
              }}
              onUpdateItem={(id, patch) => {
                if (uid) void fsCommitments.update(uid, id, patch);
              }}
              onDeleteItem={(id) => {
                if (uid) void fsCommitments.remove(uid, id);
              }}
            />
          )}

          {activeView === DashboardView.Timeline && (
            <TimelineView
              events={timelineEvents}
              onCreateEvent={(item) => {
                if (!uid) return;
                void fsTimeline.create(uid, {
                  id: makeId('tl'),
                  title: item.title,
                  description: item.description,
                  eventDate: item.eventDate,
                  category: item.category,
                  docUrl: item.docUrl || journalConfig.journalDocUrl,
                  status: 'approved',
                  fingerprint: makeId('manual'),
                });
              }}
              onUpdateEvent={(id, patch) => {
                if (uid) void fsTimeline.update(uid, id, patch);
              }}
              onDeleteEvent={(id) => {
                if (uid) void fsTimeline.remove(uid, id);
              }}
            />
          )}

          {activeView === DashboardView.Vault && (
            <VaultView
              items={vaultItems}
              people={people}
              timelineEvents={timelineEvents}
              onCreateItem={(item) => {
                if (!uid) return;
                void fsVault.create(uid, {
                  id: makeId('vlt'),
                  ...item,
                });
              }}
              onUpdateItem={(id, patch) => {
                if (uid) void fsVault.update(uid, id, patch);
              }}
              onDeleteItem={(item) => {
                if (!uid) return;
                void fsVault.remove(uid, item.id);
              }}
            />
          )}

          {activeView === DashboardView.Tasks && (
            <TasksView
              tasks={tasks}
              onToggleTask={handleToggleTask}
              onEditTask={openEditTaskModal}
              onDeleteTask={handleDeleteTask}
              onOpenNewTask={openNewTaskModal}
            />
          )}

          {activeView === DashboardView.Schedule && (
            <ScheduleView
              schedule={schedule}
              onAddBlock={handleAddScheduleBlock}
              onDeleteBlock={handleDeleteScheduleBlock}
            />
          )}

          {activeView === DashboardView.FocusHabits && (
            <FocusHabitsView
              habits={habits}
              focusSessions={focusSessions}
              onToggleHabitDay={handleToggleHabitDay}
              onAddHabit={handleAddHabit}
              onDeleteHabit={handleDeleteHabit}
              onCompleteFocusSession={handleCompleteFocusSession}
            />
          )}

          {activeView === DashboardView.Notes && (
            <NotesView
              notes={notes}
              onCreateNote={handleCreateNote}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
            />
          )}

          {activeView === DashboardView.GoogleWorkspace && (
            <WorkspaceView
              user={user}
              accessToken={accessToken}
              isSigningIn={isSigningIn}
              authError={authError}
              onSignIn={handleGoogleSignIn}
              onSignOut={handleGoogleSignOut}
              onTokenExpired={() => {
                clearAccessToken();
                setAccessToken(null);
              }}
              onImportCalendarEvent={handleAddScheduleBlock}
            />
          )}
        </main>
      </div>

      <TaskModal
        isOpen={taskModalOpen}
        initialTask={editingTask}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTaskModal}
      />
    </div>
  );
}
