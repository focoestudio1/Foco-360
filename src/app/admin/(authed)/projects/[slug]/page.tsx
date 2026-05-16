// ============================================================
// Editor del proyecto: detalles, portada, escenas y hotspots.
// URL: /admin/projects/<slug>  (slug es legible, no UUID).
// ============================================================

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { getSignedReadUrl } from '@/lib/r2';
import { ProjectEditor } from '@/components/admin/ProjectEditor';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ProjectEditPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle();
  if (!project) notFound();

  const { data: scenes } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true });

  const sceneIds = (scenes ?? []).map((s) => s.id);
  let hotspots: any[] = [];
  if (sceneIds.length > 0) {
    const { data: hs } = await supabase
      .from('hotspots')
      .select('*')
      .in('scene_id', sceneIds);
    hotspots = hs ?? [];
  }

  const cover_signed_url = project.cover_url
    ? await getSignedReadUrl(project.cover_url).catch(() => null)
    : null;
  const logo_signed_url = project.logo_url
    ? await getSignedReadUrl(project.logo_url).catch(() => null)
    : null;
  const floorplan_signed_url = project.floorplan_url
    ? await getSignedReadUrl(project.floorplan_url).catch(() => null)
    : null;

  const scenesSigned = await Promise.all(
    (scenes ?? []).map(async (s) => ({
      ...s,
      signed_url: await getSignedReadUrl(s.image_url).catch(() => null),
      audio_signed_url: s.audio_url
        ? await getSignedReadUrl(s.audio_url).catch(() => null)
        : null,
    }))
  );

  const { password_hash, ...safeProject } = project as any;
  const has_password = !!password_hash;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/projects"
            className="text-xs text-text-muted hover:text-text"
          >
            ← Volver a proyectos
          </Link>
          <h1 className="mt-2 text-2xl font-light tracking-tight">
            {project.name}
          </h1>
          <p className="mt-1 text-xs text-text-subtle">
            Creado {formatDate(project.created_at)} ·{' '}
            <span className="text-gold">{project.views ?? 0} vistas</span>
          </p>
        </div>
      </div>

      <ProjectEditor
        project={{
          ...safeProject,
          has_password,
          cover_signed_url,
          logo_signed_url,
          floorplan_signed_url,
        }}
        initialScenes={scenesSigned}
        initialHotspots={hotspots}
      />
    </div>
  );
}
