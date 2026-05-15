'use client';

// Formulario de login client-side — usa Supabase Auth en el navegador.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (err) {
        setError('Credenciales inválidas. Verifica tu email y contraseña.');
        setLoading(false);
        return;
      }
      // Refresca la sesión del servidor antes de navegar.
      router.refresh();
      router.replace(redirectTo || '/admin');
    } catch {
      setError('Ocurrió un error al iniciar sesión. Intenta nuevamente.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="admin@ejemplo.com"
      />
      <Input
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />
      {error && (
        <p className="rounded border border-red-800/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} className="w-full">
        Entrar
      </Button>
    </form>
  );
}
