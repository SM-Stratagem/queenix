import React, { forwardRef } from 'react';
import { Input as TamaguiInput, View, XStack, YStack, Label, Text } from 'tamagui';
import { Eye, EyeOff } from '@tamagui/lucide-icons';

type TamaguiInputProps = React.ComponentProps<typeof TamaguiInput>;

export interface InputProps extends Omit<TamaguiInputProps, 'size' | 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  size?: 'sm' | 'md' | 'lg';
  width?: TamaguiInputProps['width'];
  textAlign?: TamaguiInputProps['textAlign'];
}

export const Input = forwardRef<React.ElementRef<typeof TamaguiInput>, InputProps>(({
  label,
  error,
  hint,
  required,
  leftIcon,
  rightIcon,
  isPassword,
  size = 'md',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const isSecure = isPassword && !showPassword;

  const heightMap = { sm: 40, md: 48, lg: 56 };
  const fontSizeMap = { sm: 14, md: 16, lg: 18 };

  return (
    <YStack gap="$1.5" width="100%">
      {label && (
        <XStack gap="$1" alignItems="center">
          <Label color="$textPrimary" fontSize="$sm" fontWeight="500">
            {label}
          </Label>
          {required && <Text color="$danger" fontSize="$sm">*</Text>}
        </XStack>
      )}
      <XStack
        alignItems="center"
        backgroundColor="$background"
        borderColor={error ? '$danger' : '$borderColor'}
        borderWidth={1}
        borderRadius="$lg"
        paddingHorizontal="$3"
        height={heightMap[size]}
        focusStyle={{ borderColor: error ? '$danger' : '$brand' }}
      >
        {leftIcon && <View marginRight="$2">{leftIcon}</View>}
        <TamaguiInput
          ref={ref}
          unstyled
          flex={1}
          fontSize={fontSizeMap[size]}
          color="$textPrimary"
          placeholderTextColor="$placeholderColor"
          secureTextEntry={isSecure}
          autoCapitalize={isPassword ? 'none' : props.autoCapitalize}
          autoCorrect={isPassword ? false : props.autoCorrect}
          {...props}
        />
        {isPassword && (
          <View
            onPress={() => setShowPassword((s) => !s)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={20} color="$textSecondary" /> : <Eye size={20} color="$textSecondary" />}
          </View>
        )}
        {rightIcon && !isPassword && <View marginLeft="$2">{rightIcon}</View>}
      </XStack>
      {error ? (
        <Text color="$danger" fontSize="$xs">{error}</Text>
      ) : hint ? (
        <Text color="$textMuted" fontSize="$xs">{hint}</Text>
      ) : null}
    </YStack>
  );
});

Input.displayName = 'Input';
