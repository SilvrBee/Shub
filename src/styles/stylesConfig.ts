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
    effect: 'crisp' | 'editorial' | 'glass' | 'celestial';
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
    id: 'aurora-glass',
    name: 'Aurora Glass',
    description: 'Soft translucent panels, ambient backdrop glow, and rounded elevation',
    supportedModes: ['light', 'dark'],
    preview: {
      canvasLight: '#eff4fb',
      canvasDark: '#08101e',
      sidebarLight: 'rgba(255, 255, 255, 0.72)',
      sidebarDark: 'rgba(15, 23, 42, 0.68)',
      cardLight: 'rgba(255, 255, 255, 0.78)',
      cardDark: 'rgba(20, 30, 52, 0.65)',
      borderLight: 'rgba(148, 163, 184, 0.42)',
      borderDark: 'rgba(148, 163, 184, 0.22)',
      radius: '12px',
      displayFont: '"Plus Jakarta Sans", sans-serif',
      effect: 'glass',
    },
  },
  {
    id: 'celestial',
    name: 'Celestial',
    description: 'Deep nocturnal canvas with luminous hairline borders and starlight depth',
    supportedModes: ['dark'],
    preview: {
      canvasLight: '#060913',
      canvasDark: '#060913',
      sidebarLight: '#090e1d',
      sidebarDark: '#090e1d',
      cardLight: 'rgba(14, 21, 41, 0.88)',
      cardDark: 'rgba(14, 21, 41, 0.88)',
      borderLight: 'rgba(148, 163, 184, 0.24)',
      borderDark: 'rgba(148, 163, 184, 0.24)',
      radius: '10px',
      displayFont: '"Plus Jakarta Sans", sans-serif',
      effect: 'celestial',
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
