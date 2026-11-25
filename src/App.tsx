/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
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
  AppSettings,
  DashboardView,
  DEFAULT_APP_SETTINGS,
  FocusSession,
  HabitItem,
  NoteItem,
  ScheduleBlock,
  TaskCategory,
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
import { SettingsView } from './components/SettingsView';
import { TaskModal } from './components/TaskModal';

function makeId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 10);
  return sanitizeId(`${prefix}_${Date.now()}_${rand}`);
}

const VALID_VIEWS = new Set<string>(Object.values(DashboardView));

export default function App() {
  const [storedSettings, setStoredSettings] = useLocalStorage<AppSettings>(
    'cadence_settings',
    DEFAULT_APP_SETTINGS
  );

  const appSettings = useMemo<AppSettings>(
    () => ({ ...DEFAULT_APP_SETTINGS, ...storedSettings }),
    [storedSettings]
  );

  const [activeView, setActiveView] = useState<DashboardView>(() =>
    VALID_VIEWS.has(appSettings.defaultView) ? appSettings.defaultView : DashboardView.Overview
  );
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

  const isDark =
    appSettings.colorMode === 'dark' ||
    (appSettings.colorMode === 'system' && systemPrefersDark);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('cadence_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('cadence_theme', 'light');
    }
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
  }, [
    isDark,
    appSettings.theme,
    appSettings.density,
    appSettings.highContrast,
    appSettings.reducedMotion,
  ]);

  const handleUpdateSettings = (patch: Partial<AppSettings>) => {
    setStoredSettings((prev) => ({ ...DEFAULT_APP_SETTINGS, ...prev, ...patch }));
  };

  const handleResetSettings = () => {
    setStoredSettings(DEFAULT_APP_SETTINGS);
  };

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

    let cancelled = false;
    const unsubs: Array<() => void> = [];

    void ensureUserRootProfile(user)
      .then(() => {
        if (cancelled) return;
        unsubs.push(
          subscribeUserProfile(uid, ({ scratchpad }) => {
            setCloudScratchpad(scratchpad);
          }),
          subscribeUserCollection<TaskItem>(uid, 'tasks', setCloudTasks),
          subscribeUserCollection<ScheduleBlock>(uid, 'schedule', setCloudSchedule),
          subscribeUserCollection<HabitItem>(uid, 'habits', setCloudHabits),
          subscribeUserCollection<FocusSession>(uid, 'focusSessions', setCloudFocusSessions),
          subscribeUserCollection<NoteItem>(uid, 'notes', setCloudNotes)
        );
      })
      .catch((err) => {
        setAuthError(err instanceof Error ? err.message : 'Unable to connect to Firestore.');
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
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        isDark={isDark}
        onToggleTheme={() => handleUpdateSettings({ colorMode: isDark ? 'light' : 'dark' })}
        pendingCount={pendingTaskCount}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        user={user}
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

        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
          <div key={activeView} className="tab-transition-enter space-y-6">
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
                onCompleteFocusSession={handleCompleteFocusSession}
                onNavigate={setActiveView}
                onOpenNewTaskModal={openNewTaskModal}
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

            {activeView === DashboardView.Focus && (
              <FocusView
                focusSessions={focusSessions}
                defaultFocusMinutes={appSettings.defaultFocusMinutes}
                defaultFocusLabel={appSettings.defaultFocusLabel}
                onCompleteFocusSession={handleCompleteFocusSession}
              />
            )}

            {activeView === DashboardView.Habits && (
              <HabitsView
                habits={habits}
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
                onUpdateSettings={handleUpdateSettings}
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
        </main>
      </div>

      <TaskModal
        isOpen={taskModalOpen}
        initialTask={editingTask}
        defaultCategory={appSettings.defaultTaskCategory}
        defaultPriority={appSettings.defaultTaskPriority}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTaskModal}
      />
    </div>
  );
}
