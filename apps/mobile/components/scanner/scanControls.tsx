import React, { useRef } from "react"
import { CameraView, useCameraPermissions } from "expo-camera"
import { YStack, XStack } from "tamagui"
import { Card, Text, Button } from "@queenix/ui"
import {
  ScanLine,
  Camera,
  Search,
  DoorOpen,
} from "@tamagui/lucide-icons-2"
import { CornerBracket } from "./CornerBracket"

/**
 * Camera QR viewfinder (expo-camera — ships in Expo Go, no dev build needed).
 * Tapping starts/stops scanning and asks for camera permission on first use.
 */
export function ScannerViewfinder({
  scanning,
  handleToken,
  setScanning,
}: {
  scanning: boolean
  handleToken: (value: string) => void
  setScanning: (next: boolean) => void
}) {
  const [permission, requestPermission] = useCameraPermissions()
  const hasPermission = permission ? permission.granted : null
  // onBarcodeScanned fires every frame while a code is in view: one read per code per 3s.
  const last = useRef({ value: "", at: 0 })

  async function toggle() {
    if (!scanning && !permission?.granted) {
      const res = await requestPermission()
      if (!res.granted) return
    }
    setScanning(!scanning)
  }

  return (
    <YStack paddingHorizontal="$4" marginTop="$4" alignItems="center">
      <Card
        variant="elevated"
        padding="md"
        onPress={toggle}
        aria-label={scanning ? "Stop scanning" : "Start scanning"}
      >
        <YStack
          width={280}
          height={280}
          alignItems="center"
          justifyContent="center"
          position="relative"
        >
          {/* Outer frame */}
          <YStack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            borderWidth={3}
            borderColor={scanning ? "$brand" : "$borderColor"}
            borderRadius="$lg"
            backgroundColor="$surfaceMuted"
            overflow="hidden"
          />
          {hasPermission && scanning ? (
            <CameraView
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={({ data }) => {
                const now = Date.now()
                if (!data || (data === last.current.value && now - last.current.at < 3000)) return
                last.current = { value: data, at: now }
                handleToken(String(data))
              }}
            />
          ) : null}
          {/* Corner brackets */}
          <CornerBracket position="tl" />
          <CornerBracket position="tr" />
          <CornerBracket position="bl" />
          <CornerBracket position="br" />
          {!(hasPermission && scanning) && (
            <YStack alignItems="center" gap="$2" zIndex={2}>
              <YStack
                backgroundColor="$surface"
                padding="$3"
                borderRadius="$full"
                borderWidth={1}
                borderColor="$borderColor"
              >
                {scanning ? (
                  <Camera size={32} color="$brand" />
                ) : (
                  <ScanLine size={32} color="$textMuted" />
                )}
              </YStack>
              <Text variant="label" color={scanning ? "brand" : "muted"}>
                {hasPermission === false
                  ? "Camera unavailable"
                  : scanning
                    ? "Scanning…"
                    : "Tap to scan"}
              </Text>
              <Text variant="caption" color="muted" textAlign="center">
                {hasPermission === false
                  ? "Grant camera permission\nto enable scanning"
                  : scanning
                    ? "Hold member QR\nwithin the frame"
                    : "Camera is off"}
              </Text>
            </YStack>
          )}
        </YStack>
      </Card>
    </YStack>
  )
}

export function ScannerControls({
  direction,
  setDirection,
  manualToken,
  setManualToken,
  handleManualEntry,
  toast,
}: {
  direction: "in" | "out"
  setDirection: (d: "in" | "out") => void
  manualToken: string
  setManualToken: (v: string) => void
  handleManualEntry: () => void
  toast: any
}) {
  return (
    <YStack marginTop="$4" width={280} gap="$2">
      <XStack gap="$2">
        {(["in", "out"] as const).map((d) => (
          <YStack
            key={d}
            flex={1}
            paddingVertical="$2.5"
            alignItems="center"
            borderRadius="$md"
            backgroundColor={direction === d ? "$brand" : "$surfaceMuted"}
            onPress={() => setDirection(d)}
            role="button"
            aria-selected={direction === d}
            aria-label={`Set direction to ${d}`}
          >
            <Text
              variant="caption"
              weight="600"
              color={direction === d ? "inverse" : "muted"}
              textTransform="uppercase"
            >
              {d}
            </Text>
          </YStack>
        ))}
      </XStack>
      <XStack gap="$2" alignItems="center">
        <YStack
          flex={1}
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$md"
          paddingHorizontal="$3"
          paddingVertical="$2"
          backgroundColor="$surface"
        >
          <XStack alignItems="center" gap="$2">
            <Search size={16} color="$textMuted" />
            <YStack flex={1}>
              <Text variant="bodySmall" color={manualToken ? "primary" : "muted"}>
                {manualToken || "Manual token entry"}
              </Text>
            </YStack>
          </XStack>
        </YStack>
        <Button
          label="Submit"
          variant="primary"
          size="md"
          onPress={handleManualEntry}
          aria-label="Submit manual token"
        />
      </XStack>
      <Button
        label="Open main door"
        variant="outline"
        size="md"
        fullWidth
        icon={<DoorOpen size={18} color="$brand" />}
        onPress={() => toast.info("Door relay triggered")}
        aria-label="Manually open the main door"
      />
    </YStack>
  )
}
