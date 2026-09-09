import React from 'react';
import { View } from 'tamagui';

export interface SpacerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  horizontal?: boolean;
}

const sizeMap = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const Spacer: React.FC<SpacerProps> = ({ size = 'md', horizontal = false }) => {
  return (
    <View
      width={horizontal ? sizeMap[size] : 'auto'}
      height={horizontal ? 'auto' : sizeMap[size]}
    />
  );
};
