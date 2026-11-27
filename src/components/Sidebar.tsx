import { FocusEvent, MouseEvent, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CheckSquare,
  Compass,
  FileText,
  HeartPulse,
  Home,
  LogIn,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  Timer,
  X,
} from 'lucide-react';
import { DashboardView } from '../types/dashboard';
import { GoogleSignInButton } from './GoogleSignInButton';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activeView: DashboardView;
  onSelectView: (view: DashboardView) => void;
  isDark: boolean;
  supportedModes?: readonly ('light' | 'dark')[];
  onToggleTheme: () => void;
  pendingCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  user: User | null;
  isSigningIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

interface NavGroup {
  label: string;
  items: { id: DashboardView; label: string; icon: typeof Home }[];
}

interface FloatingTooltip {
  label: string;
  top: number;
  left: number;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'DAILY',
    items: [
      { id: DashboardView.Home, label: 'Home', icon: Home },
      { id: DashboardView.Tasks, label: 'Tasks', icon: CheckSquare },
      { id: DashboardView.Focus, label: 'Focus', icon: Timer },
      { id: DashboardView.Habits, label: 'Habits', icon: CalendarCheck },
    ],
  },
  {
    label: 'LIFE',
    items: [
      { id: DashboardView.Journal, label: 'Journal', icon: BookOpen },
      { id: DashboardView.Body, label: 'Body', icon: HeartPulse },
      { id: DashboardView.Life, label: 'Life', icon: Compass },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { id: DashboardView.Stats, label: 'Stats', icon: BarChart3 },
      { id: DashboardView.Reports, label: 'Reports', icon: FileText },
    ],
  },
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
  supportedModes = ['light', 'dark'],
  onToggleTheme,
  pendingCount,
  mobileOpen,
  onCloseMobile,
  collapsed,
  onToggleCollapse,
  user,
  isSigningIn,
  onSignIn,
  onSignOut,
}: SidebarProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [tooltip, setTooltip] = useState<FloatingTooltip | null>(null);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.photoURL]);

  useEffect(() => {
    if (!collapsed) {
      setTooltip(null);
    }
  }, [collapsed]);

  const showTooltip = (
    el: HTMLElement | null,
    label: string,
    enabled: boolean
  ) => {
    if (!enabled || !el) return;
    const rect = el.getBoundingClientRect();
    setTooltip({
      label,
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    });
  };

  const hideTooltip = () => setTooltip(null);

  const bindCollapsedTooltip = (label: string, isCollapsed: boolean) =>
    isCollapsed
      ? {
          onMouseEnter: (e: MouseEvent<HTMLElement>) =>
            showTooltip(e.currentTarget, label, isCollapsed),
          onMouseLeave: hideTooltip,
          onFocus: (e: FocusEvent<HTMLElement>) =>
            showTooltip(e.currentTarget, label, isCollapsed),
          onBlur: hideTooltip,
        }
      : {};

  const isModeLocked = !(supportedModes.includes('light') && supportedModes.includes('dark'));
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Guest Workspace';
  const displaySubtext = user?.email || 'Local profile';

  const themeTooltipText = isModeLocked
    ? isDark
      ? 'Dark mode is required by the active style'
      : 'Light mode is required by the active style'
    : isDark
      ? 'Switch to light mode'
      : 'Switch to dark mode';

  const renderSidebarContent = (isMobileDrawer: boolean) => {
    const isCollapsed = !isMobileDrawer && collapsed;

    return (
      <div
        className={`cadence-sidebar flex h-full flex-col justify-between bg-white dark:bg-[#0F1521] border-r border-slate-200 dark:border-slate-800 select-none transition-[width] duration-200 ease-out overflow-x-hidden ${
          isCollapsed ? 'w-[68px]' : 'w-[248px]'
        }`}
      >
        <div className="flex-1 min-h-0 flex flex-col">
          <div
            className={`flex h-16 items-center border-b border-slate-200 dark:border-slate-800 shrink-0 transition-[padding] duration-200 ${
              isCollapsed ? 'justify-center px-2' : 'justify-between px-6'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                onSelectView(DashboardView.Home);
                onCloseMobile();
              }}
              aria-label={isCollapsed ? 'Cadence Home' : undefined}
              {...bindCollapsedTooltip('Cadence · Home', isCollapsed)}
              className={`font-display font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded ${
                isCollapsed
                  ? 'w-9 h-9 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-center text-base'
                  : 'text-lg'
              }`}
            >
              {isCollapsed ? 'C' : 'Cadence'}
            </button>
            {!isCollapsed && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation"
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <nav
            aria-label="Primary Navigation"
            onScroll={hideTooltip}
            className={`py-4 overflow-y-auto overflow-x-hidden flex-1 ${
              isCollapsed ? 'px-2 space-y-2' : 'px-3 space-y-4'
            }`}
          >
            {NAV_GROUPS.map((group, groupIdx) => (
              <div
                key={group.label}
                className={`space-y-0.5 ${
                  isCollapsed && groupIdx > 0
                    ? 'pt-2 border-t border-slate-100 dark:border-slate-800/70'
                    : ''
                }`}
              >
                {!isCollapsed && (
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  const count = item.id === DashboardView.Tasks ? pendingCount : 0;
                  const tooltipLabel = count > 0 ? `${item.label} (${count})` : item.label;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectView(item.id);
                        onCloseMobile();
                      }}
                      aria-label={isCollapsed ? tooltipLabel : undefined}
                      {...bindCollapsedTooltip(tooltipLabel, isCollapsed)}
                      className={`relative w-full flex items-center rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                        isCollapsed
                          ? 'justify-center px-2 py-2.5'
                          : 'justify-between px-3 py-2'
                      } ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <span
                        className={`flex items-center min-w-0 ${
                          isCollapsed ? 'justify-center' : 'gap-3'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        />
                        {!isCollapsed && (
                          <span className="editorial-link truncate">{item.label}</span>
                        )}
                      </span>
                      {!isCollapsed && count > 0 && (
                        <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 ml-2">
                          {count}
                        </span>
                      )}
                      {isCollapsed && count > 0 && (
                        <span
                          aria-hidden="true"
                          className="absolute top-1.5 right-2.5 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div
          className={`border-t border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0 ${
            isCollapsed ? 'p-2.5' : 'p-4 space-y-3'
          }`}
        >
          <PWAInstallButton variant="sidebar" compact={isCollapsed} />

          <div
            className={`flex items-center gap-2 ${
              isCollapsed ? 'flex-col' : ''
            }`}
          >
            <button
              type="button"
              onClick={onToggleTheme}
              disabled={isModeLocked}
              title={!isCollapsed ? themeTooltipText : undefined}
              aria-label={
                isModeLocked
                  ? 'Color mode locked by current style'
                  : isDark
                    ? 'Switch to light mode'
                    : 'Switch to dark mode'
              }
              {...bindCollapsedTooltip(themeTooltipText, isCollapsed)}
              className={`${
                isCollapsed ? 'w-full' : 'flex-1'
              } flex items-center justify-center p-2 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                isModeLocked
                  ? 'text-slate-400 dark:text-slate-500 bg-slate-100/60 dark:bg-slate-800/40 cursor-not-allowed opacity-70'
                  : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectView(DashboardView.Settings);
                onCloseMobile();
              }}
              title={!isCollapsed ? 'Settings' : undefined}
              aria-label="Open settings"
              {...bindCollapsedTooltip('Settings', isCollapsed)}
              className={`${
                isCollapsed ? 'w-full' : 'flex-1'
              } flex items-center justify-center p-2 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                activeView === DashboardView.Settings
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>

            {!isMobileDrawer && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title={!isCollapsed ? 'Collapse sidebar' : undefined}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!isCollapsed}
                {...bindCollapsedTooltip(
                  isCollapsed ? 'Expand sidebar' : 'Collapse sidebar',
                  isCollapsed
                )}
                className={`${
                  isCollapsed ? 'w-full' : ''
                } flex items-center justify-center p-2 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {user ? (
            isCollapsed ? (
              <div className="flex flex-col items-center gap-1.5 pt-0.5">
                <div
                  tabIndex={0}
                  aria-label={displayName}
                  {...bindCollapsedTooltip(displayName, true)}
                  className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {user.photoURL && !avatarFailed ? (
                    <img
                      src={user.photoURL}
                      alt={`${displayName} avatar`}
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarFailed(true)}
                      className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center justify-center font-display text-xs font-semibold">
                      {getInitials(displayName)}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onSignOut}
                  aria-label="Sign out of Google"
                  {...bindCollapsedTooltip('Sign out', true)}
                  className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
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
            )
          ) : isCollapsed ? (
            <div className="flex justify-center pt-0.5">
              <button
                type="button"
                disabled={isSigningIn}
                onClick={onSignIn}
                aria-label="Sign in with Google"
                {...bindCollapsedTooltip(
                  isSigningIn ? 'Signing in...' : 'Sign in with Google',
                  true
                )}
                className="w-full flex items-center justify-center p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <LogIn className="w-4 h-4" />
              </button>
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
  };

  return (
    <>
      <aside className="hidden lg:block shrink-0 h-screen sticky top-0">
        {renderSidebarContent(false)}
      </aside>

      {tooltip && collapsed && (
        <div
          role="tooltip"
          style={{ top: `${tooltip.top}px`, left: `${tooltip.left}px` }}
          className="cadence-popover pointer-events-none fixed z-50 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap -translate-y-1/2 hidden lg:block"
        >
          {tooltip.label}
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{renderSidebarContent(true)}</div>
        </div>
      )}
    </>
  );
}
