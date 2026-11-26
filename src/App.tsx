/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  DEFAULT_SCRATCHPAD,
  getCurrentWeekDateKeys,
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
  clearLegacyTaskAiFields,
  ensureUserRootProfile,
  fsFocus,
  fsHabits,
  fsNotes,
  fsSchedule,
  fsTasks,
  sanitizeId,
  subscribeUserCollection,
  subscribeUserProfile,
  updateUserScratchpad,
} from './services/firestoreService';
import {
  completeTaskWithRecurrence,
  computeAutoPriorityEscalations,
  computeCategoryDeletion,
  migrateTask,
  migrateTasks,
  validateAndMigrateFocusSessions,
  validateAndMigrateHabits,
  validateAndMigrateNotes,
  validateAndMigrateSchedule,
  validateAndMigrateSettings,
  validateScratchpad,
} from './utils/taskUtils';
import {
  evaluateRemindersTick,
  FiredReminderStore,
  pruneFiredReminders,
  reconcileRemindersWithTasks,
  validateFiredReminderStore,
  validateReminderRecords,
} from './utils/reminderUtils';
import { playReminderChime } from './utils/notificationSound';
import {
  getStyleDefinition,
  resolveEffectiveColorMode,
  VALID_STYLES,
} from './styles/stylesConfig';
import {
  AppSettings,
  AppStyleId,
  CategoryItem,
  DashboardView,
  DEFAULT_APP_SETTINGS,
  DEFAULT_CATEGORIES,
  FocusSession,
  HabitItem,
  NoteItem,
  ReminderRecord,
  ScheduleBlock,
  TaskItem,
  TaskPriority,
} from './types/dashboard';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewView } from './components/OverviewView';
import { TasksView } from './components/TasksView';
import { ScheduleView } from './components/ScheduleView';
import { FocusView } from './components/FocusView';
import { HabitsView } from './components/HabitsView';
import { NotesView } from './components/NotesView';
import { WorkspaceView } from './components/WorkspaceView';
import { BrowserNotificationStatus, SettingsView } from './components/SettingsView';
import { TaskModal } from './components/TaskModal';
import { QuickMultiAddModal } from './components/QuickMultiAddModal';
import { ReminderOverlay } from './components/ReminderOverlay';
import { OfflineBanner } from './components/OfflineBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CategoryManagerModal } from './components/ui/CategoryManagerModal';
import { AuroraBackdrop } from './components/AuroraBackdrop';
import { CelestialBackdrop } from './components/CelestialBackdrop';

const CADENCE_FIRED_REMINDERS_KEY = 'cadence_fired_reminders';
const CADENCE_REMINDER_RECORDS_KEY = 'cadence_reminder_records';
const BASE_DOCUMENT_TITLE = 'Cadence — Personal Dashboard';

function makeId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 10);
  return sanitizeId(`${prefix}_${Date.now()}_${rand}`);
}

function getBrowserNotificationStatus(): BrowserNotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

function readFiredStoreSync(): FiredReminderStore {
  try {
    const raw = window.localStorage.getItem(CADENCE_FIRED_REMINDERS_KEY);
    if (!raw) return {};
    return validateFiredReminderStore(JSON.parse(raw));
  } catch {
    return {};
  }
}

