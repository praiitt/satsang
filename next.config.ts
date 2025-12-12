import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure Firebase modules are resolved correctly
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      // Auth Server Proxy (Port 4000)
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:4000/api/auth/:path*',
      },
      // Astrology Backend Proxy (Port 3003)
      // We proxy everything else under /api/ to the main backend if not caught above
      // But we must be careful. Let's list specific major routes or use a fallback.
      // Based on server.js: /api/astrology, /api/chat, etc.
      {
        source: '/api/astrology/:path*',
        destination: 'http://localhost:3003/api/astrology/:path*',
      },
      {
        source: '/api/comprehensive-astrology/:path*',
        destination: 'http://localhost:3003/api/comprehensive-astrology/:path*',
      },
      {
        source: '/api/chart-management/:path*',
        destination: 'http://localhost:3003/api/chart-management/:path*',
      },
      {
        source: '/api/chat/:path*',
        destination: 'http://localhost:3003/api/chat/:path*',
      },
      {
        source: '/api/compatibility/:path*',
        destination: 'http://localhost:3003/api/compatibility/:path*',
      },
      {
        source: '/api/matchmaking/:path*',
        destination: 'http://localhost:3003/api/matchmaking/:path*',
      },
      {
        source: '/api/user-journey/:path*',
        destination: 'http://localhost:3003/api/user-journey/:path*',
      },
      {
        source: '/api/enhanced-chat/:path*',
        destination: 'http://localhost:3003/api/enhanced-chat/:path*',
      },
      {
        source: '/api/user-profile/:path*',
        destination: 'http://localhost:3003/api/user-profile/:path*',
      },
      {
        source: '/api/rag/:path*',
        destination: 'http://localhost:3003/api/rag/:path*',
      },
      {
        source: '/api/hybrid-rag/:path*',
        destination: 'http://localhost:3003/api/hybrid-rag/:path*',
      },
      {
        source: '/api/payments/:path*',
        destination: 'http://localhost:3003/api/payments/:path*',
      },
      {
        source: '/api/waitlist/:path*',
        destination: 'http://localhost:3003/api/waitlist/:path*',
      },
      {
        source: '/api/coins/:path*',
        destination: 'http://localhost:3003/api/coins/:path*',
      },
      {
        source: '/api/pdf/:path*',
        destination: 'http://localhost:3003/api/pdf/:path*',
      },
      {
        source: '/api/geocoding/:path*',
        destination: 'http://localhost:3003/api/geocoding/:path*',
      },
      {
        source: '/api/livekit/:path*',
        destination: 'http://localhost:3003/api/livekit/:path*',
      },
      {
        source: '/api/admin/:path*',
        destination: 'http://localhost:3003/api/admin/:path*',
      },
      {
        source: '/api/langchain/:path*',
        destination: 'http://localhost:3003/api/langchain/:path*',
      },
    ];
  },
};

export default nextConfig;
