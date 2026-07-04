import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Generate unique build ID based on timestamp to force cache invalidation
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  // Add empty turbopack config to silence Next.js 16 warning
  turbopack: {},
  async headers() {
    return [
      {
        // Never cache page HTML — prevents stale chunk reference 404s after deploys
        source: '/((?!_next/|favicon\.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, max-age=0',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://cdn.tailwindcss.com https://use.fontawesome.com https://kit.fontawesome.com",
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://fonts.googleapis.com https://use.fontawesome.com https://maxcdn.bootstrapcdn.com https://stackpath.bootstrapcdn.com https://cdn.tailwindcss.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.gstatic.com https://use.fontawesome.com https://maxcdn.bootstrapcdn.com",
              "connect-src 'self' https://api.deepseek.com https://api.openai.com https://api.anthropic.com https://openrouter.ai https://cdn.jsdelivr.net https://fonts.googleapis.com",
              "frame-src 'self' blob: data:",
              "worker-src 'self' blob: data:",
              "child-src 'self' blob: data:",
            ].join('; ')
          }
        ]
      },
      {
        // Static chunks are content-addressed — cache them for 1 year
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ]
      },
      {
        // Auth API — allow fetch from sandboxed iframe (origin: null)
        source: '/api/auth/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ]
      },
    ]
  }
};

export default nextConfig;
