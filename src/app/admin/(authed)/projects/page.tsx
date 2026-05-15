// ============================================================
// Lista de proyectos del admin.
// ============================================================

import Link from 'next/link';
import Image from 'next/image';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { formatDate } from '@/lib/utils';
import { getSignedReadUrl } from '@/lib/r2';
import { CopyLinkButton } from '@/components/admin/CopyLinkButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Proyectos' };

export default async function ProjectsListPage() {
  const supabase = createSupabaseAdminClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('id, slug, name, client_name, is_active, views, cover_url, created_at')
    .order('created_at', { ascending: false });

  // Firmamos las URLs de portada en paralelo.
  const items = await Promise.all(
    (projects ?? []).map(async (p) => ({
      ...p,
      cover_signed_url: p.cover_url
        ? await getSignedReadUrl(p.cover_url).catch(() => null)
        : null,
    }))
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight">Proyectos</h1>
          <p className="mt-1 text-sm text-text-muted">
            {items.length} proyecto{items.length === 1 ? '' : 's'} en total.
          </p>
        </div>
        <Link href="/admin/projects/new" className="btn-primary">
          + Nuevo proyecto
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <p className="text-text-muted">Aún no tienes proyectos creados.</p>
          <Link href="/admin/projects/new" className="btn-primary mt-4">
            Crear el primero
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <article
              key={p.id}
              className="group overflow-hidden rounded-lg border border-border bg-bg-card transition-all hover:border-border-light"
            >
              <Link
                href={`/admin/projects/${p.id}`}
                className="block aspect-video w-full overflow-hidden bg-bg-elevated"
              >
                {p.cover_signed_url ? (
                  <Image
                    src={p.cover_signed_url}
                    alt={p.name}
                    width={640}
                    height={360}
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-text-subtle">
                    Sin portada
                  </div>
                )}
              </Link>

              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/admin/projects/${p.id}`}
                    className="font-medium text-text hover:text-gold"
                  >
                    {p.name}
                  </Link>
                  <span
                    className={
                      p.is_active
                        ? 'rounded-full bg-gold/10 px-2 py-0.5 text-[10px] text-gold'
                        : 'rounded-full bg-bg-hover px-2 py-0.5 text-[10px] text-text-subtle'
                    }
                  >
                    {p.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="text-xs text-text-subtle">
                  {p.client_name || 'Sin cliente'} · {formatDate(p.created_at)}
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                  <span className="text-text-muted">{p.views ?? 0} vistas</span>
                  <CopyLinkButton url={`${siteUrl}/tour/${p.slug}`} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
