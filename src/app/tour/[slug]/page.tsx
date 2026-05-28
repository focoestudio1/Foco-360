// ============================================================
// Página pública del tour 360°.
//
// Lógica:
//  1) Si el proyecto no existe → 404.
//  2) Si is_active === false → mensaje "Tour no disponible".
//  3) Si no hay cookie de acceso → muestra formulario de password.
//  4) Si hay cookie → renderiza el visor con escenas firmadas.
// ============================================================

import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { getAdminUser } from '@/lib/auth';
import { getSignedReadUrl } from '@/lib/r2';
import { TourAccess } from '@/components/viewer/TourAccess';
import { TourViewer } from '@/components/viewer/TourViewer';
import { Logo } from '@/components/ui/Logo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('projects')
    .select('name, client_name, description, is_active, cover_url')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!data) {
    return { title: 'Tour 360°', robots: { index: false, follow: false } };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const tourUrl = `${siteUrl}/tour/${params.slug}`;
  // Descripción usada por WhatsApp/FB/Twitter al previsualizar.
  const description =
    data.description || data.client_name || 'Tour virtual 360°';
  // og:image apunta a nuestra ruta pública de portada (no expone R2).
  const imageUrl =
    data.cover_url && siteUrl
      ? `${siteUrl}/api/og/${params.slug}`
      : undefined;

  return {
    title: data.name,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: data.name,
      description,
      url: tourUrl,
      siteName: process.env.NEXT_PUBLIC_BRAND_NAME || 'FOCO',
      type: 'website',
      images: imageUrl
        ? [{ url: imageUrl, width: 1200, height: 630, alt: data.name }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: data.name,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function TourPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { preview?: string; embed?: string };
}) {
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, slug, name, client_name, description, is_active, cover_url, password_hash, logo_url, whatsapp_phone, whatsapp_message, brand_color, floorplan_url, specs_image_url, specs_title, specs_price, specs_features, specs_description, background_music_id, background_music_volume')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!project) notFound();

  // ---- Vista previa de admin (bypass contraseña + estado inactivo) ----
  // Si el usuario es admin y pasa ?preview=1, entra directo sin
  // incrementar el contador de vistas. Útil para construir tours.
  const isPreview = searchParams.preview === '1' && (await getAdminUser());

  // ---- Tour desactivado (solo para visitantes, no para admin en preview) ----
  if (!project.is_active && !isPreview) {
    return <UnavailableTour />;
  }

  // ---- Acceso: hay 3 casos ----
  //   1. Admin en preview → entra directo
  //   2. Proyecto sin contraseña → entra directo (tour público)
  //   3. Proyecto con contraseña → necesita cookie de acceso
  const cookieStore = cookies();
  const isPublic = !project.password_hash;
  const hasAccess =
    isPreview ||
    isPublic ||
    cookieStore.get(`tour_access_${params.slug}`)?.value === '1';

  if (!hasAccess) {
    const coverUrl = project.cover_url
      ? await getSignedReadUrl(project.cover_url).catch(() => null)
      : null;
    return (
      <TourAccess
        slug={params.slug}
        name={project.name}
        clientName={project.client_name}
        description={project.description}
        coverUrl={coverUrl}
      />
    );
  }

  // ---- Carga escenas y hotspots ----
  const { data: scenes, error: scenesError } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', project.id)
    .order('order_index', { ascending: true });

  // Log a Vercel server logs para diagnóstico.
  if (scenesError) {
    console.error('[/tour/:slug] scenes query failed', {
      slug: params.slug,
      project_id: project.id,
      error: scenesError,
    });
  } else {
    console.log('[/tour/:slug] scenes loaded', {
      slug: params.slug,
      project_id: project.id,
      count: scenes?.length ?? 0,
    });
  }

  const sceneIds = (scenes ?? []).map((s) => s.id);
  let hotspots: any[] = [];
  if (sceneIds.length > 0) {
    const { data: hs } = await supabase
      .from('hotspots')
      .select('*')
      .in('scene_id', sceneIds);
    hotspots = hs ?? [];
  }

  if (!scenes || scenes.length === 0) {
    return (
      <EmptyTour
        name={project.name}
        debug={{
          projectId: project.id,
          scenesError: scenesError?.message ?? null,
          slugParam: params.slug,
        }}
      />
    );
  }

  // URL pasada a Pannellum: pasa por nuestro proxy /api/tour/<slug>/image
  // para evitar CORS de R2 y ocultar la firma del navegador.
  // Audio NO necesita proxy (el elemento <audio> no aplica CORS por defecto).
  const scenesSigned = await Promise.all(
    scenes.map(async (s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      url: `/api/tour/${params.slug}/image?key=${encodeURIComponent(s.image_url)}`,
      audioUrl: s.audio_url
        ? await getSignedReadUrl(s.audio_url).catch(() => null)
        : null,
      floorplanX: s.floorplan_x != null ? Number(s.floorplan_x) : null,
      floorplanY: s.floorplan_y != null ? Number(s.floorplan_y) : null,
    }))
  );

  // Logo y plano del proyecto (si tiene).
  const logoUrl = project.logo_url
    ? await getSignedReadUrl(project.logo_url).catch(() => null)
    : null;
  const floorplanUrl = project.floorplan_url
    ? await getSignedReadUrl(project.floorplan_url).catch(() => null)
    : null;
  const specsImageUrl = project.specs_image_url
    ? await getSignedReadUrl(project.specs_image_url).catch(() => null)
    : null;

  return (
    <TourViewer
      slug={params.slug}
      projectName={project.name}
      scenes={scenesSigned}
      isPreview={!!isPreview}
      isInactive={!project.is_active}
      logoUrl={logoUrl}
      whatsappPhone={project.whatsapp_phone}
      whatsappMessage={project.whatsapp_message}
      brandColor={project.brand_color}
      isEmbed={searchParams.embed === '1'}
      floorplanUrl={floorplanUrl}
      specs={{
        imageUrl: specsImageUrl,
        title: project.specs_title,
        price: project.specs_price,
        features: project.specs_features,
        description: project.specs_description,
      }}
      backgroundMusicId={project.background_music_id}
      backgroundMusicVolume={
        project.background_music_volume != null
          ? Number(project.background_music_volume)
          : null
      }
      hotspots={hotspots.map((h) => ({
        id: h.id,
        scene_id: h.scene_id,
        target_scene_id: h.target_scene_id,
        pitch: Number(h.pitch),
        yaw: Number(h.yaw),
        label: h.label,
        kind: (h.kind === 'info' || h.kind === 'url'
          ? h.kind
          : 'navigation') as 'info' | 'navigation' | 'url',
        info_text: h.info_text ?? null,
        info_image_url: h.info_image_url ?? null,
        external_url: h.external_url ?? null,
      }))}
    />
  );
}

