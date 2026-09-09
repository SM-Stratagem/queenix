import React, { useEffect, useState, useCallback } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Button,
  Badge,
  Spacer,
  Progress,
  Skeleton,
  ErrorState,
  EmptyState,
} from '@queenix/ui';
import { RefreshCw, Eye, History, Car } from '@tamagui/lucide-icons';
import QRCode from 'react-native-qrcode-svg';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';
import { formatTime } from '@queenix/types';

const ROTATION_INTERVAL_MS = 60 * 1000;
const COUNTDOWN_TICK_MS = 1000;

const DEFAULT_MAX_OCCUPANCY = 60;

export default function GymScreen() {
  const router = useRouter();

  // Real data
  const occupancy = useConvexQuery(api.queries.access.getCurrentOccupancy, {});
  const accessEvents = useConvexQuery(api.queries.access.getRecentAccessEvents, { limit: 5 });
  const rotateToken = useConvexMutation(api.mutations.access.rotateAccessToken);

  // Token rotation state
  const [token, setToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [rotating, setRotating] = useState<boolean>(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const refreshToken = useCallback(async () => {
    setRotating(true);
    setTokenError(null);
    try {
      const res = await rotateToken({});
      setToken(res.token);
      setTokenExpiresAt(res.tokenExpiresAt);
      setSecondsLeft(Math.max(0, Math.round((res.tokenExpiresAt - Date.now()) / 1000)));
    } catch (err: any) {
      setTokenError(err?.message ?? 'Could not refresh access token');
    } finally {
      setRotating(false);
    }
  }, [rotateToken]);

  // Initial token fetch
  useEffect(() => {
    refreshToken();
  }, [refreshToken]);

  // Periodic rotation
  useEffect(() => {
    const id = setInterval(() => {
      refreshToken();
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshToken]);

  // 1-second countdown ticker for the visible secondsLeft
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (tokenExpiresAt == null) return 60;
        const remaining = Math.max(0, Math.round((tokenExpiresAt - Date.now()) / 1000));
        return remaining;
      });
    }, COUNTDOWN_TICK_MS);
    return () => clearInterval(id);
  }, [tokenExpiresAt]);

  const liveOccupancy = occupancy?.count ?? 0;

  return (
    <Screen scroll padded={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <YStack padding="$4" alignItems="center" gap="$2">
          <Text variant="h2">Gym access</Text>
          <Text variant="bodySmall" color="secondary">Show this code at the entrance</Text>
        </YStack>

        {/* QR Card */}
        <YStack paddingHorizontal="$4">
          <Card variant="elevated" padding="lg" alignItems="center">
            <XStack alignSelf="stretch" justifyContent="space-between" alignItems="center" marginBottom="$3">
              <Badge label="Active" variant="success" />
              <Text variant="caption" color="muted">
                {tokenError ? 'Token error' : `Refreshes in ${secondsLeft}s`}
              </Text>
            </XStack>

            {token && !tokenError ? (
              <YStack
                backgroundColor="white"
                padding="$3"
                borderRadius="$lg"
                borderWidth={1}
                borderColor="$borderColor"
                alignSelf="center"
                width={240}
                height={240}
                alignItems="center"
                justifyContent="center"
              >
                <QRCode
                  value={token}
                  size={208}
                  backgroundColor="white"
                  color="black"
                  ecl="M"
                />
              </YStack>
            ) : tokenError ? (
              <YStack
                backgroundColor="white"
                padding="$3"
                borderRadius="$lg"
                borderWidth={1}
                borderColor="$borderColor"
                alignSelf="center"
                width={240}
                height={240}
                alignItems="center"
                justifyContent="center"
              >
                <ErrorState
                  title="QR unavailable"
                  message={tokenError}
                  onRetry={refreshToken}
                  retryLabel="Try again"
                />
              </YStack>
            ) : (
              <YStack
                backgroundColor="white"
                padding="$3"
                borderRadius="$lg"
                borderWidth={1}
                borderColor="$borderColor"
                alignSelf="center"
                width={240}
                height={240}
                alignItems="center"
                justifyContent="center"
              >
                <YStack gap="$2" alignItems="center">
                  <Skeleton width={208} height={208} borderRadius={8} />
                </YStack>
              </YStack>
            )}

            <Spacer size="md" />
            <XStack gap="$2" alignSelf="stretch">
              <Button
                label={rotating ? 'Refreshing…' : 'Refresh'}
                onPress={refreshToken}
                variant="outline"
                size="sm"
                fullWidth
                disabled={rotating}
                icon={<RefreshCw size={16} color="$brand" />}
              />
            </XStack>
            <Text variant="caption" color="muted" marginTop="$3" align="center">
              For your security, this code rotates every 60 seconds
            </Text>
          </Card>
        </YStack>

        {/* Live occupancy */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card variant="outlined">
            <XStack alignItems="center" gap="$3" marginBottom="$3">
              <YStack
                backgroundColor="$brand50"
                padding="$2.5"
                borderRadius="$md"
              >
                <Eye size={20} color="$brand" />
              </YStack>
              <YStack flex={1}>
                <Text variant="label">Live occupancy</Text>
                <Text variant="bodySmall" color="muted">Updated just now</Text>
              </YStack>
              <Text variant="h3" color="brand">
                {occupancy === undefined ? '—' : `${liveOccupancy}/${DEFAULT_MAX_OCCUPANCY}`}
              </Text>
            </XStack>
            <Progress
              value={occupancy === undefined ? 0 : (liveOccupancy / DEFAULT_MAX_OCCUPANCY) * 100}
              color={liveOccupancy > DEFAULT_MAX_OCCUPANCY * 0.8 ? '$warning' : '$brand'}
            />
            <Text variant="caption" color="muted" marginTop="$2">
              {liveOccupancy < DEFAULT_MAX_OCCUPANCY * 0.6
                ? 'Plenty of space — great time to come in'
                : 'Getting busy — quieter time recommended'}
            </Text>
          </Card>
        </YStack>

        {/* Recent access events */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          <Text variant="h4">Recent visits</Text>
          {accessEvents === undefined ? (
            <Card variant="outlined" padding="md">
              <YStack gap="$2">
                <Skeleton width="80%" height={14} />
                <Skeleton width="60%" height={14} />
                <Skeleton width="70%" height={14} />
              </YStack>
            </Card>
          ) : accessEvents.length === 0 ? (
            <Card variant="outlined" padding="md">
              <EmptyState
                title="No recent visits"
                message="Your last access events will show up here."
              />
            </Card>
          ) : (
            <Card variant="outlined" padding="none">
              <YStack>
                {accessEvents.map((ev, idx) => (
                  <XStack
                    key={ev._id}
                    alignItems="center"
                    gap="$3"
                    padding="$3"
                    borderTopWidth={idx === 0 ? 0 : 1}
                    borderTopColor="$borderColor"
                  >
                    <YStack
                      backgroundColor={ev.granted ? '$success50' : '$danger50'}
                      padding="$2"
                      borderRadius="$md"
                    >
                      <History size={16} color={ev.granted ? '$success700' : '$danger'} />
                    </YStack>
                    <YStack flex={1}>
                      <Text variant="label" numberOfLines={1}>
                        {ev.direction === 'in' ? 'Entered' : 'Exited'} • {ev.accessPointId}
                      </Text>
                      <Text variant="caption" color="muted">
                        {formatTime(ev.timestamp)}
                        {!ev.granted && ev.reason ? ` • ${ev.reason}` : ''}
                      </Text>
                    </YStack>
                    <Badge
                      label={ev.granted ? 'OK' : 'Denied'}
                      variant={ev.granted ? 'success' : 'danger'}
                    />
                  </XStack>
                ))}
              </YStack>
            </Card>
          )}
        </YStack>

        {/* Quick links */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          <Card
            variant="outlined"
            onPress={() => router.push('/(member)/profile')}
            accessibilityLabel="View visit history"
          >
            <XStack alignItems="center" gap="$3">
              <YStack backgroundColor="$surfaceMuted" padding="$2.5" borderRadius="$md">
                <History size={20} color="$textPrimary" />
              </YStack>
              <YStack flex={1}>
                <Text variant="label">Visit history</Text>
                <Text variant="bodySmall" color="muted">
                  {accessEvents ? `${accessEvents.length} events tracked` : 'Loading…'}
                </Text>
              </YStack>
            </XStack>
          </Card>

          <Card variant="outlined">
            <XStack alignItems="center" gap="$3">
              <YStack backgroundColor="$surfaceMuted" padding="$2.5" borderRadius="$md">
                <Car size={20} color="$textPrimary" />
              </YStack>
              <YStack flex={1}>
                <Text variant="label">Parking</Text>
                <Text variant="bodySmall" color="muted">Manage registered vehicles</Text>
              </YStack>
              <Badge label="Member" variant="info" />
            </XStack>
          </Card>
        </YStack>
      </ScrollView>
    </Screen>
  );
}
