/**
 * Queenix Gym — Tamagui theme configuration
 *
 * Dark-mode only by design. The product demos and brand run dark
 * everywhere; the OS preference is intentionally ignored so contrast
 * stays consistent across devices. `light` is kept as an alias of the
 * dark theme so legacy `Theme name="light"` call sites keep rendering
 * dark instead of crashing on a missing theme.
 */

import { createTamagui } from 'tamagui';
import { palette, spacing, radii, fontSizes, fontWeights, lineHeights, shadows } from './tokens';
import { animations } from './animations';


const darkTheme = {
  background: palette.gray950,
  backgroundHover: palette.gray900,
  backgroundPress: palette.gray800,
  backgroundFocus: palette.gray800,
  backgroundStrong: palette.gray800,
  backgroundTransparent: 'rgba(9,9,11,0)',

  color: palette.gray0,
  colorHover: palette.gray0,
  colorPress: palette.gray200,
  colorFocus: palette.gray200,
  colorTransparent: 'rgba(255,255,255,0)',

  borderColor: palette.gray800,
  borderColorHover: palette.gray700,
  borderColorPress: palette.gray600,
  borderColorFocus: palette.brand500,

  placeholderColor: palette.gray500,

  // Brand
  brand: palette.brand500,
  brandHover: palette.brand400,
  brandPress: palette.brand600,

  // Status
  success: palette.success500,
  warning: palette.warning500,
  danger: palette.danger500,
  info: palette.info500,

  // Surfaces
  surface: palette.gray950,
  surfaceElevated: palette.gray900,
  surfaceMuted: palette.gray900,
  surfaceInverse: palette.gray0,

  // Text variants
  textPrimary: palette.gray0,
  textSecondary: palette.gray300,
  textMuted: palette.gray400,
  textInverse: palette.gray950,
  textBrand: palette.brand400,
  textOnBrand: palette.gray0,
  textSuccess: palette.success500,
  textWarning: palette.warning500,
  textDanger: palette.danger500,
  textInfo: palette.info500,
};

export const themes = {
  dark: darkTheme,
  // Legacy alias: every remaining `light` reference renders dark.
  light: darkTheme,
} as const

export const config: any = createTamagui({
  animations,
  themes,
  media: {
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1420 },
    xxl: { maxWidth: 1600 },
    gtXs: { minWidth: 660 + 1 },
    gtSm: { minWidth: 800 + 1 },
    gtMd: { minWidth: 1020 + 1 },
    gtLg: { minWidth: 1280 + 1 },
    gtXl: { minWidth: 1420 + 1 },
    short: { maxHeight: 820 },
    tall: { minHeight: 820 },
    hoverNone: { hover: 'none' },
    pointerCoarse: { pointer: 'coarse' },
  },
  tokens: {
    color: palette,
    space: spacing,
    radius: radii,
    size: {
      0: 0,
      true: 16, // Tamagui 2.x requires a `true` token = the default size
      1: 4,
      2: 8,
      3: 12,
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
      48: 192,
      56: 224,
      64: 256,
      72: 288,
      80: 320,
      96: 384,
    },
    fontSize: fontSizes,
    fontWeight: fontWeights,
    lineHeight: lineHeights,
    zIndex: {
      0: 0,
      1: 1,
      10: 10,
      20: 20,
      30: 30,
      40: 40,
      50: 50,
      100: 100,
    },
  },
  fonts: {
    body: {
      family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      size: fontSizes,
      lineHeight: lineHeights,
      weight: fontWeights,
      letterSpacing: {
        tight: -0.4,
        normal: 0,
        wide: 0.4,
      },
    },
    heading: {
      family: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      size: fontSizes,
      lineHeight: {
        tight: 1.1,
        normal: 1.3,
      },
      weight: {
        normal: '600',
        bold: '700',
        black: '800',
      },
      letterSpacing: {
        tight: -0.5,
        normal: 0,
      },
    },
    mono: {
      family: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
      size: fontSizes,
      lineHeight: lineHeights,
      weight: fontWeights,
    },
  },
  defaultProps: {
    Text: {
      color: '$color',
    },
  },
  settings: {
    allowedStyleValues: 'somewhat-strict',
    autocompleteSpecificTokens: 'except-special',
    // Tamagui 2: keep v1/React Native flex semantics (flex={1} = flex-basis auto).
    // Without it, flex+justifyContent=center screens overflow above the viewport.
    styleCompat: 'legacy',
  },
});

export type QueenixConfig = typeof config

declare module 'tamagui' {
  // intentionally empty — module augmentation removed to break circular type ref
}
