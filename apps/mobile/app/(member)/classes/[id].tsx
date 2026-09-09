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

type ClassCategory = 'HIIT' | 'Yoga' | 'Strength' | 'Cardio' | 'Pilates';
type Level = 'Beginner' | 'Intermediate' | 'Advanced';

function categoryFromString(raw: string | undefined): ClassCategory {
  const allowed: ClassCategory[] = ['HIIT', 'Yoga', 'Strength', 'Cardio', 'Pilates'];
  if ((allowed as string[]).includes(raw ?? '')) {
    return raw as ClassCategory;
  }
  return 'Yoga';
}

function levelFromString(raw: string | undefined): Level {
  if (raw === 'beginner') return 'Beginner';
  if (raw === 'advanced') return 'Advanced';
  return 'Intermediate';
}

function categoryStyle(category: ClassCategory) {
  switch (category) {
    case 'HIIT':
      return { hue: '$warning50', iconColor: '$warning', Icon: Flame };
    case 'Yoga':
      return { hue: '$brand50', iconColor: '$brand', Icon: Heart };
    case 'Strength':
      return { hue: '$success50', iconColor: '$success700', Icon: Dumbbell };
    case 'Cardio':
      return { hue: '$danger50', iconColor: '$danger', Icon: Zap };
    case 'Pilates':
      return { hue: '$info50', iconColor: '$info700', Icon: Sparkles };
  }
}

function formatDay(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatHour(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function makeIdempotencyKey(): string {
  return `bk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

  const [isBooked, setIsBooked] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleBook = useCallback(async () => {
    if (!cls) return;
    const isFull = cls.bookedCount >= cls.capacity;
    if (isFull) {
      toast.info('Class is full — waitlist is not enabled yet');
      return;
    }
    setBusy(true);
    try {
      await bookClass({
        classInstanceId: cls._id as any,
        idempotencyKey: makeIdempotencyKey(),
      });
      setIsBooked(true);
      toast.success(`Booked ${cls.classType?.name ?? 'class'}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not book this class');
    } finally {
      setBusy(false);
    }
  }, [cls, bookClass, toast]);

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
              ? 'Booking…'
              : isBooked
                ? 'Booked — see you there'
                : isFull
                  ? 'Join waitlist'
                  : 'Book this class'
          }
          variant={isBooked ? 'secondary' : isFull ? 'outline' : 'primary'}
          size="lg"
          fullWidth
          onPress={handleBook}
          disabled={isBooked || busy}
          icon={
            isBooked ? (
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
