import React from 'react';
import { View } from 'tamagui';

export const Divider: React.FC<{ vertical?: boolean; thickness?: number; color?: string }> = ({
  vertical = false,
  thickness = 1,
  color = '$borderColor',
}) => {
  return (
    <View
      backgroundColor={color as any}
      width={vertical ? thickness : '100%'}
      height={vertical ? '100%' : thickness}
    />
  );
};
