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

  // ¿El tour es PÚBLICO (activo y sin contraseña)? Lo necesitamos saber siempre:
  // decide si la imagen puede quedar en la caché compartida de Vercel.
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase
    .from('projects')
    .select('password_hash, is_active')
    .eq('slug', params.slug)
    .single();
  const esPublico = !!project && !!project.is_active && !project.password_hash;

  // Triple ruta de autorización: tour público, cookie de acceso o admin.
  let allowed = esPublico;
  if (!allowed) {
    const cookieAccess =
      req.cookies.get(`tour_access_${params.slug}`)?.value === '1';
    allowed = cookieAccess && !!project && !!project.is_active;
    if (!allowed) allowed = !!(await getAdminUser()); // el admin ve también inactivos
  }

  if (!allowed) {
    if (!project || !project.is_active) return new NextResponse('Not Found', { status: 404 });
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Firmamos URL R2 internamente y descargamos.
  const signedUrl = await getSignedReadUrl(key);
  const r2 = await fetch(signedUrl);
  if (!r2.ok || !r2.body) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Caché. Cada archivo subido tiene un nombre ÚNICO (lleva la fecha/hora), así
  // que su contenido nunca cambia:
  //  - Tour PÚBLICO → caché compartida de Vercel 30 días (s-maxage): la 2ª visita
  //    en adelante la recibe desde el servidor de Vercel más cercano, sin pasar
  //    por esta función, por R2 ni por Supabase → carga mucho más rápido.
  //  - Tour con CONTRASEÑA → solo el navegador de quien tiene acceso (private).
  const cacheControl = esPublico
    ? 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400'
    : 'private, max-age=86400';
  const headers: Record<string, string> = {
    'Content-Type': r2.headers.get('Content-Type') || 'image/jpeg',
    'Cache-Control': cacheControl,
  };
  const len = r2.headers.get('Content-Length');
  if (len) headers['Content-Length'] = len;

  return new NextResponse(r2.body, { status: 200, headers });
}
