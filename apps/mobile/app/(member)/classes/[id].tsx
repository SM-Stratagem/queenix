import React, { useMemo, useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Avatar,
  Button,
  Badge,
  Chip,
  Progress,
  Divider,
  Spacer,
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
  Star,
  ChevronRight,
  Award,
  CheckCircle2,
} from '@tamagui/lucide-icons';

type ClassCategory = 'HIIT' | 'Yoga' | 'Strength' | 'Cardio' | 'Pilates';

interface ClassDetail {
  id: string;
  name: string;
  category: ClassCategory;
  description: string;
  longDescription: string;
  trainerName: string;
  trainerBio: string;
  trainerYears: number;
  trainerId: string;
  startsAt: number;
  durationMin: number;
  room: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  capacity: number;
  booked: number;
  hue: string;
  iconColor: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  benefits: string[];
}

const CLASSES: ClassDetail[] = [
  {
    id: 'c1',
    name: 'Power Yoga Flow',
    category: 'Yoga',
    description: 'A dynamic vinyasa flow that builds strength and flexibility.',
    longDescription:
      'Power Yoga Flow combines traditional vinyasa sequencing with strength-building postures. Each class is set to an energizing playlist and moves through sun salutations, standing flows, balance work, and deep stretching. Suitable for anyone with some yoga experience looking to deepen their practice.',
    trainerName: 'Maya Patel',
    trainerBio: 'Certified RYT-500 with 8 years of experience in vinyasa and restorative yoga. Maya believes movement is medicine.',
    trainerYears: 8,
    trainerId: 't1',
    startsAt: Date.now() + 2 * 60 * 60 * 1000,
    durationMin: 60,
    room: 'Studio 2',
    level: 'Intermediate',
    capacity: 20,
    booked: 14,
    hue: '$brand50',
    iconColor: '$brand',
    Icon: Heart,
    benefits: [
      'Improves flexibility and balance',
      'Builds functional core strength',
      'Reduces stress and supports recovery',
    ],
  },
  {
    id: 'c2',
    name: 'HIIT Burner',
    category: 'HIIT',
    description: '45 minutes of high-intensity intervals to torch calories.',
    longDescription:
      'HIIT Burner is a fast-paced, calorie-torching class built around 30-second work intervals and 15-second rest. Expect burpees, kettlebell swings, jump squats, and sled pushes. Modifications are offered for every movement, so all levels are welcome.',
    trainerName: 'Sara Al-Mansoori',
    trainerBio: 'Former national athlete specializing in high-intensity training and fat loss. Sara brings energy and structure to every session.',
    trainerYears: 6,
    trainerId: 't2',
    startsAt: Date.now() + 4 * 60 * 60 * 1000,
    durationMin: 45,
    room: 'Studio 1',
    capacity: 25,
    booked: 22,
    hue: '$warning50',
    iconColor: '$warning',
    Icon: Flame,
    benefits: [
      'Burns up to 500 calories per class',
      'Boosts metabolism for 24h after',
      'Builds explosive power',
    ],
  },
  {
    id: 'c3',
    name: 'Strength Lab',
    category: 'Strength',
    description: 'Compound lifts, progressive overload, and accessory work.',
    longDescription:
      'Strength Lab follows a structured block periodized around the big lifts: squat, bench, deadlift, and overhead press. Each class includes a warm-up, a main lift working up to a heavy set, and accessory work targeting weak points.',
    trainerName: 'Layla Hassan',
    trainerBio: 'Powerlifting coach focused on building strength and lean muscle for women. Layla programs with intention and progressions.',
    trainerYears: 10,
    trainerId: 't3',
    startsAt: Date.now() + 24 * 60 * 60 * 1000,
    durationMin: 50,
    room: 'Weight Room',
    level: 'Intermediate',
    capacity: 15,
    booked: 6,
    hue: '$success50',
    iconColor: '$success700',
    Icon: Dumbbell,
    benefits: [
      'Builds lean muscle and bone density',
      'Improves everyday functional strength',
      'Programs for long-term progress',
    ],
  },
  {
    id: 'c4',
    name: 'Cardio Kickstart',
    category: 'Cardio',
    description: 'Beginner-friendly cardio circuits to build endurance.',
    longDescription:
      'Cardio Kickstart is built for newcomers. You will move through walking, jogging, rowing, and bike intervals at a sustainable pace. The coach will explain form, breathing, and heart rate zones so you leave knowing how to train on your own.',
    trainerName: 'Nour Ibrahim',
    trainerBio: 'Marathon runner and certified endurance coach with a friendly, motivating style.',
    trainerYears: 5,
    trainerId: 't4',
    startsAt: Date.now() + 26 * 60 * 60 * 1000,
    durationMin: 40,
    room: 'Studio 1',
    level: 'Beginner',
    capacity: 30,
    booked: 18,
    hue: '$danger50',
    iconColor: '$danger',
    Icon: Zap,
    benefits: [
      'Builds aerobic base',
      'Improves heart health',
      'Friendly intro to group training',
    ],
  },
  {
    id: 'c5',
    name: 'Reformer Pilates',
    category: 'Pilates',
    description: 'Low-impact, high-control reformer work for posture and core.',
    longDescription:
      'Reformer Pilates uses the reformer machine to deliver spring-resistance training that is gentle on the joints but intense for the core. Expect slow, controlled movements focused on posture, alignment, and deep abdominal activation.',
    trainerName: 'Yasmin Khalid',
    trainerBio: 'Pilates instructor with a background in physiotherapy and injury rehab.',
    trainerYears: 7,
    trainerId: 't5',
    startsAt: Date.now() + 48 * 60 * 60 * 1000,
    durationMin: 55,
    room: 'Pilates Studio',
    level: 'Intermediate',
    capacity: 12,
    booked: 12,
    hue: '$info50',
    iconColor: '$info700',
    Icon: Sparkles,
    benefits: [
      'Improves posture and alignment',
      'Builds deep core stability',
      'Supports injury rehab',
    ],
  },
  {
    id: 'c6',
    name: 'Sunrise Yoga',
    category: 'Yoga',
    description: 'A gentle morning flow to wake up the body.',
    longDescription:
      'Sunrise Yoga is a slow, mindful flow designed to gently wake the body and breath. Expect longer holds, supportive postures, and a guided meditation to close. Ideal for beginners and a perfect start to the day.',
    trainerName: 'Maya Patel',
    trainerBio: 'Certified RYT-500 with 8 years of experience in vinyasa and restorative yoga.',
    trainerYears: 8,
    trainerId: 't1',
    startsAt: Date.now() + 50 * 60 * 60 * 1000,
    durationMin: 60,
    room: 'Studio 2',
    level: 'Beginner',
    capacity: 20,
    booked: 9,
    hue: '$brand50',
    iconColor: '$brand',
    Icon: Heart,
    benefits: [
      'Eases morning stiffness',
      'Sets a calm tone for the day',
      'Beginner-friendly',
    ],
  },
  {
    id: 'c7',
    name: 'Boxing Conditioning',
    category: 'HIIT',
    description: 'Boxing drills, footwork, and conditioning circuits.',
    longDescription:
      'Boxing Conditioning mixes bag work, mitt drills, footwork ladders, and short conditioning circuits. No sparring — this is about rhythm, power, and cardio. Gloves provided, hand wraps recommended.',
    trainerName: 'Reem Othman',
    trainerBio: 'Former competitive boxer and certified strength coach.',
    trainerYears: 9,
    trainerId: 't6',
    startsAt: Date.now() + 72 * 60 * 60 * 1000,
    durationMin: 45,
    room: 'Studio 1',
    level: 'Advanced',
    capacity: 18,
    booked: 11,
    hue: '$warning50',
    iconColor: '$warning',
    Icon: Flame,
    benefits: [
      'Builds power and coordination',
      'Sharpens reflexes and focus',
      'Cardio without the treadmill',
    ],
  },
];

