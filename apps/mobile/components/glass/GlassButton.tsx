import React from "react";
import { Platform, Pressable, StyleSheet, useColorScheme, type GestureResponderEvent } from "react-native";
import { View } from "tamagui";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Text } from "@queenix/ui";

type GlassButtonProps = {
  label: string;
  onPress: (e: GestureResponderEvent) => void;
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  haptic?: boolean;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
  testID?: string;
};

/**
 * Frosted pill button. Primary = brand-tinted glass; ghost = neutral glass.
 * Android: translucent fill + elevation, no BlurView.
 */
export function GlassButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  haptic = true,
  leftIcon,
  fullWidth = false,
  testID,
}: GlassButtonProps) {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  const height = size === "sm" ? 38 : 48;
  const primary = variant === "primary";
  const bg = primary
    ? dark
      ? "rgba(236,72,153,0.35)"
      : "rgba(236,72,153,0.22)"
    : dark
      ? "rgba(255,255,255,0.12)"
      : "rgba(255,255,255,0.55)";

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    if (haptic && Platform.OS !== "web") {
      void Haptics.selectionAsync().catch(() => undefined);
    }
    onPress(e);
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.pressable,
        fullWidth && styles.fullWidth,
        { opacity: disabled ? 0.5 : pressed ? 0.82 : 1 },
      ]}
    >
      <View
        style={[
          styles.shell,
          {
            height,
            borderRadius: height / 2,
            backgroundColor: Platform.OS === "android" ? bg : undefined,
            borderColor: primary ? "rgba(236,72,153,0.45)" : dark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.7)",
          },
        ]}
      >
        {Platform.OS !== "android" ? (
          <BlurView intensity={60} tint={dark ? "dark" : "light"} style={[StyleSheet.absoluteFill, { borderRadius: height / 2 }]} />
        ) : null}
        <View style={[styles.inner, { backgroundColor: Platform.OS === "android" ? "transparent" : bg }]}>
          {leftIcon}
          <Text variant="label" color={primary ? "brand" : "primary"} align="center">
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { alignSelf: "flex-start" },
  fullWidth: { alignSelf: "stretch" },
  shell: {
    borderWidth: 1,
    overflow: "hidden",
    elevation: 3,
  },
  inner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
  },
});
