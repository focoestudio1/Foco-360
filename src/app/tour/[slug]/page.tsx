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
    .select('name, is_active')
    .eq('slug', params.slug)
    .maybeSingle();
  return {
    title: data?.name ?? 'Tour 360°',
    robots: { index: false, follow: false },
  };
}

export default async function TourPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { preview?: string };
}) {
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase
    .from('projects')
    .select('id, slug, name, client_name, description, is_active, cover_url, password_hash')
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
  const { data: scenes } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', project.id)
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

  if (!scenes || scenes.length === 0) {
    return (
      <EmptyTour name={project.name} />
    );
  }

  // URL pasada a Pannellum: pasa por nuestro proxy /api/tour/<slug>/image
  // para evitar CORS de R2 y ocultar la firma del navegador.
  const scenesSigned = scenes.map((s) => ({
    id: s.id,
    title: s.title,
    url: `/api/tour/${params.slug}/image?key=${encodeURIComponent(s.image_url)}`,
  }));

  return (
    <TourViewer
      slug={params.slug}
      projectName={project.name}
      scenes={scenesSigned}
      isPreview={!!isPreview}
      isInactive={!project.is_active}
      hotspots={hotspots.map((h) => ({
        id: h.id,
        scene_id: h.scene_id,
        target_scene_id: h.target_scene_id,
        pitch: Number(h.pitch),
        yaw: Number(h.yaw),
        label: h.label,
      }))}
    />
  );
}

// ------------------------------------------------------------
// Sub-componentes
// ------------------------------------------------------------
function UnavailableTour() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo asLink={false} className="mb-8 justify-center" />
      <h1 className="mb-2 text-2xl font-light">Tour no disponible</h1>
      <p className="text-sm text-text-muted">
        Este tour ha sido desactivado por el administrador.
      </p>
    </main>
  );
}

function EmptyTour({ name }: { name: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo asLink={false} className="mb-8 justify-center" />
      <h1 className="mb-2 text-2xl font-light">{name}</h1>
      <p className="text-sm text-text-muted">
        Este tour aún no tiene escenas. Vuelve más tarde.
      </p>
    </main>
  );
}
