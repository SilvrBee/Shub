/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
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
import { googleSignIn, initAuth, logout } from './services/googleAuth';
import {
  DashboardView,
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
import { FocusHabitsView } from './components/FocusHabitsView';
import { NotesView } from './components/NotesView';
import { WorkspaceView } from './components/WorkspaceView';
import { TaskModal } from './components/TaskModal';

export default function App() {
  const [activeView, setActiveView] = useState<DashboardView>(DashboardView.Overview);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth((authUser, token) => {
      setUser(authUser);
      setAccessToken(token);
    });
    return () => unsubscribe();
  }, []);

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
  };

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

  const [tasks, setTasks] = useLocalStorage<TaskItem[]>('cadence_tasks', INITIAL_TASKS);
  const [schedule, setSchedule] = useLocalStorage<ScheduleBlock[]>('cadence_schedule', INITIAL_SCHEDULE);
  const [habits, setHabits] = useLocalStorage<HabitItem[]>('cadence_habits', INITIAL_HABITS);
  const [focusSessions, setFocusSessions] = useLocalStorage<FocusSession[]>(
    'cadence_focus_sessions',
    INITIAL_FOCUS_SESSIONS
  );
  const [notes, setNotes] = useLocalStorage<NoteItem[]>('cadence_notes', INITIAL_NOTES);
  const [scratchpad, setScratchpad] = useLocalStorage<string>('cadence_scratchpad', DEFAULT_SCRATCHPAD);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

  // Task handlers
  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleQuickAddTask = (
    title: string,
    category: TaskCategory,
    priority: TaskPriority
  ) => {
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title,
      category,
      priority,
      dueDate: getTodayKey(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleSaveTaskModal = (
    data: Omit<TaskItem, 'id' | 'createdAt' | 'completed'>,
    existingId?: string
  ) => {
    if (existingId) {
      setTasks((prev) =>
        prev.map((t) => (t.id === existingId ? { ...t, ...data } : t))
      );
    } else {
      const newTask: TaskItem = {
        id: `task-${Date.now()}`,
        ...data,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => [newTask, ...prev]);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Schedule handlers
  const handleAddScheduleBlock = (block: Omit<ScheduleBlock, 'id'>) => {
    setSchedule((prev) => [...prev, { id: `sched-${Date.now()}`, ...block }]);
  };

  const handleDeleteScheduleBlock = (id: string) => {
    setSchedule((prev) => prev.filter((b) => b.id !== id));
  };

  // Habit & Focus handlers
  const handleToggleHabitDay = (habitId: string, dayIndex: number) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const nextDays = [...h.completedDays];
        nextDays[dayIndex] = !nextDays[dayIndex];
        return { ...h, completedDays: nextDays };
      })
    );
  };

  const handleAddHabit = (name: string, category: string, targetDaysPerWeek: number) => {
    const newHabit: HabitItem = {
      id: `habit-${Date.now()}`,
      name,
      category,
      targetDaysPerWeek,
      completedDays: [false, false, false, false, false, false, false],
    };
    setHabits((prev) => [...prev, newHabit]);
  };

  const handleDeleteHabit = (habitId: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
  };

  const handleCompleteFocusSession = (minutes: number, label: string) => {
    const newSession: FocusSession = {
      id: `focus-${Date.now()}`,
      label,
      minutes,
      completedAt: new Date().toISOString(),
      dateKey: getTodayKey(),
    };
    setFocusSessions((prev) => [newSession, ...prev]);
  };

  // Notes handlers
  const handleCreateNote = (): string => {
    const newId = `note-${Date.now()}`;
    const newNote: NoteItem = {
      id: newId,
      title: 'Untitled Note',
      category: 'General',
      content: '',
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
    return newId;
  };

  const handleUpdateNote = (
    id: string,
    patch: Partial<Pick<NoteItem, 'title' | 'category' | 'content'>>
  ) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n
      )
    );
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleResetWorkspace = () => {
    setTasks(INITIAL_TASKS);
    setSchedule(INITIAL_SCHEDULE);
    setHabits(INITIAL_HABITS);
    setFocusSessions(INITIAL_FOCUS_SESSIONS);
    setNotes(INITIAL_NOTES);
    setScratchpad(DEFAULT_SCRATCHPAD);
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
        onToggleTheme={() => setIsDark((d) => !d)}
        onResetWorkspace={handleResetWorkspace}
        pendingCount={pendingTaskCount}
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

        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {activeView === DashboardView.Overview && (
            <OverviewView
              tasks={tasks}
              schedule={schedule}
              habits={habits}
              focusSessions={focusSessions}
              scratchpad={scratchpad}
              userFirstName={userFirstName}
              isSignedIn={Boolean(user)}
              hasWorkspaceToken={Boolean(accessToken)}
              isSigningIn={isSigningIn}
              onSignIn={() => void handleGoogleSignIn()}
              onUpdateScratchpad={setScratchpad}
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
              onTokenExpired={() => setAccessToken(null)}
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