function writeFiredStoreSync(store: FiredReminderStore): void {
  try {
    window.localStorage.setItem(CADENCE_FIRED_REMINDERS_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors
  }
}

const VALID_VIEWS = new Set<string>(Object.values(DashboardView));

export default function App() {
  const [storedSettings, setStoredSettings] = useLocalStorage<AppSettings>(
    'cadence_settings',
    DEFAULT_APP_SETTINGS,
    validateAndMigrateSettings
  );

  const appSettings = useMemo<AppSettings>(() => {
    const validated = validateAndMigrateSettings(storedSettings);
    const safeStyle: AppStyleId = VALID_STYLES.has(validated.style)
      ? validated.style
      : 'classic';
    return {
      ...validated,
      style: safeStyle,
    };
  }, [storedSettings]);

  const [activeView, setActiveView] = useState<DashboardView>(() =>
    VALID_VIEWS.has(appSettings.defaultView) ? appSettings.defaultView : DashboardView.Overview
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

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

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const activeStyleDef = useMemo(
    () => getStyleDefinition(appSettings.style),
    [appSettings.style]
  );

  const effectiveColorMode = useMemo(
    () => resolveEffectiveColorMode(appSettings.colorMode, activeStyleDef.supportedModes),
    [appSettings.colorMode, activeStyleDef.supportedModes]
  );

  const isDark =
    effectiveColorMode === 'dark' ||
    (effectiveColorMode === 'system' && systemPrefersDark);

  const [styleCrossFading, setStyleCrossFading] = useState(false);
  const prevStyleRef = useRef<AppStyleId>(appSettings.style);

  useEffect(() => {
    if (prevStyleRef.current === appSettings.style) return;
    prevStyleRef.current = appSettings.style;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (appSettings.reducedMotion || prefersReduced) {
      return;
    }

    const root = document.documentElement;
    root.classList.add('style-transitioning');
    setStyleCrossFading(true);
    const timer = window.setTimeout(() => {
      root.classList.remove('style-transitioning');
      setStyleCrossFading(false);
    }, 240);

    return () => {
      window.clearTimeout(timer);
      root.classList.remove('style-transitioning');
    };
  }, [appSettings.style, appSettings.reducedMotion]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (
      activeStyleDef.supportedModes.includes('light') &&
      activeStyleDef.supportedModes.includes('dark')
    ) {
      localStorage.setItem('cadence_theme', isDark ? 'dark' : 'light');
    }
    root.setAttribute('data-style', activeStyleDef.id);
    root.setAttribute('data-theme', appSettings.theme);
    root.setAttribute('data-density', appSettings.density);
    if (appSettings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    if (appSettings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isDark ? '#0B0F17' : '#2563eb');
    }
  }, [
    isDark,
    activeStyleDef.id,
    activeStyleDef.supportedModes,
    appSettings.theme,
    appSettings.density,
    appSettings.highContrast,
    appSettings.reducedMotion,
  ]);

  // Cursor spotlight on card borders + subtle 3D tilt on KPI cards only (Aurora Glass)
  useEffect(() => {
    if (activeStyleDef.id !== 'aurora') return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (appSettings.reducedMotion || prefersReduced) return;

    let rafId = 0;
    let lastX = -999;
    let lastY = -999;
    let lastTarget: EventTarget | null = null;

    const updateSpotlightAndTilt = () => {
      rafId = 0;
      const cards = document.querySelectorAll<HTMLElement>(
        '.cadence-card, .aurora-kpi-card, .aurora-hero-header'
      );
      const hoveredKpi =
        lastTarget instanceof Element ? lastTarget.closest('.aurora-kpi-card') : null;

      cards.forEach((el) => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--aurora-mx', `${lastX - rect.left}px`);
        el.style.setProperty('--aurora-my', `${lastY - rect.top}px`);

        if (el.classList.contains('aurora-kpi-card')) {
          if (el === hoveredKpi && rect.width > 0 && rect.height > 0) {
            const nx = ((lastX - rect.left) / rect.width) * 2 - 1;
            const ny = ((lastY - rect.top) / rect.height) * 2 - 1;
            const rx = Math.max(-3.2, Math.min(3.2, -ny * 3));
            const ry = Math.max(-3.2, Math.min(3.2, nx * 3));
            el.style.setProperty('--aurora-rx', `${rx.toFixed(2)}deg`);
            el.style.setProperty('--aurora-ry', `${ry.toFixed(2)}deg`);
          } else {
            el.style.setProperty('--aurora-rx', '0deg');
            el.style.setProperty('--aurora-ry', '0deg');
          }
        }
      });
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      lastX = e.clientX;
      lastY = e.clientY;
      lastTarget = e.target;
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateSpotlightAndTilt);
      }
    };

    const handleReset = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      const cards = document.querySelectorAll<HTMLElement>(
        '.cadence-card, .aurora-kpi-card, .aurora-hero-header'
      );
      cards.forEach((el) => {
        el.style.setProperty('--aurora-mx', '-999px');
        el.style.setProperty('--aurora-my', '-999px');
        if (el.classList.contains('aurora-kpi-card')) {
          el.style.setProperty('--aurora-rx', '0deg');
          el.style.setProperty('--aurora-ry', '0deg');
        }
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handleReset);
    window.addEventListener('blur', handleReset);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('mouseleave', handleReset);
      window.removeEventListener('blur', handleReset);
      handleReset();
    };
  }, [activeStyleDef.id, appSettings.reducedMotion]);

  const handleUpdateSettings = (patch: Partial<AppSettings>) => {
    setStoredSettings((prev) => ({ ...DEFAULT_APP_SETTINGS, ...prev, ...patch }));
  };

  const handleResetSettings = () => {
    setStoredSettings(DEFAULT_APP_SETTINGS);
  };

  // Local fallback state when signed out (with runtime validation & migration)
  const [localTasks, setLocalTasks] = useLocalStorage<TaskItem[]>(
    'cadence_tasks',
    INITIAL_TASKS,
    migrateTasks
  );
  const [localSchedule, setLocalSchedule] = useLocalStorage<ScheduleBlock[]>(
    'cadence_schedule',
    INITIAL_SCHEDULE,
    validateAndMigrateSchedule
  );
  const [localHabits, setLocalHabits] = useLocalStorage<HabitItem[]>(
    'cadence_habits',
    INITIAL_HABITS,
    validateAndMigrateHabits
  );
  const [localFocusSessions, setLocalFocusSessions] = useLocalStorage<FocusSession[]>(
    'cadence_focus_sessions',
    INITIAL_FOCUS_SESSIONS,
    validateAndMigrateFocusSessions
  );
  const [localNotes, setLocalNotes] = useLocalStorage<NoteItem[]>(
    'cadence_notes',
    INITIAL_NOTES,
    validateAndMigrateNotes
  );
  const [localScratchpad, setLocalScratchpad] = useLocalStorage<string>(
    'cadence_scratchpad',
    DEFAULT_SCRATCHPAD,
    validateScratchpad
  );

  // Cloud Firestore state when signed in
  const [cloudTasks, setCloudTasks] = useState<TaskItem[]>([]);
  const [cloudSchedule, setCloudSchedule] = useState<ScheduleBlock[]>([]);
  const [cloudHabits, setCloudHabits] = useState<HabitItem[]>([]);
  const [cloudFocusSessions, setCloudFocusSessions] = useState<FocusSession[]>([]);
  const [cloudNotes, setCloudNotes] = useState<NoteItem[]>([]);
  const [cloudScratchpad, setCloudScratchpad] = useState<string>('');

  const scratchpadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!uid || !user) {
      setCloudTasks([]);
      setCloudSchedule([]);
      setCloudHabits([]);
      setCloudFocusSessions([]);
      setCloudNotes([]);
      setCloudScratchpad('');
      return;
    }

    const unsubs: Array<() => void> = [
      subscribeUserProfile(uid, ({ scratchpad }) => {
        setCloudScratchpad(scratchpad);
      }),
      subscribeUserCollection<TaskItem>(uid, 'tasks', setCloudTasks),
      subscribeUserCollection<ScheduleBlock>(uid, 'schedule', setCloudSchedule),
      subscribeUserCollection<HabitItem>(uid, 'habits', setCloudHabits),
      subscribeUserCollection<FocusSession>(uid, 'focusSessions', setCloudFocusSessions),
      subscribeUserCollection<NoteItem>(uid, 'notes', setCloudNotes),
    ];

    void ensureUserRootProfile(user).catch((err) => {
      if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        setAuthError(err instanceof Error ? err.message : 'Unable to connect to Firestore.');
      }
    });

    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, [uid, user]);

  const migratedCloudIdsRef = useRef<Set<string>>(new Set());

  // Clean up any legacy AI fields ('prioritySource: "ai"', 'durationSource') in Firestore & localStorage
  useEffect(() => {
    if (!uid) {
      migratedCloudIdsRef.current.clear();
      return;
    }
    for (const raw of cloudTasks) {
      if (migratedCloudIdsRef.current.has(raw.id)) continue;
      const legacy = raw as unknown as Record<string, unknown>;
      if ('durationSource' in legacy || legacy.prioritySource === 'ai') {
        migratedCloudIdsRef.current.add(raw.id);
        void clearLegacyTaskAiFields(uid, raw.id);
      }
    }
  }, [uid, cloudTasks]);

  useEffect(() => {
    const hasLegacy = localTasks.some((t) => {
      const legacy = t as unknown as Record<string, unknown>;
      return 'durationSource' in legacy || legacy.prioritySource === 'ai' || 'notes' in legacy;
    });
    if (hasLegacy) {
      setLocalTasks((prev) => migrateTasks(prev));
    }
  }, [localTasks, setLocalTasks]);

  // Active workspace datasets (with task & collection schema validation applied)
  const rawTasks = uid ? cloudTasks : localTasks;
  const tasks = useMemo(() => migrateTasks(rawTasks), [rawTasks]);
  const schedule = useMemo(
    () => validateAndMigrateSchedule(uid ? cloudSchedule : localSchedule),
    [uid, cloudSchedule, localSchedule]
  );
  const habits = useMemo(
    () => validateAndMigrateHabits(uid ? cloudHabits : localHabits),
    [uid, cloudHabits, localHabits]
  );
  const focusSessions = useMemo(
    () => validateAndMigrateFocusSessions(uid ? cloudFocusSessions : localFocusSessions),
    [uid, cloudFocusSessions, localFocusSessions]
  );
  const notes = useMemo(
    () => validateAndMigrateNotes(uid ? cloudNotes : localNotes),
    [uid, cloudNotes, localNotes]
  );
  const scratchpad = uid ? validateScratchpad(cloudScratchpad) : localScratchpad;

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [multiAddOpen, setMultiAddOpen] = useState(false);
  const [multiAddInitialText, setMultiAddInitialText] = useState('');

  // Auto-raise priority as deadline approaches (opt-in, rule-based, non-destructive)
  const autoUpdatingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!appSettings.autoRaisePriorityEnabled) {
      autoUpdatingRef.current.clear();
      return;
    }
    const { tasks: escalated, changes } = computeAutoPriorityEscalations(
      tasks,
      appSettings,
      getTodayKey()
    );
    if (changes.length === 0) return;

    if (uid) {
      for (const ch of changes) {
        const lockKey = `${ch.taskId}:${ch.newPriority}`;
        if (autoUpdatingRef.current.has(lockKey)) continue;
        const updatedTask = escalated.find((t) => t.id === ch.taskId);
        if (!updatedTask) continue;
        autoUpdatingRef.current.add(lockKey);
        void fsTasks.update(uid, ch.taskId, {
          priority: updatedTask.priority,
          prioritySource: 'auto',
          priorityAutoPrev: updatedTask.priorityAutoPrev,
          priorityAutoReason: updatedTask.priorityAutoReason,
        });
      }
    } else {
      setLocalTasks(escalated);
    }
  }, [
    tasks,
    appSettings.autoRaisePriorityEnabled,
    appSettings.autoRaiseHighDays,
    appSettings.autoRaiseMediumDays,
    uid,
    setLocalTasks,
  ]);

  // Task Reminders State & Reliability Loop (30s timestamp checks + focus/visibility catch-up + cross-tab sync)
  const [notificationPermission, setNotificationPermission] = useState<BrowserNotificationStatus>(
    getBrowserNotificationStatus
  );
  const [reminderRecords, setReminderRecords] = useLocalStorage<ReminderRecord[]>(
    CADENCE_REMINDER_RECORDS_KEY,
    [],
    validateReminderRecords
  );
  const [toastQueue, setToastQueue] = useState<ReminderRecord[]>([]);

  const sessionStartMsRef = useRef<number>(Date.now());
  const tabIdRef = useRef<string>(makeId('tab'));
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const browserNotifsRef = useRef<Map<string, Notification>>(new Map());
  const latestStateRef = useRef({
    tasks,
    appSettings,
    notificationPermission,
  });
  latestStateRef.current = { tasks, appSettings, notificationPermission };

  const openReminderTask = useCallback(
    (reminder: ReminderRecord) => {
      const targetTask = latestStateRef.current.tasks.find((t) => t.id === reminder.taskId);
      setReminderRecords((prev) =>
        prev.map((r) => (r.triggerKey === reminder.triggerKey ? { ...r, read: true } : r))
      );
      setToastQueue((prev) => prev.filter((t) => t.triggerKey !== reminder.triggerKey));
      setActiveView(DashboardView.Tasks);
      if (targetTask) {
        setEditingTask(targetTask);
        setTaskModalOpen(true);
      }
    },
    [setReminderRecords]
  );

  const openReminderTaskRef = useRef(openReminderTask);
  openReminderTaskRef.current = openReminderTask;

  const runReminderCheck = useCallback(() => {
    const {
      tasks: curTasks,
      appSettings: curSettings,
      notificationPermission: curPermission,
    } = latestStateRef.current;

    if (!curSettings.notificationsEnabled) return;

    const nowMs = Date.now();
    const rawFired = readFiredStoreSync();
    const cleanedFired = pruneFiredReminders(rawFired, curTasks, nowMs);

    const { dueLive, dueMissed, nextFiredMap } = evaluateRemindersTick({
      tasks: curTasks,
      settings: curSettings,
      firedMap: cleanedFired,
      nowMs,
      sessionStartMs: sessionStartMsRef.current,
    });

    const finalFired = pruneFiredReminders(nextFiredMap, curTasks, nowMs);
    if (
      dueLive.length > 0 ||
      dueMissed.length > 0 ||
      Object.keys(cleanedFired).length !== Object.keys(rawFired).length
    ) {
      writeFiredStoreSync(finalFired);
    }

    const newlyTriggered = [...dueLive, ...dueMissed];
    if (newlyTriggered.length === 0) return;

    setReminderRecords((prev) => {
      const existingKeys = new Set(prev.map((r) => r.triggerKey));
      const additions = newlyTriggered.filter((r) => !existingKeys.has(r.triggerKey));
      return additions.length > 0 ? [...additions, ...prev].slice(0, 100) : prev;
    });

    if (dueLive.length > 0) {
      setToastQueue((prev) => {
        const existingKeys = new Set(prev.map((r) => r.triggerKey));
        const additions = dueLive.filter((r) => !existingKeys.has(r.triggerKey));
        return additions.length > 0 ? [...prev, ...additions].slice(-6) : prev;
      });
    }

    // Notify sibling open tabs so they update unread badges without re-notifying
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({
          type: 'REMINDERS_CLAIMED',
          tabId: tabIdRef.current,
          records: newlyTriggered,
        });
      } catch {
        // Ignore channel errors
      }
    }

    if (dueLive.length > 0) {
      if (curSettings.notificationSoundEnabled) {
        playReminderChime();
      }
      if (
        curPermission === 'granted' &&
        typeof window !== 'undefined' &&
        'Notification' in window
      ) {
        for (const rec of dueLive) {
          try {
            const notif = new Notification(
              rec.kind === 'deadline-heads-up'
                ? `Deadline tomorrow: ${rec.taskTitle}`
                : `Reminder: ${rec.taskTitle}`,
              {
                body: rec.subtitle,
                tag: rec.triggerKey,
              }
            );
            browserNotifsRef.current.set(rec.triggerKey, notif);
            notif.onclick = () => {
              window.focus();
              openReminderTaskRef.current(rec);
              notif.close();
            };
            notif.onclose = () => {
              browserNotifsRef.current.delete(rec.triggerKey);
            };
          } catch {
            // Ignore browser Notification constructor errors
          }
        }
      }
    }
  }, [setReminderRecords]);

  // Reconcile & cancel reminders cleanly whenever tasks or reminder rules change
  useEffect(() => {
    const activeTriggers = new Set(
      reconcileRemindersWithTasks(reminderRecords, tasks, appSettings).map((r) => r.triggerKey)
    );
    const activeCountChanged = activeTriggers.size !== reminderRecords.length;
    if (activeCountChanged) {
      const removed = reminderRecords.filter((r) => !activeTriggers.has(r.triggerKey));
      for (const rem of removed) {
        const notif = browserNotifsRef.current.get(rem.triggerKey);
        if (notif) {
          try {
            notif.close();
          } catch {
            // Ignore
          }
          browserNotifsRef.current.delete(rem.triggerKey);
        }
      }
      setReminderRecords((prev) => reconcileRemindersWithTasks(prev, tasks, appSettings));
    }

    setToastQueue((prev) => {
      const openTaskIds = new Set(tasks.filter((t) => !t.completed).map((t) => t.id));
      const filtered = prev.filter((t) => openTaskIds.has(t.taskId));
      return filtered.length === prev.length ? prev : filtered;
    });

    const rawFired = readFiredStoreSync();
    const pruned = pruneFiredReminders(rawFired, tasks, Date.now());
    if (Object.keys(pruned).length !== Object.keys(rawFired).length) {
      writeFiredStoreSync(pruned);
    }

    runReminderCheck();
  }, [
    tasks,
    appSettings.notificationsEnabled,
    appSettings.defaultReminderOffset,
    appSettings.morningReminderTime,
    appSettings.deadlineHeadsUpEnabled,
    appSettings.timeFormat,
    reminderRecords,
    setReminderRecords,
    runReminderCheck,
  ]);

  // 30-second polling interval + focus / visibility / wake catch-up + cross-tab sync
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('cadence_reminders');
      broadcastChannelRef.current = channel;
      channel.onmessage = (event: MessageEvent) => {
        const data = event.data as
          | { type?: string; tabId?: string; records?: ReminderRecord[] }
          | undefined;
        if (!data || data.tabId === tabIdRef.current) return;
        if (data.type === 'REMINDERS_CLAIMED' && Array.isArray(data.records)) {
          const validIncoming = validateReminderRecords(data.records);
          if (validIncoming.length === 0) return;
          setReminderRecords((prev) => {
            const seen = new Set(prev.map((r) => r.triggerKey));
            const additions = validIncoming.filter((r) => !seen.has(r.triggerKey));
            return additions.length > 0 ? [...additions, ...prev].slice(0, 100) : prev;
          });
        }
      };
    }

    const syncPermissionAndCheck = () => {
      setNotificationPermission(getBrowserNotificationStatus());
      runReminderCheck();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncPermissionAndCheck();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === CADENCE_REMINDER_RECORDS_KEY && e.newValue) {
        try {
          setReminderRecords(validateReminderRecords(JSON.parse(e.newValue)));
        } catch {
          // Ignore malformed storage payload
        }
      }
    };

    const intervalId = window.setInterval(runReminderCheck, 30_000);
    window.addEventListener('focus', syncPermissionAndCheck);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', runReminderCheck);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', syncPermissionAndCheck);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', runReminderCheck);
      window.removeEventListener('storage', handleStorage);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [runReminderCheck, setReminderRecords]);

  const unreadReminderCount = useMemo(
    () => reminderRecords.filter((r) => !r.read).length,
    [reminderRecords]
  );

  useEffect(() => {
    document.title =
      unreadReminderCount > 0
        ? `(${unreadReminderCount}) ${BASE_DOCUMENT_TITLE}`
        : BASE_DOCUMENT_TITLE;
  }, [unreadReminderCount]);

  const handleRequestNotificationPermission = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }
    void Notification.requestPermission().then((perm) => {
      setNotificationPermission(perm);
      if (perm === 'granted') {
        runReminderCheck();
      }
    });
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn(user?.email);
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

  // Task handlers (idempotent completion prevents double-creating recurring occurrences)
  const completingLockRef = useRef<Set<string>>(new Set());

  const handleToggleTask = (id: string) => {
    if (completingLockRef.current.has(id)) return;

    if (uid) {
      const outcome = completeTaskWithRecurrence(tasks, id, () => makeId('task'));
      if (!outcome.updatedTask) return;
      completingLockRef.current.add(id);

      const patch: Partial<TaskItem> = {
        completed: outcome.updatedTask.completed,
        ...(outcome.nextOccurrence ? { recurrenceChildId: outcome.nextOccurrence.id } : {}),
      };

      const ops: Promise<unknown>[] = [fsTasks.update(uid, id, patch)];
      if (outcome.nextOccurrence) {
        ops.push(fsTasks.create(uid, outcome.nextOccurrence));
      }
      void Promise.allSettled(ops).finally(() => {
        window.setTimeout(() => completingLockRef.current.delete(id), 250);
      });
    } else {
      setLocalTasks((prev) => completeTaskWithRecurrence(prev, id, () => makeId('task')).tasks);
    }
  };

  const handleUpdateTask = (id: string, patch: Partial<TaskItem>) => {
    if (uid) {
      void fsTasks.update(uid, id, patch);
    } else {
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === id ? migrateTask({ ...t, ...patch }) : t))
      );
    }
  };

  const propagateCategoryName = (fromName: string, toName: string) => {
    if (!fromName || !toName || fromName === toName) return;
    if (uid) {
      for (const t of tasks) {
        if (t.category === fromName) {
          void fsTasks.update(uid, t.id, { category: toName });
        }
      }
      for (const b of schedule) {
        if (b.category === fromName) {
          void fsSchedule.update(uid, b.id, { category: toName });
        }
      }
    } else {
      setLocalTasks((prev) =>
        prev.map((t) =>
          t.category === fromName ? migrateTask({ ...t, category: toName }) : t
        )
      );
      setLocalSchedule((prev) =>
        prev.map((b) =>
          b.category === fromName ? { ...b, category: toName } : b
        )
      );
    }
  };

  const handleAddCategory = (category: CategoryItem) => {
    const nextCategories = [...appSettings.categories, category];
    handleUpdateSettings({ categories: nextCategories });
  };

  const handleUpdateCategory = (id: string, patch: Partial<CategoryItem>) => {
    const existing = appSettings.categories.find((c) => c.id === id);
    if (!existing) return;

    const nextName = patch.name !== undefined ? patch.name.trim() : existing.name;
    const nextCategories = appSettings.categories.map((c) =>
      c.id === id ? { ...c, ...patch, name: nextName } : c
    );

    const nextDefault =
      patch.name !== undefined && appSettings.defaultTaskCategory === existing.name
        ? nextName
        : appSettings.defaultTaskCategory;

    handleUpdateSettings({
      categories: nextCategories,
      defaultTaskCategory: nextDefault,
    });

    if (patch.name !== undefined && nextName !== existing.name) {
      propagateCategoryName(existing.name, nextName);
    }
  };

  const handleReorderCategories = (nextOrder: CategoryItem[]) => {
    const safeOrder = nextOrder.length > 0 ? nextOrder : DEFAULT_CATEGORIES;
    handleUpdateSettings({ categories: safeOrder });
  };

  const handleDeleteCategory = (id: string, reassignToName: string) => {
    const outcome = computeCategoryDeletion(
      appSettings.categories,
      tasks,
      schedule,
      appSettings.defaultTaskCategory,
      id,
      reassignToName
    );
    if (!outcome.deleted || !outcome.deletedName || !outcome.reassignedTo) return;

    handleUpdateSettings({
      categories: outcome.categories,
      defaultTaskCategory: outcome.defaultTaskCategory,
    });

    if (uid) {
      propagateCategoryName(outcome.deletedName, outcome.reassignedTo);
    } else {
      setLocalTasks(outcome.tasks);
      setLocalSchedule(outcome.schedule);
    }
  };

  const handleQuickAddTask = (
    title: string,
    category: string,
    priority: TaskPriority
  ) => {
    const newTask: TaskItem = {
      id: makeId('task'),
      title,
      category,
      priority,
      prioritySource: 'user',
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
          ...data,
          notes: undefined,
        });
      } else {
        setLocalTasks((prev) =>
          prev.map((t) =>
            t.id === existingId ? migrateTask({ ...t, ...data, notes: undefined }) : t
          )
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

  const handleSaveMultiAddBatch = (
    items: Array<{
      title: string;
      priority: TaskPriority;
      category?: string;
      dueDate?: string;
      durationMinutes?: number;
    }>
  ) => {
    const nowIso = new Date().toISOString();
    const created: TaskItem[] = items.map((item) => ({
      id: makeId('task'),
      title: item.title,
      priority: item.priority,
      prioritySource: 'user',
      category: item.category,
      dueDate: item.dueDate,
      durationMinutes: item.durationMinutes,
      completed: false,
      repeat: 'none',
      pinned: false,
      createdAt: nowIso,
    }));

    if (uid) {
      for (const task of created) {
        void fsTasks.create(uid, task);
      }
    } else {
      setLocalTasks((prev) => [...created, ...prev]);
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
    const nextDone = !nextDays[dayIndex];
    nextDays[dayIndex] = nextDone;

    const weekKeys = getCurrentWeekDateKeys();
    const dateKey = weekKeys[dayIndex];
    const dateSet = new Set(target.completedDates ?? []);
    if (dateKey) {
      if (nextDone) dateSet.add(dateKey);
      else dateSet.delete(dateKey);
    }
    const nextDates = Array.from(dateSet).sort().slice(-400);

    if (uid) {
      void fsHabits.update(uid, habitId, {
        completedDays: nextDays,
        completedDates: nextDates,
      });
    } else {
      setLocalHabits((prev) =>
        prev.map((h) =>
          h.id === habitId ? { ...h, completedDays: nextDays, completedDates: nextDates } : h
        )
      );
    }
  };

  const handleToggleHabitDate = (habitId: string, dateKey: string) => {
    const target = habits.find((h) => h.id === habitId);
    if (!target) return;
    const weekKeys = getCurrentWeekDateKeys();
    const dateSet = new Set(target.completedDates ?? []);
    // Ensure current week booleans are reflected in set before toggling
    weekKeys.forEach((dk, idx) => {
      if (target.completedDays[idx]) dateSet.add(dk);
    });

    const willAdd = !dateSet.has(dateKey);
    if (willAdd) dateSet.add(dateKey);
    else dateSet.delete(dateKey);

    const nextDates = Array.from(dateSet).sort().slice(-400);
    const weekIdx = weekKeys.indexOf(dateKey);
    const nextDays = [...target.completedDays];
    if (weekIdx !== -1) {
      nextDays[weekIdx] = willAdd;
    }

    if (uid) {
      void fsHabits.update(uid, habitId, {
        completedDays: nextDays,
        completedDates: nextDates,
      });
    } else {
      setLocalHabits((prev) =>
        prev.map((h) =>
          h.id === habitId ? { ...h, completedDays: nextDays, completedDates: nextDates } : h
        )
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
      completedDates: [],
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

  const handleResetWorkspace = () => {
    setLocalTasks(INITIAL_TASKS);
    setLocalSchedule(INITIAL_SCHEDULE);
    setLocalHabits(INITIAL_HABITS);
    setLocalFocusSessions(INITIAL_FOCUS_SESSIONS);
    setLocalNotes(INITIAL_NOTES);
    setLocalScratchpad(DEFAULT_SCRATCHPAD);
  };

  const handleExportWorkspace = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings: appSettings,
      tasks,
      schedule,
      habits,
      focusSessions,
      notes,
      scratchpad,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cadence-backup-${getTodayKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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

  const userFirstName =
    user?.displayName?.trim().split(/\s+/)[0] ||
    user?.email?.split('@')[0] ||
    null;

  return (
    <div
      className={`cadence-shell min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100 relative ${
        styleCrossFading ? 'style-crossfade' : ''
      }`}
    >
      {activeStyleDef.id === 'aurora' && (
        <AuroraBackdrop reducedMotion={appSettings.reducedMotion} />
      )}
      {activeStyleDef.id === 'celestial' && (
        <CelestialBackdrop reducedMotion={appSettings.reducedMotion} />
      )}

      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        isDark={isDark}
        supportedModes={activeStyleDef.supportedModes}
        onToggleTheme={() => handleUpdateSettings({ colorMode: isDark ? 'light' : 'dark' })}
        pendingCount={pendingTaskCount}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        user={user}
        isSigningIn={isSigningIn}
        onSignIn={() => void handleGoogleSignIn()}
        onSignOut={() => void handleGoogleSignOut()}
      />

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Header
          activeView={activeView}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          reminders={reminderRecords}
          unreadCount={unreadReminderCount}
          timeFormat={appSettings.timeFormat}
          onOpenReminderTask={openReminderTask}
          onMarkAllRemindersRead={() =>
            setReminderRecords((prev) => prev.map((r) => ({ ...r, read: true })))
          }
          onDismissReminder={(triggerKey) => {
            setReminderRecords((prev) => prev.filter((r) => r.triggerKey !== triggerKey));
            setToastQueue((prev) => prev.filter((t) => t.triggerKey !== triggerKey));
          }}
          onClearAllReminders={() => {
            setReminderRecords([]);
            setToastQueue([]);
          }}
        />

        <main className="cadence-main flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
          <ErrorBoundary
            inline
            resetKey={activeView}
            fallbackTitle="Unable to display this section"
          >
            <div key={activeView} className="tab-transition-enter cadence-stack space-y-6">
              {activeView === DashboardView.Overview && (
                <OverviewView
                  tasks={tasks}
                  schedule={schedule}
                  habits={habits}
                  focusSessions={focusSessions}
                  scratchpad={scratchpad}
                  settings={appSettings}
                  userFirstName={userFirstName}
                  isSignedIn={Boolean(user)}
                  hasWorkspaceToken={Boolean(accessToken)}
                  isSigningIn={isSigningIn}
                  onSignIn={() => void handleGoogleSignIn()}
                  onUpdateScratchpad={handleUpdateScratchpad}
                  onToggleTask={handleToggleTask}
                  onQuickAddTask={handleQuickAddTask}
                  onOpenMultiAddWithText={(text) => {
                    setMultiAddInitialText(text);
                    setMultiAddOpen(true);
                  }}
                  onCompleteFocusSession={handleCompleteFocusSession}
                  onNavigate={setActiveView}
                  onOpenNewTaskModal={openNewTaskModal}
                />
              )}

              {activeView === DashboardView.Tasks && (
                <TasksView
                  tasks={tasks}
                  settings={appSettings}
                  onUpdateSettings={handleUpdateSettings}
                  onToggleTask={handleToggleTask}
                  onUpdateTask={handleUpdateTask}
                  onEditTask={openEditTaskModal}
                  onDeleteTask={handleDeleteTask}
                  onOpenNewTask={openNewTaskModal}
                  onOpenMultiAdd={() => {
                    setMultiAddInitialText('');
                    setMultiAddOpen(true);
                  }}
                  onOpenCategoryManager={() => setCategoryManagerOpen(true)}
                />
              )}

              {activeView === DashboardView.Schedule && (
                <ScheduleView
                  schedule={schedule}
                  categories={appSettings.categories}
                  defaultCategory={appSettings.defaultTaskCategory}
                  timeFormat={appSettings.timeFormat}
                  onOpenCategoryManager={() => setCategoryManagerOpen(true)}
                  onAddBlock={handleAddScheduleBlock}
                  onDeleteBlock={handleDeleteScheduleBlock}
                />
              )}

              {activeView === DashboardView.Focus && (
                <FocusView
                  focusSessions={focusSessions}
                  defaultFocusMinutes={appSettings.defaultFocusMinutes}
                  defaultFocusLabel={appSettings.defaultFocusLabel}
                  style={appSettings.style}
                  reducedMotion={appSettings.reducedMotion}
                  onCompleteFocusSession={handleCompleteFocusSession}
                />
              )}

              {activeView === DashboardView.Habits && (
                <HabitsView
                  habits={habits}
                  style={appSettings.style}
                  reducedMotion={appSettings.reducedMotion}
                  onToggleHabitDay={handleToggleHabitDay}
                  onToggleHabitDate={handleToggleHabitDate}
                  onAddHabit={handleAddHabit}
                  onDeleteHabit={handleDeleteHabit}
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

              {activeView === DashboardView.Settings && (
                <SettingsView
                  settings={appSettings}
                  tasks={tasks}
                  schedule={schedule}
                  isDark={isDark}
                  notificationPermission={notificationPermission}
                  onRequestNotificationPermission={handleRequestNotificationPermission}
                  onUpdateSettings={handleUpdateSettings}
                  onAddCategory={handleAddCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onReorderCategories={handleReorderCategories}
                  onDeleteCategory={handleDeleteCategory}
                  onResetSettings={handleResetSettings}
                  onResetWorkspace={handleResetWorkspace}
                  onExportWorkspace={handleExportWorkspace}
                  user={user}
                  hasWorkspaceToken={Boolean(accessToken)}
                  isSigningIn={isSigningIn}
                  onSignIn={() => void handleGoogleSignIn()}
                  onSignOut={() => void handleGoogleSignOut()}
                />
              )}
            </div>
          </ErrorBoundary>
        </main>
      </div>

      <OfflineBanner isCloudSignedIn={isCloudSignedIn} />

      <ReminderOverlay
        toasts={toastQueue}
        onOpenTask={openReminderTask}
        onDismissToast={(triggerKey) =>
          setToastQueue((prev) => prev.filter((t) => t.triggerKey !== triggerKey))
        }
      />

      <TaskModal
        isOpen={taskModalOpen}
        initialTask={editingTask}
        existingTasks={tasks}
        categories={appSettings.categories}
        defaultCategory={appSettings.defaultTaskCategory}
        defaultPriority={appSettings.defaultTaskPriority}
        timeFormat={appSettings.timeFormat}
        onOpenCategoryManager={() => setCategoryManagerOpen(true)}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTaskModal}
      />

      <QuickMultiAddModal
        isOpen={multiAddOpen}
        initialText={multiAddInitialText}
        categories={appSettings.categories}
        defaultPriority={appSettings.defaultTaskPriority}
        existingTasks={tasks}
        onClose={() => setMultiAddOpen(false)}
        onSaveBatch={handleSaveMultiAddBatch}
      />

      <CategoryManagerModal
        isOpen={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        categories={appSettings.categories}
        tasks={tasks}
        schedule={schedule}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onReorderCategories={handleReorderCategories}
        onDeleteCategory={handleDeleteCategory}
      />
    </div>
  );
}
