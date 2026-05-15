// ============================================================
// API: /api/admin/projects/[id]/reorder
//  POST { order: string[] } → actualiza order_index de las escenas.
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const order = body.order;
  if (!Array.isArray(order) || order.some((v) => typeof v !== 'string')) {
    return NextResponse.json({ error: 'order debe ser string[]' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Actualiza en paralelo cada escena con su nuevo order_index.
  // Filtramos por project_id como precaución contra IDs ajenas.
  const updates = order.map((sceneId, idx) =>
    supabase
      .from('scenes')
      .update({ order_index: idx })
      .eq('id', sceneId)
      .eq('project_id', params.id)
  );
  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
