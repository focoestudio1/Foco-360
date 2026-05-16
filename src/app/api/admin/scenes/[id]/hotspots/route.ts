// ============================================================
// API: /api/admin/scenes/[id]/hotspots
//  POST → crea un hotspot en la escena.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

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

  const pitch = Number(body.pitch ?? 0);
  const yaw = Number(body.yaw ?? 0);
  const target_scene_id = body.target_scene_id || null;
  const label = body.label ? String(body.label).trim() : null;
  const kind = body.kind === 'info' ? 'info' : 'navigation';
  const info_text = body.info_text?.toString().trim() || null;
  const info_image_url = body.info_image_url?.toString().trim() || null;

  if (Number.isNaN(pitch) || Number.isNaN(yaw)) {
    return NextResponse.json({ error: 'pitch/yaw inválidos' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('hotspots')
    .insert({
      scene_id: params.id,
      target_scene_id,
      pitch,
      yaw,
      label,
      kind,
      info_text,
      info_image_url,
    })
    .select('*')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ hotspot: data }, { status: 201 });
}
