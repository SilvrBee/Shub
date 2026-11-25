import { useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  Database,
  Download,
  Globe,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Sliders,
  Sun,
} from 'lucide-react';
import {
  AppSettings,
  AppThemeId,
  ColorMode,
  DashboardView,
  LayoutDensity,
  TaskCategory,
  TaskPriority,
} from '../types/dashboard';
import { GoogleSignInButton } from './GoogleSignInButton';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onResetSettings: () => void;
  onResetWorkspace: () => void;
  onExportWorkspace: () => void;
  user: User | null;
  hasWorkspaceToken: boolean;
  isSigningIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

const THEME_OPTIONS: Array<{
  id: AppThemeId;
  name: string;
  description: string;
  accentHex: string;
  surfaceHex: string;
  darkSurfaceHex: string;
}> = [
  {
    id: 'cobalt',
    name: 'Cobalt Crisp',
    description: 'Clean slate surfaces with classic cobalt blue accents',
    accentHex: '#2563eb',
    surfaceHex: '#f8fafc',
    darkSurfaceHex: '#0b0f17',
  },
  {
    id: 'emerald',
    name: 'Forest Emerald',
    description: 'Grounded neutral canvas paired with fresh emerald green',
    accentHex: '#059669',
    surfaceHex: '#f8fafc',
    darkSurfaceHex: '#0b0f17',
  },
  {
    id: 'indigo',
    name: 'Midnight Indigo',
    description: 'Focused slate typography with deep indigo highlights',
    accentHex: '#4f46e5',
    surfaceHex: '#f8fafc',
    darkSurfaceHex: '#0b0f17',
  },
  {
    id: 'amber',
    name: 'Warm Editorial',
    description: 'Soft warm paper surfaces with rich amber accents',
    accentHex: '#d97706',
    surfaceHex: '#faf8f5',
    darkSurfaceHex: '#0b0f17',
  },
  {
    id: 'rose',
    name: 'Crimson Ink',
    description: 'High-contrast slate paired with refined crimson rose',
    accentHex: '#e11d48',
    surfaceHex: '#f8fafc',
    darkSurfaceHex: '#0b0f17',
  },
  {
    id: 'nord',
    name: 'Nordic Frost',
    description: 'Cool frost canvas with crisp fjord sky blue accents',
    accentHex: '#0284c7',
    surfaceHex: '#f4f7fa',
    darkSurfaceHex: '#0b0f17',
  },
];

const COLOR_MODES: Array<{ id: ColorMode; label: string; icon: typeof Sun }> = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

const LANDING_VIEWS: Array<{ id: DashboardView; label: string }> = [
  { id: DashboardView.Overview, label: 'Overview' },
  { id: DashboardView.Tasks, label: 'Tasks' },
  { id: DashboardView.Schedule, label: 'Schedule' },
  { id: DashboardView.FocusHabits, label: 'Focus & Habits' },
  { id: DashboardView.Notes, label: 'Notes' },
  { id: DashboardView.GoogleWorkspace, label: 'Google Apps' },
];

