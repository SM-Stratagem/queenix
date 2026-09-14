import React from "react"
import { YStack, XStack } from "tamagui"
import { Card, Text, Avatar, Badge, Skeleton, Chip } from "@queenix/ui"
import { Star } from "@tamagui/lucide-icons"

export function ProfileHeader({
  fullName,
  reviewCount,
  rating,
  hourlyRate,
  currency,
  isLoading,
}: {
  fullName: string
  reviewCount: number
  rating: number
  hourlyRate: number
  currency: string
  isLoading: boolean
}) {
  return (
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
          {currency} {hourlyRate}/hr
        </Text>
      )}
    </YStack>
  )
}

export function BioCard({ bio, isLoading }: { bio: string; isLoading: boolean }) {
  if (isLoading) {
    return (
      <YStack paddingHorizontal="$4" marginTop="$4">
        <Skeleton height={80} />
      </YStack>
    )
  }
  return (
    <YStack paddingHorizontal="$4" marginTop="$4">
      <Card variant="outlined">
        <YStack gap="$2">
          <Text variant="label">About</Text>
          <Text variant="body" color="secondary">
            {bio || "Add a short bio so members can get to know you."}
          </Text>
        </YStack>
      </Card>
    </YStack>
  )
}

export function SpecialtiesSection({
  specialties,
  isLoading,
  onEdit,
}: {
  specialties: string[]
  isLoading: boolean
  onEdit: () => void
}) {
  return (
    <YStack paddingHorizontal="$4" marginTop="$4">
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        <Text variant="h4">Specialties</Text>
        <Text
          variant="bodySmall"
          color="brand"
          onPress={onEdit}
          accessibilityLabel="Edit specialties"
        >
          Edit
        </Text>
      </XStack>
      {isLoading ? (
        <XStack gap="$2">
          <Skeleton width={80} height={28} />
          <Skeleton width={100} height={28} />
          <Skeleton width={90} height={28} />
        </XStack>
      ) : (
        <XStack gap="$2" flexWrap="wrap">
          {specialties.length === 0 ? (
            <Text variant="bodySmall" color="muted">
              No specialties yet — tap Edit to add some.
            </Text>
          ) : (
            specialties.map((s) => <Chip key={s} label={s} variant="brand" />)
          )}
        </XStack>
      )}
    </YStack>
  )
}
