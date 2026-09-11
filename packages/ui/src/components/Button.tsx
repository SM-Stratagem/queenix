import React from 'react';
import { Button as TamaguiButton, Spinner, styled, type ViewProps } from 'tamagui';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export type ButtonProps = Omit<ViewProps, "variant" | "size"> & {
  label?: string;
  onPress?: () => void;
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
}

const StyledButton = styled(TamaguiButton, {
  name: 'QueenixButton',
  borderRadius: '$lg',
  fontWeight: '600',
  pressStyle: { opacity: 0.85, scale: 0.98 },
  variants: {
    variant: {
      primary: {
        backgroundColor: '$brand',
        color: '$textOnBrand',
        borderColor: '$brand',
        hoverStyle: { backgroundColor: '$brandHover' },
        pressStyle: { backgroundColor: '$brandPress' },
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
    },
    size: {
      sm: {
        height: 36,
        paddingHorizontal: '$3',
        fontSize: '$sm',
      },
      md: {
        height: 44,
        paddingHorizontal: '$4',
        fontSize: '$base',
      },
      lg: {
        height: 52,
        paddingHorizontal: '$5',
        fontSize: '$md',
      },
      xl: {
        height: 60,
        paddingHorizontal: '$6',
        fontSize: '$lg',
      },
    },
    fullWidth: {
      true: { width: '100%' },
    },
    disabled: {
      true: { opacity: 0.5, pointerEvents: 'none' },
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

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
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      onPress={onPress}
      testID={testID}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
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
    </StyledButton>
  );
};
