import React, { useState, useCallback } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Avatar,
  Button,
  Badge,
  Progress,
  Skeleton,
  ErrorState,
  EmptyState,
  useToast,
} from '@queenix/ui';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Heart,
  Flame,
  Dumbbell,
  Zap,
  Sparkles,
  MapPin,
  Award,
  CheckCircle2,
} from '@tamagui/lucide-icons';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';
import {
  categoryFromString,
  levelFromString,
  formatDay,
  formatHour,
  makeIdempotencyKey,
} from '@/components/class-detail/format';

type ClassCategory = 'HIIT' | 'Yoga' | 'Strength' | 'Cardio' | 'Pilates';
type Level = 'Beginner' | 'Intermediate' | 'Advanced';

type CategoryIcon = React.ComponentType<{ size?: number | string; color?: string }>;

function categoryStyle(category: ClassCategory): { hue: string; iconColor: string; Icon: CategoryIcon } {
  switch (category) {
    case 'HIIT':
      return { hue: '$warning50', iconColor: '$warning', Icon: Flame };
    case 'Strength':
      return { hue: '$success50', iconColor: '$success700', Icon: Dumbbell };
    case 'Cardio':
      return { hue: '$danger50', iconColor: '$danger', Icon: Zap };
    case 'Pilates':
      return { hue: '$info50', iconColor: '$info700', Icon: Sparkles };
    case 'Yoga':
    default:
      return { hue: '$brand50', iconColor: '$brand', Icon: Heart };
  }
}


