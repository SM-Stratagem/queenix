import React from 'react';
import { YStack } from 'tamagui';
import { Text } from './Text';
import { Button } from './Button';

export interface EmptyStateProps {
  title?: string;
  message?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nothing here yet',
  message,
  description,
  icon,
  actionLabel,
  onAction,
}) => {
  const body = message ?? description;
  return (
    <YStack alignItems="center" justifyContent="center" padding="$6" gap="$3" flex={1}>
      {icon}
      <Text variant="h3" align="center">{title}</Text>
      {body && (
        <Text variant="body" color="secondary" align="center" maxWidth={280}>
          {body}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} variant="primary" size="md" />
      )}
    </YStack>
  );
};
