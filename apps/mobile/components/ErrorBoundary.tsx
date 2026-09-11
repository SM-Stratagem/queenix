/**
 * Queenix Gym — React error boundary
 * Catches render errors and shows a recovery UI.
 */

import React from 'react';
import { YStack } from 'tamagui';
import { Text, Button, Screen } from '@queenix/ui';
import { AlertOctagon } from '@tamagui/lucide-icons';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production: send to Sentry or similar
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;
      return (
        <Screen>
          <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" padding="$6">
            <AlertOctagon size={64} color="$danger" />
            <Text variant="h2" align="center">Something went wrong</Text>
            <Text variant="body" color="secondary" align="center" maxWidth={300}>
              {this.state.error?.message ?? 'An unexpected error occurred. Please try again.'}
            </Text>
            <Button label="Try again" onPress={this.reset} variant="primary" size="lg" />
          </YStack>
        </Screen>
      );
    }
    return this.props.children;
  }
}
