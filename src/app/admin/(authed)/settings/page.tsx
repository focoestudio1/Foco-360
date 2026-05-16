// ============================================================
// Página de configuración del admin.
// - Cambio de contraseña de la plataforma.
// - Información de cuenta.
// - Acciones útiles (link de docs, etc).
// ============================================================

import { getAdminUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ChangePasswordForm } from './ChangePasswordForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Configuración' };

export default async function SettingsPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');

  return (
    <div className="animate-fade-in mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight">Configuración</h1>
        <p className="mt-1 text-sm text-text-muted">
          Ajustes de tu cuenta y la plataforma.
        </p>
      </div>

      {/* Info de cuenta */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          👤 Cuenta
        </h2>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-text-subtle">Email: </span>
            <span className="text-text">{admin.email}</span>
          </div>
          <div>
            <span className="text-text-subtle">ID de usuario: </span>
            <code className="text-[11px] text-text-muted">{admin.id}</code>
          </div>
        </div>
      </div>

      {/* Cambio de contraseña */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          🔒 Cambiar contraseña
        </h2>
        <p className="text-[11px] text-text-subtle">
          La contraseña con la que entras al panel admin. Mínimo 6 caracteres.
        </p>
        <ChangePasswordForm />
      </div>

      {/* Branding / vars de entorno */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          🎨 Branding global
        </h2>
        <p className="text-[11px] text-text-subtle">
          El logo global (FOCO) y el nombre de marca se configuran en
          las variables de entorno de Vercel: <code>NEXT_PUBLIC_LOGO_URL</code>{' '}
          y <code>NEXT_PUBLIC_BRAND_NAME</code>. Para cambios por proyecto
          (logo, color, WhatsApp), usa la página de cada proyecto.
        </p>
      </div>

      {/* Recursos */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          📚 Recursos
        </h2>
        <ul className="space-y-2 text-sm">
          <li>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              Supabase Dashboard →
            </a>{' '}
            <span className="text-text-subtle">
              · Ver y editar base de datos
            </span>
          </li>
          <li>
            <a
              href="https://dash.cloudflare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              Cloudflare R2 →
            </a>{' '}
            <span className="text-text-subtle">· Archivos del bucket</span>
          </li>
          <li>
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              Vercel Dashboard →
            </a>{' '}
            <span className="text-text-subtle">· Deploys y env vars</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
