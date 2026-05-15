// ============================================================
// API: /api/admin/projects
//  - GET:  listar proyectos
//  - POST: crear proyecto (con contraseña hasheada)
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { generateSlug, randomSuffix } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// ---------- GET ----------
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, slug, name, client_name, is_active, views, cover_url, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ projects: data ?? [] });
}

// ---------- POST ----------
export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const name = String(body.name ?? '').trim();
  const password = String(body.password ?? '');
  const clientName = body.client_name ? String(body.client_name).trim() : null;
  const description = body.description ? String(body.description).trim() : null;

  // Validación
  if (!name) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
  }
  if (!password || password.length < 4) {
    return NextResponse.json(
      { error: 'La contraseña debe tener al menos 4 caracteres' },
      { status: 400 }
    );
  }

  // Genera slug único — si ya existe agrega sufijo aleatorio.
  const supabase = createSupabaseAdminClient();
  let slug = generateSlug(name) || `tour-${randomSuffix(6)}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${generateSlug(name)}-${randomSuffix(5)}`;
  }

  // Hash de contraseña (bcrypt, 10 rounds — balance speed/seguridad).
  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('projects')
    .insert({
      slug,
      name,
      client_name: clientName,
      description,
      password_hash,
      is_active: true,
    })
    .select('id, slug, name')
    .single();

  if (error) {
    console.error('[POST /api/admin/projects]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data }, { status: 201 });
}
