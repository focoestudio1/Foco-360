// ============================================================
// API: /api/admin/scenes/[id]
//  - PATCH:  renombrar escena
//  - DELETE: eliminar escena (DB cascada hotspots) + objeto en R2
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { deleteObject } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => ({}));
  const update: Record<string, any> = {};
  if (typeof body.title === 'string') update.title = body.title.trim();

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('scenes')
    .update(update)
    .eq('id', params.id)
    .select('*')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ scene: data });
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
    .select('image_url')
    .eq('id', params.id)
    .single();

  const { error } = await supabase.from('scenes').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (scene?.image_url) {
    try {
      await deleteObject(scene.image_url);
    } catch (e) {
      console.error('[DELETE scene r2]', e);
    }
  }
  return NextResponse.json({ ok: true });
}
