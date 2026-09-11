import React, { useState, useEffect } from 'react';
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
  Input,
  Sheet,
  Switch,
  Skeleton,
  useToast,
} from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';
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
  X,
} from '@tamagui/lucide-icons';

interface Certification {
  name: string;
  issuer: string;
  issuedAt: number;
  expiresAt?: number;
  documentUrl?: string;
}

const SUGGESTED_SPECIALTIES = [
  'Strength training',
  'Pre/postnatal',
  'Fat loss',
  'Mobility',
  'Hypertrophy',
  'Athletic performance',
  'Pilates',
  'Yoga',
  'HIIT',
  'Rehab',
  'Powerlifting',
  'CrossFit',
];

export default function TrainerProfile() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addCertOpen, setAddCertOpen] = useState(false);

  const profileQuery = useConvexQuery(api.queries.users.getMyTrainerProfile, {});
  const isLoading = profileQuery === undefined;
  const profile = profileQuery ?? null;

  const updateProfile = useConvexMutation(api.mutations.users.updateTrainerProfile);
  const addCertification = useConvexMutation(api.mutations.users.addTrainerCertification);

  const fullName = session?.fullName ?? 'Trainer';

  // Edit form state
  const [bioDraft, setBioDraft] = useState('');
  const [rateDraft, setRateDraft] = useState('');
  const [specialtiesDraft, setSpecialtiesDraft] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setBioDraft(profile.bio ?? '');
      setRateDraft((profile.hourlyRateCents / 100).toFixed(0));
      setSpecialtiesDraft(profile.specialties ?? []);
    }
  }, [profile]);

  const toggleSpecialty = (s: string) => {
    setSpecialtiesDraft((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleSaveProfile = async () => {
    const rateCents = Math.round(parseFloat(rateDraft || '0') * 100);
    try {
      await updateProfile({
        bio: bioDraft,
        hourlyRateCents: isNaN(rateCents) ? 0 : rateCents,
        specialties: specialtiesDraft,
        currency: 'AED',
      });
      toast.show('Profile updated', 'success');
      setEditOpen(false);
    } catch (e: any) {
      toast.show(e?.message ?? 'Failed to update', 'error');
    }
  };

  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');

  const handleAddCert = async () => {
    if (!certName.trim() || !certIssuer.trim()) {
      toast.show('Name and issuer are required', 'warning');
      return;
    }
    try {
      await addCertification({
        name: certName.trim(),
        issuer: certIssuer.trim(),
        issuedAt: Date.now(),
      });
      toast.show('Certification added', 'success');
      setCertName('');
      setCertIssuer('');
      setAddCertOpen(false);
    } catch (e: any) {
      toast.show(e?.message ?? 'Failed to add certification', 'error');
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const specialties = profile?.specialties ?? [];
  const certifications: Certification[] = profile?.certifications ?? [];
  const hourlyRateAED = (profile?.hourlyRateCents ?? 0) / 100;
  const rating = profile?.rating ?? 0;
  const reviewCount = profile?.reviewCount ?? 0;
  const bio = profile?.bio ?? '';
  const currency = profile?.currency ?? 'AED';

  return (
    <Screen scroll padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header card */}
        <YStack paddingTop="$6" paddingHorizontal="$4" alignItems="center" gap="$2">
          <Avatar name={fullName} size="2xl" />
          <Text variant="h2" marginTop="$3">
            {fullName}
          </Text>
          <XStack gap="$2" alignItems="center" flexWrap="wrap" justifyContent="center">
            <Badge label="Personal Trainer" variant="brand" />
            {reviewCount > 0 && (
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
                  {rating.toFixed(1)}
                </Text>
                <Text variant="caption" color="muted">
                  ({reviewCount} reviews)
                </Text>
              </XStack>
            )}
          </XStack>
          {isLoading ? (
            <Skeleton width={80} height={20} />
          ) : (
            <Text variant="bodySmall" color="muted">
              {currency} {hourlyRateAED}/hr
            </Text>
          )}
        </YStack>

        {/* Bio */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          {isLoading ? (
            <Skeleton height={80} borderRadius="$md" />
          ) : (
            <Card variant="outlined">
              <YStack gap="$2">
                <Text variant="label">About</Text>
                <Text variant="body" color="secondary">
                  {bio || 'Add a short bio so members can get to know you.'}
                </Text>
              </YStack>
            </Card>
          )}
        </YStack>

        {/* Specialties */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <Text variant="h4">Specialties</Text>
            <Text
              variant="bodySmall"
              color="brand"
              onPress={() => setEditOpen(true)}
              accessibilityLabel="Edit specialties"
            >
              Edit
            </Text>
          </XStack>
          {isLoading ? (
            <XStack gap="$2">
              <Skeleton width={80} height={28} borderRadius="$full" />
              <Skeleton width={100} height={28} borderRadius="$full" />
              <Skeleton width={90} height={28} borderRadius="$full" />
            </XStack>
          ) : (
            <XStack gap="$2" flexWrap="wrap">
              {specialties.length === 0 ? (
                <Text variant="bodySmall" color="muted">
                  No specialties yet — tap Edit to add some.
                </Text>
              ) : (
                specialties.map((s: string) => (
                  <Chip key={s} label={s} variant="brand" />
                ))
              )}
            </XStack>
          )}
        </YStack>

        {/* Certifications */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <Text variant="h4">Certifications</Text>
            <Text variant="caption" color="muted">
              {certifications.length} active
            </Text>
          </XStack>
          {isLoading ? (
            <Card variant="outlined" padding="sm">
              <Skeleton height={60} borderRadius="$md" />
            </Card>
          ) : (
            <Card variant="outlined" padding="sm">
              {certifications.length === 0 ? (
                <YStack alignItems="center" padding="$4" gap="$2">
                  <Text variant="bodySmall" color="muted" align="center">
                    No certifications added yet.
                  </Text>
                </YStack>
              ) : (
                certifications.map((c: Certification, idx: number) => (
                  <React.Fragment key={`${c.name}-${c.issuedAt}`}>
                    <XStack
                      alignItems="center"
                      gap="$3"
                      paddingVertical="$3"
                      accessibilityLabel={`${c.name} from ${c.issuer}`}
                    >
                      <YStack backgroundColor="$success50" padding="$2.5" borderRadius="$md">
                        <ShieldCheck size={20} color="$success500" />
                      </YStack>
                      <YStack flex={1} gap="$0.5">
                        <Text variant="body" weight="500" numberOfLines={2}>
                          {c.name}
                        </Text>
                        <Text variant="caption" color="muted">
                          {c.issuer}
                        </Text>
                        {c.expiresAt && (
                          <Text variant="caption" color="muted">
                            Expires {new Date(c.expiresAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                          </Text>
                        )}
                      </YStack>
                      <Badge label="Active" variant="success" size="sm" />
                    </XStack>
                    {idx < certifications.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
              <Divider />
              <XStack
                alignItems="center"
                gap="$3"
                paddingVertical="$3"
                onPress={() => setAddCertOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Add a new certification"
              >
                <YStack backgroundColor="$brand50" padding="$2.5" borderRadius="$md">
                  <Plus size={20} color="$brand" />
                </YStack>
                <Text variant="body" weight="600" color="brand">
                  Add certification
                </Text>
              </XStack>
            </Card>
          )}
        </YStack>

        {/* Edit profile */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Button
            label="Edit profile"
            variant="primary"
            size="lg"
            fullWidth
            icon={<Edit3 size={18} color="$textOnBrand" />}
            onPress={() => setEditOpen(true)}
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

      {/* Edit profile sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen} snapPoints={[85]}>
        <YStack gap="$3" paddingTop="$2">
          <XStack alignItems="center" justifyContent="space-between">
            <Text variant="h3">Edit profile</Text>
            <XStack
              onPress={() => setEditOpen(false)}
              padding="$2"
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={20} color="$textMuted" />
            </XStack>
          </XStack>
          <ScrollView showsVerticalScrollIndicator={false}>
            <YStack gap="$3" paddingBottom="$6">
              <YStack gap="$1">
                <Text variant="label">Bio</Text>
                <YStack
                  backgroundColor="$surfaceMuted"
                  borderRadius="$md"
                  paddingHorizontal="$3"
                  paddingVertical="$2"
                  borderWidth={1}
                  borderColor="$borderColor"
                  minHeight={100}
                >
                  <Input
                    placeholder="Tell members about you"
                    value={bioDraft}
                    onChangeText={setBioDraft}
                    multiline
                    numberOfLines={4}
                    accessibilityLabel="Bio"
                  />
                </YStack>
              </YStack>

              <YStack gap="$1">
                <Text variant="label">Hourly rate (AED)</Text>
                <Input
                  placeholder="220"
                  value={rateDraft}
                  onChangeText={setRateDraft}
                  keyboardType="numeric"
                  accessibilityLabel="Hourly rate"
                />
              </YStack>

              <YStack gap="$1">
                <Text variant="label">Specialties</Text>
                <XStack gap="$2" flexWrap="wrap">
                  {SUGGESTED_SPECIALTIES.map((s) => (
                    <Chip
                      key={s}
                      label={s}
                      selected={specialtiesDraft.includes(s)}
                      onPress={() => toggleSpecialty(s)}
                    />
                  ))}
                </XStack>
                <Text variant="caption" color="muted">
                  {specialtiesDraft.length} selected
                </Text>
              </YStack>

              <Button
                label="Save changes"
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleSaveProfile}
              />
            </YStack>
          </ScrollView>
        </YStack>
      </Sheet>

      {/* Add certification sheet */}
      <Sheet open={addCertOpen} onOpenChange={setAddCertOpen} snapPoints={[60]}>
        <YStack gap="$3" paddingTop="$2">
          <XStack alignItems="center" justifyContent="space-between">
            <Text variant="h3">Add certification</Text>
            <XStack
              onPress={() => setAddCertOpen(false)}
              padding="$2"
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={20} color="$textMuted" />
            </XStack>
          </XStack>
          <YStack gap="$3">
            <YStack gap="$1">
              <Text variant="label">Certification name</Text>
              <Input
                placeholder="NASM Certified Personal Trainer"
                value={certName}
                onChangeText={setCertName}
                accessibilityLabel="Certification name"
              />
            </YStack>
            <YStack gap="$1">
              <Text variant="label">Issuer</Text>
              <Input
                placeholder="National Academy of Sports Medicine"
                value={certIssuer}
                onChangeText={setCertIssuer}
                accessibilityLabel="Issuer"
              />
            </YStack>
            <Text variant="caption" color="muted">
              Your cert will be marked as Pending until verified by the owner.
            </Text>
            <Button
              label="Add certification"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleAddCert}
            />
          </YStack>
        </YStack>
      </Sheet>
    </Screen>
  );
}

