// ============================================================
// API: /api/admin/change-password
//
// POST { current, new } → cambia la contraseña del admin logueado.
// Verifica la contraseña actual antes de cambiar (más seguro).
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdminUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => null);
  const current = String(body?.current ?? '');
  const next = String(body?.new ?? '');

  if (!current || !next) {
    return NextResponse.json(
      { error: 'Contraseña actual y nueva son requeridas' },
      { status: 400 }
    );
  }
  if (next.length < 6) {
    return NextResponse.json(
      { error: 'La nueva contraseña debe tener al menos 6 caracteres' },
      { status: 400 }
    );
  }
  if (current === next) {
    return NextResponse.json(
      { error: 'La nueva contraseña debe ser diferente a la actual' },
      { status: 400 }
    );
  }

  // Paso 1: verifica contraseña actual intentando sign-in.
  // Usamos un cliente separado (anon, no service_role) para que el
  // login actúe como auth real, no como bypass.
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error: signInError } = await anonClient.auth.signInWithPassword({
    email: admin.email!,
    password: current,
  });
  if (signInError) {
    return NextResponse.json(
      { error: 'Contraseña actual incorrecta' },
      { status: 401 }
    );
  }

  // Paso 2: actualiza la contraseña usando service_role (admin API).
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    admin.id,
    { password: next }
  );
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
