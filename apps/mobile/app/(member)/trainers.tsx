import React, { useMemo, useState } from 'react';
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
} from '@queenix/ui';
import { Star, Award, Dumbbell } from '@tamagui/lucide-icons';

const SPECIALTIES = ['All', 'Yoga', 'HIIT', 'Strength', 'Cardio', 'Pilates'] as const;
type Specialty = (typeof SPECIALTIES)[number];

interface Trainer {
  id: string;
  name: string;
  specialty: Exclude<Specialty, 'All'>;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  bio: string;
  years: number;
  certifications: string[];
  languages: string[];
  nextAvailable: string;
}

const TRAINERS: Trainer[] = [
  {
    id: 't1',
    name: 'Maya Patel',
    specialty: 'Yoga',
    rating: 4.9,
    reviewCount: 128,
    hourlyRate: 220,
    bio: 'Certified RYT-500 specializing in vinyasa, restorative, and mobility work. Maya tailors each session to your body and goals.',
    years: 8,
    certifications: ['RYT-500', 'Mobility Specialist'],
    languages: ['English', 'Hindi'],
    nextAvailable: 'Today, 6:00 PM',
  },
  {
    id: 't2',
    name: 'Sara Al-Mansoori',
    specialty: 'HIIT',
    rating: 4.8,
    reviewCount: 96,
    hourlyRate: 250,
    bio: 'Former national athlete. High-intensity programming for fat loss, conditioning, and athletic performance.',
    years: 6,
    certifications: ['NSCA-CPT', 'Precision Nutrition L1'],
    languages: ['English', 'Arabic'],
    nextAvailable: 'Tomorrow, 7:00 AM',
  },
  {
    id: 't3',
    name: 'Layla Hassan',
    specialty: 'Strength',
    rating: 4.9,
    reviewCount: 142,
    hourlyRate: 280,
    bio: 'Powerlifting coach focused on building strength and lean muscle. Programs built around progressive overload.',
    years: 10,
    certifications: ['CSCS', 'USA Powerlifting L1'],
    languages: ['English', 'Arabic'],
    nextAvailable: 'Thu, 9:00 AM',
  },
  {
    id: 't4',
    name: 'Nour Ibrahim',
    specialty: 'Cardio',
    rating: 4.7,
    reviewCount: 64,
    hourlyRate: 200,
    bio: 'Marathon runner and certified endurance coach. Friendly, motivating style that makes cardio feel doable.',
    years: 5,
    certifications: ['ACE-CPT', 'RRCA'],
    languages: ['English', 'Arabic', 'French'],
    nextAvailable: 'Today, 5:00 PM',
  },
  {
    id: 't5',
    name: 'Yasmin Khalid',
    specialty: 'Pilates',
    rating: 5.0,
    reviewCount: 78,
    hourlyRate: 240,
    bio: 'Pilates instructor with a background in physiotherapy. Specializes in posture, alignment, and injury rehab.',
    years: 7,
    certifications: ['BASI Pilates', 'Physiotherapy'],
    languages: ['English', 'Arabic'],
    nextAvailable: 'Tomorrow, 10:00 AM',
  },
];

export default function TrainersScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Specialty>('All');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(
    () => (filter === 'All' ? TRAINERS : TRAINERS.filter((t) => t.specialty === filter)),
    [filter]
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

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
          {filtered.map((trainer) => (
            <TrainerCard
              key={trainer.id}
              trainer={trainer}
              onViewProfile={() => router.push('/(member)/book')}
              onBook={() => router.push('/(member)/book')}
            />
          ))}
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
