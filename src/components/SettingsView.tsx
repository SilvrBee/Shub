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
  Sparkles,
  Sun,
} from 'lucide-react';
import {
  formatSupportedModesLabel,
  getStyleDefinition,
  resolveEffectiveColorMode,
  STYLE_DEFINITIONS,
} from '../styles/stylesConfig';
import {
  AiPriorityMode,
  AppSettings,
  AppThemeId,
  ColorMode,
  DashboardView,
  LayoutDensity,
  MatrixImportantRule,
  SmartSortMode,
  TaskCategory,
  TaskPriority,
} from '../types/dashboard';
import { GoogleSignInButton } from './GoogleSignInButton';
import { DoodleHeaderScene } from './DoodleKit';
import { getAiUsageToday } from '../services/aiTaskSort';

interface SettingsViewProps {
  settings: AppSettings;
  isDark?: boolean;
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
  { id: DashboardView.Focus, label: 'Focus' },
  { id: DashboardView.Habits, label: 'Habits' },
  { id: DashboardView.Notes, label: 'Notes' },
  { id: DashboardView.GoogleWorkspace, label: 'Google Apps' },
];

export function SettingsView({
  settings,
  isDark = false,
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

  const activeStyle = getStyleDefinition(settings.style);
  const activeTheme = THEME_OPTIONS.find((t) => t.id === settings.theme) ?? THEME_OPTIONS[0];
  const effectiveColorMode = resolveEffectiveColorMode(
    settings.colorMode,
    activeStyle.supportedModes
  );
  const modeLockedToDark =
    activeStyle.supportedModes.includes('dark') && !activeStyle.supportedModes.includes('light');

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => {
      setStatusNotice((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="editorial-rise editorial-rise-1 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">EDITION</span>
            <span className="editorial-kicker-text">Preferences</span>
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Customize appearance, styles, themes, overview layout, productivity defaults, and workspace data
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {settings.style === 'doodle' && <DoodleHeaderScene tab={DashboardView.Settings} />}
          {statusNotice && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200">
              <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{statusNotice}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section 1: Appearance & Themes */}
      <section className="editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <span className="editorial-kicker">
              <span className="editorial-marker" aria-hidden="true">01</span>
              <span className="editorial-kicker-text">Visual System</span>
            </span>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Appearance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Color mode, visual style, website themes, spacing density, and motion preferences
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Color Mode */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Color Mode</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {modeLockedToDark
                  ? `${activeStyle.name} supports Dark mode only`
                  : 'Choose Light, Dark, or automatically match your operating system'}
              </p>
            </div>
            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg self-start sm:self-auto">
              {COLOR_MODES.map((mode) => {
                const Icon = mode.icon;
                const active = effectiveColorMode === mode.id;
                const unsupported =
                  (mode.id === 'light' && !activeStyle.supportedModes.includes('light')) ||
                  (mode.id === 'dark' && !activeStyle.supportedModes.includes('dark')) ||
                  (mode.id === 'system' &&
                    !(
                      activeStyle.supportedModes.includes('light') &&
                      activeStyle.supportedModes.includes('dark')
                    ));
                return (
                  <button
                    key={mode.id}
                    type="button"
                    disabled={unsupported}
                    title={
                      unsupported
                        ? `${mode.label} is unavailable for ${activeStyle.name}`
                        : undefined
                    }
                    onClick={() => onUpdateSettings({ colorMode: mode.id })}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : unsupported
                          ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
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

          {/* Style Selector */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Style</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choose typography, geometry, surface depth, and backdrop character independently of color theme
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {STYLE_DEFINITIONS.map((styleDef) => {
                const selected = settings.style === styleDef.id;
                const previewDark =
                  !styleDef.supportedModes.includes('light') ||
                  (isDark && styleDef.supportedModes.includes('dark'));
                const p = styleDef.preview;
                const canvasBg = previewDark ? p.canvasDark : p.canvasLight;
                const sidebarBg = previewDark ? p.sidebarDark : p.sidebarLight;
                const cardBg = previewDark ? p.cardDark : p.cardLight;
                const borderColor = previewDark ? p.borderDark : p.borderLight;
                const textPrimary = previewDark ? '#f1f5f9' : '#0f172a';
                const textMuted = previewDark ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.45)';
                const modeLabel = formatSupportedModesLabel(styleDef.supportedModes);

                let backdropBg = 'none';
                if (p.effect === 'glass') {
                  backdropBg = `radial-gradient(120px circle at 20% 15%, ${activeTheme.accentHex}33, transparent 70%), radial-gradient(110px circle at 85% 85%, ${activeTheme.accentHex}26, transparent 70%)`;
                } else if (p.effect === 'celestial') {
                  backdropBg = `radial-gradient(1.5px 1.5px at 22% 24%, rgba(255,255,255,0.65), transparent), radial-gradient(1px 1px at 78% 20%, rgba(255,255,255,0.5), transparent), radial-gradient(1.5px 1.5px at 66% 74%, ${activeTheme.accentHex}aa, transparent), radial-gradient(140px circle at 80% 12%, ${activeTheme.accentHex}2b, transparent 70%)`;
                } else if (p.effect === 'editorial') {
                  backdropBg = `linear-gradient(180deg, ${activeTheme.accentHex}0d 0%, transparent 65%)`;
                } else if (p.effect === 'doodle') {
                  backdropBg = `radial-gradient(4px circle at 88% 22%, #fbbc04, transparent), radial-gradient(3px circle at 76% 78%, #fb7185, transparent), linear-gradient(135deg, ${activeTheme.accentHex}14 0%, transparent 70%)`;
                }

                return (
                  <button
                    key={styleDef.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onUpdateSettings({ style: styleDef.id });
                      showNotice(`Style switched to ${styleDef.name}`);
                    }}
                    className={`text-left p-4 rounded-xl border transition-colors flex flex-col gap-3 ${
                      selected
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
                        : 'editorial-subtle-box border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-[#0B0F17]/50'
                    }`}
                  >
                    {/* Miniature UI Preview */}
                    <div
                      aria-hidden="true"
                      className="w-full h-24 overflow-hidden flex border relative"
                      style={{
                        backgroundColor: canvasBg,
                        backgroundImage: backdropBg,
                        borderColor,
                        borderRadius: p.radius,
                        borderWidth: p.effect === 'doodle' ? '2px' : '1px',
                        boxShadow:
                          p.effect === 'doodle'
                            ? `3px 3px 0 0 ${activeTheme.accentHex}55`
                            : undefined,
                      }}
                    >
                      {/* Mini sidebar */}
                      <div
                        className="w-12 h-full shrink-0 p-2 flex flex-col justify-between border-r"
                        style={{
                          backgroundColor: sidebarBg,
                          borderColor,
                        }}
                      >
                        <div className="space-y-1.5">
                          <div
                            className="h-1.5 w-6 rounded-xs"
                            style={{ backgroundColor: activeTheme.accentHex }}
                          />
                          <div className="h-1 w-7 rounded-xs" style={{ backgroundColor: textMuted }} />
                          <div className="h-1 w-5 rounded-xs" style={{ backgroundColor: textMuted }} />
                        </div>
                        <div
                          className="h-2 w-7"
                          style={{
                            backgroundColor: activeTheme.accentHex,
                            borderRadius: p.radius === '12px' ? '6px' : p.radius === '3px' ? '2px' : '4px',
                          }}
                        />
                      </div>

                      {/* Mini canvas + cards */}
                      <div className="flex-1 p-2.5 flex flex-col gap-2 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[11px] font-semibold leading-none"
                            style={{ fontFamily: p.displayFont, color: textPrimary }}
                          >
                            Aa Cadence
                          </span>
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: activeTheme.accentHex }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 flex-1">
                          <div
                            className="border p-1.5 flex flex-col justify-between"
                            style={{
                              backgroundColor: cardBg,
                              borderColor,
                              borderRadius: p.radius === '12px' ? '8px' : p.radius,
                            }}
                          >
                            <div className="h-1 w-8 rounded-xs" style={{ backgroundColor: textMuted }} />
                            <div
                              className="h-2 w-10 rounded-xs"
                              style={{ backgroundColor: activeTheme.accentHex, opacity: 0.75 }}
                            />
                          </div>
                          <div
                            className="border p-1.5 flex flex-col justify-between"
                            style={{
                              backgroundColor: cardBg,
                              borderColor,
                              borderRadius: p.radius === '12px' ? '8px' : p.radius,
                            }}
                          >
                            <div className="h-1 w-6 rounded-xs" style={{ backgroundColor: textMuted }} />
                            <div className="h-1.5 w-9 rounded-xs" style={{ backgroundColor: textMuted }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Details */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                          <span>{styleDef.name}</span>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700 font-normal">
                            ·
                          </span>
                          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                            {modeLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {styleDef.description}
                        </p>
                      </div>
                      {selected && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      )}
                    </div>
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
                        : 'editorial-subtle-box border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-[#0B0F17]/50'
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

          {/* High Contrast, Density & Motion */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  High Contrast
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sharper borders and text legibility
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => onUpdateSettings({ highContrast: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 shrink-0"
              />
            </label>

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
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 shrink-0"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Section 2: General & Overview */}
      <section className="editorial-rise editorial-rise-3 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <span className="editorial-kicker">
              <span className="editorial-marker" aria-hidden="true">02</span>
              <span className="editorial-kicker-text">Overview Layout</span>
            </span>
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
                  className="editorial-subtle-box flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F17]/50 cursor-pointer"
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
      <section className="editorial-rise editorial-rise-4 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <span className="editorial-kicker">
            <span className="editorial-marker" aria-hidden="true">03</span>
            <span className="editorial-kicker-text">Workflow Defaults</span>
          </span>
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

          <div>
            <label
              htmlFor="settings-smart-sort"
              className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
            >
              Smart Order Default Mode
            </label>
            <select
              id="settings-smart-sort"
              value={settings.smartSortMode}
              onChange={(e) =>
                onUpdateSettings({ smartSortMode: e.target.value as SmartSortMode })
              }
              className="w-full px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="balanced">Balanced</option>
              <option value="priority">Priority first</option>
              <option value="deadline">Deadline first</option>
              <option value="quick-wins">Quick wins first</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="settings-quick-win-mins"
              className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
            >
              Quick-Win Threshold (minutes)
            </label>
            <input
              id="settings-quick-win-mins"
              type="number"
              min={1}
              max={60}
              value={settings.quickWinMinutes}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                if (Number.isFinite(parsed) && parsed >= 1) {
                  onUpdateSettings({ quickWinMinutes: Math.min(60, Math.round(parsed)) });
                }
              }}
              className="w-full px-3.5 py-2 rounded-lg text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="settings-matrix-important"
              className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
            >
              Matrix &ldquo;Important&rdquo; Rule
            </label>
            <select
              id="settings-matrix-important"
              value={settings.matrixImportantRule}
              onChange={(e) =>
                onUpdateSettings({ matrixImportantRule: e.target.value as MatrixImportantRule })
              }
              className="w-full px-3.5 py-2 rounded-lg text-sm bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="high-medium">High or Medium flag</option>
              <option value="high-only">High flag only</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="settings-matrix-urgent-days"
              className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
            >
              Matrix &ldquo;Urgent&rdquo; Window (days)
            </label>
            <input
              id="settings-matrix-urgent-days"
              type="number"
              min={0}
              max={30}
              value={settings.matrixUrgentDays}
              onChange={(e) => {
                const parsed = Number(e.target.value);
                if (Number.isFinite(parsed) && parsed >= 0) {
                  onUpdateSettings({ matrixUrgentDays: Math.min(30, Math.round(parsed)) });
                }
              }}
              className="w-full px-3.5 py-2 rounded-lg text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </section>

      {/* Section 4: AI Task Ordering & Suggestions */}
      <section className="editorial-rise editorial-rise-4 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div>
            <span className="editorial-kicker">
              <span className="editorial-marker" aria-hidden="true">04</span>
              <span className="editorial-kicker-text">Optional Assistance</span>
            </span>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              AI
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Optional Gemini task ordering &amp; priority suggestions on top of score order
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              AI Priority &amp; Duration Changes
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'suggest' as AiPriorityMode,
                  title: 'Suggest only',
                  desc: 'Show accept/ignore chips on tasks without changing fields automatically.',
                },
                {
                  id: 'auto-unflagged' as AiPriorityMode,
                  title: 'Auto-apply to unflagged tasks only',
                  desc: 'Fill missing flags & durations, never overwriting user-set priorities.',
                },
                {
                  id: 'off' as AiPriorityMode,
                  title: 'Off',
                  desc: 'Do not suggest or apply priority flag changes.',
                },
              ].map((opt) => {
                const selected = settings.aiPriorityMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ aiPriorityMode: opt.id });
                      showNotice(`AI priority mode: ${opt.title}`);
                    }}
                    className={`text-left p-3.5 rounded-xl border transition-colors ${
                      selected
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/20'
                        : 'editorial-subtle-box border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-[#0B0F17]/50'
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {opt.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Auto AI Sort
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Automatically refresh AI order when open tasks change
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.aiAutoSort}
                onChange={(e) => onUpdateSettings({ aiAutoSort: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 shrink-0"
              />
            </label>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="settings-ai-daily-cap"
                  className="text-sm font-medium text-slate-900 dark:text-slate-100"
                >
                  Daily AI Usage Cap
                </label>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  Used today: {getAiUsageToday()}/{settings.aiDailyCap}
                </span>
              </div>
              <input
                id="settings-ai-daily-cap"
                type="number"
                min={1}
                max={200}
                value={settings.aiDailyCap}
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  if (Number.isFinite(parsed) && parsed >= 1) {
                    onUpdateSettings({ aiDailyCap: Math.min(200, Math.round(parsed)) });
                  }
                }}
                className="w-full px-3.5 py-2 rounded-lg text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Google Account & Connected Apps */}
      <section className="editorial-rise editorial-rise-5 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <span className="editorial-kicker">
              <span className="editorial-marker" aria-hidden="true">05</span>
              <span className="editorial-kicker-text">Cloud Sync</span>
            </span>
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

      {/* Section 6: Data, Backup & Reset */}
      <section className="editorial-rise editorial-rise-6 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <Database className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <span className="editorial-kicker">
              <span className="editorial-marker" aria-hidden="true">06</span>
              <span className="editorial-kicker-text">Archive &amp; Reset</span>
            </span>
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
