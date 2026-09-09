import React from 'react';
import { Pressable as RNPressable, PressableProps, View, ViewStyle, StyleProp } from 'react-native';

export interface AppPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

export const Pressable: React.FC<AppPressableProps> = ({
  style,
  children,
  onPress,
  disabled,
  ...props
}) => {
  return (
    <RNPressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        style as any,
        { opacity: pressed && !disabled ? 0.7 : 1 },
      ]}
      {...props}
    >
      {children}
    </RNPressable>
  );
};
