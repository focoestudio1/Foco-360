// ============================================================
// API: /api/admin/projects/[id]/welcome-video
//
// POST   { key } → confirma un video ya subido directamente a R2.
//                  Borra el video anterior (si existía) y actualiza DB.
// DELETE        → quita el video de bienvenida del proyecto.
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
  if (!body) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const key = String(body.key ?? '');
  if (!key) {
    return NextResponse.json({ error: 'key requerida' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, slug, welcome_video_url')
    .eq('id', params.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }
  if (!key.startsWith(`projects/${project.slug}/`)) {
    return NextResponse.json({ error: 'Key no autorizada' }, { status: 403 });
  }

  // Borra video anterior si era distinto.
  if (project.welcome_video_url && project.welcome_video_url !== key) {
    try {
      await deleteObject(project.welcome_video_url);
    } catch (e) {
      console.error('[welcome-video delete old]', e);
    }
  }

  const { error } = await supabase
    .from('projects')
    .update({ welcome_video_url: key })
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
  const { data: project } = await supabase
    .from('projects')
    .select('welcome_video_url')
    .eq('id', params.id)
    .single();

  if (project?.welcome_video_url) {
    try {
      await deleteObject(project.welcome_video_url);
    } catch (e) {
      console.error('[welcome-video delete]', e);
    }
  }

  const { error } = await supabase
    .from('projects')
    .update({ welcome_video_url: null })
    .eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
