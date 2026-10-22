import type { Metadata, Viewport } from 'next';
import { QueenixProvider } from '@/components/TamaguiProvider';
import { ConvexClientProvider } from '@/components/ConvexClientProvider';
import { AdminFrame } from '@/components/admin/AdminFrame';
import './globals.css';

export const metadata: Metadata = {
  title: 'Queenix Admin',
  description: 'Queenix Gym — operations and management',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = { themeColor: '#0081cc' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body>
        <QueenixProvider>
          <ConvexClientProvider>
            <AdminFrame>{children}</AdminFrame>
          </ConvexClientProvider>
        </QueenixProvider>
      </body>
    </html>
  );
}
