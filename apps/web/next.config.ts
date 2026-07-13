import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@wordbase/shared'],
  experimental: {
    optimizeCss: false,
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@wordbase/shared': path.resolve(__dirname, '../../shared'),
    };
    return config;
  },
};

export default nextConfig;