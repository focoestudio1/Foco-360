// ============================================================
// API: /api/admin/projects/[id]/gallery/[photoId]
//
// PATCH { caption } → actualiza el caption de una foto.
// DELETE            → borra la fila y el objeto en R2.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { deleteObject } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const caption =
    typeof body.caption === 'string' ? body.caption.trim() || null : undefined;

  if (caption === undefined) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('gallery_photos')
    .update({ caption })
    .eq('id', params.photoId)
    .eq('project_id', params.id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ photo: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; photoId: string } }
) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = createSupabaseAdminClient();

  // Traemos primero la foto para saber su image_url (para borrar de R2).
  const { data: photo } = await supabase
    .from('gallery_photos')
    .select('id, image_url')
    .eq('id', params.photoId)
    .eq('project_id', params.id)
    .maybeSingle();

  if (!photo) {
    return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 });
  }

  // Borra el objeto en R2 (mejor esfuerzo — si falla igual borramos la fila).
  await deleteObject(photo.image_url).catch((err) => {
    console.warn('[gallery DELETE] R2 delete failed:', err?.message);
  });

  const { error } = await supabase
    .from('gallery_photos')
    .delete()
    .eq('id', params.photoId)
    .eq('project_id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
