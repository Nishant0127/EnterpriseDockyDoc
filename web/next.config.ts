import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Strict mode catches common bugs early
  reactStrictMode: true,

  // Environment variables exposed to the browser must be prefixed with NEXT_PUBLIC_
  // Server-only variables are accessed via process.env directly in server components
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? 'DockyDoc',
  },

  // Image optimization: add external domains here when needed
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
