// ============================================================
// Página de login admin (pública).
// ============================================================

import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/auth';
import { LoginForm } from './LoginForm';
import { Logo } from '@/components/ui/Logo';

export const metadata = { title: 'Acceso administrador' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  // Si ya está autenticado, va directo al dashboard.
  const admin = await getAdminUser();
  if (admin) redirect(searchParams.redirect || '/admin');

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <Logo asLink={false} className="justify-center" />
          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-text-subtle">
            Panel administrador
          </p>
        </div>

        <div className="card">
          <h1 className="mb-1 text-lg font-medium">Iniciar sesión</h1>
          <p className="mb-6 text-sm text-text-muted">
            Acceso restringido al administrador autorizado.
          </p>

          <LoginForm redirectTo={searchParams.redirect} />
        </div>
      </div>
    </main>
  );
}
