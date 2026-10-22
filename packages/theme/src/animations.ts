import { createAnimations } from '@tamagui/animations-css';

/**
 * Web animation driver (Next.js console + Expo web). Native builds resolve
 * animations.native.ts instead. Tamagui's Sheet (and any `animation=` prop)
 * needs a driver — without one it crashes reading `animatedNumber.setValue`.
 */
export const animations = createAnimations({
  quick: 'ease-in 150ms',
  medium: 'ease-in-out 250ms',
  lazy: 'ease-in 400ms',
  bouncy: 'cubic-bezier(0.175, 0.885, 0.32, 1.275) 300ms',
});
