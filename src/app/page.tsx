// ============================================================
// Landing pública minimalista.
// ============================================================

import Link from 'next/link';

export default function HomePage() {
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'MI PRODUCTORA 360°';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="animate-fade-in text-center">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-gold">
          Tours virtuales inmobiliarios
        </p>
        <h1 className="mb-6 text-4xl font-light tracking-tight text-text sm:text-6xl">
          {brand}
        </h1>
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
