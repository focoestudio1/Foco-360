// ============================================================
// API: /api/admin/projects/[id]
//  - GET:    obtener proyecto + escenas + hotspots
//  - PATCH:  actualizar campos (incluida contraseña opcional)
//  - DELETE: eliminar proyecto (cascada DB + R2)
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { getAdminUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { deletePrefix, getSignedReadUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

// ---------- GET ----------
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = createSupabaseAdminClient();

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single();
  if (error || !project) {
    return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  }

  const { data: scenes } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', params.id)
    .order('order_index', { ascending: true });

  const sceneIds = (scenes ?? []).map((s) => s.id);
  let hotspots: any[] = [];
  if (sceneIds.length > 0) {
    const { data: hs } = await supabase
      .from('hotspots')
      .select('*')
      .in('scene_id', sceneIds);
    hotspots = hs ?? [];
  }

  // Firmamos URLs de portada, logo y escenas para preview en el admin.
  const cover_signed_url = project.cover_url
    ? await getSignedReadUrl(project.cover_url).catch(() => null)
    : null;
  const logo_signed_url = project.logo_url
    ? await getSignedReadUrl(project.logo_url).catch(() => null)
    : null;
  const floorplan_signed_url = project.floorplan_url
    ? await getSignedReadUrl(project.floorplan_url).catch(() => null)
    : null;
  const specs_image_signed_url = project.specs_image_url
    ? await getSignedReadUrl(project.specs_image_url).catch(() => null)
    : null;
  const welcome_video_signed_url = project.welcome_video_url
    ? await getSignedReadUrl(project.welcome_video_url).catch(() => null)
    : null;

  const scenesSigned = await Promise.all(
    (scenes ?? []).map(async (s) => ({
      ...s,
      signed_url: await getSignedReadUrl(s.image_url).catch(() => null),
      audio_signed_url: s.audio_url
        ? await getSignedReadUrl(s.audio_url).catch(() => null)
        : null,
    }))
  );

  // No exponer el hash — solo si existe contraseña configurada.
  const { password_hash, ...safeProject } = project;
  const has_password = !!password_hash;

  return NextResponse.json({
    project: {
      ...safeProject,
      has_password,
      cover_signed_url,
      logo_signed_url,
      floorplan_signed_url,
      specs_image_signed_url,
      welcome_video_signed_url,
    },
    scenes: scenesSigned,
    hotspots,
  });
}

// ---------- PATCH ----------
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const update: Record<string, any> = {};
  if (typeof body.name === 'string') update.name = body.name.trim();
  if ('client_name' in body)
    update.client_name = body.client_name?.toString().trim() || null;
  if ('description' in body)
    update.description = body.description?.toString().trim() || null;
  if (typeof body.is_active === 'boolean') update.is_active = body.is_active;
  if (typeof body.cover_url === 'string') update.cover_url = body.cover_url;

  // WhatsApp: teléfono (formato internacional sin +) + mensaje pre-cargado.
  if ('whatsapp_phone' in body) {
    const raw = body.whatsapp_phone?.toString() ?? '';
    const digits = raw.replace(/\D/g, '');
    update.whatsapp_phone = digits || null;
  }
  if ('whatsapp_message' in body) {
    update.whatsapp_message =
      body.whatsapp_message?.toString().trim() || null;
  }
  // Color de marca: solo aceptamos hex #RRGGBB (6 dígitos).
  if ('brand_color' in body) {
    const v = body.brand_color?.toString().trim() ?? '';
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      update.brand_color = v.toLowerCase();
    } else if (v === '') {
      update.brand_color = null; // vuelve al default
    }
  }
  // Ficha del inmueble (specs)
  if ('specs_title' in body) {
    update.specs_title = body.specs_title?.toString().trim() || null;
  }
  if ('specs_price' in body) {
    update.specs_price = body.specs_price?.toString().trim() || null;
  }
  if ('specs_features' in body) {
    update.specs_features = body.specs_features?.toString().trim() || null;
  }
  if ('specs_description' in body) {
    update.specs_description = body.specs_description?.toString().trim() || null;
  }
  // Música de fondo: id de pista en la biblioteca + volumen base.
  if ('background_music_id' in body) {
    update.background_music_id =
      body.background_music_id?.toString().trim() || null;
  }
  if ('background_music_volume' in body) {
    const v = Number(body.background_music_volume);
    if (Number.isFinite(v) && v >= 0 && v <= 1) {
      update.background_music_volume = v;
    }
  }

  // Contraseña:
  //   - body.password = "xxxxxxxx"  → setea/cambia contraseña
  //   - body.password = ""          → ignora (no cambia nada)
  //   - body.remove_password = true → elimina contraseña (tour público)
  if (typeof body.password === 'string' && body.password.length >= 4) {
    update.password_hash = await bcrypt.hash(body.password, 10);
  } else if (body.remove_password === true) {
    update.password_hash = null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('projects')
    .update(update)
    .eq('id', params.id)
    .select('id, slug, name, is_active, cover_url')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Invalida el cache del visor público y de las páginas admin del
  // proyecto. Sin esto, Vercel edge puede servir HTML stale después
  // de pausar/activar.
  if (data?.slug) {
    try {
      revalidatePath(`/tour/${data.slug}`);
      revalidatePath(`/admin/projects/${data.slug}`);
      revalidatePath('/admin/projects');
      revalidatePath('/admin');
    } catch (e) {
      console.warn('[revalidate]', e);
    }
  }
  return NextResponse.json({ project: data });
}

// ---------- DELETE ----------
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getAdminUser();
  if (!admin) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = createSupabaseAdminClient();

  // Necesitamos el slug para borrar los archivos R2 bajo ese prefijo.
  const { data: project } = await supabase
    .from('projects')
    .select('slug')
    .eq('id', params.id)
    .single();

  // 1) Borra proyecto (cascada borra scenes + hotspots por FK).
  const { error } = await supabase.from('projects').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2) Limpia archivos en R2. Si falla, log pero no bloqueamos.
  if (project?.slug) {
    try {
      await deletePrefix(`projects/${project.slug}/`);
    } catch (e) {
      console.error('[DELETE r2 prefix]', e);
    }
  }

  return NextResponse.json({ ok: true });
}
