import React from "react";
import { Platform, StyleSheet, useColorScheme, type ViewStyle } from "react-native";
import { View, YStack, type YStackProps } from "tamagui";
import { BlurView } from "expo-blur";

type GlassCardProps = YStackProps & {
  children: React.ReactNode;
  intensity?: number;
  radius?: number;
  style?: ViewStyle;
  testID?: string;
};

const LIGHT_TINT = "rgba(255,255,255,0.55)";
const DARK_TINT = "rgba(20,20,28,0.55)";

/**
 * iOS-first liquid-glass card. iOS: real blur. Android/web: translucent
 * background + elevation (no native blur where unsupported).
 */
export function GlassCard({
  children,
  intensity = 70,
  radius = 22,
  style,
  testID,
  ...rest
}: GlassCardProps) {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  const fallbackBg = dark ? DARK_TINT : LIGHT_TINT;

  if (Platform.OS === "android") {
    return (
      <YStack
        testID={testID}
        borderRadius={radius}
        backgroundColor={fallbackBg}
        borderWidth={1}
        borderColor={dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.65)"}
        elevation={4}
        shadowColor="rgba(0,0,0,0.18)"
        shadowRadius={16}
        shadowOpacity={1}
        shadowOffset={{ width: 0, height: 8 }}
        padding="$4"
        overflow="hidden"
        style={style as ViewStyle}
        {...rest}
      >
        {children}
      </YStack>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        styles.shell,
        { borderRadius: radius, borderColor: dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.65)" },
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={dark ? "dark" : "light"}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <YStack
        borderRadius={radius}
        borderWidth={1}
        borderColor={dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.65)"}
        backgroundColor={fallbackBg}
        padding="$4"
        overflow="hidden"
        {...rest}
      >
        {children}
      </YStack>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: 1,
    overflow: "hidden",
  },
});
