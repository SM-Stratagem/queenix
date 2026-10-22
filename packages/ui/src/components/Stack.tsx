import React from 'react';
import {
  View as TamaguiStack,
  XStack,
  YStack,
  ZStack,
  type ViewProps as TamaguiStackProps,
} from 'tamagui';

export { XStack, YStack, ZStack };
export { TamaguiStack as VStack };

export interface StackProps extends Omit<TamaguiStackProps, 'padding' | 'flexDirection' | 'direction'> {
  padded?: boolean;
  padding?: TamaguiStackProps['padding'];
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
}

export const Stack = React.forwardRef<React.ElementRef<typeof TamaguiStack>, StackProps>(
  ({ padded, padding, direction, flexDirection, ...props }, ref) => (
    <TamaguiStack
      ref={ref}
      padding={padding ?? (padded ? '$4' : undefined)}
      // Native defaults to column but CSS flex defaults to row: pin column so
      // web (Expo web) lays screens out like the phone does.
      flexDirection={flexDirection ?? direction ?? 'column'}
      {...props}
    />
  )
);
Stack.displayName = 'Stack';
