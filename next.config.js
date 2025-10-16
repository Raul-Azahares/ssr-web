/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración de seguridad
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src * data:; connect-src * ws: wss:; frame-src *;",
          },
        ],
      },
    ];
  },
  // Transpile puppeteer-core y playwright-core para que funcione con Next.js
  transpilePackages: ['puppeteer-core', 'playwright-core'],
  experimental: {
    serverComponentsExternalPackages: [
      'puppeteer-core', 
      '@sparticuz/chromium',
      'playwright-core',
      'chromium-bidi'
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Excluir módulos opcionales de Playwright que no necesitamos
      config.externals = [...config.externals, 'electron', 'chromium-bidi'];
    }
    return config;
  },
};

module.exports = nextConfig;
