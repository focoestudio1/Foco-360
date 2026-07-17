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
  // Una escena puede ser una FOTO 360 (key de R2) o un VIDEO 360 (URL de Bunny).
  const kind = body.kind === 'video' ? 'video' : 'photo';
  const videoUrl = String(body.videoUrl ?? '').trim();

  if (kind === 'video') {
    // Solo aceptamos https (el video se sirve desde Bunny, no desde R2).
    if (!/^https:\/\/\S+$/i.test(videoUrl)) {
      return NextResponse.json(
        { error: 'videoUrl inválida: pega el link del video 360 (https://…)' },
        { status: 400 }
      );
    }
  } else if (!key) {
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

  // Valida que la key pertenezca al proyecto (solo aplica a fotos; en video la
  // key es opcional y solo sirve de póster).
  if (key && !key.startsWith(`projects/${project.slug}/`)) {
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
      kind,
      // En video, image_url queda null salvo que manden un póster.
      image_url: key || null,
      video_url: kind === 'video' ? videoUrl : null,
      order_index: nextIndex,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ scene }, { status: 201 });
}
