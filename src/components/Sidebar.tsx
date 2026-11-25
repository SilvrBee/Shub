import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  CalendarCheck,
  CalendarClock,
  CheckSquare,
  FileText,
  Layers,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
  Timer,
  X,
} from 'lucide-react';
import { DashboardView } from '../types/dashboard';
import { GoogleSignInButton } from './GoogleSignInButton';

interface SidebarProps {
  activeView: DashboardView;
  onSelectView: (view: DashboardView) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  pendingCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  user: User | null;
  isSigningIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

const NAV_ITEMS: { id: DashboardView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: DashboardView.Overview, label: 'Overview', icon: LayoutDashboard },
  { id: DashboardView.Tasks, label: 'Tasks', icon: CheckSquare },
  { id: DashboardView.Schedule, label: 'Schedule', icon: CalendarClock },
  { id: DashboardView.Focus, label: 'Focus', icon: Timer },
  { id: DashboardView.Habits, label: 'Habits', icon: CalendarCheck },
  { id: DashboardView.Notes, label: 'Notes', icon: FileText },
  { id: DashboardView.GoogleWorkspace, label: 'Google Apps', icon: Layers },
];

function getInitials(nameOrEmail: string): string {
  const cleaned = nameOrEmail.trim();
  if (!cleaned) return 'U';
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export function Sidebar({
  activeView,
  onSelectView,
  isDark,
  onToggleTheme,
  pendingCount,
  mobileOpen,
  onCloseMobile,
  user,
  isSigningIn,
  onSignIn,
  onSignOut,
}: SidebarProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.photoURL]);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Guest Workspace';
  const displaySubtext = user?.email || 'Local profile';

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-[#0F1521] border-r border-slate-200 dark:border-slate-800 w-[248px] select-none">
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              onSelectView(DashboardView.Overview);
              onCloseMobile();
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded"
          >
            Cadence
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav aria-label="Primary Navigation" className="px-3 py-4 space-y-0.5 overflow-y-auto flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const count = item.id === DashboardView.Tasks ? pendingCount : 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {count > 0 && (
                  <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 ml-2">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex-1 flex items-center justify-center p-2 rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectView(DashboardView.Settings);
              onCloseMobile();
            }}
            title="Settings"
            aria-label="Open settings"
            className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              activeView === DashboardView.Settings
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {user ? (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                {user.photoURL && !avatarFailed ? (
                  <img
                    src={user.photoURL}
                    alt={`${displayName} avatar`}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
                    className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center justify-center font-display text-xs font-semibold shrink-0">
                    {getInitials(displayName)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {displaySubtext}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                title="Sign out"
                aria-label="Sign out of Google"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-1">
            <GoogleSignInButton
              fullWidth
              disabled={isSigningIn}
              onClick={onSignIn}
              label={isSigningIn ? 'Signing in...' : 'Sign in with Google'}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0">{sidebarContent}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
