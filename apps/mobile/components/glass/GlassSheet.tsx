import React from "react";
import { Modal, Platform, Pressable, StyleSheet, useColorScheme, useWindowDimensions } from "react-native";
import { View, YStack } from "tamagui";
import { BlurView } from "expo-blur";
import { Text } from "@queenix/ui";

type GlassSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  intensity?: number;
  testID?: string;
};

/**
 * Bottom sheet with frosted panel + dimmed scrim.
 * Controlled (open/onClose); no gesture-handler dependency.
 */
export function GlassSheet({ open, onClose, title, children, intensity = 70, testID }: GlassSheetProps) {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  const { height } = useWindowDimensions();
  const panelBg = dark ? "rgba(24,24,32,0.72)" : "rgba(255,255,255,0.72)";

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable testID={testID} style={styles.scrim} onPress={onClose} accessibilityLabel="Close sheet" />
      <YStack justifyContent="flex-end" flex={1} pointerEvents="box-none">
        <View
          style={[
            styles.panel,
            {
              maxHeight: height * 0.85,
              backgroundColor: Platform.OS === "android" ? panelBg : undefined,
              borderColor: dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.7)",
              elevation: 8,
            },
          ]}
        >
          {Platform.OS !== "android" ? (
            <BlurView intensity={intensity} tint={dark ? "dark" : "light"} style={[StyleSheet.absoluteFill, styles.radius]} />
          ) : null}
          <YStack
            backgroundColor={Platform.OS === "android" ? "transparent" : panelBg}
            borderRadius={24}
            padding="$4"
            gap="$3"
          >
            <YStack alignItems="center">
              <View style={styles.handle} />
            </YStack>
            {title ? (
              <Text variant="h3" align="center">
                {title}
              </Text>
            ) : null}
            {children}
          </YStack>
        </View>
      </YStack>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: "hidden",
  },
  radius: { borderRadius: 24 },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(128,128,128,0.55)",
  },
});