export function SettingsView({
  settings,
  onUpdateSettings,
  onResetSettings,
  onResetWorkspace,
  onExportWorkspace,
  user,
  hasWorkspaceToken,
  isSigningIn,
  onSignIn,
  onSignOut,
}: SettingsViewProps) {
  const [confirmResetWorkspace, setConfirmResetWorkspace] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => {
      setStatusNotice((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Customize appearance, themes, overview layout, productivity defaults, and workspace data
          </p>
        </div>

        {statusNotice && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 self-start sm:self-auto">
            <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{statusNotice}</span>
          </div>
        )}
      </div>

      {/* Section 1: Appearance & Themes */}
      <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Appearance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Color mode, website themes, spacing density, and motion preferences
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Color Mode */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Color Mode</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choose Light, Dark, or automatically match your operating system
              </p>
            </div>
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg self-start sm:self-auto">
              {COLOR_MODES.map((mode) => {
                const Icon = mode.icon;
                const active = settings.colorMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onUpdateSettings({ colorMode: mode.id })}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Themes */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Theme</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select a visual accent and surface palette across all views
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {THEME_OPTIONS.map((theme) => {
                const selected = settings.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ theme: theme.id });
                      showNotice(`Theme switched to ${theme.name}`);
                    }}
                    className={`text-left p-4 rounded-xl border transition-colors flex flex-col justify-between gap-3 ${
                      selected
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-[#0B0F17]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: theme.accentHex }}
                          aria-hidden="true"
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0"
                          style={{ backgroundColor: theme.surfaceHex }}
                          aria-hidden="true"
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-slate-700 shrink-0"
                          style={{ backgroundColor: theme.darkSurfaceHex }}
                          aria-hidden="true"
                        />
                      </div>
                      {selected && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {theme.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        {theme.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Density & Motion */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Layout Density
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Adjust outer workspace padding
                </p>
              </div>
              <select
                aria-label="Layout density"
                value={settings.density}
                onChange={(e) =>
                  onUpdateSettings({ density: e.target.value as LayoutDensity })
                }
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </div>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Reduce Motion
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Minimize UI transitions and animations
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => onUpdateSettings({ reducedMotion: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Section 2: General & Overview */}
      <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              General &amp; Overview
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Default tab, clock format, and visible Overview widgets
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="settings-default-view"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Default Landing Tab
              </label>
              <select
                id="settings-default-view"
                value={settings.defaultView}
                onChange={(e) =>
                  onUpdateSettings({ defaultView: e.target.value as DashboardView })
                }
                className="w-full px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              >
                {LANDING_VIEWS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="settings-time-format"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Clock Format
              </label>
              <select
                id="settings-time-format"
                value={settings.timeFormat}
                onChange={(e) =>
                  onUpdateSettings({ timeFormat: e.target.value as '24h' | '12h' })
                }
                className="w-full px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="24h">24-hour (14:30)</option>
                <option value="12h">12-hour (2:30 PM)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Overview Sections
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'showFocusChart' as const, label: '7-Day Focus Output Chart' },
                { key: 'showFocusTimer' as const, label: 'Compact Focus Timer' },
                { key: 'showScratchpad' as const, label: 'Quick Scratchpad' },
                { key: 'showGoogleCard' as const, label: 'Google Workspace Card' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F17]/50 cursor-pointer"
                >
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {item.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={settings[item.key]}
                    onChange={(e) => onUpdateSettings({ [item.key]: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Tasks & Focus Timer Defaults */}
      <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Tasks &amp; Focus Defaults
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pre-selected defaults when starting timers or creating new tasks
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="settings-focus-minutes"
              className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
            >
              Default Focus Duration
            </label>
            <select
              id="settings-focus-minutes"
              value={settings.defaultFocusMinutes}
              onChange={(e) =>
                onUpdateSettings({
                  defaultFocusMinutes: Number(e.target.value) as 15 | 25 | 50,
                })
              }
              className="w-full px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value={15}>15 minutes</option>
              <option value={25}>25 minutes</option>
              <option value={50}>50 minutes</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="settings-focus-label"
              className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
            >
              Default Focus Label
            </label>
            <input
              id="settings-focus-label"
              type="text"
              value={settings.defaultFocusLabel}
              onChange={(e) => onUpdateSettings({ defaultFocusLabel: e.target.value })}
              placeholder="Deep work sprint"
              className="w-full px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="settings-task-category"
              className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
            >
              Default Task Category
            </label>
            <select
              id="settings-task-category"
              value={settings.defaultTaskCategory}
              onChange={(e) =>
                onUpdateSettings({ defaultTaskCategory: e.target.value as TaskCategory })
              }
              className="w-full px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              {Object.values(TaskCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="settings-task-priority"
              className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
            >
              Default Task Priority
            </label>
            <select
              id="settings-task-priority"
              value={settings.defaultTaskPriority}
              onChange={(e) =>
                onUpdateSettings({ defaultTaskPriority: e.target.value as TaskPriority })
              }
              className="w-full px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              {Object.values(TaskPriority).map((prio) => (
                <option key={prio} value={prio}>
                  {prio}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Section 4: Google Account & Connected Apps */}
      <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Google Account &amp; Sync
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cloud Firestore persistence and Google Workspace access
            </p>
          </div>
        </div>

        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            {user ? (
              <>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {user.displayName || user.email}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {user.email} ·{' '}
                  {hasWorkspaceToken
                    ? 'Google Apps access active'
                    : 'Signed into Firestore (Google Apps refreshes automatically when opened)'}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Local Workspace Mode
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sign in with Google to sync data privately in Firestore and connect Calendar, Drive, Docs &amp; Gmail
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {user ? (
              <>
                {!hasWorkspaceToken && (
                  <GoogleSignInButton
                    onClick={onSignIn}
                    disabled={isSigningIn}
                    label={isSigningIn ? 'Connecting...' : 'Refresh Google Apps'}
                  />
                )}
                <button
                  type="button"
                  onClick={onSignOut}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <GoogleSignInButton
                onClick={onSignIn}
                disabled={isSigningIn}
                label={isSigningIn ? 'Signing in...' : 'Sign in with Google'}
              />
            )}
          </div>
        </div>
      </section>

      {/* Section 5: Data, Backup & Reset */}
      <section className="bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Data &amp; Backup
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Export your workspace data or restore default preferences
            </p>
          </div>
        </div>

        <div className="p-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              onExportWorkspace();
              showNotice('Workspace backup downloaded');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Workspace JSON</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onResetSettings();
              showNotice('Settings restored to defaults');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Settings</span>
          </button>

          {!confirmResetWorkspace ? (
            <button
              type="button"
              onClick={() => setConfirmResetWorkspace(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <span>Reset Local Workspace</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetWorkspace();
                  setConfirmResetWorkspace(false);
                  showNotice('Local workspace reset to defaults');
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 transition-colors"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmResetWorkspace(false)}
                className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
