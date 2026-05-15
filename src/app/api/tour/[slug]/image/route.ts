// ============================================================
// API: /api/tour/[slug]/image?key=<r2-key>
//
// Proxy del binario de la imagen desde R2. Resuelve el problema
// de CORS en R2 con URLs firmadas y oculta totalmente la firma
// al navegador. Pannellum carga la imagen como si fuera del
// mismo origen.
//
// Acceso permitido si:
//  - el usuario es admin (Supabase auth), o
//  - tiene cookie tour_access_<slug>, o
//  - el proyecto no tiene contraseña (público).
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { getSignedReadUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';
// En Vercel, evitar timeout corto: el archivo puede ser grande.
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  // La key debe pertenecer al slug — evita filtrar archivos ajenos.
  if (!key.startsWith(`projects/${params.slug}/`)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Triple ruta de autorización.
  const admin = await getAdminUser();
  const cookieAccess =
    req.cookies.get(`tour_access_${params.slug}`)?.value === '1';

  let allowed = !!admin || cookieAccess;

  if (!allowed) {
    // Proyecto público (sin contraseña) → acceso libre.
    const supabase = createSupabaseAdminClient();
    const { data: project } = await supabase
      .from('projects')
      .select('password_hash, is_active')
      .eq('slug', params.slug)
      .single();
    if (!project) return new NextResponse('Not Found', { status: 404 });
    if (!project.is_active) {
      return new NextResponse('Not Found', { status: 404 });
    }
    allowed = !project.password_hash;
  }

  if (!allowed) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Firmamos URL R2 internamente y descargamos.
  const signedUrl = await getSignedReadUrl(key);
  const r2 = await fetch(signedUrl);
  if (!r2.ok || !r2.body) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Stream del body al cliente. Cache 1h (las panoramicas no cambian).
  return new NextResponse(r2.body, {
    status: 200,
    headers: {
      'Content-Type': r2.headers.get('Content-Type') || 'image/jpeg',
      'Content-Length': r2.headers.get('Content-Length') ?? '',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
