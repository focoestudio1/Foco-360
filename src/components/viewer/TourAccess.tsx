'use client';

// ============================================================
// Pantalla de acceso al tour: pide contraseña.
// Si es correcta, recarga la página y entra al visor.
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

export function TourAccess({
  slug,
  name,
  clientName,
  description,
  coverUrl,
}: {
  slug: string;
  name: string;
  clientName: string | null;
  description: string | null;
  coverUrl: string | null;
}) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/tour/${slug}/access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Contraseña incorrecta');
      setLoading(false);
      return;
    }
    // Cookie ya seteada por el servidor — refrescamos.
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6">
      {/* Fondo con la portada difuminada */}
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-20 blur-md"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/70 to-bg" />

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <Logo asLink={false} className="justify-center" />
        </div>

        <div className="card text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-gold">
            Tour Virtual 360°
          </p>
          <h1 className="mt-2 text-2xl font-light tracking-tight">{name}</h1>
          {clientName && (
            <p className="mt-1 text-xs text-text-subtle">{clientName}</p>
          )}
          {description && (
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              {description}
            </p>
          )}

          <form onSubmit={onSubmit} className="mt-6 space-y-3 text-left">
            <Input
              label="Contraseña de acceso"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            {error && (
              <p className="rounded border border-red-800/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} className="w-full">
              Entrar al tour
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-text-subtle">
          Si no tienes la contraseña, contacta al administrador.
        </p>
      </div>
    </main>
  );
}
