import React from "react"
import { YStack, XStack } from "tamagui"
import { Text, Card } from "@queenix/ui"
import { Wifi, WifiOff, AlertTriangle } from "@tamagui/lucide-icons"

export type ScannerStatus = "online" | "offline" | "unknown"

export function ScannerStatusBanner({ status }: { status: ScannerStatus }) {
  const bg =
    status === "online"
      ? "$success50"
      : status === "offline"
        ? "$danger50"
        : "$surfaceMuted"
  const description =
    status === "online"
      ? "Front door is being handled automatically. Camera mode is the backup."
      : status === "offline"
        ? "Use the camera scanner below. Hardware scanner needs a power-cycle."
        : "Waiting for first heartbeat from the hardware scanner."

  return (
    <YStack paddingHorizontal="$4" marginTop="$2">
      <Card
        variant="outlined"
        padding="sm"
        backgroundColor={bg}
        accessibilityLabel={`Hardware scanner ${status}`}
      >
        <XStack alignItems="center" gap="$2">
          {status === "online" ? (
            <Wifi size={16} color="$success" />
          ) : status === "offline" ? (
            <WifiOff size={16} color="$danger" />
          ) : (
            <AlertTriangle size={16} color="$warning" />
          )}
          <Text variant="label" weight="600">
            Hardware scanner:{" "}
            {status === "online"
              ? "Online"
              : status === "offline"
                ? "Offline"
                : "Unknown"}
          </Text>
        </XStack>
        <Text variant="caption" color="muted" marginTop="$1">
          {description}
        </Text>
      </Card>
    </YStack>
  )
}
