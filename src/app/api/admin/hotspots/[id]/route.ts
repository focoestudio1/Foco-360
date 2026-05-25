// ============================================================
// API: /api/admin/hotspots/[id]
//  - PATCH:  editar hotspot
//  - DELETE: eliminar hotspot
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => ({}));
  const update: Record<string, any> = {};
  if (typeof body.label === 'string') update.label = body.label.trim() || null;
  if (body.target_scene_id !== undefined)
    update.target_scene_id = body.target_scene_id || null;
  if (body.pitch !== undefined) update.pitch = Number(body.pitch);
  if (body.yaw !== undefined) update.yaw = Number(body.yaw);
  // kind: 3 valores válidos.
  if (body.kind === 'navigation' || body.kind === 'info' || body.kind === 'url') {
    update.kind = body.kind;
  }
  if ('info_text' in body) {
    update.info_text = body.info_text?.toString().trim() || null;
  }
  if ('info_image_url' in body) {
    update.info_image_url = body.info_image_url?.toString().trim() || null;
  }
  if ('external_url' in body) {
    update.external_url = body.external_url?.toString().trim() || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('hotspots')
    .update(update)
    .eq('id', params.id)
    .select('*')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ hotspot: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('hotspots')
    .delete()
    .eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
