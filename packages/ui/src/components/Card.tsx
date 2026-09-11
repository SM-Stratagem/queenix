import React from 'react';
import { Card as TamaguiCard, YStack, XStack, Text, View, type ViewProps } from 'tamagui';

export type CardProps = ViewProps & {
  children?: React.ReactNode;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  testID?: string;
  accessibilityLabel?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  onPress,
  variant = 'elevated',
  padding = 'md',
  testID,
  accessibilityLabel,
}) => {
  const paddingMap = { none: 0, sm: '$3', md: '$4', lg: '$5' };
  const variantStyles = {
    elevated: {
      backgroundColor: '$surfaceElevated',
      borderColor: 'transparent',
      borderWidth: 0,
      shadowColor: '$shadowColor',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    outlined: {
      backgroundColor: '$surface',
      borderColor: '$borderColor',
      borderWidth: 1,
    },
    filled: {
      backgroundColor: '$surfaceMuted',
      borderColor: 'transparent',
      borderWidth: 0,
    },
  } as const;

  return (
    <TamaguiCard
      onPress={onPress}
      pressStyle={onPress ? { opacity: 0.95, scale: 0.99 } : undefined}
      borderRadius="$xl"
      padding={paddingMap[padding]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={onPress ? 'button' : undefined}
      {...variantStyles[variant]}
    >
      {title && (
        <YStack gap="$1" marginBottom="$2">
          <Text fontSize="$lg" fontWeight="600" color="$textPrimary">{title}</Text>
          {subtitle && <Text fontSize="$sm" color="$textSecondary">{subtitle}</Text>}
        </YStack>
      )}
      {children}
    </TamaguiCard>
  );
};
