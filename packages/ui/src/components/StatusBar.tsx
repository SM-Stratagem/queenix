import React from 'react';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useTheme } from 'tamagui';

export const StatusBar: React.FC<{ style?: 'auto' | 'light' | 'dark' }> = ({
  style = 'auto',
}) => {
  const theme = useTheme();
  const isDark = theme.background?.val?.startsWith('#0') || theme.background?.val?.startsWith('#1');
  return <ExpoStatusBar style={isDark ? 'light' : 'dark'} />;
};
