import React from 'react';
import { Image, ImageProps, View } from 'tamagui';
import { Text } from './Text';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

const sizeMap = {
  sm: { height: 24, fontSize: '$sm' as const },
  md: { height: 32, fontSize: '$lg' as const },
  lg: { height: 48, fontSize: '$xl' as const },
  xl: { height: 64, fontSize: '$2xl' as const },
};

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = false }) => {
  const { height, fontSize } = sizeMap[size];
  return (
    <View flexDirection="row" alignItems="center" gap="$2">
      <Image
        source={require('../../../../assets/logo/logo.jpg')}
        height={height}
        width={height}
        resizeMode="contain"
        accessibilityLabel="Queenix Gym logo"
      />
      {showText && (
        <Text variant="h2" color="brand" fontSize={fontSize}>
          Queenix
        </Text>
      )}
    </View>
  );
};
