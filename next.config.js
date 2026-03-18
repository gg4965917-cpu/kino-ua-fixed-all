/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
    // Vercel Image Optimization is free — keep unoptimized=false by default.
    // Set NEXT_PUBLIC_IMAGE_UNOPTIMIZED=true only for self-hosted / Docker builds.
    unoptimized: process.env.NEXT_PUBLIC_IMAGE_UNOPTIMIZED === 'true',
    // Serve WebP / AVIF for maximum performance on Vercel
    formats: ['image/avif', 'image/webp'],
  },

  reactStrictMode: true,

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Standalone output for Docker; omit for Vercel deployments
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,

  // Security & performance headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Allow embedding video iframes from trusted CDN sources
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https://image.tmdb.org",
              // Add your video CDN domains here, e.g. https://ashdi.vip
              "frame-src 'self'",
              "connect-src 'self' https://api.themoviedb.org",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
