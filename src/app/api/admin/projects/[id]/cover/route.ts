// ============================================================
// API: /api/admin/projects/[id]/cover
//
// POST { key } → confirma una portada ya subida directamente a R2.
//                Borra la portada anterior (si existía) y actualiza DB.
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
    .select('id, slug, cover_url')
    .eq('id', params.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }

  // Validamos que la key pertenezca a este proyecto (evita ataques cruzados).
  if (!key.startsWith(`projects/${project.slug}/`)) {
    return NextResponse.json({ error: 'Key no autorizada' }, { status: 403 });
  }

  // Borra portada anterior si existía y es distinta.
  if (project.cover_url && project.cover_url !== key) {
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
