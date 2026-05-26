// ============================================================
// Dashboard admin: resumen de proyectos, vistas y recientes.
// ============================================================

import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = createSupabaseAdminClient();

  const [{ count: totalProjects }, { data: recent }, { data: views }] =
    await Promise.all([
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true }),
      supabase
        .from('projects')
        .select('id, slug, name, client_name, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      // Contamos vistas reales desde scene_views (lo nuevo, incluye
      // todas las visitas a tours publicos sin contraseña).
      supabase.from('scene_views').select('project_id'),
    ]);

  // Total = todas las vistas de escenas registradas.
  const totalViews = views?.length ?? 0;
  // Conteo por proyecto para mostrar en la lista recientes.
  const viewsByProject = (views ?? []).reduce<Record<string, number>>(
    (acc, v: any) => {
      acc[v.project_id] = (acc[v.project_id] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const activeCount = recent?.filter((p: any) => p.is_active).length ?? 0;

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-text-muted">
          Resumen general de tus tours virtuales.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total proyectos" value={totalProjects ?? 0} />
        <StatCard label="Total vistas" value={totalViews} />
        <StatCard label="Activos (recientes)" value={activeCount} />
      </div>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            Proyectos recientes
          </h2>
          <Link
            href="/admin/projects"
            className="text-xs text-gold hover:text-gold-light"
          >
            Ver todos →
          </Link>
        </div>

        {recent && recent.length > 0 ? (
          <ul className="divide-y divide-border">
            {recent.map((p: any) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <Link
                    href={`/admin/projects/${p.slug}`}
                    className="font-medium text-text hover:text-gold"
                  >
                    {p.name}
                  </Link>
                  <div className="mt-0.5 text-xs text-text-subtle">
                    {p.client_name || 'Sin cliente'} · {formatDate(p.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span
                    className={
                      p.is_active
                        ? 'rounded-full bg-gold/10 px-2 py-0.5 text-gold'
                        : 'rounded-full bg-bg-hover px-2 py-0.5 text-text-subtle'
                    }
                  >
                    {p.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="tabular-nums text-text-muted">
                    {viewsByProject[p.id] ?? 0} vistas
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-8 text-center text-sm text-text-muted">
            Aún no tienes proyectos.{' '}
            <Link
              href="/admin/projects/new"
              className="text-gold hover:text-gold-light"
            >
              Crear el primero →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-2 text-3xl font-light tabular-nums text-text">
        {value}
      </div>
    </div>
  );
}
