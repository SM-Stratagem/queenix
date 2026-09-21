import React from 'react';
import {
  Stack as TamaguiStack,
  XStack,
  YStack,
  ZStack,
  type StackProps as TamaguiStackProps,
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
      flexDirection={flexDirection ?? direction}
      {...props}
    />
  )
);
Stack.displayName = 'Stack';
