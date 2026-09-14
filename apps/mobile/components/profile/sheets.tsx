import React from "react"
import { YStack, XStack } from "tamagui"
import { Card, Text, Button, Sheet } from "@queenix/ui"
import { Check, X } from "@tamagui/lucide-icons"

export function HandoverSheet({
  open,
  onOpenChange,
  value,
  onChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  value: string
  onChange: (next: string) => void
  onSave: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <YStack gap="$3">
        <YStack gap="$0.5" marginBottom="$1">
          <Text variant="h2">Handover notes</Text>
          <Text variant="bodySmall" color="secondary">
            Visible to the next shift
          </Text>
        </YStack>
        <YStack gap="$1">
          <Text variant="caption" color="secondary" fontWeight="600">
            Notes
          </Text>
          <YStack
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius="$md"
            padding="$3"
            backgroundColor="$surface"
            minHeight={160}
          >
            <textarea
              value={value}
              onChange={(e: any) => onChange(e.target.value)}
              placeholder="Anything the next team should know…"
              style={{
                width: "100%",
                minHeight: 140,
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 14,
                color: "inherit",
                fontFamily: "inherit",
                resize: "none",
              }}
              aria-label="Handover note text"
            />
          </YStack>
        </YStack>
        <XStack gap="$2">
          <Button
            label="Discard"
            variant="outline"
            size="md"
            flex={1}
            icon={<X size={16} color="$textPrimary" />}
            onPress={() => onOpenChange(false)}
            accessibilityLabel="Discard handover note"
          />
          <Button
            label="Save note"
            variant="primary"
            size="md"
            flex={1}
            icon={<Check size={16} color="$textOnBrand" />}
            onPress={onSave}
            accessibilityLabel="Save handover note"
          />
        </XStack>
      </YStack>
    </Sheet>
  )
}

export type RoleMeta = {
  key: string
  label: string
  description: string
  icon: React.ReactNode
}

export function RoleSwitcherSheet({
  open,
  onOpenChange,
  roles,
  activeRole,
  availableRoles,
  onSwitch,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  roles: RoleMeta[]
  activeRole: string
  availableRoles: string[]
  onSwitch: (roleKey: string) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <YStack gap="$3">
        <YStack gap="$0.5" marginBottom="$1">
          <Text variant="h2">Switch role</Text>
          <Text variant="bodySmall" color="secondary">
            Pick which dashboard to open
          </Text>
        </YStack>
        {roles.map((r) => {
          const hasRole = availableRoles.includes(r.key)
          const active = activeRole === r.key
          return (
            <Card
              key={r.key}
              variant={active ? "elevated" : "outlined"}
              padding="md"
              backgroundColor={active ? "$brand50" : undefined}
              onPress={() => hasRole && onSwitch(r.key)}
              accessibilityLabel={`Switch to ${r.label} role`}
              accessibilityState={{ disabled: !hasRole }}
            >
              <XStack alignItems="center" gap="$3">
                <YStack
                  backgroundColor={active ? "$brand" : "$surfaceMuted"}
                  padding="$2.5"
                  borderRadius="$md"
                >
                  {r.icon}
                </YStack>
                <YStack flex={1}>
                  <Text variant="label" weight="600">
                    {r.label}
                    {active ? " (current)" : ""}
                  </Text>
                  <Text variant="caption" color="muted">
                    {r.description}
                  </Text>
                  {!hasRole && (
                    <Text variant="caption" color="warning">
                      Not enabled on your account
                    </Text>
                  )}
                </YStack>
                {active && <Check size={18} color="$brand" />}
              </XStack>
            </Card>
          )
        })}
      </YStack>
    </Sheet>
  )
}
