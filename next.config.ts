import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: {
    serverComponentsExternalPackages: ['firebase', 'firebase-admin'],
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.firebasedatabase.app https://www.google.com https://www.gstatic.com;
              style-src 'self' 'unsafe-inline' https://*.web.app;
              img-src 'self' data: https:;
              media-src 'self' https: data: https://www.soundjay.com https://firebasestorage.googleapis.com https://*.firebasestorage.app;
              font-src 'self';
              connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.google.com https://*.firebase.com https://*.firebasedatabase.app https://apis.google.com https://firebasestorage.googleapis.com;
              frame-src https://www.youtube.com https://www.youtube-nocookie.com;
              frame-ancestors 'none';
            `.replace(/\s+/g, ' ').trim()
          }
        ],
      },
    ];
  },
};

export default nextConfig;
