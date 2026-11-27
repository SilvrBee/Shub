import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertCircle,
  Bell,
  BellOff,
  Check,
  CheckSquare,
  ChevronDown,
  Compass,
  Database,
  Download,
  Globe,
  Hourglass,
  Layers,
  Monitor,
  Moon,
  Palette,
  Plus,
  RotateCcw,
  Sliders,
  Smartphone,
  Sun,
  X,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import {
  formatSupportedModesLabel,
  getStyleDefinition,
  resolveEffectiveColorMode,
  STYLE_DEFINITIONS,
} from '../styles/stylesConfig';
import {
  AppSettings,
  AppThemeId,
  AreaSettings,
  CategoryItem,
  ColorMode,
  DashboardView,
  DEFAULT_AREA_SETTINGS,
  DEFAULT_LIFE_CHAPTER,
  DEFAULT_LIFE_PROFILE,
  DefaultReminderOffset,
  LayoutDensity,
  LIFE_AREA_IDS,
  LifeAreaId,
  LifeChapter,
  LifeProfileSettings,
  MatrixImportantRule,
  ScheduleBlock,
  SmartSortMode,
  TaskItem,
  TaskPriority,
} from '../types/dashboard';
import { LIFE_AREA_META, resolveCategoryToArea } from '../utils/lifeUtils';
import { GoogleSignInButton } from './GoogleSignInButton';
import { DoodleHeaderScene } from './DoodleKit';
import { CustomCheckbox } from './ui/CustomCheckbox';
import { CustomSelect } from './ui/CustomSelect';
import { TimePickerField } from './ui/CustomDateTimePicker';
import { CategoryIcon } from './ui/CategoryBadge';
import { CategoryManager } from './ui/CategoryManager';
import { FLAG_META, PRIORITY_ORDER, PriorityFlagGlyph } from './PriorityFlag';

export type BrowserNotificationStatus = NotificationPermission | 'unsupported';