const RELATED: Array<{ id: string; name: string; category: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = [
  { id: 'c1', name: 'Power Yoga Flow', category: 'Yoga', Icon: Heart },
  { id: 'c3', name: 'Strength Lab', category: 'Strength', Icon: Dumbbell },
  { id: 'c4', name: 'Cardio Kickstart', category: 'Cardio', Icon: Zap },
];

const REVIEWS: Array<{ name: string; rating: number; text: string; when: string }> = [
  {
    name: 'Aisha R.',
    rating: 5,
    text: 'Loved every minute. The coach corrected my form and pushed me just enough.',
    when: '2 days ago',
  },
  {
    name: 'Mariam K.',
    rating: 5,
    text: 'Best class I have taken in Dubai. Worth the membership on its own.',
    when: '1 week ago',
  },
  {
    name: 'Hala S.',
    rating: 4,
    text: 'Great class, felt a bit rushed at peak. Will book again.',
    when: '2 weeks ago',
  },
];

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

export default function ClassDetailScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id: string }>();
  const [isBooked, setIsBooked] = useState(false);

  const cls = useMemo(
    () => CLASSES.find((c) => c.id === params.id) ?? CLASSES[0],
    [params.id]
  );

  const fillPct = (cls.booked / cls.capacity) * 100;
  const isFull = cls.booked >= cls.capacity;
  const Icon = cls.Icon;

  const handleBook = () => {
    if (isFull && !isBooked) {
      toast.success('Added to waitlist — we will notify you if a spot opens');
    } else {
      setIsBooked(true);
      toast.success(`Booked ${cls.name}`);
    }
  };

  return (
    <Screen scroll padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <YStack
          height={240}
          backgroundColor={cls.hue as any}
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
            <Icon size={48} color={cls.iconColor as any} />
          </YStack>
          <Badge label={cls.category} variant="brand" />
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
            <Badge label={cls.level} variant="neutral" />
          </XStack>
          <Text variant="h1">{cls.name}</Text>
          <Text variant="body" color="secondary">
            {cls.description}
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
                label={`${cls.durationMin} min`}
                sub="Duration"
              />
              <InfoItem
                icon={<MapPin size={18} color="$brand" />}
                label={cls.room}
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
                  {cls.booked} of {cls.capacity} booked
                </Text>
              </YStack>
              <Text
                variant="caption"
                weight="600"
                color={isFull ? 'danger' : fillPct > 80 ? 'warning' : 'success'}
              >
                {isFull ? 'Full' : `${cls.capacity - cls.booked} spots left`}
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
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <Text variant="h3">About this class</Text>
          <Text variant="body" color="secondary">
            {cls.longDescription}
          </Text>
        </YStack>

        {/* Benefits */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          <Text variant="h3">What you will get</Text>
          <Card variant="filled" padding="md">
            <YStack gap="$2">
              {cls.benefits.map((b, i) => (
                <XStack key={i} alignItems="center" gap="$2">
                  <CheckCircle2 size={18} color="$success500" />
                  <Text variant="body" color="primary" flex={1}>
                    {b}
                  </Text>
                </XStack>
              ))}
            </YStack>
          </Card>
        </YStack>

        {/* Trainer */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          <Text variant="h3">About the trainer</Text>
          <Card
            variant="outlined"
            padding="md"
            onPress={() => router.push('/(member)/trainers')}
            accessibilityLabel={`View ${cls.trainerName} profile`}
          >
            <XStack gap="$3" alignItems="flex-start">
              <Avatar name={cls.trainerName} size="lg" />
              <YStack flex={1} gap="$1">
                <XStack alignItems="center" justifyContent="space-between" gap="$2">
                  <Text variant="h4">{cls.trainerName}</Text>
                  <XStack alignItems="center" gap="$1">
                    <Award size={14} color="$brand" />
                    <Text variant="caption" color="brand" weight="600">
                      {cls.trainerYears} yrs
                    </Text>
                  </XStack>
                </XStack>
                <Text variant="caption" color="muted">
                  Coach
                </Text>
                <Text variant="bodySmall" color="secondary" marginTop="$1">
                  {cls.trainerBio}
                </Text>
                <XStack alignItems="center" gap="$1" marginTop="$2">
                  <Text variant="caption" color="brand" weight="600">
                    View full profile
                  </Text>
                  <ChevronRight size={14} color="$brand" />
                </XStack>
              </YStack>
            </XStack>
          </Card>
        </YStack>

        {/* Reviews */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="h3">Reviews</Text>
            <Text variant="bodySmall" color="brand" weight="600">
              See all
            </Text>
          </XStack>
          <YStack gap="$2">
            {REVIEWS.map((r, i) => (
              <Card key={i} variant="outlined" padding="md">
                <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
                  <XStack alignItems="center" gap="$2">
                    <Avatar name={r.name} size="sm" />
                    <YStack>
                      <Text variant="label">{r.name}</Text>
                      <Text variant="caption" color="muted">
                        {r.when}
                      </Text>
                    </YStack>
                  </XStack>
                  <XStack alignItems="center" gap="$1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        size={12}
                        color="$warning500"
                        fill={idx < r.rating ? '$warning500' : 'transparent'}
                      />
                    ))}
                  </XStack>
                </XStack>
                <Text variant="bodySmall" color="secondary">
                  {r.text}
                </Text>
              </Card>
            ))}
          </YStack>
        </YStack>

        {/* Related */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          <Text variant="h3">You might also like</Text>
          <YStack gap="$2">
            {RELATED.map((r) => {
              const RIcon = r.Icon;
              return (
                <Card
                  key={r.id}
                  variant="outlined"
                  padding="sm"
                  onPress={() => router.push(`/(member)/classes/${r.id}`)}
                  accessibilityLabel={`Open ${r.name}`}
                >
                  <XStack alignItems="center" gap="$3">
                    <YStack
                      backgroundColor="$brand50"
                      padding="$2.5"
                      borderRadius="$md"
                    >
                      <RIcon size={20} color="$brand" />
                    </YStack>
                    <YStack flex={1}>
                      <Text variant="label">{r.name}</Text>
                      <Text variant="caption" color="muted">
                        {r.category}
                      </Text>
                    </YStack>
                    <ChevronRight size={18} color="$textMuted" />
                  </XStack>
                </Card>
              );
            })}
          </YStack>
        </YStack>
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
            isBooked
              ? 'Booked — see you there'
              : isFull
                ? 'Join waitlist'
                : 'Book this class'
          }
          variant={isBooked ? 'secondary' : isFull ? 'outline' : 'primary'}
          size="lg"
          fullWidth
          onPress={handleBook}
          disabled={isBooked}
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
