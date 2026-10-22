import React from 'react';
import { router, type ErrorBoundaryProps } from 'expo-router';
import { Screen, ErrorState } from '@queenix/ui';

/**
 * Per-screen Expo Router error boundary: a failed or timed-out Convex query
 * (useQuery throws) shows a friendly card instead of crashing the screen.
 * Re-exported as `ErrorBoundary` from every route file.
 */
export function ScreenError({ error, retry }: ErrorBoundaryProps) {
  const data = (error as any)?.data;
  const code: string | undefined = data?.code;
  const msg: string = data?.message ?? error?.message ?? '';

  // Access errors won't fix themselves on retry: explain and offer a way back.
  if (code === 'FORBIDDEN' || code === 'NOT_FOUND') {
    const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
    return (
      <Screen>
        <ErrorState
          title={code === 'FORBIDDEN' ? "You can't open this" : 'Not found'}
          message={
            code === 'FORBIDDEN'
              ? `${data?.message ? `${data.message}. ` : ''}This isn't available to your account.`
              : data?.message ?? 'It may have been removed.'
          }
          onRetry={back}
          retryLabel="Go back"
        />
      </Screen>
    );
  }

  const timedOut = /timed out/i.test(msg);
  return (
    <Screen>
      <ErrorState
        title={timedOut ? 'Taking too long' : 'Could not load this screen'}
        message={timedOut ? 'The server is busy. Please try again in a moment.' : 'Check your connection and try again.'}
        onRetry={() => void retry()}
      />
    </Screen>
  );
}
