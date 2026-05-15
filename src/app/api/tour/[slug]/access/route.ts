// ============================================================
// API: /api/tour/[slug]/access
//  POST { password } → si coincide, setea cookie HttpOnly de
//  acceso temporal y devuelve { ok: true }.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Tiempo de validez del acceso (en segundos). 4h razonable para una visita.
const ACCESS_TTL = 60 * 60 * 4;

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const body = await req.json().catch(() => ({}));
  const password = String(body.password ?? '');

  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, is_active, password_hash, views')
    .eq('slug', params.slug)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Tour no encontrado' }, { status: 404 });
  }
  if (!project.is_active) {
    return NextResponse.json({ error: 'Tour no disponible' }, { status: 403 });
  }

  // Si el proyecto NO tiene contraseña configurada (tour público), no
  // exigimos password — solo cookie + increment de vistas.
  if (project.password_hash) {
    if (!password) {
      return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 });
    }
    const ok = await bcrypt.compare(password, project.password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }
  }

  // Incrementa contador de vistas y marca timestamp.
  await supabase
    .from('projects')
    .update({
      views: (project.views ?? 0) + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq('id', project.id);

  const res = NextResponse.json({ ok: true });
  // Cookie HttpOnly específica del slug — no es transferible entre tours.
  res.cookies.set({
    name: `tour_access_${params.slug}`,
    value: '1',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/tour/${params.slug}`,
    maxAge: ACCESS_TTL,
  });
  return res;
}
