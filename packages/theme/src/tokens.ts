/**
 * Queenix Gym — Design Tokens
 * Brand color extracted from LOGOFinalized.jpg (primary: #0081cc)
 */

export const palette = {
  // Brand
  brand50: '#e6f4fb',
  brand100: '#bfe1f4',
  brand200: '#94ceeb',
  brand300: '#69bbe1',
  brand400: '#3fa7d7',
  brand500: '#0081cc', // primary
  brand600: '#006ba8',
  brand700: '#005485',
  brand800: '#003d62',
  brand900: '#00263f',

  // Neutral (warm grays for women's gym feel)
  gray0: '#ffffff',
  gray50: '#fafafa',
  gray100: '#f4f4f5',
  gray200: '#e4e4e7',
  gray300: '#d4d4d8',
  gray400: '#a1a1aa',
  gray500: '#71717a',
  gray600: '#52525b',
  gray700: '#3f3f46',
  gray800: '#27272a',
  gray900: '#18181b',
  gray950: '#09090b',

  // Status
  success50: '#ecfdf5',
  success500: '#10b981',
  success600: '#059669',
  success700: '#047857',

  warning50: '#fffbeb',
  warning500: '#f59e0b',
  warning600: '#d97706',
  warning700: '#b45309',

  danger50: '#fef2f2',
  danger500: '#ef4444',
  danger600: '#dc2626',
  danger700: '#b91c1c',

  info50: '#eff6ff',
  info500: '#3b82f6',
  info600: '#2563eb',
  info700: '#1d4ed8',

  // Accents (warm, premium, women's gym)
  rose500: '#f43f5e', // power / strength
  rose600: '#e11d48',
  violet500: '#8b5cf6', // premium
  violet600: '#7c3aed',
  amber500: '#f59e0b', // energy
} as const;

export const spacing = {
  px: 1,
  true: 4, // Tamagui 2.x requires a `true` token = the default space
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
} as const;

export const radii = {
  0: 0,
  true: 10, // Tamagui 2.x requires numeric keys with a `true` default
  1: 4,
  2: 8,
  3: 10,
  4: 12,
  5: 16,
  6: 20,
  7: 24,
  99: 9999, // use as `pill` in styles
} as const

export const fontSizes = {
  '2xs': 10,
  xs: 12,
  sm: 14,
  base: 16,
  md: 17,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
  '6xl': 48,
  '7xl': 56,
  '8xl': 64,
  '9xl': 72,
} as const;

export const fontWeights = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

export const lineHeights = {
  none: 1,
  tight: 1.2,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.65,
  loose: 2,
} as const;

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

export const durations = {
  fastest: 50,
  faster: 100,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 400,
  slowest: 500,
} as const;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Palette = typeof palette;
export type Spacing = typeof spacing;
export type Radii = typeof radii;
