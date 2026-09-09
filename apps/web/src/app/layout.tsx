import type { Metadata } from 'next';
import { TamaguiProvider, Theme } from 'tamagui';
import { config } from '@queenix/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'Queenix Admin',
  description: 'Queenix Gym — operations and management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <TamaguiProvider config={config} defaultTheme="light">
          <Theme name="light">{children}</Theme>
        </TamaguiProvider>
      </body>
    </html>
  );
}
