import React from 'react';
import { Avatar as TamaguiAvatar, Text, View } from 'tamagui';

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fallbackColor?: string;
}

const sizeMap = {
  xs: { size: 24, fontSize: 10 },
  sm: { size: 32, fontSize: 12 },
  md: { size: 40, fontSize: 14 },
  lg: { size: 56, fontSize: 18 },
  xl: { size: 80, fontSize: 28 },
  '2xl': { size: 120, fontSize: 40 },
} as const;

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = '',
  size = 'md',
  fallbackColor = '$brand',
}) => {
  const { size: dim, fontSize } = sizeMap[size];
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <TamaguiAvatar
      size={dim}
      circular
      backgroundColor={fallbackColor}
      borderWidth={0}
    >
      {src ? (
        <TamaguiAvatar.Image src={src} accessibilityLabel={name} />
      ) : (
        <Text color="$textOnBrand" fontSize={fontSize} fontWeight="600">
          {initials || '?'}
        </Text>
      )}
    </TamaguiAvatar>
  );
};