// ------------------------------------------------------------
// Sub-componentes
// ------------------------------------------------------------
function BrandedLogo() {
  const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL;
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || 'FOCO 360°';
  if (logoUrl) {
    return (
      <div className="mb-10 inline-flex items-center rounded-2xl bg-white/95 p-5 shadow-xl shadow-gold/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={brand} className="h-24 w-auto sm:h-28" draggable={false} />
      </div>
    );
  }
  return <Logo asLink={false} className="mb-10 scale-150 justify-center" />;
}

function UnavailableTour() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <BrandedLogo />
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-gold">
        Vuelve pronto
      </p>
      <h1 className="font-display mb-3 text-3xl font-medium tracking-wide sm:text-4xl">
        Tour pausado
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-text-muted">
        Este tour no está disponible en este momento. Contacta al administrador
        para más información.
      </p>
    </main>
  );
}

function EmptyTour({
  name,
  debug,
}: {
  name: string;
  debug?: { projectId: string; scenesError: string | null; slugParam: string };
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <BrandedLogo />
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-gold">
        Próximamente
      </p>
      <h1 className="font-display mb-3 text-3xl font-medium tracking-wide sm:text-4xl">
        {name}
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-text-muted">
        Este tour aún no tiene escenas cargadas. Estamos preparándolo —
        vuelve más tarde.
      </p>
      {debug && (
        <pre className="mt-8 max-w-xl whitespace-pre-wrap rounded-md border border-border bg-bg-elevated p-3 text-left text-[10px] text-text-subtle">
{`DEBUG
slug:        ${debug.slugParam}
projectId:   ${debug.projectId}
scenesError: ${debug.scenesError ?? '(sin error - simplemente devolvió 0 escenas)'}`}
        </pre>
      )}
    </main>
  );
}
