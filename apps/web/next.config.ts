import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

// This Next.js config is API-only. The frontend (landing + app) is built by
// Vite and served as static assets from apps/web/dist/. Next.js is only used
// for the Vercel serverless API deployment (src/app/api/[[...all]]/route.ts).
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@wordbase/shared'],
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@wordbase/shared': path.resolve(__dirname, '../../shared'),
    };
    return config;
  },
};

export default nextConfig;
