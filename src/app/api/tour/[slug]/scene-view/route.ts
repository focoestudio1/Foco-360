// ============================================================
// API: /api/tour/[slug]/scene-view
//
// POST { scene_id, duration_ms } → registra una vista de escena
// para estadísticas. NO requiere auth (cualquier visitante).
// Verifica que la escena pertenezca al proyecto del slug.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { getAdminUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  // Excluye al admin logueado de las estadisticas: el dueño viendo
  // su propio tour no debería inflar las visitas.
  const admin = await getAdminUser();
  if (admin) {
    return NextResponse.json({ ok: true, skipped: 'admin' });
  }

  const body = await req.json().catch(() => null);
  const sceneId = String(body?.scene_id ?? '');
  const durationMs = Math.max(
    0,
    Math.min(1000 * 60 * 60, Number(body?.duration_ms ?? 0))
  );
  if (!sceneId) {
    return NextResponse.json({ error: 'scene_id requerido' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  // Validamos que la escena pertenezca a un proyecto con ese slug.
  const { data: scene } = await supabase
    .from('scenes')
    .select('id, project_id, projects!inner(slug)')
    .eq('id', sceneId)
    .single<{ id: string; project_id: string; projects: { slug: string } }>();

  if (!scene || scene.projects?.slug !== params.slug) {
    return NextResponse.json({ error: 'Scene mismatch' }, { status: 404 });
  }

  const { error } = await supabase.from('scene_views').insert({
    scene_id: sceneId,
    project_id: scene.project_id,
    duration_ms: Math.round(durationMs),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
