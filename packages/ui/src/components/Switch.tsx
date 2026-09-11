import React from 'react';
import { Switch as TamaguiSwitch, XStack, YStack, type ViewProps } from 'tamagui';
import { Text } from './Text';

export type SwitchProps = ViewProps & {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export const Switch: React.FC<SwitchProps> = ({ value, onValueChange, label, description, disabled }) => {
  if (!label && !description) {
    return (
      <TamaguiSwitch
        checked={value}
        onCheckedChange={onValueChange}
        disabled={disabled}
        size="$3"
      >
        <TamaguiSwitch.Thumb animation="quick" />
      </TamaguiSwitch>
    );
  }

  return (
    <XStack justifyContent="space-between" alignItems="center" paddingVertical="$2">
      <YStack flex={1} gap="$0.5">
        {label && <Text variant="body" weight="500">{label}</Text>}
        {description && <Text variant="caption" color="secondary">{description}</Text>}
      </YStack>
      <TamaguiSwitch
        checked={value}
        onCheckedChange={onValueChange}
        disabled={disabled}
        size="$3"
      >
        <TamaguiSwitch.Thumb animation="quick" />
      </TamaguiSwitch>
    </XStack>
  );
};
