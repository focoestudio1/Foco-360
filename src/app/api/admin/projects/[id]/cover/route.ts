// ============================================================
// API: /api/admin/projects/[id]/cover
//  POST multipart/form-data { file } → sube cover a R2 y actualiza DB.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { buildCoverKey, uploadBuffer, deleteObject } from '@/lib/r2';

export const dynamic = 'force-dynamic';
// Permite payloads grandes (Vercel Hobby limita a ~4.5MB body request).
// Para fotos pesadas considerar subida directa firmada (TODO futuro).
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, slug, cover_url')
    .eq('id', params.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Tipo de archivo inválido' }, { status: 400 });
  }

  const key = buildCoverKey(project.slug, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadBuffer(key, buffer, file.type);

  // Borra portada anterior si existía.
  if (project.cover_url) {
    try {
      await deleteObject(project.cover_url);
    } catch (e) {
      console.error('[cover delete old]', e);
    }
  }

  const { error } = await supabase
    .from('projects')
    .update({ cover_url: key })
    .eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ key });
}
