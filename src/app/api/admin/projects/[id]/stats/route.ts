// ============================================================
// API: /api/admin/projects/[id]/stats
//
// GET → estadísticas agregadas por escena para un proyecto.
// Para cada escena: total_views + avg_duration_ms.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = createSupabaseAdminClient();

  // Listamos las escenas del proyecto (mantener orden).
  const { data: scenes } = await supabase
    .from('scenes')
    .select('id, title, order_index')
    .eq('project_id', params.id)
    .order('order_index');

  // Trae las vistas y agrupamos en JS (más simple que SQL agregado).
  const { data: views } = await supabase
    .from('scene_views')
    .select('scene_id, duration_ms')
    .eq('project_id', params.id);

  const byScene: Record<string, { count: number; totalMs: number }> = {};
  for (const v of views ?? []) {
    if (!byScene[v.scene_id]) byScene[v.scene_id] = { count: 0, totalMs: 0 };
    byScene[v.scene_id].count += 1;
    byScene[v.scene_id].totalMs += v.duration_ms ?? 0;
  }

  const stats = (scenes ?? []).map((s) => {
    const e = byScene[s.id] ?? { count: 0, totalMs: 0 };
    return {
      scene_id: s.id,
      title: s.title,
      views: e.count,
      avg_duration_ms: e.count > 0 ? Math.round(e.totalMs / e.count) : 0,
      total_duration_ms: e.totalMs,
    };
  });

  return NextResponse.json({ stats });
}
