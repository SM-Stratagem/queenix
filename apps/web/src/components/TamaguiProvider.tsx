'use client';

import React from 'react';
import { TamaguiProvider, Theme } from 'tamagui';
import { config } from '@queenix/theme';

/**
 * Client-side Tamagui boundary for the admin panel.
 * Kept in its own 'use client' module so Tamagui / react-native-web
 * modules are never evaluated in a React Server Component context
 * (their top-level `createContext` calls crash the RSC build otherwise).
 */
export function QueenixProvider({ children }: { children: React.ReactNode }) {
  return (
    <TamaguiProvider config={config} defaultTheme="light">
      <Theme name="light">{children}</Theme>
    </TamaguiProvider>
  );
}
