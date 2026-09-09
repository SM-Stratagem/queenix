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
  Divider,
  Switch,
  useToast,
} from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import {
  Star,
  Edit3,
  Plus,
  Award,
  Bell,
  Calendar,
  FileText,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Globe,
  BadgeCheck,
} from '@tamagui/lucide-icons';

interface Certification {
  id: string;
  name: string;
  issuer: string;
  expires: string; // human-readable
  verified: boolean;
}

const mockCertifications: Certification[] = [
  {
    id: 'cert1',
    name: 'NASM Certified Personal Trainer',
    issuer: 'National Academy of Sports Medicine',
    expires: 'Mar 2027',
    verified: true,
  },
  {
    id: 'cert2',
    name: 'Pre & Postnatal Coaching',
    issuer: 'Girls Gone Strong',
    expires: 'Aug 2027',
    verified: true,
  },
  {
    id: 'cert3',
    name: 'Functional Range Conditioning',
    issuer: 'FRC Mobility Specialist',
    expires: 'Nov 2026',
    verified: false,
  },
];

export default function TrainerProfile() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);

  const firstName = session?.fullName?.split(' ')[0] ?? 'Maya';
  const fullName = session?.fullName ?? 'Maya Patel';

  const trainer = {
    name: fullName,
    role: 'Personal Trainer',
    rating: 4.9,
    reviews: 132,
    hourlyRate: 220,
    bio: 'Strength & conditioning coach with 8+ years of experience. I help women build confidence through progressive training, smart programming, and a supportive environment.',
    specialties: [
      'Strength training',
      'Pre/postnatal',
      'Fat loss',
      'Mobility',
      'Hypertrophy',
      'Athletic performance',
    ],
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Screen scroll padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header card */}
        <YStack paddingTop="$6" paddingHorizontal="$4" alignItems="center" gap="$2">
          <Avatar name={trainer.name} size="2xl" />
          <Text variant="h2" marginTop="$3">
            {trainer.name}
          </Text>
          <XStack gap="$2" alignItems="center" flexWrap="wrap" justifyContent="center">
            <Badge label={trainer.role} variant="brand" />
            <XStack
              alignItems="center"
              gap="$1"
              backgroundColor="$surfaceMuted"
              paddingHorizontal="$2.5"
              paddingVertical="$0.5"
              borderRadius="$full"
            >
              <Star size={12} color="$warning500" fill="$warning500" />
              <Text variant="caption" weight="600">
                {trainer.rating}
              </Text>
              <Text variant="caption" color="muted">
                ({trainer.reviews} reviews)
              </Text>
            </XStack>
          </XStack>
          <Text variant="bodySmall" color="muted">
            AED {trainer.hourlyRate}/hr
          </Text>
        </YStack>

        {/* Bio */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card variant="outlined">
            <YStack gap="$2">
              <Text variant="label">About</Text>
              <Text variant="body" color="secondary">
                {trainer.bio}
              </Text>
            </YStack>
          </Card>
        </YStack>

        {/* Specialties */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <Text variant="h4">Specialties</Text>
            <Text
              variant="bodySmall"
              color="brand"
              onPress={() => toast.info('Edit specialties')}
              accessibilityLabel="Edit specialties"
            >
              Edit
            </Text>
          </XStack>
          <XStack gap="$2" flexWrap="wrap">
            {trainer.specialties.map((s) => (
              <Chip key={s} label={s} variant="brand" />
            ))}
            <Chip
              label="+ Add"
              onPress={() => toast.info('Add specialty')}
              accessibilityLabel="Add a new specialty"
            />
          </XStack>
        </YStack>

        {/* Certifications */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <Text variant="h4">Certifications</Text>
            <Text variant="caption" color="muted">
              {mockCertifications.length} active
            </Text>
          </XStack>
          <Card variant="outlined" padding="sm">
            {mockCertifications.map((c, idx) => (
              <React.Fragment key={c.id}>
                <XStack
                  alignItems="center"
                  gap="$3"
                  paddingVertical="$3"
                  accessibilityLabel={`${c.name} from ${c.issuer}, expires ${c.expires}`}
                >
                  <YStack
                    backgroundColor={c.verified ? '$success50' : '$warning50'}
                    padding="$2.5"
                    borderRadius="$md"
                  >
                    {c.verified ? (
                      <ShieldCheck size={20} color="$success500" />
                    ) : (
                      <Award size={20} color="$warning500" />
                    )}
                  </YStack>
                  <YStack flex={1} gap="$0.5">
                    <Text variant="body" weight="500" numberOfLines={2}>
                      {c.name}
                    </Text>
                    <Text variant="caption" color="muted">
                      {c.issuer}
                    </Text>
                    <XStack alignItems="center" gap="$1.5" marginTop="$0.5">
                      <Text variant="caption" color="muted">
                        Expires {c.expires}
                      </Text>
                      {c.verified && (
                        <Badge
                          label="Verified"
                          variant="success"
                          size="sm"
                          icon={<BadgeCheck size={10} color="$success500" />}
                        />
                      )}
                    </XStack>
                  </YStack>
                  <XStack
                    onPress={() => toast.info('Edit certification')}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${c.name}`}
                    padding="$2"
                  >
                    <Edit3 size={16} color="$textMuted" />
                  </XStack>
                </XStack>
                {idx < mockCertifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
            <Divider />
            <XStack
              alignItems="center"
              gap="$3"
              paddingVertical="$3"
              onPress={() => toast.info('Add certification')}
              accessibilityRole="button"
              accessibilityLabel="Add a new certification"
            >
              <YStack
                backgroundColor="$brand50"
                padding="$2.5"
                borderRadius="$md"
              >
                <Plus size={20} color="$brand" />
              </YStack>
              <Text variant="body" weight="600" color="brand">
                Add certification
              </Text>
            </XStack>
          </Card>
        </YStack>

        {/* Edit profile */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Button
            label="Edit profile"
            variant="primary"
            size="lg"
            fullWidth
            icon={<Edit3 size={18} color="$textOnBrand" />}
            onPress={() => toast.info('Edit profile — coming soon')}
          />
        </YStack>

        {/* Settings */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <SettingsItem
            icon={<Bell size={20} color="$textPrimary" />}
            title="Notifications"
            subtitle="Bookings, payouts, reminders"
            onPress={() => toast.info('Notification settings')}
            right={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                accessibilityLabel="Toggle notifications"
              />
            }
          />
          <SettingsItem
            icon={<Calendar size={20} color="$textPrimary" />}
            title="Availability"
            subtitle="Working hours, recurring blocks"
            onPress={() => router.push('/(trainer)/schedule')}
          />
          <SettingsItem
            icon={<FileText size={20} color="$textPrimary" />}
            title="Documents"
            subtitle="Contracts, tax forms, ID"
            onPress={() => toast.info('Documents — coming soon')}
          />
          <SettingsItem
            icon={<Globe size={20} color="$textPrimary" />}
            title="Language & region"
            subtitle="English • UAE"
            onPress={() => toast.info('Language settings — coming soon')}
          />
        </YStack>

        {/* Auto-accept toggle */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card variant="outlined">
            <Switch
              label="Auto-accept bookings"
              description="Members can book your slots without confirmation"
              value={autoAccept}
              onValueChange={setAutoAccept}
            />
          </Card>
        </YStack>

        {/* Sign out */}
        <YStack paddingHorizontal="$4" marginTop="$6">
          <Button
            label="Sign out"
            onPress={handleSignOut}
            variant="danger"
            size="lg"
            fullWidth
            icon={<LogOut size={18} color="white" />}
          />
          <Text variant="caption" color="muted" align="center" marginTop="$3">
            Queenix Gym • Trainer app v1.0.0
          </Text>
        </YStack>
      </ScrollView>
    </Screen>
  );
}

function SettingsItem({
  icon,
  title,
  subtitle,
  onPress,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Card variant="outlined" padding="sm" onPress={onPress}>
      <XStack alignItems="center" gap="$3">
        <YStack backgroundColor="$surfaceMuted" padding="$2.5" borderRadius="$md">
          {icon}
        </YStack>
        <YStack flex={1}>
          <Text variant="body" weight="500">
            {title}
          </Text>
          {subtitle && (
            <Text variant="caption" color="muted">
              {subtitle}
            </Text>
          )}
        </YStack>
        {right ?? <ChevronRight size={18} color="$textMuted" />}
      </XStack>
    </Card>
  );
}
