// ============================================================
// Layout del panel admin autenticado (con topbar/nav).
// El route group "(authed)" deja /admin/login sin este chrome.
// La protección de auth la hace el middleware.
// ============================================================

import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { ToastHost } from '@/components/ui/Toast';
import { LogoutButton } from '@/components/admin/LogoutButton';
import { getAdminUser } from '@/lib/auth';

export default async function AdminAuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/admin"
                className="rounded px-3 py-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/projects"
                className="rounded px-3 py-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              >
                Proyectos
              </Link>
              <Link
                href="/admin/projects/new"
                className="rounded px-3 py-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              >
                Nuevo
              </Link>
              <Link
                href="/admin/leads"
                className="rounded px-3 py-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              >
                Leads
              </Link>
              <Link
                href="/admin/settings"
                className="rounded px-3 py-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              >
                Configuración
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-text-subtle sm:inline">
              {admin?.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

      <ToastHost />
    </div>
  );
}
