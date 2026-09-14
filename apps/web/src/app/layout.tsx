import type { Metadata } from 'next';
import { QueenixProvider } from '@/components/TamaguiProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Queenix Admin',
  description: 'Queenix Gym — operations and management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueenixProvider>{children}</QueenixProvider>
      </body>
    </html>
  );
}
