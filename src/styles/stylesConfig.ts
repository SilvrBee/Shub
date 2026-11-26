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
    effect:
      | 'crisp'
      | 'editorial'
      | 'glass'
      | 'celestial'
      | 'doodle'
      | 'minimal'
      | 'bento'
      | 'magazine'
      | 'brutalism'
      | 'swiss'
      | 'motion-3d';
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
  {
    id: 'minimalism',
    name: 'Minimalism',
    description: 'Ample negative space, limited colors, and clean typography to keep focus on core content and usability',
    supportedModes: ['light', 'dark'],
    preview: {
      canvasLight: '#ffffff',
      canvasDark: '#0b0b0c',
      sidebarLight: '#ffffff',
      sidebarDark: '#0b0b0c',
      cardLight: '#ffffff',
      cardDark: '#101013',
      borderLight: '#e4e4e7',
      borderDark: '#232327',
      radius: '4px',
      displayFont: '"Manrope", sans-serif',
      effect: 'minimal',
    },
  },
  {
    id: 'bento',
    name: 'Bento Grid',
    description: 'Modular rounded compartments on a soft tray, tight uniform gutters, and Outfit geometric type',
    supportedModes: ['light', 'dark'],
    preview: {
      canvasLight: '#eff1f5',
      canvasDark: '#090b10',
      sidebarLight: '#f8f9fb',
      sidebarDark: '#0d1017',
      cardLight: '#ffffff',
      cardDark: '#131620',
      borderLight: '#dfe3ec',
      borderDark: '#232838',
      radius: '12px',
      displayFont: '"Outfit", sans-serif',
      effect: 'bento',
    },
  },
  {
    id: 'editorial-style',
    name: 'Editorial Style',
    description: 'Print magazine and broadsheet hierarchy with Playfair Display type, large feature visuals, and expressive layouts',
    supportedModes: ['light', 'dark'],
    preview: {
      canvasLight: '#faf8f3',
      canvasDark: '#121110',
      sidebarLight: '#f3efe6',
      sidebarDark: '#171614',
      cardLight: '#faf8f3',
      cardDark: '#161513',
      borderLight: '#1c1917',
      borderDark: '#d6d0c4',
      radius: '0px',
      displayFont: '"Playfair Display", Georgia, serif',
      effect: 'magazine',
    },
  },
  {
    id: 'brutalism',
    name: 'Neobrutalism & Brutalism',
    description: 'Bold ink outlines, raw grid geometry, oversized Archivo type, hard offset shadows, and clashing high-contrast colors',
    supportedModes: ['light', 'dark'],
    preview: {
      canvasLight: '#f3efe0',
      canvasDark: '#0b0b0b',
      sidebarLight: '#fffdf7',
      sidebarDark: '#121212',
      cardLight: '#ffffff',
      cardDark: '#161616',
      borderLight: '#000000',
      borderDark: '#f5f5f0',
      radius: '0px',
      displayFont: '"Archivo", sans-serif',
      effect: 'brutalism',
    },
  },
  {
    id: 'swiss',
    name: 'Swiss Style',
    description: 'International Typographic Style with strict modular grids, crisp sans-serif type, and objective alignment',
    supportedModes: ['light', 'dark'],
    preview: {
      canvasLight: '#f6f6f4',
      canvasDark: '#0d0d0e',
      sidebarLight: '#ffffff',
      sidebarDark: '#111113',
      cardLight: '#ffffff',
      cardDark: '#141416',
      borderLight: '#111111',
      borderDark: '#e4e4e0',
      radius: '0px',
      displayFont: '"Plus Jakarta Sans", sans-serif',
      effect: 'swiss',
    },
  },
  {
    id: 'motion-3d',
    name: '3D & Interactive / Motion',
    description: 'Interactive 3D spatial backdrop, pointer-tilted metric surfaces, scroll depth reveals, and spring micro-interactions',
    supportedModes: ['light', 'dark'],
    preview: {
      canvasLight: '#eef2f9',
      canvasDark: '#070a12',
      sidebarLight: '#ffffff',
      sidebarDark: '#0b0f1b',
      cardLight: '#ffffff',
      cardDark: '#101626',
      borderLight: 'rgba(148, 163, 184, 0.36)',
      borderDark: 'rgba(148, 163, 184, 0.24)',
      radius: '14px',
      displayFont: '"Outfit", sans-serif',
      effect: 'motion-3d',
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
