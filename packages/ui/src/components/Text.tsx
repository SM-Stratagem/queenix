import React, { PropsWithChildren } from 'react';
import { Text as TamaguiText } from 'tamagui';

type Variant =
  | 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'heading' | 'title'
  | 'body' | 'bodySmall' | 'caption' | 'label' | 'mono';

export type TextColor =
  | 'primary' | 'secondary' | 'muted' | 'brand'
  | 'inverse' | 'success' | 'warning' | 'danger';

export interface TextProps {
  variant?: Variant;
  // Semantic names map to theme tokens; raw theme tokens ('$textSecondary')
  // and plain colors pass through untouched.
  color?: TextColor | (string & {});
  weight?: '400' | '500' | '600' | '700' | '800' | 'bold' | 'normal';
  align?: 'left' | 'center' | 'right';
  children?: React.ReactNode;
  numberOfLines?: number;
  maxWidth?: number;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: string;
  fontSize?: string | number;
  size?: string | number;
  onPress?: (event: any) => void;
  accessibilityLabel?: string;
  flex?: number;
  marginTop?: React.ComponentProps<typeof TamaguiText>['marginTop'];
  marginBottom?: React.ComponentProps<typeof TamaguiText>['marginBottom'];
  textTransform?: string;
  width?: number;
  textDecorationLine?: string;
}

const variantMap: Record<Variant, { fontSize: any; lineHeight: any; weight: any }> = {
  display: { fontSize: '$5xl', lineHeight: '$5xl' as any, weight: '800' },
  h1: { fontSize: '$4xl', lineHeight: '$4xl' as any, weight: '700' },
  h2: { fontSize: '$3xl', lineHeight: '$3xl' as any, weight: '700' },
  h3: { fontSize: '$2xl', lineHeight: '$2xl' as any, weight: '600' },
  heading: { fontSize: '$2xl', lineHeight: '$2xl' as any, weight: '600' },
  h4: { fontSize: '$xl', lineHeight: '$xl' as any, weight: '600' },
  title: { fontSize: '$xl', lineHeight: 28, weight: '700' },
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
  numberOfLines,
  maxWidth,
  textAlign,
  fontWeight,
  fontSize,
  size,
  onPress,
  accessibilityLabel,
  flex,
  marginTop,
  marginBottom,
  textTransform,
  width,
  textDecorationLine,
}) => {
  const v = variantMap[variant];
  const resolvedColor = (colorMap as Record<string, string>)[color] ?? color;
  const resolvedWeight = fontWeight ?? (weight === 'bold' ? '700' : weight === 'normal' ? '400' : weight) ?? v.weight;
  return (
    <TamaguiText
      fontSize={fontSize ?? size ?? v.fontSize}
      lineHeight={v.lineHeight}
      fontWeight={resolvedWeight}
      color={resolvedColor as any}
      textAlign={textAlign ?? align}
      numberOfLines={numberOfLines}
      maxWidth={maxWidth}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      flex={flex}
      marginTop={marginTop}
      marginBottom={marginBottom}
      textTransform={textTransform as any}
      width={width}
      textDecorationLine={textDecorationLine as any}
    >
      {children}
    </TamaguiText>
  );
};
