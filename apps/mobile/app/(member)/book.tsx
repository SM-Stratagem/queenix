import React, { useMemo, useState, useCallback } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, useToast } from '@queenix/ui';
import {
  Calendar,
  Dumbbell,
  Flame,
  Heart,
  Sparkles,
  Zap,
} from '@tamagui/lucide-icons-2';
import { TabPill } from '@/components/book/BookCards';
import { ClassesTab, TrainersTab } from '@/components/book/BookTabs';
import type { ClassCategory, ClassView, Level, TrainerView } from '@/components/book/types';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';

type TabKey = 'classes' | 'pt';

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
  const myBookings = useConvexQuery(api.queries.classes.getMyBookings, {});
  const trainersRaw = useConvexQuery(api.queries.users.getAvailableTrainers, {});
  const bookClass = useConvexMutation(api.mutations.bookings.bookClass);
  const joinWaitlist = useConvexMutation((api.mutations as any).bookings.joinWaitlist);

  const classes: ClassView[] = useMemo(() => {
    if (!upcoming) return [];
    const mine = new Map<string, 'confirmed' | 'waitlisted'>();
    for (const b of myBookings ?? []) {
      if (b.status === 'confirmed' || b.status === 'waitlisted') mine.set(String(b.classInstanceId), b.status);
    }
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
        myStatus: mine.get(String(c._id)),
      };
    });
  }, [upcoming, myBookings]);

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
      const key = makeIdempotencyKey();
      setBookingId(cls.id);
      try {
        if (isFull) {
          await joinWaitlist({ classInstanceId: cls.id as any, idempotencyKey: key });
          toast.success(`On the waitlist for ${cls.name}`);
        } else {
          await bookClass({ classInstanceId: cls.id as any, idempotencyKey: key });
          toast.success(`Booked ${cls.name}`);
        }
        router.push(`/(member)/classes/${cls.id}`);
      } catch (err: any) {
        toast.error(err?.data?.message ?? err?.message ?? 'Could not book this class');
      } finally {
        setBookingId(null);
      }
    },
    [bookClass, joinWaitlist, router, toast]
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
          <ClassesTab
            category={category}
            onCategory={setCategory}
            isLoadingClasses={isLoadingClasses}
            classesError={classesError}
            filteredClasses={filteredClasses}
            bookingId={bookingId}
            onOpenClass={(cls) => router.push(`/(member)/classes/${cls.id}`)}
            onBook={handleBook}
          />
        ) : (
          <TrainersTab
            isLoadingTrainers={isLoadingTrainers}
            trainersError={trainersRaw === null}
            trainers={trainers}
            onOpenTrainer={() => router.push('/(member)/trainers')}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

