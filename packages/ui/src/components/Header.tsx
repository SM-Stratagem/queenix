import React from 'react';
import { XStack, YStack, useTheme } from 'tamagui';
import { Text } from './Text';
import { Pressable } from 'react-native';
import { ChevronLeft, X } from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  transparent?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack,
  onBack,
  right,
  transparent = false,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <XStack
      paddingTop={insets.top + 8}
      paddingBottom="$3"
      paddingHorizontal="$4"
      alignItems="center"
      justifyContent="space-between"
      backgroundColor={transparent ? 'transparent' : '$background'}
      borderBottomWidth={transparent ? 0 : 1}
      borderBottomColor="$borderColor"
      minHeight={56}
    >
      <XStack alignItems="center" gap="$2" flex={1}>
        {showBack && (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
          >
            <ChevronLeft size={28} color="$textPrimary" />
          </Pressable>
        )}
        <YStack flex={1}>
          {title && <Text variant="h3">{title}</Text>}
          {subtitle && <Text variant="caption" color="secondary">{subtitle}</Text>}
        </YStack>
      </XStack>
      {right && <XStack gap="$2">{right}</XStack>}
    </XStack>
  );
};
