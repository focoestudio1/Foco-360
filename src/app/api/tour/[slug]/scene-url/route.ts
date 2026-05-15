// ============================================================
// API: /api/tour/[slug]/scene-url?key=<r2-key>
//   GET → devuelve URL firmada para una key específica.
// Requiere la cookie de acceso al tour.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { getSignedReadUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  // Validamos acceso por cookie.
  const cookie = req.cookies.get(`tour_access_${params.slug}`)?.value;
  if (cookie !== '1') {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'key requerida' }, { status: 400 });
  }

  // La key debe pertenecer al slug del tour (evita firmar archivos ajenos).
  if (!key.startsWith(`projects/${params.slug}/`)) {
    return NextResponse.json({ error: 'Key no autorizada' }, { status: 403 });
  }

  // Verificamos que la escena existe en este proyecto.
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, is_active')
    .eq('slug', params.slug)
    .single();
  if (!project || !project.is_active) {
    return NextResponse.json({ error: 'Tour no disponible' }, { status: 404 });
  }

  const url = await getSignedReadUrl(key);
  return NextResponse.json({ url });
}
