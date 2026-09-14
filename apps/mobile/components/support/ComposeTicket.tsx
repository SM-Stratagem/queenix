import React from "react"
import { YStack, XStack } from "tamagui"
import {
  Text,
  Card,
  Avatar,
  Input,
  Sheet,
  Button,
} from "@queenix/ui"
import { Search, X, Check } from "@tamagui/lucide-icons"
import type { Member } from "./MemberRow"

export function MemberSearchInput({
  selectedMember,
  query,
  onChangeQuery,
  suggestions,
  onPickSuggestion,
}: {
  selectedMember: Member | null
  query: string
  onChangeQuery: (v: string) => void
  suggestions: Member[]
  onPickSuggestion: (m: Member) => void
}) {
  return (
    <YStack gap="$1">
      <Text variant="caption" color="secondary" fontWeight="600">
        Member
      </Text>
      <Input
        placeholder="Search member name or ID"
        value={selectedMember?.name ?? query}
        onChangeText={(v: string) => onChangeQuery(v)}
        leftIcon={<Search size={16} color="$textMuted" />}
        accessibilityLabel="Member name or ID"
      />
      {query.length > 0 && !selectedMember && (
        <YStack gap="$1" marginTop="$1">
          {suggestions.slice(0, 4).map((m) => (
            <Card
              key={m.id}
              variant="outlined"
              padding="sm"
              onPress={() => onPickSuggestion(m)}
            >
              <XStack alignItems="center" gap="$2">
                <Avatar name={m.name} size="sm" fallbackColor="$brand" />
                <YStack flex={1}>
                  <Text variant="label" numberOfLines={1}>
                    {m.name}
                  </Text>
                  <Text variant="caption" color="muted">
                    {m.tier} • {m.visits} visits
                  </Text>
                </YStack>
                <Text variant="caption" color="brand" weight="600">
                  {m.id}
                </Text>
              </XStack>
            </Card>
          ))}
        </YStack>
      )}
    </YStack>
  )
}

export function ComposeTicketSheet({
  open,
  onOpenChange,
  selectedMember,
  onClearSelected,
  memberQuery,
  onChangeQuery,
  suggestions,
  onPickSuggestion,
  subject,
  onChangeSubject,
  category,
  onChangeCategory,
  priority,
  onChangePriority,
  categories,
  priorities,
  onSubmit,
  isCreating,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  selectedMember: Member | null
  onClearSelected: () => void
  memberQuery: string
  onChangeQuery: (v: string) => void
  suggestions: Member[]
  onPickSuggestion: (m: Member) => void
  subject: string
  onChangeSubject: (v: string) => void
  category: string
  onChangeCategory: (v: string) => void
  priority: string
  onChangePriority: (v: string) => void
  categories: string[]
  priorities: string[]
  onSubmit: () => void
  isCreating: boolean
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <YStack gap="$3">
        <YStack gap="$0.5" marginBottom="$1">
          <Text variant="h2">New support ticket</Text>
          <Text variant="bodySmall" color="secondary">
            Logged for operations follow-up
          </Text>
        </YStack>

        {selectedMember ? (
          <Card variant="outlined" padding="sm">
            <XStack alignItems="center" gap="$2">
              <Avatar name={selectedMember.name} size="sm" fallbackColor="$brand" />
              <YStack flex={1}>
                <Text variant="label">{selectedMember.name}</Text>
                <Text variant="caption" color="muted">
                  {selectedMember.tier} • {selectedMember.visits} visits
                </Text>
              </YStack>
              <Button
                label="Change"
                variant="ghost"
                size="sm"
                onPress={onClearSelected}
              />
            </XStack>
          </Card>
        ) : (
          <MemberSearchInput
            selectedMember={selectedMember}
            query={memberQuery}
            onChangeQuery={onChangeQuery}
            suggestions={suggestions}
            onPickSuggestion={onPickSuggestion}
          />
        )}

        <YStack gap="$1">
          <Text variant="caption" color="secondary" fontWeight="600">
            Subject
          </Text>
          <Input
            placeholder="Short summary"
            value={subject}
            onChangeText={(v: string) => onChangeSubject(v)}
            accessibilityLabel="Ticket subject"
          />
        </YStack>

        <XStack gap="$2">
          <YStack flex={1} gap="$1">
            <Text variant="caption" color="secondary" fontWeight="600">
              Category
            </Text>
            <YStack flexDirection="row" gap="$1" flexWrap="wrap">
              {categories.map((c) => (
                <Button
                  key={c}
                  label={c}
                  size="sm"
                  variant={category === c ? "primary" : "outline"}
                  onPress={() => onChangeCategory(c)}
                />
              ))}
            </YStack>
          </YStack>
        </XStack>

        <XStack gap="$2">
          <YStack flex={1} gap="$1">
            <Text variant="caption" color="secondary" fontWeight="600">
              Priority
            </Text>
            <YStack flexDirection="row" gap="$1" flexWrap="wrap">
              {priorities.map((p) => (
                <Button
                  key={p}
                  label={p}
                  size="sm"
                  variant={priority === p ? "primary" : "outline"}
                  onPress={() => onChangePriority(p)}
                />
              ))}
            </YStack>
          </YStack>
        </XStack>

        <XStack gap="$2" marginTop="$2">
          <Button
            label="Cancel"
            variant="outline"
            flex={1}
            icon={<X size={16} color="$textPrimary" />}
            onPress={() => onOpenChange(false)}
          />
          <Button
            label="Create ticket"
            variant="primary"
            flex={1}
            icon={<Check size={16} color="$textOnBrand" />}
            onPress={onSubmit}
            loading={isCreating}
          />
        </XStack>
      </YStack>
    </Sheet>
  )
}
