import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['stripe'],
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'X-DNS-Prefetch-Control', value: 'on' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io https://*.clerk.accounts.dev https://*.clerk.dev https://challenges.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' blob: data: https: http:",
            "connect-src 'self' https://*.clerk.dev https://*.clerk.accounts.dev https://api.stripe.com https://plausible.io https://*.turso.io wss://*.turso.io https://api.openai.com https://*.vercel-storage.com https://*.public.blob.vercel-storage.com",
            "frame-src 'self' https://*.clerk.accounts.dev https://js.stripe.com https://challenges.cloudflare.com",
            "worker-src 'self' blob:",
            "media-src 'self' blob: https://*.vercel-storage.com",
          ].join('; '),
        },
      ],
    },
  ],
};

export default nextConfig;
