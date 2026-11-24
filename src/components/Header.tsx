import { Menu, Plus } from 'lucide-react';
import { DashboardView } from '../types/dashboard';

interface HeaderProps {
  activeView: DashboardView;
  onOpenMobileNav: () => void;
  onNewTask: () => void;
}

const VIEW_LABELS: Record<DashboardView, string> = {
  [DashboardView.Overview]: 'Overview',
  [DashboardView.Tasks]: 'Tasks',
  [DashboardView.Schedule]: 'Schedule',
  [DashboardView.FocusHabits]: 'Focus & Habits',
  [DashboardView.Notes]: 'Notes',
  [DashboardView.GoogleWorkspace]: 'Google Apps',
};

export function Header({ activeView, onOpenMobileNav, onNewTask }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-[#0F1521]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 flex items-center justify-between gap-8">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm min-w-0 whitespace-nowrap">
          <span className="text-slate-400 dark:text-slate-500">Workspace</span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
            /
          </span>
          <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
            {VIEW_LABELS[activeView]}
          </span>
        </div>
      </div>

      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onNewTask}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Task</span>
        </button>
      </div>
    </header>
  );
}
