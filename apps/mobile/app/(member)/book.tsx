import React, { useState } from 'react';
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
  Spacer,
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

type ClassCategory = 'All' | 'HIIT' | 'Yoga' | 'Strength' | 'Cardio' | 'Pilates';
type TabKey = 'classes' | 'pt';

const CATEGORIES: ClassCategory[] = ['All', 'HIIT', 'Yoga', 'Strength', 'Cardio', 'Pilates'];

interface ClassItem {
  id: string;
  name: string;
  trainer: string;
  category: Exclude<ClassCategory, 'All'>;
  startsAt: number;
  durationMin: number;
  room: string;
  capacity: number;
  booked: number;
  hue: string;
  icon: React.ReactNode;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
}

interface TrainerItem {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  bio: string;
  certifications: string[];
}

const CLASSES: ClassItem[] = [
  {
    id: 'c1',
    name: 'Power Yoga Flow',
    trainer: 'Maya Patel',
    category: 'Yoga',
    startsAt: Date.now() + 2 * 60 * 60 * 1000,
    durationMin: 60,
    room: 'Studio 2',
    capacity: 20,
    booked: 14,
    hue: '$brand100',
    icon: <Heart size={22} color="$brand" />,
    level: 'Intermediate',
  },
  {
    id: 'c2',
    name: 'HIIT Burner',
    trainer: 'Sara Al-Mansoori',
    category: 'HIIT',
    startsAt: Date.now() + 4 * 60 * 60 * 1000,
    durationMin: 45,
    room: 'Studio 1',
    capacity: 25,
    booked: 22,
    hue: '$warning50',
    icon: <Flame size={22} color="$warning" />,
    level: 'Advanced',
  },
  {
    id: 'c3',
    name: 'Strength Lab',
    trainer: 'Layla Hassan',
    category: 'Strength',
    startsAt: Date.now() + 24 * 60 * 60 * 1000,
    durationMin: 50,
    room: 'Weight Room',
    capacity: 15,
    booked: 6,
    hue: '$success50',
    icon: <Dumbbell size={22} color="$success700" />,
    level: 'Intermediate',
  },
  {
    id: 'c4',
    name: 'Cardio Kickstart',
    trainer: 'Nour Ibrahim',
    category: 'Cardio',
    startsAt: Date.now() + 26 * 60 * 60 * 1000,
    durationMin: 40,
    room: 'Studio 1',
    capacity: 30,
    booked: 18,
    hue: '$danger50',
    icon: <Zap size={22} color="$danger" />,
    level: 'Beginner',
  },
  {
    id: 'c5',
    name: 'Reformer Pilates',
    trainer: 'Yasmin Khalid',
    category: 'Pilates',
    startsAt: Date.now() + 48 * 60 * 60 * 1000,
    durationMin: 55,
    room: 'Pilates Studio',
    capacity: 12,
    booked: 12,
    hue: '$info50',
    icon: <Sparkles size={22} color="$info700" />,
    level: 'Intermediate',
  },
  {
    id: 'c6',
    name: 'Sunrise Yoga',
    trainer: 'Maya Patel',
    category: 'Yoga',
    startsAt: Date.now() + 50 * 60 * 60 * 1000,
    durationMin: 60,
    room: 'Studio 2',
    capacity: 20,
    booked: 9,
    hue: '$brand50',
    icon: <Heart size={22} color="$brand" />,
    level: 'Beginner',
  },
  {
    id: 'c7',
    name: 'Boxing Conditioning',
    trainer: 'Reem Othman',
    category: 'HIIT',
    startsAt: Date.now() + 72 * 60 * 60 * 1000,
    durationMin: 45,
    room: 'Studio 1',
    capacity: 18,
    booked: 11,
    hue: '$warning50',
    icon: <Flame size={22} color="$warning" />,
    level: 'Advanced',
  },
];

