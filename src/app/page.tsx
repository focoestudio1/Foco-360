// ============================================================
// Landing pública minimalista — usa el logo real como hero.
// ============================================================

import Link from 'next/link';

export const metadata = {
  // absolute: no aplica el template del layout (evita 'FOCO 360° · FOCO 360°').
  title: { absolute: 'FOCO 360°' },
};

export default function HomePage() {
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'FOCO 360°';
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="animate-fade-in text-center">
        {/* Logo como hero (en chip blanco para que se vea sobre el fondo oscuro) */}
        {logoUrl ? (
          <div className="mb-8 inline-flex items-center rounded-2xl bg-white/95 p-6 shadow-xl shadow-gold/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={brand}
              className="h-32 w-auto sm:h-40"
              draggable={false}
            />
          </div>
        ) : (
          <h1 className="mb-6 text-4xl font-light tracking-tight text-text sm:text-6xl font-display">
            {brand}
          </h1>
        )}
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-gold">
          Tours virtuales inmobiliarios
        </p>
        <p className="mx-auto mb-10 max-w-md text-sm leading-relaxed text-text-muted">
          Recorre propiedades en 360° desde cualquier dispositivo. Cada tour es
          privado y accesible solo con su link y contraseña.
        </p>
        <Link
          href="/admin"
          className="btn-secondary"
          aria-label="Acceder al panel de administración"
        >
          Acceso administrador →
        </Link>
      </div>
      <footer className="absolute bottom-6 text-xs text-text-subtle">
        © {new Date().getFullYear()} {brand}
      </footer>
    </main>
  );
}
