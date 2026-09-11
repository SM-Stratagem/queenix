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
    optimizePackageImports: ['@queenix/ui', '@queenix/theme', 'tamagui', 'lucide-react'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.queenix.com' },
    ],
  },
};

export default nextConfig;
