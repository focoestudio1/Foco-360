/** @type {import('next').NextConfig} */
// Configuración principal de Next.js para Foco 360°.
const nextConfig = {
  reactStrictMode: true,
  // Permitimos servir imágenes desde cualquier host R2 firmado.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Headers básicos de seguridad.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
