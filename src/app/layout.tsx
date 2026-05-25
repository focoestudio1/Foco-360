// ============================================================
// Layout raíz de toda la app.
// ============================================================

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Foco 360° — Tours Virtuales Inmobiliarios',
    template: '%s · Foco 360°',
  },
  description:
    'Plataforma profesional de tours virtuales 360° para propiedades inmobiliarias.',
  robots: { index: false, follow: false }, // panel privado, no indexar
  // Apple-specific para "Agregar a inicio" en iOS.
  appleWebApp: {
    capable: true,
    title: 'FOCO 360°',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport = {
  themeColor: '#d4af37',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Tipografía Inter desde Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Cinzel:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Apple touch icon — usado al "Agregar a inicio" en iOS */}
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="min-h-screen bg-bg font-sans text-text antialiased">
        {children}
        {/* Registra el Service Worker para habilitar instalacion PWA.
            Sin caching agresivo, solo para que Chrome muestre 'Instalar'. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
