// ============================================================
// API: /api/admin/projects/[id]/gallery
//
// GET  → lista fotos de la galería del proyecto ordenadas.
// POST { key, caption? } → confirma una foto ya subida a R2 y crea
//                          su fila en gallery_photos.
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
  const { data, error } = await supabase
    .from('gallery_photos')
    .select('*')
    .eq('project_id', params.id)
    .order('order_index', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ photos: data ?? [] });
}

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
  const caption = body.caption ? String(body.caption).trim() || null : null;

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

  // Valida que la key pertenezca al proyecto (misma protección que scenes).
  if (!key.startsWith(`projects/${project.slug}/`)) {
    return NextResponse.json({ error: 'Key no autorizada' }, { status: 403 });
  }

  // Siguiente order_index para poner la foto al final de la galería.
  const { data: maxRow } = await supabase
    .from('gallery_photos')
    .select('order_index')
    .eq('project_id', params.id)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextIndex = (maxRow?.order_index ?? -1) + 1;

  const { data: photo, error } = await supabase
    .from('gallery_photos')
    .insert({
      project_id: params.id,
      image_url: key,
      caption,
      order_index: nextIndex,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ photo }, { status: 201 });
}
