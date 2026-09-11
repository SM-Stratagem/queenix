import React from 'react';
import { View, type ViewProps } from 'tamagui';

export type DividerProps = ViewProps & {
  vertical?: boolean
  thickness?: number
  color?: string
}

export const Divider: React.FC<DividerProps> = ({
  vertical = false,
  thickness = 1,
  color = '$borderColor',
  ...rest
}) => {
  return (
    <View
      backgroundColor={color as any}
      width={vertical ? thickness : '100%'}
      height={vertical ? '100%' : thickness}
      {...rest}
    />
  )
}