export default function ClassDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string }>();
  const classId = (params.id ?? '') as string;

  const cls = useConvexQuery(
    api.queries.classes.getClassById,
    classId ? ({ id: classId as any } as any) : 'skip'
  );
  const bookClass = useConvexMutation(api.mutations.bookings.bookClass);
  const cancelBooking = useConvexMutation(api.mutations.bookings.cancelBooking);
  const bookingsMutations = (api.mutations as any).bookings;
  const joinWaitlist = useConvexMutation(bookingsMutations.joinWaitlist);
  const leaveWaitlist = useConvexMutation(bookingsMutations.leaveWaitlist);
  const myBookings = useConvexQuery((api.queries as any).classes.getMyBookings, {});

  const [busy, setBusy] = useState(false);

  const mine = (myBookings as any[] | undefined)?.find(
    (b) => String(b.classInstanceId) === String(classId) && (b.status === 'confirmed' || b.status === 'waitlisted')
  );

  const handleBook = useCallback(async () => {
    if (!cls) return;
    setBusy(true);
    try {
      if (mine?.status === 'confirmed') {
        await cancelBooking({ bookingId: mine._id as any });
        toast.success('Booking cancelled');
      } else if (mine?.status === 'waitlisted') {
        await leaveWaitlist({ bookingId: mine._id as any });
        toast.success('Left the waitlist');
      } else if (cls.bookedCount >= cls.capacity) {
        await joinWaitlist({ classInstanceId: cls._id as any, idempotencyKey: makeIdempotencyKey() });
        toast.success('On the waitlist — we will notify you of a spot');
      } else {
        await bookClass({
          classInstanceId: cls._id as any,
          idempotencyKey: makeIdempotencyKey(),
        });
        toast.success(`Booked ${cls.classType?.name ?? 'class'}`);
      }
    } catch (err: any) {
      toast.error(err?.data?.message ?? err?.message ?? 'Could not update booking');
    } finally {
      setBusy(false);
    }
  }, [cls, mine, bookClass, cancelBooking, joinWaitlist, leaveWaitlist, toast]);

  if (cls === undefined) {
    return (
      <Screen>
        <YStack flex={1} padding="$4" gap="$3">
          <Skeleton width="100%" height={240} borderRadius={24} />
          <Skeleton width="60%" height={24} />
          <Skeleton width="40%" height={16} />
          <Skeleton width="100%" height={80} borderRadius={16} />
          <Skeleton width="100%" height={120} borderRadius={16} />
        </YStack>
      </Screen>
    );
  }

  if (cls === null) {
    return (
      <Screen padded>
        <ErrorState
          title="Class not found"
          message="This class may have been removed or the link is invalid."
          onRetry={() => router.replace('/(member)/book')}
          retryLabel="Browse classes"
        />
      </Screen>
    );
  }

  const cat = categoryFromString(cls.classType?.category);
  const level = levelFromString(cls.classType?.difficulty);
  const { hue, iconColor, Icon } = categoryStyle(cat);
  const fillPct = (cls.bookedCount / cls.capacity) * 100;
  const isFull = cls.bookedCount >= cls.capacity;
  const trainerName = cls.trainer?.fullName;

  return (
    <Screen scroll padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <YStack
          height={240}
          backgroundColor={hue as any}
          alignItems="center"
          justifyContent="center"
          paddingTop="$6"
        >
          <YStack
            backgroundColor="$surface"
            padding="$4"
            borderRadius="$xl"
            marginBottom="$3"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <Icon size={48} color={iconColor as any} />
          </YStack>
          <Badge label={cat} variant="brand" />
        </YStack>

        {/* Back / Title */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <XStack alignItems="center" gap="$2">
            <YStack
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              pressStyle={{ opacity: 0.7 }}
              padding="$2"
              borderRadius="$full"
              backgroundColor="$surfaceMuted"
            >
              <ArrowLeft size={20} color="$textPrimary" />
            </YStack>
            <Badge label={level} variant="neutral" />
          </XStack>
          <Text variant="h1">{cls.classType?.name ?? 'Class'}</Text>
          <Text variant="body" color="secondary">
            {cls.classType?.description ?? 'A great class to get you moving.'}
          </Text>
        </YStack>

        {/* Quick info row */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card variant="outlined" padding="md">
            <XStack gap="$3" flexWrap="wrap">
              <InfoItem
                icon={<Calendar size={18} color="$brand" />}
                label={formatDay(cls.startsAt)}
                sub={formatHour(cls.startsAt)}
              />
              <InfoItem
                icon={<Clock size={18} color="$brand" />}
                label={`${cls.classType?.durationMinutes ?? 60} min`}
                sub="Duration"
              />
              <InfoItem
                icon={<MapPin size={18} color="$brand" />}
                label={cls.roomId ?? 'Studio'}
                sub="Location"
              />
            </XStack>
          </Card>
        </YStack>

        {/* Capacity */}
        <YStack paddingHorizontal="$4" marginTop="$3">
          <Card variant="outlined" padding="md">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
              <YStack>
                <Text variant="label">Capacity</Text>
                <Text variant="caption" color="muted">
                  {cls.bookedCount} of {cls.capacity} booked
                </Text>
              </YStack>
              <Text
                variant="caption"
                weight="600"
                color={isFull ? 'danger' : fillPct > 80 ? 'warning' : 'success'}
              >
                {isFull ? 'Full' : `${cls.capacity - cls.bookedCount} spots left`}
              </Text>
            </XStack>
            <Progress
              value={fillPct}
              size="md"
              color={isFull ? '$danger' : fillPct > 80 ? '$warning' : '$brand'}
            />
          </Card>
        </YStack>

        {/* About */}
        {cls.classType?.description && (
          <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
            <Text variant="h3">About this class</Text>
            <Text variant="body" color="secondary">
              {cls.classType.description}
            </Text>
          </YStack>
        )}

        {/* Trainer */}
        {trainerName && (
          <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
            <Text variant="h3">About the trainer</Text>
            <Card
              variant="outlined"
              padding="md"
              onPress={() => router.push('/(member)/trainers')}
              accessibilityLabel={`View ${trainerName} profile`}
            >
              <XStack gap="$3" alignItems="flex-start">
                <Avatar name={trainerName} size="lg" />
                <YStack flex={1} gap="$1">
                  <XStack alignItems="center" justifyContent="space-between" gap="$2">
                    <Text variant="h4">{trainerName}</Text>
                    <XStack alignItems="center" gap="$1">
                      <Award size={14} color="$brand" />
                      <Text variant="caption" color="brand" weight="600">
                        Coach
                      </Text>
                    </XStack>
                  </XStack>
                  <Text variant="caption" color="muted">Certified instructor</Text>
                </YStack>
              </XStack>
            </Card>
          </YStack>
        )}

        {!trainerName && (
          <YStack paddingHorizontal="$4" marginTop="$4">
            <EmptyState
              title="Trainer TBA"
              message="Your coach for this session will be announced soon."
            />
          </YStack>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor="$surface"
        borderTopWidth={1}
        borderTopColor="$borderColor"
        padding="$4"
        paddingBottom="$6"
      >
        <Button
          label={
            busy
              ? 'Updating…'
              : mine?.status === 'confirmed'
                ? 'Cancel booking'
                : mine?.status === 'waitlisted'
                  ? 'Leave waitlist'
                  : isFull
                    ? `Join waitlist${cls.waitlistCount ? ` (${cls.waitlistCount} waiting)` : ''}`
                    : 'Book this class'
          }
          variant={mine ? 'secondary' : isFull ? 'outline' : 'primary'}
          size="lg"
          fullWidth
          onPress={handleBook}
          disabled={busy}
          icon={
            mine ? (
              <CheckCircle2 size={18} color="$textPrimary" />
            ) : (
              <Icon size={18} color={isFull ? '$brand' : '$textOnBrand'} />
            )
          }
        />
      </YStack>
    </Screen>
  );
}

function InfoItem({
  icon,
  label,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <XStack flex={1} minWidth={88} alignItems="center" gap="$2">
      <YStack backgroundColor="$brand50" padding="$2" borderRadius="$md">
        {icon}
      </YStack>
      <YStack flex={1}>
        <Text variant="label" numberOfLines={1}>
          {label}
        </Text>
        <Text variant="caption" color="muted">
          {sub}
        </Text>
      </YStack>
    </XStack>
  );
}
