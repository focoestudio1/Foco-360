// ============================================================
// API: /api/admin/projects/[id]/scenes
//
// POST { key, title } → confirma una escena ya subida directamente
//                       a R2 y crea su fila en la DB.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const key = String(body.key ?? '');
  const title = String(body.title ?? '').trim() || 'Escena sin título';

  if (!key) {
    return NextResponse.json({ error: 'key requerida' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, slug')
    .eq('id', params.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }

  // Valida que la key pertenezca al proyecto.
  if (!key.startsWith(`projects/${project.slug}/`)) {
    return NextResponse.json({ error: 'Key no autorizada' }, { status: 403 });
  }

  // Calcula el siguiente order_index.
  const { data: maxRow } = await supabase
    .from('scenes')
    .select('order_index')
    .eq('project_id', params.id)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextIndex = (maxRow?.order_index ?? -1) + 1;

  const { data: scene, error } = await supabase
    .from('scenes')
    .insert({
      project_id: params.id,
      title,
      image_url: key,
      order_index: nextIndex,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ scene }, { status: 201 });
}
