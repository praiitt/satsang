import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // Optimized for Docker/Cloud Run
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Fix for Firebase Hosting decoding dynamic route chunks (ChunkLoadError)
  // We serve assets directly from Cloud Run to avoid URL path modification by the proxy
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX,

  // Enable CORS for assets since they will be served from a different domain (Cloud Run) than the main site (Firebase/Custom Domain)
  async headers() {
    return [
      {
        source: "/_next/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET" },
        ],
      },
    ];
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
    const AUTH_URL = process.env.NODE_ENV === 'development'
      ? 'http://localhost:4000'
      : (process.env.AUTH_SERVER_URL || process.env.AUTH_SERVICE_URL || 'https://satsang-auth-server-6ougd45dya-el.a.run.app');
    const MARKETING_SERVER_URL = process.env.MARKETING_SERVER_URL || 'http://localhost:4001';
    const BACKEND_URL = process.env.BACKEND_SERVICE_URL || 'http://localhost:3003';

    console.log('[Next.Config] AUTH_URL:', AUTH_URL);
    console.log('[Next.Config] Suno Rewrite Dst:', `${AUTH_URL}/suno/:path*`);

    return [
      {
        source: '/api/marketing/ads/:path*',
        destination: `${MARKETING_SERVER_URL}/ads/:path*`,
      },
      {
        source: '/api/marketing/podcast/:path*',
        destination: `${MARKETING_SERVER_URL}/podcast/:path*`,
      },
      {
        source: '/api/marketing/video-stitch/:path*',
        destination: `${MARKETING_SERVER_URL}/video-stitch/:path*`,
      },
      {
        source: '/api/transcripts/:path*',
        destination: `${MARKETING_SERVER_URL}/transcripts/:path*`,
      },
      // Generic transcription tool
      {
        source: '/api/transcript/:path*',
        destination: `${MARKETING_SERVER_URL}/transcript/:path*`,
      },
      // Auth Server Proxy
      {
        source: '/api/auth/:path*',
        destination: `${AUTH_URL}/auth/:path*`,
      },
      // Suno API Proxy (Auth Server)
      {
        source: '/api/suno/:path*',
        destination: `${AUTH_URL}/suno/:path*`,
      },
      {
        source: '/backend/auth/:path*',
        destination: `${AUTH_URL}/auth/:path*`,
      },
      // Astrology Backend Proxy (Port 3003)
      // We proxy everything else under /api/ to the main backend if not caught above
      // But we must be careful. Let's list specific major routes or use a fallback.
      // Based on server.js: /api/astrology, /api/chat, etc.
      {
        source: '/api/astrology/:path*',
        destination: `${BACKEND_URL}/api/astrology/:path*`,
      },
      {
        source: '/api/comprehensive-astrology/:path*',
        destination: `${BACKEND_URL}/api/comprehensive-astrology/:path*`,
      },
      {
        source: '/api/chart-management/:path*',
        destination: `${BACKEND_URL}/api/chart-management/:path*`,
      },
      {
        source: '/api/chat/:path*',
        destination: `${BACKEND_URL}/api/chat/:path*`,
      },
      {
        source: '/api/compatibility/:path*',
        destination: `${BACKEND_URL}/api/compatibility/:path*`,
      },
      {
        source: '/api/matchmaking/:path*',
        destination: `${BACKEND_URL}/api/matchmaking/:path*`,
      },
      {
        source: '/api/user-journey/:path*',
        destination: `${BACKEND_URL}/api/user-journey/:path*`,
      },
      {
        source: '/api/enhanced-chat/:path*',
        destination: `${BACKEND_URL}/api/enhanced-chat/:path*`,
      },
      {
        source: '/api/user-profile/:path*',
        destination: `${BACKEND_URL}/api/user-profile/:path*`,
      },
      {
        source: '/api/rag/:path*',
        destination: `${BACKEND_URL}/api/rag/:path*`,
      },
      {
        source: '/api/hybrid-rag/:path*',
        destination: `${BACKEND_URL}/api/hybrid-rag/:path*`,
      },
      {
        source: '/api/payments/:path*',
        destination: `${BACKEND_URL}/api/payments/:path*`,
      },
      {
        source: '/api/waitlist/:path*',
        destination: `${BACKEND_URL}/api/waitlist/:path*`,
      },
      {
        source: '/api/coins/:path*',
        destination: `${BACKEND_URL}/api/coins/:path*`,
      },
      {
        source: '/api/pdf/:path*',
        destination: `${BACKEND_URL}/api/pdf/:path*`,
      },
      {
        source: '/api/geocoding/:path*',
        destination: `${BACKEND_URL}/api/geocoding/:path*`,
      },
      {
        source: '/api/livekit/:path*',
        destination: `${BACKEND_URL}/api/livekit/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${BACKEND_URL}/api/admin/:path*`,
      },
      {
        source: '/api/langchain/:path*',
        destination: `${BACKEND_URL}/api/langchain/:path*`,
      },
    ];
  },
};

export default nextConfig;
