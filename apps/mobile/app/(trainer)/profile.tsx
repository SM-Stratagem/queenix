import React, { useState, useEffect } from "react";
import { YStack, ScrollView } from "tamagui";
import { useRouter } from "expo-router";
import {
  Screen,
  Text,
  Card,
  Button,
  Switch,
  Skeleton,
  useToast,
} from "@queenix/ui";
import { useAuth } from "@/lib/auth";
import { useConvexQuery, useConvexMutation } from "@/lib/convex";
import { api } from "@queenix/convex";
import {
  Edit3,
  Bell,
  Calendar,
  FileText,
  Globe,
  LogOut,
} from "@tamagui/lucide-icons";
import { SettingsItem } from "@/components/trainer-profile/SettingsItem";
import {
  ProfileHeader,
  BioCard,
  SpecialtiesSection,
} from "@/components/trainer-profile/ProfileHeader";
import {
  CertificationsSection,
  EditProfileSheet,
  AddCertificationSheet,
  type Certification,
} from "@/components/trainer-profile/ProfileSections";

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

  const fullName = session?.fullName ?? "Trainer";

  const [bioDraft, setBioDraft] = useState("");
  const [rateDraft, setRateDraft] = useState("");
  const [specialtiesDraft, setSpecialtiesDraft] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setBioDraft(profile.bio ?? "");
      setRateDraft((profile.hourlyRateCents / 100).toFixed(0));
      setSpecialtiesDraft(profile.specialties ?? []);
    }
  }, [profile]);

  const toggleSpecialty = (s: string) => {
    setSpecialtiesDraft((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const handleSaveProfile = async () => {
    const rateCents = Math.round(parseFloat(rateDraft || "0") * 100);
    try {
      await updateProfile({
        bio: bioDraft,
        hourlyRateCents: isNaN(rateCents) ? 0 : rateCents,
        specialties: specialtiesDraft,
        currency: "AED",
      });
      toast.show("Profile updated", "success");
      setEditOpen(false);
    } catch (e: any) {
      toast.show(e?.message ?? "Failed to update", "error");
    }
  };

  const [certName, setCertName] = useState("");
  const [certIssuer, setCertIssuer] = useState("");

  const handleAddCert = async () => {
    if (!certName.trim() || !certIssuer.trim()) {
      toast.show("Name and issuer are required", "warning");
      return;
    }
    try {
      await addCertification({
        name: certName.trim(),
        issuer: certIssuer.trim(),
        issuedAt: Date.now(),
      });
      toast.show("Certification added", "success");
      setCertName("");
      setCertIssuer("");
      setAddCertOpen(false);
    } catch (e: any) {
      toast.show(e?.message ?? "Failed to add certification", "error");
    }
  };

  const specialties = profile?.specialties ?? [];
  const certifications: Certification[] = profile?.certifications ?? [];
  const hourlyRateAED = (profile?.hourlyRateCents ?? 0) / 100;
  const rating = profile?.rating ?? 0;
  const reviewCount = profile?.reviewCount ?? 0;
  const bio = profile?.bio ?? "";
  const currency = profile?.currency ?? "AED";

  return (
    <Screen scroll padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <ProfileHeader
          fullName={fullName}
          reviewCount={reviewCount}
          rating={rating}
          hourlyRate={hourlyRateAED}
          currency={currency}
          isLoading={isLoading}
        />

        <BioCard bio={bio} isLoading={isLoading} />

        <SpecialtiesSection
          specialties={specialties}
          isLoading={isLoading}
          onEdit={() => setEditOpen(true)}
        />

        <CertificationsSection
          certs={certifications}
          isLoading={isLoading}
          onAdd={() => setAddCertOpen(true)}
        />

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

        <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <SettingsItem
            icon={<Bell size={20} color="$textPrimary" />}
            title="Notifications"
            subtitle="Bookings, payouts, reminders"
            onPress={() => toast.info("Notification settings")}
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
            onPress={() => router.push("/(trainer)/schedule")}
          />
          <SettingsItem
            icon={<FileText size={20} color="$textPrimary" />}
            title="Documents"
            subtitle="Contracts, tax forms, ID"
            onPress={() => toast.info("Documents — coming soon")}
          />
          <SettingsItem
            icon={<Globe size={20} color="$textPrimary" />}
            title="Language & region"
            subtitle="English • UAE"
            onPress={() => toast.info("Language settings — coming soon")}
          />
        </YStack>

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

        <YStack paddingHorizontal="$4" marginTop="$6">
          <Button
            label="Sign out"
            onPress={() => signOut()}
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

      <EditProfileSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        bioDraft={bioDraft}
        onBioChange={setBioDraft}
        rateDraft={rateDraft}
        onRateChange={setRateDraft}
        specialtiesDraft={specialtiesDraft}
        onToggleSpecialty={toggleSpecialty}
        onSave={handleSaveProfile}
      />
      <AddCertificationSheet
        open={addCertOpen}
        onClose={() => setAddCertOpen(false)}
        name={certName}
        onNameChange={setCertName}
        issuer={certIssuer}
        onIssuerChange={setCertIssuer}
        onSave={handleAddCert}
      />
    </Screen>
  );
}
