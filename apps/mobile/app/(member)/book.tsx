import React, { useMemo, useState, useCallback } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Avatar,
  Button,
  Badge,
  Chip,
  Progress,
  Skeleton,
  ErrorState,
  EmptyState,
  useToast,
} from '@queenix/ui';
import {
  Calendar,
  Dumbbell,
  Flame,
  Heart,
  Star,
  Users,
  Clock,
  ChevronRight,
  Sparkles,
  Zap,
} from '@tamagui/lucide-icons';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';

type ClassCategory = 'All' | 'HIIT' | 'Yoga' | 'Strength' | 'Cardio' | 'Pilates';
type TabKey = 'classes' | 'pt';
type Level = 'Beginner' | 'Intermediate' | 'Advanced';

const CATEGORIES: ClassCategory[] = ['All', 'HIIT', 'Yoga', 'Strength', 'Cardio', 'Pilates'];

interface ClassView {
  id: string;
  name: string;
  category: ClassCategory;
  level: Level;
  startsAt: number;
  durationMin: number;
  room: string;
  capacity: number;
  bookedCount: number;
  waitlistCount: number;
  trainerName?: string;
  hue: string;
  icon: React.ReactNode;
}

interface TrainerView {
  id: string;
  name: string;
  avatarUrl?: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  bio?: string;
  certifications: string[];
  years?: number;
  nextAvailable?: string;
}

