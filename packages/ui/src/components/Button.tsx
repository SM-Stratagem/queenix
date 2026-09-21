import React from 'react';
import { Button as TamaguiButton, Spinner } from 'tamagui';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export type ButtonProps = {
  label?: string;
  onPress?: (event: any) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  flex?: number;
  marginTop?: React.ComponentProps<typeof TamaguiButton>['marginTop'];
}

const variantStyles: Record<ButtonVariant, Record<string, unknown>> = {
  primary: {
    backgroundColor: '$brand',
    color: '$textOnBrand',
    borderColor: '$brand',
  },
  secondary: {
    backgroundColor: '$surfaceMuted',
    color: '$textPrimary',
    borderColor: '$borderColor',
  },
  outline: {
    backgroundColor: 'transparent',
    color: '$textBrand',
    borderWidth: 1.5,
    borderColor: '$brand',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: '$textPrimary',
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: '$danger',
    color: 'white',
    borderColor: '$danger',
  },
};

const sizeStyles: Record<ButtonSize, Record<string, unknown>> = {
  sm: { height: 36, paddingHorizontal: '$3', fontSize: '$sm' },
  md: { height: 44, paddingHorizontal: '$4', fontSize: '$base' },
  lg: { height: 52, paddingHorizontal: '$5', fontSize: '$md' },
  xl: { height: 60, paddingHorizontal: '$6', fontSize: '$lg' },
};

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  icon,
  iconRight,
  children,
  testID,
  accessibilityLabel,
  flex,
  marginTop,
}) => {
  const isDisabled = disabled || loading;
  return (
    <TamaguiButton
      borderRadius="$lg"
      fontWeight="600"
      pressStyle={{ opacity: 0.85, scale: 0.98 }}
      {...variantStyles[variant]}
      {...(variant === 'primary'
        ? {
            hoverStyle: { backgroundColor: '$brandHover' },
            pressStyle: { backgroundColor: '$brandPress' },
          }
        : null)}
      {...sizeStyles[size]}
      {...(fullWidth ? { width: '100%' } : null)}
      {...(isDisabled ? { opacity: 0.5, pointerEvents: 'none' as const } : null)}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      flex={flex}
      marginTop={marginTop}
    >
      {loading ? (
        <Spinner color="currentColor" size="small" />
      ) : (
        <>
          {icon && <>{icon}</>}
          {label && <>{label}</>}
          {children}
          {iconRight && <>{iconRight}</>}
        </>
      )}
    </TamaguiButton>
  );
};
