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
    // Los TOURS deben poder embeberse en la plataforma FOCO
    // (galerias.focoestudio.net y demás subdominios de focoestudio.net).
    // Por eso NO usamos X-Frame-Options (solo permite DENY/SAMEORIGIN, no un
    // origen cruzado) sino CSP frame-ancestors, que sí permite listar dominios.
    // + el acceso del ESTUDIO por la red local (admin "FOCO Admin (Estudio)" en
    // http://foco-nas.local:8080): sin esto el tour salía "rechazó la conexión".
    const frameAncestors =
      "frame-ancestors 'self' https://*.focoestudio.net https://focoestudio.net http://foco-nas.local:*";
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: frameAncestors },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