function formatHour(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function formatDay(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function categoryFromString(raw: string | undefined): Exclude<ClassCategory, 'All'> {
  const allowed = ['HIIT', 'Yoga', 'Strength', 'Cardio', 'Pilates'] as const;
  type Allowed = (typeof allowed)[number];
  if ((allowed as readonly string[]).includes(raw ?? '')) {
    return raw as Allowed;
  }
  return 'Yoga';
}

function levelFromString(raw: string | undefined): Level {
  if (raw === 'beginner') return 'Beginner';
  if (raw === 'advanced') return 'Advanced';
  return 'Intermediate';
}

function categoryStyle(category: Exclude<ClassCategory, 'All'>) {
  switch (category) {
    case 'HIIT':
      return { hue: '$warning50', icon: <Flame size={22} color="$warning" /> };
    case 'Yoga':
      return { hue: '$brand50', icon: <Heart size={22} color="$brand" /> };
    case 'Strength':
      return { hue: '$success50', icon: <Dumbbell size={22} color="$success700" /> };
    case 'Cardio':
      return { hue: '$danger50', icon: <Zap size={22} color="$danger" /> };
    case 'Pilates':
      return { hue: '$info50', icon: <Sparkles size={22} color="$info700" /> };
  }
}

function makeIdempotencyKey(): string {
  return `bk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function BookScreen() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('classes');
  const [category, setCategory] = useState<ClassCategory>('All');
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Real data
  const upcoming = useConvexQuery(api.queries.classes.getUpcomingClasses, { limit: 30 });
  const trainersRaw = useConvexQuery(api.queries.users.getAvailableTrainers, {});
  const bookClass = useConvexMutation(api.mutations.bookings.bookClass);

  const classes: ClassView[] = useMemo(() => {
    if (!upcoming) return [];
    return upcoming.map((c) => {
      const cat = categoryFromString(c.classType?.category);
      const level = levelFromString(c.classType?.difficulty);
      const style = categoryStyle(cat);
      return {
        id: c._id,
        name: c.classType?.name ?? 'Class',
        category: cat,
        level,
        startsAt: c.startsAt,
        durationMin: c.classType?.durationMinutes ?? 60,
        room: c.roomId ?? 'Studio',
        capacity: c.capacity,
        bookedCount: c.bookedCount,
        waitlistCount: c.waitlistCount,
        trainerName: c.trainer?.fullName,
        hue: style.hue,
        icon: style.icon,
      };
    });
  }, [upcoming]);

  const trainers: TrainerView[] = useMemo(() => {
    if (!trainersRaw) return [];
    return trainersRaw.map((t) => ({
      id: t._id,
      name: t.user?.fullName ?? 'Trainer',
      avatarUrl: t.user?.avatarUrl ?? t.profileImageUrl,
      specialty: t.specialties?.[0] ?? 'Personal training',
      rating: t.rating ?? 0,
      reviewCount: t.reviewCount ?? 0,
      hourlyRate: Math.round((t.hourlyRateCents ?? 0) / 100),
      bio: t.bio,
      certifications: (t.certifications ?? []).map((c) => c.name),
    }));
  }, [trainersRaw]);

  const filteredClasses =
    category === 'All' ? classes : classes.filter((c) => c.category === category);

  const handleBook = useCallback(
    async (cls: ClassView) => {
      const isFull = cls.bookedCount >= cls.capacity;
      if (isFull) {
        toast.info('Class is full — waitlist is not enabled yet');
        return;
      }
      const key = makeIdempotencyKey();
      setBookingId(cls.id);
      try {
        await bookClass({ classInstanceId: cls.id as any, idempotencyKey: key });
        toast.success(`Booked ${cls.name}`);
        router.push(`/(member)/classes/${cls.id}`);
      } catch (err: any) {
        toast.error(err?.message ?? 'Could not book this class');
      } finally {
        setBookingId(null);
      }
    },
    [bookClass, router, toast]
  );

  const isLoadingClasses = upcoming === undefined;
  const isLoadingTrainers = trainersRaw === undefined;
  const classesError = upcoming === null;

  return (
    <Screen scroll padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <YStack paddingTop="$4" paddingHorizontal="$4" paddingBottom="$2" gap="$1">
          <Text variant="h1">Book</Text>
          <Text variant="bodySmall" color="secondary">
            Reserve classes or 1-on-1 training
          </Text>
        </YStack>

        {/* Tabs */}
        <XStack
          paddingHorizontal="$4"
          marginTop="$3"
          marginBottom="$3"
          gap="$2"
        >
          <TabPill
            label="Classes"
            icon={<Calendar size={16} color={tab === 'classes' ? '$textOnBrand' : '$textSecondary'} />}
            active={tab === 'classes'}
            onPress={() => setTab('classes')}
            flex={1}
          />
          <TabPill
            label="Personal Training"
            icon={<Dumbbell size={16} color={tab === 'pt' ? '$textOnBrand' : '$textSecondary'} />}
            active={tab === 'pt'}
            onPress={() => setTab('pt')}
            flex={1}
          />
        </XStack>

        {tab === 'classes' ? (
          <YStack>
            {/* Category filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  selected={category === cat}
                  variant={category === cat ? 'brand' : 'default'}
                  onPress={() => setCategory(cat)}
                />
              ))}
            </ScrollView>

            <YStack paddingHorizontal="$4" marginTop="$3" gap="$3">
              {isLoadingClasses ? (
                <YStack gap="$3">
                  {[0, 1, 2].map((i) => (
                    <Card key={i} variant="elevated" padding="md">
                      <YStack gap="$2">
                        <Skeleton width="100%" height={120} borderRadius={16} />
                        <Skeleton width="60%" height={18} />
                        <Skeleton width="40%" height={14} />
                      </YStack>
                    </Card>
                  ))}
                </YStack>
              ) : classesError ? (
                <ErrorState
                  title="Could not load classes"
                  message="We had trouble fetching the schedule."
                  onRetry={() => {
                    /* Convex auto-revalidates */
                  }}
                />
              ) : (
                <>
                  <Text variant="caption" color="muted">
                    {filteredClasses.length} class{filteredClasses.length === 1 ? '' : 'es'} available
                  </Text>
                  {filteredClasses.length === 0 ? (
                    <EmptyState
                      title="No classes in this category"
                      message="Try a different filter or check back soon."
                    />
                  ) : (
                    filteredClasses.map((cls) => (
                      <ClassCard
                        key={cls.id}
                        cls={cls}
                        busy={bookingId === cls.id}
                        onPress={() => router.push(`/(member)/classes/${cls.id}`)}
                        onBook={() => handleBook(cls)}
                      />
                    ))
                  )}
                </>
              )}
            </YStack>
          </YStack>
        ) : (
          <YStack paddingHorizontal="$4" marginTop="$2" gap="$3">
            {isLoadingTrainers ? (
              <YStack gap="$3">
                {[0, 1].map((i) => (
                  <Card key={i} variant="outlined" padding="md">
                    <XStack gap="$3">
                      <Skeleton width={48} height={48} circle />
                      <YStack flex={1} gap="$1">
                        <Skeleton width="50%" height={16} />
                        <Skeleton width="70%" height={12} />
                        <Skeleton width="80%" height={12} />
                      </YStack>
                    </XStack>
                  </Card>
                ))}
              </YStack>
            ) : trainersRaw === null ? (
              <ErrorState
                title="Could not load trainers"
                message="Please try again in a moment."
                onRetry={() => {
                  /* Convex auto-revalidates */
                }}
              />
            ) : trainers.length === 0 ? (
              <EmptyState
                title="No trainers available"
                message="Check back soon for new coaching talent."
              />
            ) : (
              <>
                <Text variant="caption" color="muted">
                  {trainers.length} certified trainer{trainers.length === 1 ? '' : 's'}
                </Text>
                {trainers.map((trainer) => (
                  <TrainerCard
                    key={trainer.id}
                    trainer={trainer}
                    onPress={() => router.push('/(member)/trainers')}
                  />
                ))}
              </>
            )}
          </YStack>
        )}
      </ScrollView>
    </Screen>
  );
}

function TabPill({
  label,
  icon,
  active,
  onPress,
  flex,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
  flex?: number;
}) {
  return (
    <XStack
      flex={flex}
      alignItems="center"
      justifyContent="center"
      gap="$2"
      paddingVertical="$3"
      borderRadius="$lg"
      backgroundColor={active ? '$brand' : '$surfaceMuted'}
      borderWidth={1}
      borderColor={active ? '$brand' : '$borderColor'}
      onPress={onPress}
      pressStyle={{ opacity: 0.85, scale: 0.98 }}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      {icon}
      <Text variant="label" color={active ? 'inverse' : 'primary'}>
        {label}
      </Text>
    </XStack>
  );
}

function ClassCard({
  cls,
  onPress,
  onBook,
  busy,
}: {
  cls: ClassView;
  onPress: () => void;
  onBook: () => void;
  busy: boolean;
}) {
  const fillPct = (cls.bookedCount / cls.capacity) * 100;
  const isFull = cls.bookedCount >= cls.capacity;

  return (
    <Card variant="elevated" padding="none" onPress={onPress} accessibilityLabel={`Open ${cls.name}`}>
      <YStack>
        {/* Hero image area */}
        <YStack
          height={120}
          backgroundColor={cls.hue as any}
          alignItems="center"
          justifyContent="center"
          borderTopLeftRadius="$xl"
          borderTopRightRadius="$xl"
        >
          {cls.icon}
          <Text variant="caption" color="secondary" marginTop="$2">
            {cls.room} • {cls.level}
          </Text>
        </YStack>

        <YStack padding="$4" gap="$3">
          <YStack gap="$1">
            <XStack alignItems="center" justifyContent="space-between" gap="$2">
              <Text variant="h4" flex={1}>{cls.name}</Text>
              <Badge label={cls.category} variant="brand" />
            </XStack>
            <XStack alignItems="center" gap="$3">
              <XStack alignItems="center" gap="$1">
                <Clock size={14} color="$textMuted" />
                <Text variant="caption" color="muted">
                  {formatDay(cls.startsAt)}, {formatHour(cls.startsAt)} • {cls.durationMin}m
                </Text>
              </XStack>
            </XStack>
            {cls.trainerName && (
              <Text variant="bodySmall" color="secondary">
                with {cls.trainerName}
              </Text>
            )}
          </YStack>

          {/* Capacity */}
          <YStack gap="$1">
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap="$1">
                <Users size={14} color="$textMuted" />
                <Text variant="caption" color="muted">
                  {cls.bookedCount}/{cls.capacity} booked
                </Text>
              </XStack>
              <Text
                variant="caption"
                color={isFull ? 'danger' : fillPct > 80 ? 'warning' : 'success'}
                weight="600"
              >
                {isFull ? 'Full' : fillPct > 80 ? 'Almost full' : 'Spots open'}
              </Text>
            </XStack>
            <Progress
              value={fillPct}
              size="sm"
              color={isFull ? '$danger' : fillPct > 80 ? '$warning' : '$brand'}
            />
          </YStack>

          <Button
            label={busy ? 'Booking…' : isFull ? 'Join waitlist' : 'Book class'}
            variant={isFull ? 'outline' : 'primary'}
            size="md"
            fullWidth
            disabled={busy}
            onPress={isFull ? onPress : onBook}
            iconRight={!isFull && !busy ? <ChevronRight size={16} color="$textOnBrand" /> : undefined}
          />
        </YStack>
      </YStack>
    </Card>
  );
}

function TrainerCard({ trainer, onPress }: { trainer: TrainerView; onPress: () => void }) {
  return (
    <Card variant="outlined" padding="md" onPress={onPress} accessibilityLabel={`View ${trainer.name} profile`}>
      <XStack gap="$3" alignItems="flex-start">
        <Avatar name={trainer.name} size="lg" />
        <YStack flex={1} gap="$1">
          <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
            <Text variant="h4">{trainer.name}</Text>
            <XStack alignItems="center" gap="$1">
              <Star size={14} color="$warning500" fill="$warning500" />
              <Text variant="caption" weight="600">
                {trainer.rating.toFixed(1)}
              </Text>
              <Text variant="caption" color="muted">
                ({trainer.reviewCount})
              </Text>
            </XStack>
          </XStack>
          <Text variant="bodySmall" color="secondary">
            {trainer.specialty}
          </Text>
          {trainer.bio ? (
            <Text variant="bodySmall" color="muted" numberOfLines={2}>
              {trainer.bio}
            </Text>
          ) : null}
          <XStack alignItems="center" justifyContent="space-between" marginTop="$2">
            <YStack>
              <Text variant="caption" color="muted">From</Text>
              <Text variant="h4" color="brand">AED {trainer.hourlyRate}</Text>
              <Text variant="caption" color="muted">per hour</Text>
            </YStack>
            <Button label="Book" variant="primary" size="sm" onPress={onPress} />
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
}
