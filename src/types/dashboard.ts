export enum DashboardView {
  Overview = 'overview',
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