interface SettingsViewProps {
  settings: AppSettings;
  tasks: TaskItem[];
  schedule: ScheduleBlock[];
  isDark?: boolean;
  notificationPermission: BrowserNotificationStatus;
  onRequestNotificationPermission: () => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onAddCategory: (category: CategoryItem) => void;
  onUpdateCategory: (id: string, patch: Partial<CategoryItem>) => void;
  onReorderCategories: (nextOrder: CategoryItem[]) => void;
  onDeleteCategory: (id: string, reassignToName: string) => void;
  onResetSettings: () => void;
  onResetWorkspace: () => void;
  onExportWorkspace: () => void;
  lifeChapter: LifeChapter;
  lifeProfile: LifeProfileSettings;
  areaSettings: AreaSettings;
  onUpdateLifeChapter: (chapter: LifeChapter) => void;
  onUpdateLifeProfile: (profile: LifeProfileSettings) => void;
  onUpdateAreaSettings: (areaSettings: AreaSettings) => void;
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

const LANDING_VIEWS: Array<{ value: DashboardView; label: string }> = [
  { value: DashboardView.Home, label: 'Home' },
  { value: DashboardView.Tasks, label: 'Tasks' },
  { value: DashboardView.Focus, label: 'Focus' },
  { value: DashboardView.Habits, label: 'Habits' },
  { value: DashboardView.Journal, label: 'Journal' },
  { value: DashboardView.Body, label: 'Body' },
  { value: DashboardView.Life, label: 'Life' },
  { value: DashboardView.Stats, label: 'Stats' },
  { value: DashboardView.Reports, label: 'Reports' },
];

type SettingsSectionId =
  | 'appearance'
  | 'general'
  | 'lifeChapter'
  | 'lifeProfile'
  | 'lifeAreas'
  | 'defaults'
  | 'notifications'
  | 'account'
  | 'backup'
  | 'pwa';

const INITIAL_COLLAPSED_SECTIONS: Record<SettingsSectionId, boolean> = {
  appearance: false,
  general: false,
  lifeChapter: false,
  lifeProfile: false,
  lifeAreas: false,
  defaults: false,
  notifications: false,
  account: false,
  backup: false,
  pwa: false,
};

export function SettingsView({
  settings,
  tasks,
  schedule,
  isDark = false,
  notificationPermission,
  onRequestNotificationPermission,
  onUpdateSettings,
  onAddCategory,
  onUpdateCategory,
  onReorderCategories,
  onDeleteCategory,
  onResetSettings,
  onResetWorkspace,
  onExportWorkspace,
  lifeChapter,
  lifeProfile,
  areaSettings,
  onUpdateLifeChapter,
  onUpdateLifeProfile,
  onUpdateAreaSettings,
  user,
  hasWorkspaceToken,
  isSigningIn,
  onSignIn,
  onSignOut,
}: SettingsViewProps) {
  const [confirmResetWorkspace, setConfirmResetWorkspace] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [newGoalInput, setNewGoalInput] = useState('');
  const [chapterNameDraft, setChapterNameDraft] = useState(lifeChapter.name);
  const [chapterThemeDraft, setChapterThemeDraft] = useState(lifeChapter.theme);
  const [expectancyDraft, setExpectancyDraft] = useState(String(lifeProfile.lifeExpectancy));
  const [studyGoalDraft, setStudyGoalDraft] = useState(
    String(areaSettings.studyWeeklyGoalHours)
  );
  const [expandedSections, setExpandedSections] = useState<Record<SettingsSectionId, boolean>>(
    INITIAL_COLLAPSED_SECTIONS
  );

  useEffect(() => {
    setChapterNameDraft(lifeChapter.name);
    setChapterThemeDraft(lifeChapter.theme);
  }, [lifeChapter.name, lifeChapter.theme]);

  useEffect(() => {
    setExpectancyDraft(String(lifeProfile.lifeExpectancy));
  }, [lifeProfile.lifeExpectancy]);

  useEffect(() => {
    setStudyGoalDraft(String(areaSettings.studyWeeklyGoalHours));
  }, [areaSettings.studyWeeklyGoalHours]);

  const commitChapterName = () => {
    const trimmed = chapterNameDraft.trim().slice(0, 120);
    const nextName = trimmed || DEFAULT_LIFE_CHAPTER.name;
    setChapterNameDraft(nextName);
    if (nextName !== lifeChapter.name) {
      onUpdateLifeChapter({ ...lifeChapter, name: nextName });
      showNotice('Chapter updated');
    }
  };

  const commitChapterTheme = () => {
    const nextTheme = chapterThemeDraft.trim().slice(0, 240);
    setChapterThemeDraft(nextTheme);
    if (nextTheme !== lifeChapter.theme) {
      onUpdateLifeChapter({ ...lifeChapter, theme: nextTheme });
      showNotice('Chapter updated');
    }
  };

  const commitExpectancy = () => {
    const parsed = Number(expectancyDraft.trim());
    const nextExpectancy =
      Number.isFinite(parsed) && parsed >= 1
        ? Math.min(150, Math.round(parsed))
        : lifeProfile.lifeExpectancy || DEFAULT_LIFE_PROFILE.lifeExpectancy;
    setExpectancyDraft(String(nextExpectancy));
    if (nextExpectancy !== lifeProfile.lifeExpectancy) {
      onUpdateLifeProfile({ ...lifeProfile, lifeExpectancy: nextExpectancy });
      showNotice('Life profile updated');
    }
  };

  const commitStudyGoal = () => {
    const parsed = Number(studyGoalDraft.trim());
    const nextGoal =
      Number.isFinite(parsed) && parsed >= 1
        ? Math.min(80, Math.round(parsed))
        : areaSettings.studyWeeklyGoalHours || DEFAULT_AREA_SETTINGS.studyWeeklyGoalHours;
    setStudyGoalDraft(String(nextGoal));
    if (nextGoal !== areaSettings.studyWeeklyGoalHours) {
      onUpdateAreaSettings({
        ...areaSettings,
        studyWeeklyGoalHours: nextGoal,
      });
      showNotice('Life areas updated');
    }
  };

  const toggleSection = (id: SettingsSectionId) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allExpanded = Object.values(expandedSections).every(Boolean);
  const toggleAllSections = () => {
    const next = !allExpanded;
    setExpandedSections({
      appearance: next,
      general: next,
      lifeChapter: next,
      lifeProfile: next,
      lifeAreas: next,
      defaults: next,
      notifications: next,
      account: next,
      backup: next,
      pwa: next,
    });
  };

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
            Customize appearance, styles, themes, categories, overview layout, and workspace data
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {settings.style === 'doodle' && <DoodleHeaderScene tab={DashboardView.Settings} />}
          {statusNotice && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200">
              <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{statusNotice}</span>
            </div>
          )}
          <button
            type="button"
            onClick={toggleAllSections}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            {allExpanded ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      </div>

      {/* Section 1: Appearance & Themes */}
      <section className="editorial-rise editorial-rise-2 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('appearance')}
          aria-expanded={expandedSections.appearance}
          aria-controls="settings-panel-appearance"
          className={`w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
            expandedSections.appearance ? 'border-b border-slate-200 dark:border-slate-800' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
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
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              expandedSections.appearance ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {expandedSections.appearance && (
        <div id="settings-panel-appearance" className="p-6 space-y-6">
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
                const isMinimal = p.effect === 'minimal';
                const isBento = p.effect === 'bento';
                const isMagazine = p.effect === 'magazine';
                const isBrutal = p.effect === 'brutalism';
                const isSwiss = p.effect === 'swiss';
                const isMotion3D = p.effect === 'motion-3d';
                const isRetro = p.effect === 'retro';
                const previewAccent = isMinimal
                  ? previewDark
                    ? '#e4e4e7'
                    : '#18181b'
                  : activeTheme.accentHex;

                let backdropBg = 'none';
                if (p.effect === 'glass') {
                  backdropBg = `radial-gradient(120px circle at 20% 15%, ${activeTheme.accentHex}33, transparent 70%), radial-gradient(110px circle at 85% 85%, ${activeTheme.accentHex}26, transparent 70%)`;
                } else if (p.effect === 'celestial') {
                  backdropBg = `radial-gradient(1.5px 1.5px at 22% 24%, rgba(255,255,255,0.65), transparent), radial-gradient(1px 1px at 78% 20%, rgba(255,255,255,0.5), transparent), radial-gradient(1.5px 1.5px at 66% 74%, ${activeTheme.accentHex}aa, transparent), radial-gradient(140px circle at 80% 12%, ${activeTheme.accentHex}2b, transparent 70%)`;
                } else if (p.effect === 'editorial') {
                  backdropBg = `linear-gradient(180deg, ${activeTheme.accentHex}0d 0%, transparent 65%)`;
                } else if (p.effect === 'magazine') {
                  backdropBg = `linear-gradient(180deg, ${activeTheme.accentHex}10 0%, transparent 55%)`;
                } else if (p.effect === 'doodle') {
                  backdropBg = `radial-gradient(4px circle at 88% 22%, #fbbc04, transparent), radial-gradient(3px circle at 76% 78%, #fb7185, transparent), linear-gradient(135deg, ${activeTheme.accentHex}14 0%, transparent 70%)`;
                } else if (isBento) {
                  backdropBg = `radial-gradient(${previewDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'} 1px, transparent 1px)`;
                } else if (isBrutal) {
                  backdropBg = `linear-gradient(to right, ${previewDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'} 1px, transparent 1px), linear-gradient(to bottom, ${previewDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'} 1px, transparent 1px)`;
                } else if (isSwiss) {
                  backdropBg = `linear-gradient(to right, ${previewDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.055)'} 1px, transparent 1px), linear-gradient(to bottom, ${previewDark ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.055)'} 1px, transparent 1px)`;
                } else if (isMotion3D) {
                  backdropBg = `radial-gradient(110px circle at 82% 22%, ${activeTheme.accentHex}2a, transparent 70%), linear-gradient(160deg, transparent 55%, ${activeTheme.accentHex}14 100%)`;
                } else if (isRetro) {
                  backdropBg = `repeating-linear-gradient(0deg, ${previewDark ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.035)'} 0px, ${previewDark ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.035)'} 1px, transparent 1px, transparent 3px)`;
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
                        backgroundSize: isBento
                          ? '10px 10px'
                          : isBrutal
                            ? '12px 12px'
                            : isSwiss
                              ? '16px 16px'
                              : undefined,
                        borderColor: isSwiss ? (previewDark ? '#323236' : '#d4d4cf') : borderColor,
                        borderRadius: p.radius,
                        borderWidth: isBrutal || p.effect === 'doodle' ? '2px' : '1px',
                        boxShadow:
                          p.effect === 'doodle'
                            ? `3px 3px 0 0 ${activeTheme.accentHex}55`
                            : isBrutal
                              ? `3px 3px 0 0 ${previewDark ? '#ffe600' : '#000000'}`
                              : undefined,
                      }}
                    >
                      <div
                        className="w-12 h-full shrink-0 p-2 flex flex-col justify-between border-r"
                        style={{
                          backgroundColor: sidebarBg,
                          borderColor: isMagazine ? textMuted : borderColor,
                          borderRightWidth: isBrutal ? '2px' : undefined,
                        }}
                      >
                        <div className="space-y-1.5">
                          <div
                            className="h-1.5 w-6 rounded-xs"
                            style={{ backgroundColor: isBrutal ? '#ffe600' : previewAccent }}
                          />
                          <div className="h-1 w-7 rounded-xs" style={{ backgroundColor: textMuted }} />
                          <div className="h-1 w-5 rounded-xs" style={{ backgroundColor: textMuted }} />
                        </div>
                        <div
                          className="h-2 w-7"
                          style={{
                            backgroundColor: isMinimal ? textMuted : isBrutal ? '#5ce1e6' : activeTheme.accentHex,
                            borderRadius:
                              isBrutal || isSwiss
                                ? '0px'
                                : p.radius === '12px'
                                  ? '6px'
                                  : p.radius === '3px'
                                    ? '2px'
                                    : '4px',
                          }}
                        />
                      </div>

                      {isRetro ? (
                        <div className="p-2 flex-1 flex flex-col justify-between gap-1.5 min-w-0">
                          <div
                            className="border overflow-hidden"
                            style={{
                              backgroundColor: cardBg,
                              borderColor,
                              borderRadius: '5px',
                              boxShadow: previewDark
                                ? 'inset 1px 1px 0 rgba(148,163,184,0.2)'
                                : 'inset 1px 1px 0 rgba(255,255,255,0.95)',
                            }}
                          >
                            <div
                              className="px-2 py-0.5 flex items-center justify-between border-b"
                              style={{
                                borderColor,
                                background: previewDark
                                  ? 'linear-gradient(180deg, #1d273d 0%, #151d2e 100%)'
                                  : 'linear-gradient(180deg, #ffffff 0%, #dde6f2 100%)',
                              }}
                            >
                              <span
                                className="text-[10px] font-bold leading-none"
                                style={{ fontFamily: p.displayFont, color: textPrimary }}
                              >
                                Aa Y2K
                              </span>
                              <div className="flex items-center gap-0.5">
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: activeTheme.accentHex }}
                                />
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: textMuted }}
                                />
                              </div>
                            </div>
                            <div className="p-1.5 grid grid-cols-2 gap-1.5">
                              <div
                                className="p-1 border"
                                style={{
                                  borderColor,
                                  borderRadius: '3px',
                                  boxShadow: `inset 0 2px 0 0 ${activeTheme.accentHex}`,
                                }}
                              >
                                <div className="h-1 w-5 mb-1" style={{ backgroundColor: textMuted }} />
                                <div className="h-1.5 w-7" style={{ backgroundColor: textPrimary }} />
                              </div>
                              <div
                                className="p-1 border"
                                style={{
                                  borderColor,
                                  borderRadius: '3px',
                                }}
                              >
                                <div className="h-1 w-6 mb-1" style={{ backgroundColor: textMuted }} />
                                <div className="h-1.5 w-5" style={{ backgroundColor: textPrimary }} />
                              </div>
                            </div>
                          </div>
                          <div
                            className="h-3 w-16 rounded-xs flex items-center px-1.5"
                            style={{
                              backgroundColor: activeTheme.accentHex,
                              backgroundImage:
                                'linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.06) 50%, rgba(0,0,0,0.12) 100%)',
                              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                            }}
                          >
                            <div className="h-1 w-8 rounded-full bg-white/90" />
                          </div>
                        </div>
                      ) : isMotion3D ? (
                        <div className="p-2 flex-1 flex flex-col justify-between gap-1.5 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div
                              className="px-2 py-1 flex-1 flex items-center justify-between border"
                              style={{
                                backgroundColor: cardBg,
                                borderColor,
                                borderRadius: '8px',
                                boxShadow: previewDark
                                  ? '0 6px 14px -6px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.12)'
                                  : '0 6px 14px -6px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.9)',
                                transform: 'perspective(220px) rotateY(-5deg)',
                              }}
                            >
                              <span
                                className="text-[10px] font-bold leading-none"
                                style={{ fontFamily: p.displayFont, color: textPrimary }}
                              >
                                Aa 3D
                              </span>
                              <span
                                className="w-2.5 h-2.5 rotate-45 border"
                                style={{
                                  borderColor: activeTheme.accentHex,
                                  backgroundColor: `${activeTheme.accentHex}33`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 flex-1">
                            <div
                              className="border p-1.5 flex flex-col justify-between"
                              style={{
                                backgroundColor: cardBg,
                                borderColor,
                                borderRadius: '8px',
                                boxShadow: previewDark
                                  ? '0 8px 16px -6px rgba(0,0,0,0.75)'
                                  : '0 8px 16px -6px rgba(15,23,42,0.14)',
                                transform: 'perspective(220px) rotateX(6deg)',
                              }}
                            >
                              <div className="h-1 w-5 rounded-full" style={{ backgroundColor: activeTheme.accentHex }} />
                              <div className="h-2 w-8 rounded-xs" style={{ backgroundColor: textPrimary }} />
                            </div>
                            <div
                              className="border p-1.5 flex flex-col justify-between"
                              style={{
                                backgroundColor: cardBg,
                                borderColor,
                                borderRadius: '8px',
                                boxShadow: previewDark
                                  ? '0 8px 16px -6px rgba(0,0,0,0.75)'
                                  : '0 8px 16px -6px rgba(15,23,42,0.14)',
                                transform: 'perspective(220px) rotateX(-4deg) rotateY(4deg)',
                              }}
                            >
                              <div className="h-1 w-6 rounded-full" style={{ backgroundColor: textMuted }} />
                              <div className="h-1.5 w-6 rounded-xs" style={{ backgroundColor: textPrimary }} />
                            </div>
                          </div>
                        </div>
                      ) : isSwiss ? (
                        <div className="p-2 flex-1 flex flex-col justify-between gap-1.5 min-w-0">
                          <div
                            className="px-2 py-1 flex items-center justify-between"
                            style={{
                              backgroundColor: cardBg,
                              border: `1px solid ${previewDark ? '#2c2c30' : '#d4d4cf'}`,
                              borderTop: `2.5px solid ${textPrimary}`,
                            }}
                          >
                            <span
                              className="text-[10px] font-extrabold tracking-tight leading-none"
                              style={{ fontFamily: p.displayFont, color: textPrimary }}
                            >
                              Aa Grid
                            </span>
                            <span
                              className="text-[8px] font-mono font-semibold"
                              style={{ color: activeTheme.accentHex }}
                            >
                              01
                            </span>
                          </div>
                          <div
                            className="grid grid-cols-3 flex-1"
                            style={{
                              backgroundColor: cardBg,
                              borderTop: `2px solid ${textPrimary}`,
                              borderBottom: `2px solid ${textPrimary}`,
                              borderLeft: `1px solid ${previewDark ? '#2c2c30' : '#d4d4cf'}`,
                              borderRight: `1px solid ${previewDark ? '#2c2c30' : '#d4d4cf'}`,
                            }}
                          >
                            <div
                              className="p-1.5 flex flex-col justify-between border-r"
                              style={{
                                borderColor: previewDark ? '#2c2c30' : '#d4d4cf',
                                boxShadow: `inset 0 2px 0 0 ${activeTheme.accentHex}`,
                              }}
                            >
                              <div className="h-1 w-4" style={{ backgroundColor: textMuted }} />
                              <div className="h-2 w-6" style={{ backgroundColor: textPrimary }} />
                            </div>
                            <div
                              className="p-1.5 flex flex-col justify-between border-r"
                              style={{ borderColor: previewDark ? '#2c2c30' : '#d4d4cf' }}
                            >
                              <div className="h-1 w-5" style={{ backgroundColor: textMuted }} />
                              <div className="h-2 w-5" style={{ backgroundColor: textPrimary }} />
                            </div>
                            <div className="p-1.5 flex flex-col justify-between">
                              <div className="h-1 w-4" style={{ backgroundColor: textMuted }} />
                              <div className="h-2 w-6" style={{ backgroundColor: textPrimary }} />
                            </div>
                          </div>
                        </div>
                      ) : isBrutal ? (
                        <div className="p-2 flex-1 flex flex-col justify-between gap-1.5 min-w-0">
                          <div
                            className="px-1.5 py-1 flex items-center justify-between"
                            style={{
                              backgroundColor: '#ffe600',
                              border: '2px solid #000000',
                              boxShadow: '2px 2px 0 0 #000000',
                            }}
                          >
                            <span
                              className="text-[10px] font-black uppercase tracking-tight leading-none"
                              style={{ fontFamily: p.displayFont, color: '#000000' }}
                            >
                              AA RAW
                            </span>
                            <span className="w-2 h-2 bg-black" />
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 flex-1">
                            <div
                              className="p-1.5 flex flex-col justify-between"
                              style={{
                                backgroundColor: '#5ef2a8',
                                border: '2px solid #000000',
                                boxShadow: '2px 2px 0 0 #000000',
                              }}
                            >
                              <div className="h-1 w-6 bg-black" />
                              <div className="h-2 w-8 bg-black" />
                            </div>
                            <div
                              className="p-1.5 flex flex-col justify-between"
                              style={{
                                backgroundColor: '#ff85b3',
                                border: '2px solid #000000',
                                boxShadow: '2px 2px 0 0 #000000',
                              }}
                            >
                              <div className="h-1 w-7 bg-black" />
                              <div className="h-1.5 w-5 bg-black" />
                            </div>
                          </div>
                        </div>
                      ) : isMagazine ? (
                        <div className="p-2.5 flex-1 flex flex-col justify-between min-w-0">
                          <div
                            className="flex items-center justify-between pb-1"
                            style={{
                              borderTop: `2px solid ${textPrimary}`,
                              borderBottom: `1px solid ${textMuted}`,
                              paddingTop: '3px',
                            }}
                          >
                            <span
                              className="text-[11px] font-bold leading-none"
                              style={{ fontFamily: p.displayFont, color: textPrimary }}
                            >
                              Aa Edition
                            </span>
                            <span
                              className="text-[8px] font-mono uppercase tracking-wider"
                              style={{ color: activeTheme.accentHex }}
                            >
                              VOL. I
                            </span>
                          </div>
                          <div className="grid grid-cols-12 gap-2 flex-1 pt-1.5">
                            <div
                              className="col-span-7 border flex items-end p-1"
                              style={{
                                borderColor: textMuted,
                                background: `linear-gradient(135deg, ${activeTheme.accentHex}30 0%, ${textMuted} 100%)`,
                              }}
                            >
                              <div className="h-1 w-8" style={{ backgroundColor: textPrimary }} />
                            </div>
                            <div className="col-span-5 flex flex-col justify-between py-0.5">
                              <div className="h-1.5 w-full" style={{ backgroundColor: textPrimary }} />
                              <div className="h-1 w-4/5" style={{ backgroundColor: textMuted }} />
                              <div className="h-1 w-full" style={{ backgroundColor: textMuted }} />
                            </div>
                          </div>
                        </div>
                      ) : isBento ? (
                        <div className="p-2 flex-1 grid grid-cols-12 grid-rows-2 gap-1.5 min-w-0">
                          <div
                            className="col-span-7 row-span-1 border px-2 py-1 flex items-center justify-between"
                            style={{
                              backgroundColor: cardBg,
                              borderColor,
                              borderRadius: '8px',
                            }}
                          >
                            <span
                              className="text-[10px] font-semibold leading-none"
                              style={{ fontFamily: p.displayFont, color: textPrimary }}
                            >
                              Aa Cadence
                            </span>
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: activeTheme.accentHex }}
                            />
                          </div>
                          <div
                            className="col-span-5 row-span-2 border p-1.5 flex flex-col justify-between"
                            style={{
                              backgroundColor: cardBg,
                              borderColor,
                              borderRadius: '8px',
                              backgroundImage: `linear-gradient(155deg, ${activeTheme.accentHex}18 0%, transparent 75%)`,
                            }}
                          >
                            <div className="h-1 w-6 rounded-xs" style={{ backgroundColor: textMuted }} />
                            <div
                              className="h-2.5 w-8 rounded-xs"
                              style={{ backgroundColor: activeTheme.accentHex, opacity: 0.85 }}
                            />
                          </div>
                          <div
                            className="col-span-3 row-span-1 border p-1 flex flex-col justify-center gap-1"
                            style={{
                              backgroundColor: cardBg,
                              borderColor,
                              borderRadius: '8px',
                            }}
                          >
                            <div className="h-1 w-5 rounded-xs" style={{ backgroundColor: textMuted }} />
                          </div>
                          <div
                            className="col-span-4 row-span-1 border p-1 flex flex-col justify-center gap-1"
                            style={{
                              backgroundColor: cardBg,
                              borderColor,
                              borderRadius: '8px',
                            }}
                          >
                            <div className="h-1 w-7 rounded-xs" style={{ backgroundColor: textMuted }} />
                          </div>
                        </div>
                      ) : (
                        <div className={`${isMinimal ? 'p-3.5 gap-2.5' : 'p-2.5 gap-2'} flex-1 flex flex-col min-w-0`}>
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
                          <div className={`grid grid-cols-2 ${isMinimal ? 'gap-2.5' : 'gap-1.5'} flex-1`}>
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
                                style={{ backgroundColor: previewAccent, opacity: isMinimal ? 0.85 : 0.75 }}
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
                      )}
                    </div>

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
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="settings-high-contrast" className="cursor-pointer">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  High Contrast
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sharper borders and text legibility
                </p>
              </label>
              <CustomCheckbox
                id="settings-high-contrast"
                checked={settings.highContrast}
                onChange={(checked) => onUpdateSettings({ highContrast: checked })}
                ariaLabel="Toggle High Contrast mode"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Layout Density
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Adjust outer workspace padding
                </p>
              </div>
              <CustomSelect
                ariaLabel="Layout density"
                value={settings.density}
                onChange={(val) => onUpdateSettings({ density: val as LayoutDensity })}
                size="sm"
                matchTriggerWidth={false}
                align="end"
                className="min-w-[126px]"
                options={[
                  { value: 'comfortable', label: 'Comfortable' },
                  { value: 'compact', label: 'Compact' },
                ]}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <label htmlFor="settings-reduce-motion" className="cursor-pointer">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Reduce Motion
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Minimize UI transitions and animations
                </p>
              </label>
              <CustomCheckbox
                id="settings-reduce-motion"
                checked={settings.reducedMotion}
                onChange={(checked) => onUpdateSettings({ reducedMotion: checked })}
                ariaLabel="Toggle Reduce Motion"
              />
            </div>
          </div>
        </div>
        )}
      </section>

      {/* Section 2: General & Overview */}
      <section className="editorial-rise editorial-rise-3 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('general')}
          aria-expanded={expandedSections.general}
          aria-controls="settings-panel-general"
          className={`w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
            expandedSections.general ? 'border-b border-slate-200 dark:border-slate-800' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
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
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              expandedSections.general ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {expandedSections.general && (
        <div id="settings-panel-general" className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="settings-default-view"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Default Landing Tab
              </label>
              <CustomSelect
                id="settings-default-view"
                ariaLabel="Default landing tab"
                value={settings.defaultView}
                onChange={(val) =>
                  onUpdateSettings({ defaultView: val as DashboardView })
                }
                size="md"
                className="w-full"
                options={LANDING_VIEWS}
              />
            </div>

            <div>
              <label
                htmlFor="settings-time-format"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Clock Format
              </label>
              <CustomSelect
                id="settings-time-format"
                ariaLabel="Clock format"
                value={settings.timeFormat}
                onChange={(val) =>
                  onUpdateSettings({ timeFormat: val as '24h' | '12h' })
                }
                size="md"
                className="w-full"
                options={[
                  { value: '24h', label: '24-hour (14:30)' },
                  { value: '12h', label: '12-hour (2:30 PM)' },
                ]}
              />
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
                <div
                  key={item.key}
                  className="editorial-subtle-box flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F17]/50"
                >
                  <label
                    htmlFor={`settings-overview-${item.key}`}
                    className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex-1"
                  >
                    {item.label}
                  </label>
                  <CustomCheckbox
                    id={`settings-overview-${item.key}`}
                    size="sm"
                    checked={settings[item.key]}
                    onChange={(checked) => onUpdateSettings({ [item.key]: checked })}
                    ariaLabel={`Show ${item.label}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        )}
      </section>

      {/* Section: Life Chapter */}
      <section className="editorial-rise editorial-rise-3 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('lifeChapter')}
          aria-expanded={expandedSections.lifeChapter}
          aria-controls="settings-panel-life-chapter"
          className={`w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
            expandedSections.lifeChapter ? 'border-b border-slate-200 dark:border-slate-800' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
              <span className="editorial-kicker">
                <span className="editorial-marker" aria-hidden="true">CHAPTER</span>
                <span className="editorial-kicker-text">Season &amp; Focus</span>
              </span>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Life chapter
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Active chapter name, theme, date range, and main goals shown on Home
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              expandedSections.lifeChapter ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {expandedSections.lifeChapter && (
          <div id="settings-panel-life-chapter" className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="settings-chapter-name"
                  className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
                >
                  Chapter Name
                </label>
                <input
                  id="settings-chapter-name"
                  type="text"
                  maxLength={120}
                  value={chapterNameDraft}
                  onChange={(e) => setChapterNameDraft(e.target.value)}
                  onBlur={commitChapterName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="Drop Year"
                  className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="settings-chapter-theme"
                  className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
                >
                  Theme Line
                </label>
                <input
                  id="settings-chapter-theme"
                  type="text"
                  maxLength={240}
                  value={chapterThemeDraft}
                  onChange={(e) => setChapterThemeDraft(e.target.value)}
                  onBlur={commitChapterTheme}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  placeholder="Focused growth, deep craft & steady momentum"
                  className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="settings-chapter-start"
                  className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
                >
                  Start Date
                </label>
                <input
                  id="settings-chapter-start"
                  type="date"
                  value={lifeChapter.startDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      onUpdateLifeChapter({
                        ...lifeChapter,
                        startDate: e.target.value,
                      });
                      showNotice('Chapter updated');
                    }
                  }}
                  className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="settings-chapter-end"
                  className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
                >
                  End Date
                </label>
                <input
                  id="settings-chapter-end"
                  type="date"
                  value={lifeChapter.endDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      onUpdateLifeChapter({
                        ...lifeChapter,
                        endDate: e.target.value,
                      });
                      showNotice('Chapter updated');
                    }
                  }}
                  className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Main Goals
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Shown as small chips in your Home chapter banner (up to 10)
                </p>
              </div>

              {lifeChapter.goals.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {lifeChapter.goals.map((goal, idx) => (
                    <span
                      key={`${goal}-${idx}`}
                      className="editorial-subtle-box inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    >
                      <span>{goal}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLifeChapter({
                            ...lifeChapter,
                            goals: lifeChapter.goals.filter((_, gIdx) => gIdx !== idx),
                          })
                        }
                        aria-label={`Remove goal "${goal}"`}
                        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = newGoalInput.trim().slice(0, 80);
                  if (!trimmed || lifeChapter.goals.length >= 10) return;
                  if (lifeChapter.goals.includes(trimmed)) {
                    setNewGoalInput('');
                    return;
                  }
                  onUpdateLifeChapter({
                    ...lifeChapter,
                    goals: [...lifeChapter.goals, trimmed],
                  });
                  setNewGoalInput('');
                  showNotice('Chapter goal added');
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  maxLength={80}
                  value={newGoalInput}
                  onChange={(e) => setNewGoalInput(e.target.value)}
                  placeholder="Add a main goal (e.g. Ship flagship project)"
                  aria-label="New chapter goal"
                  className="cadence-input flex-1 px-3.5 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                />
                <button
                  type="submit"
                  disabled={!newGoalInput.trim() || lifeChapter.goals.length >= 10}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add goal</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      {/* Section: Life Profile & Time Bars */}
      <section className="editorial-rise editorial-rise-3 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('lifeProfile')}
          aria-expanded={expandedSections.lifeProfile}
          aria-controls="settings-panel-life-profile"
          className={`w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
            expandedSections.lifeProfile ? 'border-b border-slate-200 dark:border-slate-800' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Hourglass className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
              <span className="editorial-kicker">
                <span className="editorial-marker" aria-hidden="true">HORIZON</span>
                <span className="editorial-kicker-text">Time &amp; Life Bar</span>
              </span>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Life profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Date of birth and life expectancy used for your live Life progress bar
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              expandedSections.lifeProfile ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {expandedSections.lifeProfile && (
          <div id="settings-panel-life-profile" className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="settings-birth-date"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Date of Birth
              </label>
              <input
                id="settings-birth-date"
                type="date"
                value={lifeProfile.birthDate}
                onChange={(e) => {
                  if (e.target.value) {
                    onUpdateLifeProfile({
                      ...lifeProfile,
                      birthDate: e.target.value,
                    });
                    showNotice('Life profile updated');
                  }
                }}
                onBlur={(e) => {
                  if (!e.target.value) {
                    onUpdateLifeProfile({
                      ...lifeProfile,
                      birthDate: DEFAULT_LIFE_PROFILE.birthDate,
                    });
                  }
                }}
                className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="settings-life-expectancy"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Life Expectancy (years)
              </label>
              <input
                id="settings-life-expectancy"
                type="number"
                min={1}
                max={150}
                value={expectancyDraft}
                onChange={(e) => setExpectancyDraft(e.target.value)}
                onBlur={commitExpectancy}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        )}
      </section>

      {/* Section: Life Areas & Category Mapping */}
      <section className="editorial-rise editorial-rise-3 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('lifeAreas')}
          aria-expanded={expandedSections.lifeAreas}
          aria-controls="settings-panel-life-areas"
          className={`w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
            expandedSections.lifeAreas ? 'border-b border-slate-200 dark:border-slate-800' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
              <span className="editorial-kicker">
                <span className="editorial-marker" aria-hidden="true">AREAS</span>
                <span className="editorial-kicker-text">Wheel &amp; Pulse</span>
              </span>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Life areas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Map each task category to a life area and set your weekly Study focus goal
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              expandedSections.lifeAreas ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {expandedSections.lifeAreas && (
          <div id="settings-panel-life-areas" className="p-6 space-y-6">
            <div className="max-w-xs">
              <label
                htmlFor="settings-study-goal-hours"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Weekly Study Focus Goal (hours)
              </label>
              <input
                id="settings-study-goal-hours"
                type="number"
                min={1}
                max={80}
                value={studyGoalDraft}
                onChange={(e) => setStudyGoalDraft(e.target.value)}
                onBlur={commitStudyGoal}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Used to calculate your 7-day Study pulse from Focus sessions
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Category to Area Mapping
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Choose which life area each task category contributes to
                </p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800">
                {settings.categories.map((cat) => {
                  const mapped = resolveCategoryToArea(cat.name, areaSettings) ?? 'unassigned';
                  return (
                    <div
                      key={cat.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                          aria-hidden="true"
                        />
                        <span style={{ color: cat.color }} className="shrink-0">
                          <CategoryIcon icon={cat.icon} className="w-4 h-4" />
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {cat.name}
                        </span>
                      </div>

                      <div className="sm:w-56 shrink-0">
                        <CustomSelect
                          id={`settings-area-map-${cat.id}`}
                          ariaLabel={`Map category ${cat.name} to life area`}
                          value={mapped}
                          onChange={(val) => {
                            const nextMap = { ...areaSettings.categoryAreaMap };
                            // Remove any case-variants of cat.name before writing canonical name
                            for (const existingKey of Object.keys(nextMap)) {
                              if (existingKey.toLowerCase() === cat.name.toLowerCase()) {
                                delete nextMap[existingKey];
                              }
                            }
                            if (val !== 'unassigned' && LIFE_AREA_IDS.includes(val as LifeAreaId)) {
                              nextMap[cat.name] = val as LifeAreaId;
                            }
                            onUpdateAreaSettings({
                              ...areaSettings,
                              categoryAreaMap: nextMap,
                            });
                            showNotice('Category mapping updated');
                          }}
                          size="sm"
                          className="w-full"
                          options={[
                            { value: 'unassigned', label: 'Unassigned' },
                            ...LIFE_AREA_IDS.map((areaId) => ({
                              value: areaId,
                              label: LIFE_AREA_META[areaId].label,
                            })),
                          ]}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section 3: Tasks, Categories & Focus Defaults */}
      <section className="editorial-rise editorial-rise-4 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('defaults')}
          aria-expanded={expandedSections.defaults}
          aria-controls="settings-panel-defaults"
          className={`w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
            expandedSections.defaults ? 'border-b border-slate-200 dark:border-slate-800' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
              <span className="editorial-kicker">
                <span className="editorial-marker" aria-hidden="true">03</span>
                <span className="editorial-kicker-text">Workflow Defaults</span>
              </span>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Tasks &amp; Focus Defaults
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pre-selected defaults, priority &amp; matrix rules, and custom categories
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              expandedSections.defaults ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {expandedSections.defaults && (
        <div id="settings-panel-defaults" className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="settings-focus-minutes"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Default Focus Duration
              </label>
              <CustomSelect
                id="settings-focus-minutes"
                ariaLabel="Default focus duration"
                value={String(settings.defaultFocusMinutes)}
                onChange={(val) =>
                  onUpdateSettings({
                    defaultFocusMinutes: Number(val) as 15 | 25 | 50,
                  })
                }
                size="md"
                className="w-full"
                options={[
                  { value: '15', label: '15 minutes' },
                  { value: '25', label: '25 minutes' },
                  { value: '50', label: '50 minutes' },
                ]}
              />
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
                className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="settings-task-category"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Default Task Category
              </label>
              <CustomSelect
                id="settings-task-category"
                ariaLabel="Default task category"
                value={settings.defaultTaskCategory}
                onChange={(val) => onUpdateSettings({ defaultTaskCategory: val })}
                size="md"
                className="w-full"
                options={settings.categories.map((cat) => ({
                  value: cat.name,
                  label: cat.name,
                  color: cat.color,
                  icon: <CategoryIcon icon={cat.icon} className="w-3.5 h-3.5" />,
                }))}
              />
            </div>

            <div>
              <label
                htmlFor="settings-task-priority"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Default Task Priority
              </label>
              <CustomSelect
                id="settings-task-priority"
                ariaLabel="Default task priority"
                value={settings.defaultTaskPriority}
                onChange={(val) =>
                  onUpdateSettings({ defaultTaskPriority: val as TaskPriority })
                }
                size="md"
                className="w-full"
                options={PRIORITY_ORDER.map((prio) => ({
                  value: prio,
                  label: FLAG_META[prio].label,
                  icon: <PriorityFlagGlyph priority={prio} />,
                }))}
              />
            </div>

            <div>
              <label
                htmlFor="settings-smart-sort"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Default Task Sort Mode
              </label>
              <CustomSelect
                id="settings-smart-sort"
                ariaLabel="Default task sort mode"
                value={settings.smartSortMode}
                onChange={(val) =>
                  onUpdateSettings({ smartSortMode: val as SmartSortMode })
                }
                size="md"
                className="w-full"
                options={[
                  { value: 'balanced', label: 'Balanced' },
                  { value: 'priority', label: 'Priority first' },
                  { value: 'deadline', label: 'Deadline first' },
                  { value: 'quick-wins', label: 'Quick wins first' },
                ]}
              />
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
                className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="settings-matrix-important"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Matrix &ldquo;Important&rdquo; Rule
              </label>
              <CustomSelect
                id="settings-matrix-important"
                ariaLabel="Matrix important rule"
                value={settings.matrixImportantRule}
                onChange={(val) =>
                  onUpdateSettings({
                    matrixImportantRule: val as MatrixImportantRule,
                  })
                }
                size="md"
                className="w-full"
                options={[
                  { value: 'high-medium', label: 'High or Medium flag' },
                  { value: 'high-only', label: 'High flag only' },
                ]}
              />
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
                className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="settings-default-duration-est"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Fallback Duration Estimate (minutes)
              </label>
              <input
                id="settings-default-duration-est"
                type="number"
                min={1}
                max={240}
                value={settings.defaultDurationEstimateMinutes}
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  if (Number.isFinite(parsed) && parsed >= 1) {
                    onUpdateSettings({
                      defaultDurationEstimateMinutes: Math.min(240, Math.round(parsed)),
                    });
                  }
                }}
                className="cadence-input w-full px-3.5 py-2 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Rule-Based Priority Escalation */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="settings-auto-raise-priority" className="cursor-pointer">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Raise priority as deadline approaches
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Rule-based escalation before due or deadline dates (only raises, skips pinned tasks, includes Undo)
                </p>
              </label>
              <CustomCheckbox
                id="settings-auto-raise-priority"
                checked={settings.autoRaisePriorityEnabled}
                onChange={(checked) =>
                  onUpdateSettings({ autoRaisePriorityEnabled: checked })
                }
                ariaLabel="Toggle Raise priority as deadline approaches"
              />
            </div>

            {settings.autoRaisePriorityEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-0 sm:pl-4">
                <div>
                  <label
                    htmlFor="settings-auto-raise-high"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Raise to High when within (days)
                  </label>
                  <input
                    id="settings-auto-raise-high"
                    type="number"
                    min={0}
                    max={30}
                    value={settings.autoRaiseHighDays}
                    onChange={(e) => {
                      const parsed = Number(e.target.value);
                      if (Number.isFinite(parsed) && parsed >= 0) {
                        const clamped = Math.min(30, Math.round(parsed));
                        onUpdateSettings({
                          autoRaiseHighDays: clamped,
                          autoRaiseMediumDays: Math.max(clamped, settings.autoRaiseMediumDays),
                        });
                      }
                    }}
                    className="cadence-input w-full px-3 py-1.5 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="settings-auto-raise-med"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Raise to Medium when within (days)
                  </label>
                  <input
                    id="settings-auto-raise-med"
                    type="number"
                    min={0}
                    max={30}
                    value={settings.autoRaiseMediumDays}
                    onChange={(e) => {
                      const parsed = Number(e.target.value);
                      if (Number.isFinite(parsed) && parsed >= 0) {
                        const clamped = Math.min(30, Math.round(parsed));
                        onUpdateSettings({
                          autoRaiseMediumDays: Math.max(settings.autoRaiseHighDays, clamped),
                        });
                      }
                    }}
                    className="cadence-input w-full px-3 py-1.5 rounded-lg text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Editable Categories */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Categories
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Add, rename, reorder, choose icons &amp; colors, or delete and reassign categories
              </p>
            </div>
            <CategoryManager
              categories={settings.categories}
              tasks={tasks}
              schedule={schedule}
              onAddCategory={(cat) => {
                onAddCategory(cat);
                showNotice(`Added category "${cat.name}"`);
              }}
              onUpdateCategory={(id, patch) => {
                onUpdateCategory(id, patch);
                showNotice('Categories updated');
              }}
              onReorderCategories={(nextOrder) => {
                onReorderCategories(nextOrder);
                showNotice('Category order saved');
              }}
              onDeleteCategory={(id, reassignToName) => {
                onDeleteCategory(id, reassignToName);
                showNotice('Category deleted');
              }}
            />
          </div>
        </div>
        )}
      </section>

      {/* Section: Notifications & Task Reminders */}
      <section className="editorial-rise editorial-rise-4 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('notifications')}
          aria-expanded={expandedSections.notifications}
          aria-controls="settings-panel-notifications"
          className={`w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
            expandedSections.notifications ? 'border-b border-slate-200 dark:border-slate-800' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
              <span className="editorial-kicker">
                <span className="editorial-marker" aria-hidden="true">04</span>
                <span className="editorial-kicker-text">Alerts &amp; Timing</span>
              </span>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Notifications
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Task reminder lead times, browser notification permission, morning schedule, and sound
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              expandedSections.notifications ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {expandedSections.notifications && (
        <div id="settings-panel-notifications" className="p-6 space-y-5">
          {/* Master Toggle */}
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="settings-notifications-master" className="cursor-pointer">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Enable Task Reminders
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Show in-app reminder toasts, missed-reminder alerts, and browser notifications
              </p>
            </label>
            <CustomCheckbox
              id="settings-notifications-master"
              checked={settings.notificationsEnabled}
              onChange={(checked) => onUpdateSettings({ notificationsEnabled: checked })}
              ariaLabel="Toggle Task Reminders"
            />
          </div>

          {/* Browser Notification Permission */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Browser Notifications
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {notificationPermission === 'granted' &&
                    'Allowed — alerts also appear as native desktop/browser notifications.'}
                  {notificationPermission === 'denied' &&
                    'Blocked by browser — in-app toasts will still work.'}
                  {notificationPermission === 'default' &&
                    'Not enabled yet — click the button to request browser permission.'}
                  {notificationPermission === 'unsupported' &&
                    'Browser Notification API is unavailable in this environment — in-app toasts are active.'}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                    notificationPermission === 'granted'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : notificationPermission === 'denied'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {notificationPermission === 'granted' ? (
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : notificationPermission === 'denied' ? (
                    <BellOff className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {notificationPermission === 'granted'
                      ? 'Granted'
                      : notificationPermission === 'denied'
                        ? 'Denied'
                        : notificationPermission === 'unsupported'
                          ? 'Unsupported'
                          : 'Not Set'}
                  </span>
                </span>

                {notificationPermission !== 'granted' &&
                  notificationPermission !== 'unsupported' && (
                    <button
                      type="button"
                      onClick={onRequestNotificationPermission}
                      className="px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      Enable Browser Notifications
                    </button>
                  )}
              </div>
            </div>

            {notificationPermission === 'denied' && (
              <div
                role="note"
                className="p-3.5 rounded-lg border border-amber-300/70 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/25 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-medium">How to re-enable browser notifications:</p>
                  <p className="opacity-90 leading-relaxed">
                    Click the tune/lock icon in your browser&apos;s address bar, open Site
                    Settings (or Permissions), change <strong>Notifications</strong> from Block to{' '}
                    <strong>Allow</strong>, and reload Cadence.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Timing & Sound Options */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="settings-default-reminder-offset"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Default Reminder Before Due Time
              </label>
              <CustomSelect
                id="settings-default-reminder-offset"
                ariaLabel="Default reminder time before due time"
                value={settings.defaultReminderOffset}
                onChange={(val) =>
                  onUpdateSettings({ defaultReminderOffset: val as DefaultReminderOffset })
                }
                size="md"
                className="w-full"
                options={[
                  { value: '0', label: 'At due time' },
                  { value: '10', label: '10 minutes before' },
                  { value: '30', label: '30 minutes before (default)' },
                  { value: '60', label: '1 hour before' },
                  { value: '1440', label: '1 day before' },
                ]}
              />
            </div>

            <div>
              <label
                htmlFor="settings-morning-reminder-time"
                className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-1"
              >
                Morning Reminder for Date-Only Tasks
              </label>
              <TimePickerField
                id="settings-morning-reminder-time"
                ariaLabel="Morning reminder time for date-only tasks"
                value={settings.morningReminderTime}
                allowClear={false}
                onChange={(val) => {
                  if (val) onUpdateSettings({ morningReminderTime: val });
                }}
                timeFormat={settings.timeFormat}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="editorial-subtle-box flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F17]/50">
              <label
                htmlFor="settings-deadline-headsup"
                className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex-1"
              >
                1-day heads-up before hard deadlines
              </label>
              <CustomCheckbox
                id="settings-deadline-headsup"
                size="sm"
                checked={settings.deadlineHeadsUpEnabled}
                onChange={(checked) => onUpdateSettings({ deadlineHeadsUpEnabled: checked })}
                ariaLabel="Toggle 1-day deadline heads-up"
              />
            </div>

            <div className="editorial-subtle-box flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0B0F17]/50">
              <label
                htmlFor="settings-notification-sound"
                className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex-1"
              >
                Play soft chime with reminders
              </label>
              <CustomCheckbox
                id="settings-notification-sound"
                size="sm"
                checked={settings.notificationSoundEnabled}
                onChange={(checked) => onUpdateSettings({ notificationSoundEnabled: checked })}
                ariaLabel="Toggle reminder sound"
              />
            </div>
          </div>
        </div>
        )}
      </section>

      {/* Section 4: Google Account & Connected Apps */}
      <section className="editorial-rise editorial-rise-5 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('account')}
          aria-expanded={expandedSections.account}
          aria-controls="settings-panel-account"
          className={`w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
            expandedSections.account ? 'border-b border-slate-200 dark:border-slate-800' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
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
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              expandedSections.account ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {expandedSections.account && (
        <div id="settings-panel-account" className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        )}
      </section>

      {/* Section 5: Data, Backup & Reset */}
      <section className="editorial-rise editorial-rise-6 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('backup')}
          aria-expanded={expandedSections.backup}
          aria-controls="settings-panel-backup"
          className={`w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
            expandedSections.backup ? 'border-b border-slate-200 dark:border-slate-800' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
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
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              expandedSections.backup ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {expandedSections.backup && (
        <div id="settings-panel-backup" className="p-6 flex flex-wrap items-center gap-3">
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
        )}
      </section>

      {/* Section 7: Install & Offline App */}
      <section className="editorial-rise editorial-rise-6 cadence-card bg-white dark:bg-[#121927] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection('pwa')}
          aria-expanded={expandedSections.pwa}
          aria-controls="settings-panel-pwa"
          className={`w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${
            expandedSections.pwa ? 'border-b border-slate-200 dark:border-slate-800' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
              <span className="editorial-kicker">
                <span className="editorial-marker" aria-hidden="true">07</span>
                <span className="editorial-kicker-text">Progressive Web App</span>
              </span>
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Install &amp; Offline Support
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Install Cadence as a standalone app and work seamlessly without an internet connection
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              expandedSections.pwa ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </button>

        {expandedSections.pwa && (
        <div id="settings-panel-pwa" className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Offline App Shell &amp; Local Persistence
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assets are cached via Service Worker and workspace changes save locally or queue in Firestore IndexedDB while offline.
            </p>
          </div>
          <div className="shrink-0">
            <PWAInstallButton variant="settings" />
          </div>
        </div>
        )}
      </section>
    </div>
  );
}
