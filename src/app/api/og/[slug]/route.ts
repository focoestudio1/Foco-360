// ============================================================
// API: /api/og/[slug]
//
// Sirve la portada del proyecto PÚBLICAMENTE para que los scrapers
// de WhatsApp / Facebook / Twitter / LinkedIn puedan leerla cuando
// el cliente comparte el link del tour.
//
// Importante: NO requiere auth, NO chequea cookie. Es el equivalente
// público de /api/tour/[slug]/image pero solo para la portada.
// Si no hay portada o el proyecto está inactivo → 404.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { getSignedReadUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';
// Permitimos hasta 30s por si la portada es pesada.
export const maxDuration = 30;

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase
    .from('projects')
    .select('cover_url, is_active')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!project || !project.is_active || !project.cover_url) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const signedUrl = await getSignedReadUrl(project.cover_url);
  const r2 = await fetch(signedUrl);
  if (!r2.ok || !r2.body) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Cache 1h en CDN. Las portadas no cambian seguido.
  return new NextResponse(r2.body, {
    status: 200,
    headers: {
      'Content-Type': r2.headers.get('Content-Type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
