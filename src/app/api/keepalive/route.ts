// ============================================================
// API: /api/keepalive
//
// Mantiene DESPIERTO el proyecto de Supabase (plan Free lo pausa tras
// 7 días sin actividad → todos los tours salen "Tour no encontrado").
//
// Hace una consulta REAL a la base con la llave de servidor (Service Role),
// así que cuenta como actividad aunque falle la clave del Worker de
// Cloudflare. Lo llaman, de forma independiente:
//   1. Vercel Cron (vercel.json) — todos los días.
//   2. El Worker "foco360-keepalive" de Cloudflare — todos los días.
//   3. El admin de FOCO Plataforma al abrirse (y avisa si está pausado).
//
// Responde 200 { ok:true } si la base respondió; 503 si no.
// No expone datos: solo cuenta filas.
// ============================================================

import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};

export async function GET() {
  const t = new Date().toISOString();
  try {
    const supabase = createSupabaseAdminClient();
    const { count, error } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, tours: count ?? 0, t }, { headers: CORS });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[keepalive] Supabase no respondió:', msg);
    return NextResponse.json({ ok: false, error: msg, t }, { status: 503, headers: CORS });
  }
}
