import { AppStyleId, ColorMode } from '../types/dashboard';

export type SupportedColorMode = 'light' | 'dark';

export interface StyleDefinition {
  id: AppStyleId;
  name: string;
  description: string;
  supportedModes: readonly SupportedColorMode[];
  preview: {
    canvasLight: string;
    canvasDark: string;
    sidebarLight: string;
    sidebarDark: string;
    cardLight: string;
    cardDark: string;
    borderLight: string;
    borderDark: string;
    radius: string;
    displayFont: string;
    effect: 'crisp' | 'editorial' | 'glass' | 'celestial' | 'doodle';
  };
}

export const STYLE_DEFINITIONS: readonly StyleDefinition[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Crisp productivity layout with sharp slate borders and zero distraction',
    supportedModes: ['light', 'dark'],
    preview: {
      canvasLight: '#f8fafc',
      canvasDark: '#0b0f17',
      sidebarLight: '#ffffff',
      sidebarDark: '#0f1521',
      cardLight: '#ffffff',
      cardDark: '#121927',
      borderLight: '#e2e8f0',
      borderDark: '#1e293b',
      radius: '8px',
      displayFont: '"Plus Jakarta Sans", sans-serif',
      effect: 'crisp',
    },
  },
  {
    id: 'editorial',
    name: 'Editorial Atelier',
    description: 'Warm paper surfaces, Fraunces serif display, hairline rules, and tactile grain',
    supportedModes: ['light', 'dark'],
    preview: {
      canvasLight: '#fbf9f5',
      canvasDark: '#141210',
      sidebarLight: '#f5f1ea',
      sidebarDark: '#191714',
      cardLight: 'transparent',
      cardDark: 'transparent',
      borderLight: '#dcd5c9',
      borderDark: '#302c27',
      radius: '0px',
      displayFont: '"Fraunces", Georgia, serif',
      effect: 'editorial',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora Glass',
    description: 'Deep midnight frosted glass, animated aurora mesh, gradient borders, and luminous Fraunces type',
    supportedModes: ['dark'],
    preview: {
      canvasLight: '#040711',
      canvasDark: '#040711',
      sidebarLight: 'rgba(10, 16, 32, 0.78)',
      sidebarDark: 'rgba(10, 16, 32, 0.78)',
      cardLight: 'rgba(12, 19, 38, 0.72)',
      cardDark: 'rgba(12, 19, 38, 0.72)',
      borderLight: 'rgba(148, 163, 184, 0.24)',
      borderDark: 'rgba(148, 163, 184, 0.24)',
      radius: '12px',
      displayFont: '"Fraunces", Georgia, serif',
      effect: 'glass',
    },
  },
  {
    id: 'celestial',
    name: 'Celestial',
    description: 'Deep space starfield, nearly transparent luminous panels, Cormorant Garamond type, and night-sky constellations',
    supportedModes: ['dark'],
    preview: {
      canvasLight: '#030612',
      canvasDark: '#030612',
      sidebarLight: 'rgba(5, 9, 22, 0.72)',
      sidebarDark: 'rgba(5, 9, 22, 0.72)',
      cardLight: 'rgba(6, 11, 26, 0.42)',
      cardDark: 'rgba(6, 11, 26, 0.42)',
      borderLight: 'rgba(186, 210, 255, 0.24)',
      borderDark: 'rgba(186, 210, 255, 0.24)',
      radius: '12px',
      displayFont: '"Cormorant Garamond", Georgia, serif',
      effect: 'celestial',
    },
  },
  {
    id: 'doodle',
    name: 'Doodle',
    description: 'Playful paper-cut cards, chunky ink outlines, Fredoka type, and animated vector illustrations',
    supportedModes: ['light', 'dark'],
    preview: {
      canvasLight: '#fffbf0',
      canvasDark: '#161925',
      sidebarLight: '#fffdf7',
      sidebarDark: '#1c2030',
      cardLight: '#ffffff',
      cardDark: '#23283b',
      borderLight: '#1e2433',
      borderDark: '#dbe4f5',
      radius: '14px',
      displayFont: '"Fredoka", sans-serif',
      effect: 'doodle',
    },
  },
];

export const VALID_STYLES = new Set<string>(STYLE_DEFINITIONS.map((s) => s.id));

export function getStyleDefinition(styleId: AppStyleId | string | undefined): StyleDefinition {
  const found = STYLE_DEFINITIONS.find((s) => s.id === styleId);
  return found ?? STYLE_DEFINITIONS[0];
}

export function resolveEffectiveColorMode(
  requestedMode: ColorMode,
  supportedModes: readonly SupportedColorMode[]
): ColorMode {
  const allowsLight = supportedModes.includes('light');
  const allowsDark = supportedModes.includes('dark');
  if (!allowsLight && allowsDark) return 'dark';
  if (allowsLight && !allowsDark) return 'light';
  return requestedMode;
}

export function formatSupportedModesLabel(supportedModes: readonly SupportedColorMode[]): string {
  const allowsLight = supportedModes.includes('light');
  const allowsDark = supportedModes.includes('dark');
  if (allowsLight && allowsDark) return 'Light · Dark';
  if (allowsDark) return 'Dark only';
  return 'Light only';
}
