import React from "react";
import { Platform, StyleSheet, useColorScheme } from "react-native";
import { View, XStack, YStack } from "tamagui";
import { BlurView } from "expo-blur";
import { Text, Logo } from "@queenix/ui";

type GlassHeaderProps = {
  title: string;
  subtitle?: string;
  greeting?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  intensity?: number;
  testID?: string;
};

/**
 * Sticky-style frosted header. Drop-in replacement for the XStack
 * title rows on member screens. No navigation side effects.
 */
export function GlassHeader({
  title,
  subtitle,
  greeting,
  left,
  right,
  intensity = 80,
  testID,
}: GlassHeaderProps) {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  const fallbackBg = dark ? "rgba(20,20,28,0.6)" : "rgba(255,255,255,0.6)";

  const content = (
    <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$3">
      <YStack flex={1}>
        {greeting ? (
          <Text variant="caption" color="muted">
            {greeting}
          </Text>
        ) : null}
        <Text variant="h2">{title}</Text>
        {subtitle ? (
          <Text variant="bodySmall" color="secondary">
            {subtitle}
          </Text>
        ) : null}
      </YStack>
      {left}
      {right ?? <Logo size="sm" />}
    </XStack>
  );

  if (Platform.OS === "android") {
    return (
      <YStack
        testID={testID}
        backgroundColor={fallbackBg}
        borderBottomWidth={1}
        borderBottomColor={dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)"}
        elevation={2}
      >
        {content}
      </YStack>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.shell,
        { borderBottomColor: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)" },
      ]}
    >
      <BlurView intensity={intensity} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      <YStack backgroundColor={fallbackBg}>{content}</YStack>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderBottomWidth: 1,
    overflow: "hidden",
  },
});
