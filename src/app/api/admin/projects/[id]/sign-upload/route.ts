// ============================================================
// API: /api/admin/projects/[id]/sign-upload
//
// POST { kind: 'cover' | 'scene', filename, contentType }
//  → { uploadUrl, key }
//
// El navegador hace PUT directo a uploadUrl con el archivo y
// luego llama al endpoint de confirmación correspondiente:
//   - cover  → POST /api/admin/projects/[id]/cover  { key }
//   - scene  → POST /api/admin/projects/[id]/scenes { key, title }
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { buildAudioKey, buildCoverKey, buildFloorplanKey, buildGalleryKey, buildLogoKey, buildSceneKey, buildSpecsKey, buildWelcomeKey, getSignedPutUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

// Tamaño máximo aceptado para imágenes/audio (50 MB).
const MAX_SIZE = 50 * 1024 * 1024;
// Videos pueden ser un poco más pesados (100 MB para 60s en 1080p).
const MAX_SIZE_VIDEO = 100 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const kind = body.kind;
  const filename = String(body.filename ?? '');
  const contentType = String(body.contentType ?? '');
  const size = Number(body.size ?? 0);

  if (
    kind !== 'cover' &&
    kind !== 'scene' &&
    kind !== 'logo' &&
    kind !== 'audio' &&
    kind !== 'floorplan' &&
    kind !== 'specs' &&
    kind !== 'welcome' &&
    kind !== 'gallery'
  ) {
    return NextResponse.json({ error: 'kind inválido' }, { status: 400 });
  }

  // Validación de tipo MIME por kind.
  const isImage = contentType.startsWith('image/');
  const isAudio = contentType.startsWith('audio/');
  const isVideo = contentType.startsWith('video/');
  if (kind === 'audio') {
    if (!filename || !isAudio) {
      return NextResponse.json(
        { error: 'Archivo de audio inválido (MP3, M4A, OGG, WAV)' },
        { status: 400 }
      );
    }
  } else if (kind === 'welcome') {
    if (!filename || !isVideo) {
      return NextResponse.json(
        { error: 'Archivo de video inválido (MP4, WebM, MOV)' },
        { status: 400 }
      );
    }
  } else {
    if (!filename || !isImage) {
      return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 });
    }
  }
  const limit = kind === 'welcome' ? MAX_SIZE_VIDEO : MAX_SIZE;
  if (size > limit) {
    return NextResponse.json(
      { error: `Archivo demasiado grande (>${limit / 1024 / 1024} MB)` },
      { status: 413 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase
    .from('projects')
    .select('slug')
    .eq('id', params.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }

  const key =
    kind === 'cover'
      ? buildCoverKey(project.slug, filename)
      : kind === 'logo'
      ? buildLogoKey(project.slug, filename)
      : kind === 'audio'
      ? buildAudioKey(project.slug, filename)
      : kind === 'floorplan'
      ? buildFloorplanKey(project.slug, filename)
      : kind === 'specs'
      ? buildSpecsKey(project.slug, filename)
      : kind === 'welcome'
      ? buildWelcomeKey(project.slug, filename)
      : kind === 'gallery'
      ? buildGalleryKey(project.slug, filename)
      : buildSceneKey(project.slug, filename);

  const uploadUrl = await getSignedPutUrl(key, contentType);

  return NextResponse.json({ uploadUrl, key });
}
