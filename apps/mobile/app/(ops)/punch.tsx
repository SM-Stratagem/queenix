/**
 * Queenix Gym — Punch clock screen (ops / staff)
 *
 * Big primary "Punch in / Punch out" button driven by the current
 * punch state. Below: today's hours, this week's hours, and the
 * latest 5 punches. The fingerprint reader at the front desk
 * auto-punches via the webhook at /api/scanner/fingerprint.
 *
 * Hardware note:
 *   Physical fingerprint readers (e.g. ZKTeco UareU 4500, DigitalPersona 4500,
 *   or Suprema BioMini) connect to the front desk PC and POST to:
 *     https://your-domain.com/api/scanner/fingerprint
 *   with the enrolled user ID. The webhook then calls recordPunch.
 */

import React from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Header,
  Text,
  Card,
  Button,
  Badge,
  Skeleton,
  EmptyState,
  Divider,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';
import {
  LogIn,
  LogOut,
  Clock,
  Fingerprint,
  CheckCircle2,
  Calendar,
} from '@tamagui/lucide-icons';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OpsPunch() {
  const router = useRouter();
  const toast = useToast();

  const punchQuery = useConvexQuery(api.queries.users.getLatestPunch, {});
  const recordPunch = useConvexMutation(api.mutations.users.recordPunch);

  const isLoading = punchQuery === undefined;
  const isClockedIn = punchQuery?.isClockedIn ?? false;
  const latest = punchQuery?.latest ?? null;
  const hoursToday = punchQuery?.hoursToday ?? 0;
  const hoursThisWeek = punchQuery?.hoursThisWeek ?? 0;
  const recent = punchQuery?.recent ?? [];

  const handlePunch = async () => {
    try {
      await recordPunch({
        method: 'app',
        punchType: isClockedIn ? 'out' : 'in',
      });
      toast.show(isClockedIn ? 'Punched out' : 'Punched in', 'success');
    } catch (e: any) {
      toast.show(e?.message ?? 'Failed to punch', 'error');
    }
  };

  return (
    <Screen padded={false}>
      <Header
        showBack
        onBack={() => router.back()}
        title="Punch clock"
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Status card */}
        <YStack paddingHorizontal="$4" paddingTop="$3">
          <Card variant="elevated" padding="lg">
            <YStack alignItems="center" gap="$3">
              <YStack
                backgroundColor={isClockedIn ? '$success50' : '$surfaceMuted'}
                padding="$4"
                borderRadius="$full"
              >
                {isClockedIn ? (
                  <CheckCircle2 size={48} color="$success500" />
                ) : (
                  <Clock size={48} color="$textMuted" />
                )}
              </YStack>
              <YStack alignItems="center" gap="$1">
                <Text variant="caption" color="muted" textTransform="uppercase">
                  Current status
                </Text>
                <Text variant="h2" color={isClockedIn ? 'success' : 'primary'}>
                  {isLoading ? '…' : isClockedIn ? 'Clocked in' : 'Clocked out'}
                </Text>
                {latest && (
                  <Text variant="caption" color="muted">
                    Last punch {formatDateTime(latest.timestamp)}
                  </Text>
                )}
              </YStack>
              <Button
                label={isClockedIn ? 'Punch out' : 'Punch in'}
                variant="primary"
                size="lg"
                fullWidth
                icon={
                  isClockedIn ? (
                    <LogOut size={20} color="$textOnBrand" />
                  ) : (
                    <LogIn size={20} color="$textOnBrand" />
                  )
                }
                onPress={handlePunch}
                accessibilityLabel={isClockedIn ? 'Punch out' : 'Punch in'}
              />
            </YStack>
          </Card>
        </YStack>

        {/* Hours summary */}
        <XStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <Stat
            icon={<Clock size={18} color="$brand" />}
            label="Today"
            value={`${hoursToday.toFixed(2)}h`}
            flex={1}
            loading={isLoading}
          />
          <Stat
            icon={<Calendar size={18} color="$brand" />}
            label="This week"
            value={`${hoursThisWeek.toFixed(2)}h`}
            flex={1}
            loading={isLoading}
          />
        </XStack>

        {/* Recent punches */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <Text variant="h4">Recent punches</Text>
          {isLoading ? (
            <>
              <Skeleton height={60} borderRadius="$md" />
              <Skeleton height={60} borderRadius="$md" />
            </>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<Clock size={32} color="$textMuted" />}
              title="No punches yet"
              message="Tap Punch in above to start your shift."
            />
          ) : (
            <Card variant="outlined" padding="sm">
              {recent.map((p: any, idx: number) => (
                <React.Fragment key={p._id}>
                  <XStack alignItems="center" gap="$3" paddingVertical="$2.5">
                    <YStack
                      backgroundColor={
                        p.punchType === 'in' ? '$success50' : '$warning50'
                      }
                      padding="$2.5"
                      borderRadius="$md"
                    >
                      {p.punchType === 'in' ? (
                        <LogIn size={18} color="$success600" />
                      ) : (
                        <LogOut size={18} color="$warning600" />
                      )}
                    </YStack>
                    <YStack flex={1}>
                      <Text variant="bodySmall" weight="600">
                        {p.punchType === 'in' ? 'Punch in' : 'Punch out'}
                      </Text>
                      <Text variant="caption" color="muted">
                        {formatDateTime(p.timestamp)}
                      </Text>
                    </YStack>
                    <Badge
                      label={p.method}
                      variant={
                        p.method === 'fingerprint' ? 'info' :
                        p.method === 'app' ? 'brand' : 'neutral'
                      }
                      size="sm"
                    />
                  </XStack>
                  {idx < recent.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Card>
          )}
        </YStack>

        {/* Fingerprint hint */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card variant="filled" padding="sm">
            <XStack alignItems="flex-start" gap="$2">
              <YStack backgroundColor="$brand50" padding="$2" borderRadius="$md">
                <Fingerprint size={18} color="$brand" />
              </YStack>
              <YStack flex={1} gap="$0.5">
                <Text variant="label">Use fingerprint reader</Text>
                <Text variant="caption" color="muted">
                  Place your finger on the front-desk scanner — your punch is
                  recorded automatically. Webhook hits{' '}
                  <Text variant="caption" weight="600">
                    /api/scanner/fingerprint
                  </Text>
                  , validated against the FINGERPRINT_DEVICE_IDS allowlist,
                  then forwarded to Convex recordPunch.
                </Text>
              </YStack>
            </XStack>
          </Card>
        </YStack>
      </ScrollView>
    </Screen>
  );
}

function Stat({
  icon,
  label,
  value,
  flex,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  flex?: number;
  loading?: boolean;
}) {
  return (
    <Card variant="outlined" padding="md" flex={flex}>
      <YStack gap="$2">
        <XStack alignItems="center" gap="$1.5">
          {icon}
          <Text variant="caption" color="muted" textTransform="uppercase">
            {label}
          </Text>
        </XStack>
        {loading ? (
          <Skeleton width={80} height={28} />
        ) : (
          <Text variant="h2">{value}</Text>
        )}
      </YStack>
    </Card>
  );
}
