// ============================================================
// API: /api/admin/projects/[id]/floorplan
//
// POST   { key }  → confirma un plano 2D ya subido a R2.
// DELETE         → quita el plano (vuelve a NULL).
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
    .select('id, slug, floorplan_url')
    .eq('id', params.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }
  if (!key.startsWith(`projects/${project.slug}/`)) {
    return NextResponse.json({ error: 'Key no autorizada' }, { status: 403 });
  }

  if (project.floorplan_url && project.floorplan_url !== key) {
    try {
      await deleteObject(project.floorplan_url);
    } catch (e) {
      console.error('[floorplan delete old]', e);
    }
  }

  const { error } = await supabase
    .from('projects')
    .update({ floorplan_url: key })
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
    .select('floorplan_url')
    .eq('id', params.id)
    .single();

  if (project?.floorplan_url) {
    try {
      await deleteObject(project.floorplan_url);
    } catch (e) {
      console.error('[floorplan delete]', e);
    }
  }
  const { error } = await supabase
    .from('projects')
    .update({ floorplan_url: null })
    .eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
