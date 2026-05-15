// ============================================================
// API: /api/admin/projects/[id]/scenes
//  POST multipart { file, title? } → sube escena 360 a R2 + DB row.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { buildSceneKey, uploadBuffer } from '@/lib/r2';

export const dynamic = 'force-dynamic';
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
    .select('id, slug')
    .eq('id', params.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const title =
    (form.get('title') as string | null)?.trim() || 'Escena sin título';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Tipo de archivo inválido' }, { status: 400 });
  }

  // Sube el archivo equirrectangular a R2.
  const key = buildSceneKey(project.slug, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadBuffer(key, buffer, file.type);

  // Calcula el siguiente order_index (max + 1).
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
