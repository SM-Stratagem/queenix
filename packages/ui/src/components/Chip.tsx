import React from 'react';
import { XStack, Text } from 'tamagui';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
}

const variantStyles = {
  default: { bg: '$surfaceMuted', text: '$textSecondary', border: '$borderColor' },
  brand: { bg: '$brand50' as any, text: '$brand700', border: '$brand' },
  success: { bg: '$success50', text: '$success700', border: '$success500' },
  warning: { bg: '$warning50', text: '$warning700', border: '$warning500' },
  danger: { bg: '$danger50', text: '$danger700', border: '$danger500' },
} as const;

export const Chip: React.FC<ChipProps> = ({
  label,
  selected,
  onPress,
  variant = 'default',
  size = 'md',
}) => {
  const styles = selected ? variantStyles[variant] : variantStyles.default;

  return (
    <XStack
      backgroundColor={styles.bg as any}
      borderColor={(selected ? styles.border : '$borderColor') as any}
      borderWidth={1}
      paddingHorizontal={size === 'sm' ? '$2.5' : '$3'}
      paddingVertical={size === 'sm' ? '$1' : '$1.5'}
      borderRadius="$full"
      onPress={onPress}
      pressStyle={{ opacity: 0.7, scale: 0.97 }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text
        color={styles.text as any}
        fontSize={size === 'sm' ? '$xs' : '$sm'}
        fontWeight="600"
      >
        {label}
      </Text>
    </XStack>
  );
};
