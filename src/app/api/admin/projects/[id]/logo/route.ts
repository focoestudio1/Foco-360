// ============================================================
// API: /api/admin/projects/[id]/logo
//
// POST   { key } → confirma un logo ya subido directamente a R2.
//                  Borra el logo anterior (si existía) y actualiza DB.
// DELETE        → quita el logo del proyecto (vuelve al global).
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
    .select('id, slug, logo_url')
    .eq('id', params.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }
  if (!key.startsWith(`projects/${project.slug}/`)) {
    return NextResponse.json({ error: 'Key no autorizada' }, { status: 403 });
  }

  // Borra logo anterior si era distinto.
  if (project.logo_url && project.logo_url !== key) {
    try {
      await deleteObject(project.logo_url);
    } catch (e) {
      console.error('[logo delete old]', e);
    }
  }

  const { error } = await supabase
    .from('projects')
    .update({ logo_url: key })
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
    .select('logo_url')
    .eq('id', params.id)
    .single();

  if (project?.logo_url) {
    try {
      await deleteObject(project.logo_url);
    } catch (e) {
      console.error('[logo delete]', e);
    }
  }

  const { error } = await supabase
    .from('projects')
    .update({ logo_url: null })
    .eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
