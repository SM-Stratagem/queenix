import React, { useMemo, useState, useCallback } from 'react';
import { YStack, XStack, ScrollView, RefreshControl } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Avatar,
  Button,
  Badge,
  Chip,
  Skeleton,
  ErrorState,
  EmptyState,
} from '@queenix/ui';
import { Star, Award, Dumbbell } from '@tamagui/lucide-icons';
import { useConvexQuery } from '@/lib/convex';
import { api } from '@queenix/convex';

const SPECIALTIES = ['All', 'Yoga', 'HIIT', 'Strength', 'Cardio', 'Pilates'] as const;
type Specialty = (typeof SPECIALTIES)[number];

interface Trainer {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  bio: string;
  years: number;
  certifications: string[];
  languages: string[];
  nextAvailable: string;
}

function deriveYears(_specialties: string[] | undefined, bio: string | undefined): number {
  // We don't have yearsExperience in the schema — fall back to a sensible default
  // or extract from the bio if it has "N years" in it.
  if (bio) {
    const m = bio.match(/(\d+)\s*years?/i);
    if (m && m[1]) return Math.max(1, Math.min(20, Number(m[1])));
  }
  return 5;
}

export default function TrainersScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Specialty>('All');
  const [refreshing, setRefreshing] = useState(false);

  const trainersRaw = useConvexQuery(api.queries.users.getAvailableTrainers, {});

  const trainers: Trainer[] = useMemo(() => {
    if (!trainersRaw) return [];
    return trainersRaw.map((t) => {
      const specialties = t.specialties ?? [];
      const primary = (specialties[0] as Specialty) ?? 'All';
      return {
        id: t._id,
        name: t.user?.fullName ?? 'Trainer',
        specialty: SPECIALTIES.includes(primary as Specialty) ? primary : 'All',
        rating: t.rating ?? 0,
        reviewCount: t.reviewCount ?? 0,
        hourlyRate: Math.round((t.hourlyRateCents ?? 0) / 100),
        bio: t.bio ?? 'Certified personal trainer.',
        years: deriveYears(specialties, t.bio),
        certifications: (t.certifications ?? []).map((c) => c.name),
        languages: [],
        nextAvailable: 'Contact for availability',
      };
    });
  }, [trainersRaw]);

  const filtered = useMemo(
    () => (filter === 'All' ? trainers : trainers.filter((t) => t.specialty === filter)),
    [filter, trainers]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Convex will auto-revalidate; we just give a short visual hint
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  return (
    <Screen scroll padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="$brand" />
        }
      >
        {/* Header */}
        <YStack paddingTop="$4" paddingHorizontal="$4" paddingBottom="$2" gap="$1">
          <Text variant="h1">Trainers</Text>
          <Text variant="bodySmall" color="secondary">
            Find the right coach for your goals
          </Text>
        </YStack>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 12 }}
        >
          {SPECIALTIES.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={filter === s}
              variant={filter === s ? 'brand' : 'default'}
              onPress={() => setFilter(s)}
            />
          ))}
        </ScrollView>

        {/* Count */}
        <YStack paddingHorizontal="$4" marginBottom="$2">
          <Text variant="caption" color="muted">
            {filtered.length} trainer{filtered.length === 1 ? '' : 's'} available
          </Text>
        </YStack>

        {/* List */}
        <YStack paddingHorizontal="$4" gap="$3">
          {trainersRaw === undefined ? (
            <YStack gap="$3">
              {[0, 1].map((i) => (
                <Card key={i} variant="elevated" padding="md">
                  <YStack gap="$3">
                    <XStack gap="$3">
                      <Skeleton width={56} height={56} circle />
                      <YStack flex={1} gap="$1">
                        <Skeleton width="50%" height={18} />
                        <Skeleton width="30%" height={14} />
                      </YStack>
                    </XStack>
                    <Skeleton width="100%" height={14} />
                    <Skeleton width="80%" height={14} />
                  </YStack>
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
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No trainers in this category"
              message="Try a different specialty or check back soon."
            />
          ) : (
            filtered.map((trainer) => (
              <TrainerCard
                key={trainer.id}
                trainer={trainer}
                onViewProfile={() => router.push('/(member)/book')}
                onBook={() => router.push('/(member)/book')}
              />
            ))
          )}
        </YStack>
      </ScrollView>
    </Screen>
  );
}

function TrainerCard({
  trainer,
  onViewProfile,
  onBook,
}: {
  trainer: Trainer;
  onViewProfile: () => void;
  onBook: () => void;
}) {
  return (
    <Card variant="elevated" padding="md" onPress={onViewProfile} accessibilityLabel={`View ${trainer.name} profile`}>
      <YStack gap="$3">
        {/* Top: avatar + name + rate */}
        <XStack gap="$3" alignItems="flex-start">
          <Avatar name={trainer.name} size="xl" />
          <YStack flex={1} gap="$1">
            <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
              <Text variant="h3">{trainer.name}</Text>
              <XStack alignItems="center" gap="$1">
                <Star size={14} color="$warning500" fill="$warning500" />
                <Text variant="caption" weight="600">
                  {trainer.rating.toFixed(1)}
                </Text>
              </XStack>
            </XStack>
            <XStack alignItems="center" gap="$2" flexWrap="wrap">
              <Badge label={trainer.specialty} variant="brand" />
              <XStack alignItems="center" gap="$1">
                <Award size={12} color="$textMuted" />
                <Text variant="caption" color="muted">
                  {trainer.years} yrs
                </Text>
              </XStack>
            </XStack>
          </YStack>
        </XStack>

        {/* Bio */}
        <Text variant="bodySmall" color="secondary" numberOfLines={3}>
          {trainer.bio}
        </Text>

        {/* Specialty chips */}
        {trainer.certifications.length > 0 && (
          <XStack gap="$1" flexWrap="wrap">
            {trainer.certifications.map((c) => (
              <XStack
                key={c}
                backgroundColor="$surfaceMuted"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$full"
              >
                <Text variant="caption" color="secondary">
                  {c}
                </Text>
              </XStack>
            ))}
          </XStack>
        )}

        {/* Footer */}
        <XStack
          justifyContent="space-between"
          alignItems="center"
          paddingTop="$2"
          borderTopWidth={1}
          borderTopColor="$borderColor"
        >
          <YStack>
            <Text variant="caption" color="muted">
              From
            </Text>
            <XStack alignItems="baseline" gap="$1">
              <Text variant="h3" color="brand">
                AED {trainer.hourlyRate}
              </Text>
              <Text variant="caption" color="muted">
                /hr
              </Text>
            </XStack>
          </YStack>
          <XStack alignItems="center" gap="$2">
            <YStack alignItems="flex-end">
              <Text variant="caption" color="muted">
                Next slot
              </Text>
              <Text variant="label" color="primary">
                {trainer.nextAvailable}
              </Text>
            </YStack>
            <Button
              label="Book"
              variant="primary"
              size="sm"
              onPress={onBook}
              icon={<Dumbbell size={14} color="$textOnBrand" />}
            />
          </XStack>
        </XStack>
      </YStack>
    </Card>
  );
}
