// ============================================================
// Manifest PWA — permite instalar FOCO 360 como app en
// móviles (Android/iOS) y escritorios (Chrome/Edge).
//
// Next.js 14 genera /manifest.webmanifest automáticamente
// a partir de este archivo.
// ============================================================

import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FOCO 360° — Tours Virtuales',
    short_name: 'FOCO 360°',
    description:
      'Plataforma profesional de tours virtuales 360° para propiedades inmobiliarias.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#d4af37',
    orientation: 'any',
    lang: 'es-CO',
    icons: [
      // Usa el logo existente como ícono. Para mejor calidad subir
      // versiones cuadradas 192/512 a /public/icon-192.png etc.
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['business', 'photo', 'productivity'],
  };
}
