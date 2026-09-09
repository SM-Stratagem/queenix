import React, { useEffect } from 'react';
import { View } from 'tamagui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  circle?: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  circle = false,
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
      width={width}
      height={circle ? width : height}
      borderRadius={circle ? 9999 : borderRadius}
      backgroundColor="$surfaceMuted"
      style={animatedStyle}
    />
  );
};
