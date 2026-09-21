import type { Metadata } from 'next';
import { QueenixProvider } from '@/components/TamaguiProvider';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Queenix Admin',
  description: 'Queenix Gym — operations and management',
  icons: { icon: '/icon.svg' },
  themeColor: '#0081cc',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueenixProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </QueenixProvider>
      </body>
    </html>
  );
}
