import React from 'react';
import { XStack, Text, View } from 'tamagui';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

const variantStyles = {
  success: { bg: '$success50', text: '$success700', color: '$success500' },
  warning: { bg: '$warning50', text: '$warning700', color: '$warning500' },
  danger: { bg: '$danger50', text: '$danger700', color: '$danger500' },
  info: { bg: '$info50', text: '$info700', color: '$info500' },
  neutral: { bg: '$surfaceMuted', text: '$textSecondary', color: '$textMuted' },
  brand: { bg: '$brand50' as any, text: '$brand700', color: '$brand' },
} as const;

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', size = 'sm', icon }) => {
  const styles = variantStyles[variant];
  return (
    <XStack
      backgroundColor={styles.bg as any}
      paddingHorizontal={size === 'sm' ? '$2' : '$3'}
      paddingVertical={size === 'sm' ? '$0.5' : '$1'}
      borderRadius="$full"
      alignItems="center"
      gap="$1"
      alignSelf="flex-start"
    >
      {icon}
      <Text color={styles.text as any} fontSize={size === 'sm' ? '$xs' : '$sm'} fontWeight="600">
        {label}
      </Text>
    </XStack>
  );
};
