// ============================================================
// API: /api/public/tours
//
// Lista de recorridos para que el admin de FOCO Plataforma
// (galerias.focoestudio.net/admin/tours.html) los muestre solos, sin
// tener que copiar slugs a mano.
//
// Solo datos de catálogo (nombre, cliente, portada pública, vistas,
// escenas). NUNCA la contraseña ni keys de R2: la portada va por
// /api/og/<slug>, que ya es pública (la usan WhatsApp/Facebook).
//
// Bonus: cada llamada es una consulta real a la base → también ayuda a
// que Supabase no se pause.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  // 1 minuto en la red de Vercel: el admin ve cambios casi al instante
  // sin consultar la base en cada recarga.
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
};

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  try {
    const supabase = createSupabaseAdminClient();
    const [{ data: projects, error }, { data: views }, { data: scenes }] = await Promise.all([
      supabase
        .from('projects')
        .select('id, slug, name, client_name, is_active, cover_url, password_hash, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('scene_views').select('project_id'),
      supabase.from('scenes').select('project_id, kind'),
    ]);
    if (error) throw new Error(error.message);

    const vistas: Record<string, number> = {};
    (views ?? []).forEach((v) => { vistas[v.project_id] = (vistas[v.project_id] ?? 0) + 1; });
    const fotos: Record<string, number> = {};
    const videos: Record<string, number> = {};
    (scenes ?? []).forEach((s) => {
      const k = s.kind === 'video' ? videos : fotos;
      k[s.project_id] = (k[s.project_id] ?? 0) + 1;
    });

    const tours = (projects ?? []).map((p) => ({
      slug: p.slug,
      titulo: p.name,
      cliente: p.client_name || '',
      activo: !!p.is_active,
      conContrasena: !!p.password_hash,
      portada: p.cover_url && p.is_active ? `${origin}/api/og/${encodeURIComponent(p.slug)}` : '',
      vistas: vistas[p.id] ?? 0,
      escenasFoto: fotos[p.id] ?? 0,
      escenasVideo: videos[p.id] ?? 0,
      creado: p.created_at,
      url: `${origin}/tour/${encodeURIComponent(p.slug)}`,
      editar: `${origin}/admin/projects/${encodeURIComponent(p.slug)}`,
    }));

    return NextResponse.json({ ok: true, tours }, { headers: HEADERS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, error: msg, tours: [] },
      { status: 503, headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } }
    );
  }
}
