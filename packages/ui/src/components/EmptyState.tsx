import React from 'react';
import { YStack } from 'tamagui';
import { Text } from './Text';
import { Button } from './Button';

export interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nothing here yet',
  message,
  icon,
  actionLabel,
  onAction,
}) => {
  return (
    <YStack alignItems="center" justifyContent="center" padding="$6" gap="$3" flex={1}>
      {icon}
      <Text variant="h3" align="center">{title}</Text>
      {message && (
        <Text variant="body" color="secondary" align="center" maxWidth={280}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} variant="primary" size="md" />
      )}
    </YStack>
  );
};
