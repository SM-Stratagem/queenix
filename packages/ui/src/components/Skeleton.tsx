import React, { useEffect } from 'react';
import { View, type ViewProps } from 'tamagui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export type SkeletonProps = ViewProps & {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  circle?: boolean;
  flex?: number;
  marginTop?: number | string;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  circle = false,
  flex,
  marginTop,
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedView
      width={width as any}
      height={(circle ? width : height) as any}
      borderRadius={(circle ? 9999 : borderRadius) as any}
      backgroundColor="$surfaceMuted"
      flex={flex}
      marginTop={marginTop as any}
      style={animatedStyle}
    />
  );
};
