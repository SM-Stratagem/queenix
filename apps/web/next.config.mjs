import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Dev-only: dev-up.sh serves the console on the LAN IP (phones, other laptops).
  // Without this Next blocks its dev chunks there, the login page never hydrates
  // and the form falls back to a native GET. Ignored by `next build`/`start`.
  allowedDevOrigins: ['10.*.*.*', '192.168.*.*', '172.*.*.*', '*.local'],
  // Production image runs `node apps/web/server.js` from a self-contained
  // bundle (only the files the server actually uses, traced from the monorepo).
  output: 'standalone',
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), '../..'),
  transpilePackages: [
    '@queenix/ui',
    '@queenix/theme',
    '@queenix/types',
    '@queenix/convex',
    '@queenix/payments',
    '@queenix/receipts',
    '@tamagui/core',
    '@tamagui/web',
  ],
  experimental: {
    optimizePackageImports: ['@queenix/ui', '@queenix/theme', 'lucide-react'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.queenix.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/favicon.ico', destination: '/icon.svg', permanent: true },
      // Legacy owner surfaces renamed to finance (backward-compat).
      { source: '/owner', destination: '/finance', permanent: false },
      { source: '/owner/:path*', destination: '/finance/:path*', permanent: false },
    ];
  },
};

export default nextConfig;