const TRAINERS: TrainerItem[] = [
  {
    id: 't1',
    name: 'Maya Patel',
    specialty: 'Yoga & Mobility',
    rating: 4.9,
    reviewCount: 128,
    hourlyRate: 220,
    bio: 'Certified RYT-500 with 8 years of experience in vinyasa and restorative yoga.',
    certifications: ['RYT-500', 'Mobility Specialist'],
  },
  {
    id: 't2',
    name: 'Sara Al-Mansoori',
    specialty: 'HIIT & Conditioning',
    rating: 4.8,
    reviewCount: 96,
    hourlyRate: 250,
    bio: 'Former national athlete specializing in high-intensity training and fat loss.',
    certifications: ['NSCA-CPT', 'Precision Nutrition L1'],
  },
  {
    id: 't3',
    name: 'Layla Hassan',
    specialty: 'Strength & Hypertrophy',
    rating: 4.9,
    reviewCount: 142,
    hourlyRate: 280,
    bio: 'Powerlifting coach focused on building strength and lean muscle for women.',
    certifications: ['CSCS', 'USA Powerlifting L1'],
  },
  {
    id: 't4',
    name: 'Nour Ibrahim',
    specialty: 'Cardio & Endurance',
    rating: 4.7,
    reviewCount: 64,
    hourlyRate: 200,
    bio: 'Marathon runner and certified endurance coach with a friendly, motivating style.',
    certifications: ['ACE-CPT', 'RRCA'],
  },
  {
    id: 't5',
    name: 'Yasmin Khalid',
    specialty: 'Pilates & Posture',
    rating: 5.0,
    reviewCount: 78,
    hourlyRate: 240,
    bio: 'Pilates instructor with a background in physiotherapy and injury rehab.',
    certifications: ['BASI Pilates', 'Physiotherapy'],
  },
];

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

export default function BookScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('classes');
  const [category, setCategory] = useState<ClassCategory>('All');

  const filteredClasses =
    category === 'All' ? CLASSES : CLASSES.filter((c) => c.category === category);

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
              <Text variant="caption" color="muted">
                {filteredClasses.length} class{filteredClasses.length === 1 ? '' : 'es'} available
              </Text>
              {filteredClasses.map((cls) => (
                <ClassCard
                  key={cls.id}
                  cls={cls}
                  onPress={() => router.push(`/(member)/classes/${cls.id}`)}
                />
              ))}
            </YStack>
          </YStack>
        ) : (
          <YStack paddingHorizontal="$4" marginTop="$2" gap="$3">
            <Text variant="caption" color="muted">
              {TRAINERS.length} certified trainers
            </Text>
            {TRAINERS.map((trainer) => (
              <TrainerCard
                key={trainer.id}
                trainer={trainer}
                onPress={() => router.push('/(member)/trainers')}
              />
            ))}
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

function ClassCard({ cls, onPress }: { cls: ClassItem; onPress: () => void }) {
  const fillPct = (cls.booked / cls.capacity) * 100;
  const isFull = cls.booked >= cls.capacity;

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
            <Text variant="bodySmall" color="secondary">
              with {cls.trainer}
            </Text>
          </YStack>

          {/* Capacity */}
          <YStack gap="$1">
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap="$1">
                <Users size={14} color="$textMuted" />
                <Text variant="caption" color="muted">
                  {cls.booked}/{cls.capacity} booked
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
            label={isFull ? 'Join waitlist' : 'Book class'}
            variant={isFull ? 'outline' : 'primary'}
            size="md"
            fullWidth
            onPress={onPress}
            iconRight={!isFull ? <ChevronRight size={16} color="$textOnBrand" /> : undefined}
          />
        </YStack>
      </YStack>
    </Card>
  );
}

function TrainerCard({ trainer, onPress }: { trainer: TrainerItem; onPress: () => void }) {
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
          <Text variant="bodySmall" color="muted" numberOfLines={2}>
            {trainer.bio}
          </Text>
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
