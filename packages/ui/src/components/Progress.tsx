import React from 'react';
import { Progress as TamaguiProgress, XStack } from 'tamagui';

export interface ProgressProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  backgroundColor?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  size = 'md',
  color = '$brand',
  backgroundColor = '$surfaceMuted',
}) => {
  const height = size === 'sm' ? 4 : size === 'md' ? 8 : 12;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <TamaguiProgress
      value={clamped}
      height={height}
      backgroundColor={backgroundColor as any}
    >
      <TamaguiProgress.Indicator backgroundColor={color as any} animation="quick" />
    </TamaguiProgress>
  );
};
