import type { NextConfig } from 'next';

// The upstream API URL — used server-side for rewrites only (never in the bundle).
// Override via API_URL or NEXT_PUBLIC_API_URL env var in Vercel / Render.
const UPSTREAM_API =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'production'
    ? 'https://dockydoc-api-staging.onrender.com'
    : 'http://localhost:8081');

const nextConfig: NextConfig = {
  // Strict mode catches common bugs early
  reactStrictMode: true,

  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? 'DockyDoc',
  },

  images: {
    remotePatterns: [],
  },

  // Proxy /api/v1/* through the Next.js server so the browser never needs to
  // know (or hard-code) the Render URL.  CORS and NEXT_PUBLIC_API_URL issues
  // are eliminated because requests go same-origin to Vercel.
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${UPSTREAM_API}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
