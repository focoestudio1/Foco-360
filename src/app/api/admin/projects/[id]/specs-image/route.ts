// ============================================================
// API: /api/admin/projects/[id]/specs-image
//
// POST   { key } → confirma una foto de la ficha del inmueble.
// DELETE        → quita la foto (vuelve a null).
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
  const { data: project } = await supabase
    .from('projects')
    .select('id, slug, specs_image_url')
    .eq('id', params.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }
  if (!key.startsWith(`projects/${project.slug}/`)) {
    return NextResponse.json({ error: 'Key no autorizada' }, { status: 403 });
  }

  if (project.specs_image_url && project.specs_image_url !== key) {
    try {
      await deleteObject(project.specs_image_url);
    } catch (e) {
      console.error('[specs-image delete old]', e);
    }
  }

  const { error } = await supabase
    .from('projects')
    .update({ specs_image_url: key })
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
    .select('specs_image_url')
    .eq('id', params.id)
    .single();

  if (project?.specs_image_url) {
    try {
      await deleteObject(project.specs_image_url);
    } catch (e) {
      console.error('[specs-image delete]', e);
    }
  }
  const { error } = await supabase
    .from('projects')
    .update({ specs_image_url: null })
    .eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
