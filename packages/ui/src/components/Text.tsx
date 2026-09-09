import React, { PropsWithChildren } from 'react';
import { Text as TamaguiText, TextProps as TamaguiTextProps } from 'tamagui';

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySmall' | 'caption' | 'label' | 'mono';

export interface TextProps extends Omit<TamaguiTextProps, 'children'> {
  variant?: Variant;
  color?: 'primary' | 'secondary' | 'muted' | 'brand' | 'inverse' | 'success' | 'warning' | 'danger';
  weight?: '400' | '500' | '600' | '700' | '800';
  align?: 'left' | 'center' | 'right';
}

const variantMap: Record<Variant, { fontSize: any; lineHeight: any; weight: any }> = {
  display: { fontSize: '$5xl', lineHeight: '$5xl' as any, weight: '800' },
  h1: { fontSize: '$4xl', lineHeight: '$4xl' as any, weight: '700' },
  h2: { fontSize: '$3xl', lineHeight: '$3xl' as any, weight: '700' },
  h3: { fontSize: '$2xl', lineHeight: '$2xl' as any, weight: '600' },
  h4: { fontSize: '$xl', lineHeight: '$xl' as any, weight: '600' },
  body: { fontSize: '$base', lineHeight: 24, weight: '400' },
  bodySmall: { fontSize: '$sm', lineHeight: 20, weight: '400' },
  caption: { fontSize: '$xs', lineHeight: 16, weight: '500' },
  label: { fontSize: '$sm', lineHeight: 20, weight: '600' },
  mono: { fontSize: '$sm', lineHeight: 20, weight: '400' },
};

const colorMap = {
  primary: '$textPrimary',
  secondary: '$textSecondary',
  muted: '$textMuted',
  brand: '$textBrand',
  inverse: '$textInverse',
  success: '$textSuccess',
  warning: '$textWarning',
  danger: '$textDanger',
};

export const Text: React.FC<PropsWithChildren<TextProps>> = ({
  variant = 'body',
  color = 'primary',
  weight,
  align,
  children,
  ...props
}) => {
  const v = variantMap[variant];
  return (
    <TamaguiText
      fontSize={v.fontSize}
      lineHeight={v.lineHeight}
      fontWeight={weight ?? v.weight}
      color={colorMap[color]}
      textAlign={align}
      {...props}
    >
      {children}
    </TamaguiText>
  );
};
