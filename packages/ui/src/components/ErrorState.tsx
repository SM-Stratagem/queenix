import React from 'react';
import { YStack } from 'tamagui';
import { AlertCircle } from '@tamagui/lucide-icons';
import { Text } from './Text';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'Please try again. If the problem persists, contact support.',
  onRetry,
  retryLabel = 'Try again',
}) => {
  return (
    <YStack alignItems="center" justifyContent="center" padding="$6" gap="$3" flex={1}>
      <AlertCircle size={48} color="$danger500" />
      <Text variant="h3" align="center">{title}</Text>
      <Text variant="body" color="secondary" align="center" maxWidth={300}>
        {message}
      </Text>
      {onRetry && (
        <Button label={retryLabel} onPress={onRetry} variant="primary" size="md" />
      )}
    </YStack>
  );
};
