// ============================================================
// API: /api/admin/scenes/[id]/audio
//
// POST   { key }  → confirma un audio ya subido a R2.
//                   Borra el audio anterior si había.
// DELETE         → quita el audio (setea NULL).
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { deleteObject } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => null);
  const key = String(body?.key ?? '');
  if (!key) {
    return NextResponse.json({ error: 'key requerida' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  // Validamos que la escena exista y obtenemos su slug de proyecto
  // para chequear que la key pertenece al proyecto correcto.
  const { data: scene } = await supabase
    .from('scenes')
    .select('id, project_id, audio_url, projects(slug)')
    .eq('id', params.id)
    .single<{ id: string; project_id: string; audio_url: string | null; projects: { slug: string } | null }>();

  if (!scene) {
    return NextResponse.json({ error: 'Escena no encontrada' }, { status: 404 });
  }
  const slug = scene.projects?.slug;
  if (!slug || !key.startsWith(`projects/${slug}/`)) {
    return NextResponse.json({ error: 'Key no autorizada' }, { status: 403 });
  }

  // Borra audio anterior si era distinto.
  if (scene.audio_url && scene.audio_url !== key) {
    try {
      await deleteObject(scene.audio_url);
    } catch (e) {
      console.error('[audio delete old]', e);
    }
  }

  const { error } = await supabase
    .from('scenes')
    .update({ audio_url: key })
    .eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ key });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data: scene } = await supabase
    .from('scenes')
    .select('audio_url')
    .eq('id', params.id)
    .single();

  if (scene?.audio_url) {
    try {
      await deleteObject(scene.audio_url);
    } catch (e) {
      console.error('[audio delete]', e);
    }
  }
  const { error } = await supabase
    .from('scenes')
    .update({ audio_url: null })
    .eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
