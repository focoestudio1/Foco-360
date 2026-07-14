// ============================================================
// API: /api/tour/[slug]/lead
//
// POST { name, email, phone?, message? }
//   → guarda el lead en la DB, setea cookie lead_captured_[slug]
//     por 30 dias (para no re-mostrar el form al mismo visitante).
//
// Solo acepta si el proyecto tiene requires_lead = true.
// El endpoint es publico (no requiere auth) pero valida
// project.requires_lead para no aceptar leads spurios.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Cookie persistente por 30 dias para no molestar al visitante recurrente.
const LEAD_COOKIE_TTL = 60 * 60 * 24 * 30;

// Validacion basica de email — no queremos regex loca de RFC, solo evitar
// que el visitante mande "sanjuan" como email.
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  const phone = body.phone ? String(body.phone).trim() : null;
  const message = body.message ? String(body.message).trim() : null;

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  }
  if (message && message.length > 1000) {
    return NextResponse.json({ error: 'Mensaje demasiado largo' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, requires_lead, is_active')
    .eq('slug', params.slug)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Tour no encontrado' }, { status: 404 });
  }
  if (!project.is_active) {
    return NextResponse.json({ error: 'Tour no disponible' }, { status: 403 });
  }
  if (!project.requires_lead) {
    // Alguien esta llamando la API sin necesidad — no aceptamos leads
    // en tours abiertos para evitar basura en la tabla.
    return NextResponse.json({ error: 'Este tour no requiere formulario' }, { status: 400 });
  }

  // IP y user agent para analytics/dedup — best effort.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null;
  const userAgent = req.headers.get('user-agent') || null;

  const { error } = await supabase.from('leads').insert({
    project_id: project.id,
    name,
    email,
    phone,
    message,
    ip_address: ip,
    user_agent: userAgent,
  });

  if (error) {
    console.error('[/api/tour/:slug/lead] insert failed', error);
    return NextResponse.json(
      { error: 'No se pudo guardar. Intentá de nuevo.' },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ ok: true });
  // Cookie NO httpOnly — se lee desde el server-side de /tour/[slug]/page.tsx
  // para saltarse el LeadForm en visitas recurrentes.
  res.cookies.set({
    name: `lead_captured_${params.slug}`,
    value: '1',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/tour/${params.slug}`,
    maxAge: LEAD_COOKIE_TTL,
  });
  return res;
}
