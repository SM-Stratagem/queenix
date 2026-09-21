/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
