import React from 'react';
import { Sheet as TamaguiSheet } from 'tamagui';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
  snapPoints?: Array<number | string>;
  dismissOnOverlayPress?: boolean;
}

export const Sheet: React.FC<SheetProps> = ({
  open,
  onOpenChange,
  children,
  snapPoints = [50],
  dismissOnOverlayPress = true,
}) => {
  return (
    <TamaguiSheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints as any}
      position={0}
      dismissOnOverlayPress={dismissOnOverlayPress}
      modal
    >
      <TamaguiSheet.Overlay backgroundColor="rgba(0,0,0,0.5)" />
      <TamaguiSheet.Frame
        backgroundColor="$surface"
        borderTopLeftRadius="$3xl"
        borderTopRightRadius="$3xl"
        padding="$4"
      >
        <TamaguiSheet.Handle
          backgroundColor="$borderColor"
          width={40}
          height={4}
          marginBottom="$3"
        />
        {children}
      </TamaguiSheet.Frame>
    </TamaguiSheet>
  );
};
