import { createAnimations } from '@tamagui/animations-react-native';

/** Native animation driver (iOS/Android via Metro's .native resolution). */
export const animations = createAnimations({
  quick: { type: 'spring', damping: 20, mass: 1.2, stiffness: 250 },
  medium: { type: 'spring', damping: 15, stiffness: 120 },
  lazy: { type: 'spring', damping: 20, stiffness: 60 },
  bouncy: { type: 'spring', damping: 10, mass: 0.9, stiffness: 100 },
});
