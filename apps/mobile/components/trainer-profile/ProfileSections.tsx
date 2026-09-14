import React from "react"
import { YStack, XStack } from "tamagui"
import { Card, Text, Badge, Chip, Skeleton, Divider, Input, Button, Sheet } from "@queenix/ui"
import { ShieldCheck, Plus, X } from "@tamagui/lucide-icons"

export type Certification = {
  name: string
  issuer: string
  issuedAt: number
  expiresAt?: number
  documentUrl?: string
}

export function CertificationsSection({
  certs,
  isLoading,
  onAdd,
}: {
  certs: Certification[]
  isLoading: boolean
  onAdd: () => void
}) {
  if (isLoading) {
    return (
      <YStack paddingHorizontal="$4" marginTop="$4">
        <Card variant="outlined" padding="sm">
          <Skeleton height={60} />
        </Card>
      </YStack>
    )
  }
  return (
    <YStack paddingHorizontal="$4" marginTop="$4">
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        <Text variant="h4">Certifications</Text>
        <Text variant="caption" color="muted">
          {certs.length} active
        </Text>
      </XStack>
      <Card variant="outlined" padding="sm">
        {certs.length === 0 ? (
          <YStack alignItems="center" padding="$4" gap="$2">
            <Text variant="bodySmall" color="muted" align="center">
              No certifications added yet.
            </Text>
          </YStack>
        ) : (
          certs.map((c, idx) => (
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
                      Expires{" "}
                      {new Date(c.expiresAt).toLocaleDateString("en-GB", {
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  )}
                </YStack>
                <Badge label="Active" variant="success" size="sm" />
              </XStack>
              {idx < certs.length - 1 && <Divider />}
            </React.Fragment>
          ))
        )}
        <Divider />
        <XStack
          alignItems="center"
          gap="$3"
          paddingVertical="$3"
          onPress={onAdd}
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
    </YStack>
  )
}

export const SUGGESTED_SPECIALTIES = [
  "Strength training",
  "Pre/postnatal",
  "Fat loss",
  "Mobility",
  "Hypertrophy",
  "Athletic performance",
  "Pilates",
  "Yoga",
  "HIIT",
  "Rehab",
  "Powerlifting",
  "CrossFit",
]

export function EditProfileSheet({
  open,
  onClose,
  bioDraft,
  onBioChange,
  rateDraft,
  onRateChange,
  specialtiesDraft,
  onToggleSpecialty,
  onSave,
}: {
  open: boolean
  onClose: () => void
  bioDraft: string
  onBioChange: (next: string) => void
  rateDraft: string
  onRateChange: (next: string) => void
  specialtiesDraft: string[]
  onToggleSpecialty: (s: string) => void
  onSave: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()} snapPoints={[85]}>
      <YStack gap="$3" paddingTop="$2">
        <XStack alignItems="center" justifyContent="space-between">
          <Text variant="h3">Edit profile</Text>
          <XStack
            onPress={onClose}
            padding="$2"
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={20} color="$textMuted" />
          </XStack>
        </XStack>
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
                onChangeText={onBioChange}
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
              onChangeText={onRateChange}
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
                  onPress={() => onToggleSpecialty(s)}
                />
              ))}
            </XStack>
            <Text variant="caption" color="muted">
              {specialtiesDraft.length} selected
            </Text>
          </YStack>
          <Button label="Save changes" variant="primary" size="lg" fullWidth onPress={onSave} />
        </YStack>
      </YStack>
    </Sheet>
  )
}

export function AddCertificationSheet({
  open,
  onClose,
  name,
  onNameChange,
  issuer,
  onIssuerChange,
  onSave,
}: {
  open: boolean
  onClose: () => void
  name: string
  onNameChange: (next: string) => void
  issuer: string
  onIssuerChange: (next: string) => void
  onSave: () => void
}) {
  if (!open) return null
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <YStack gap="$3">
        <Text variant="h3">Add certification</Text>
        <Input
          placeholder="e.g. NASM CPT"
          value={name}
          onChangeText={onNameChange}
          accessibilityLabel="Certification name"
        />
        <Input
          placeholder="Issuing body"
          value={issuer}
          onChangeText={onIssuerChange}
          accessibilityLabel="Issuing body"
        />
        <Button label="Add certification" variant="primary" onPress={onSave} fullWidth />
      </YStack>
    </Sheet>
  )
}
