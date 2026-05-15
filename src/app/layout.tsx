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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg font-sans text-text antialiased">
        {children}
      </body>
    </html>
  );
}
