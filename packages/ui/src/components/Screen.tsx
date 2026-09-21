import React from 'react';
import { ScrollView, ScrollViewProps, View, YStack, useTheme } from 'tamagui';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export interface ScreenProps {
  children?: React.ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  background?: 'background' | 'surface' | 'surfaceMuted';
  edges?: Edge[];
  padded?: boolean;
  safeArea?: boolean;
  testID?: string;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = false,
  refreshControl,
  contentContainerStyle,
  background = 'background',
  edges = ['top', 'bottom', 'left', 'right'],
  padded = true,
  safeArea = true,
  testID,
}) => {
  const theme = useTheme();
  const Container = safeArea ? SafeAreaView : View;
  const backgroundColor = theme[background]?.val ?? 'transparent';
  const containerProps = safeArea
    ? { edges, style: { flex: 1, backgroundColor } }
    : { style: { flex: 1, backgroundColor } };

  if (scroll) {
    return (
      <Container {...(containerProps as any)} testID={testID}>
        <ScrollView
          contentContainerStyle={{
            ...(padded ? { padding: 16 } : null),
            ...((contentContainerStyle as Record<string, unknown> | undefined) ?? {}),
          }}
          refreshControl={refreshControl as any}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </Container>
    );
  }

  return (
    <Container {...(containerProps as any)} testID={testID}>
      <YStack flex={1} padding={padded ? '$4' : 0}>
        {children}
      </YStack>
    </Container>
  );
};
