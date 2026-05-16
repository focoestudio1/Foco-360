'use client';

// ============================================================
// Editor completo de un proyecto: agrupa sub-componentes.
// ============================================================

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectSettings } from './ProjectSettings';
import { ScenesManager } from './ScenesManager';
import { HotspotEditor } from './HotspotEditor';
import { showToast } from '@/components/ui/Toast';

export type SceneWithUrl = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  image_url: string;
  order_index: number;
  signed_url: string | null;
  // Audio narración opcional.
  audio_url: string | null;
  audio_signed_url: string | null;
};

export type Hotspot = {
  id: string;
  scene_id: string;
  target_scene_id: string | null;
  pitch: number;
  yaw: number;
  label: string | null;
};

export type Project = {
  id: string;
  slug: string;
  name: string;
  client_name: string | null;
  description: string | null;
  is_active: boolean;
  views: number;
  cover_url: string | null;
  cover_signed_url: string | null;
  // Logo personalizado del proyecto (anula el global si está seteado).
  logo_url: string | null;
  logo_signed_url: string | null;
  // true si el proyecto tiene contraseña configurada (no expone el hash).
  has_password: boolean;
  // WhatsApp opcional para botón flotante.
  whatsapp_phone: string | null;
  whatsapp_message: string | null;
  // Color de marca opcional — anula el dorado global.
  brand_color: string | null;
  last_viewed_at: string | null;
  created_at: string;
};

export function ProjectEditor({
  project,
  initialScenes,
  initialHotspots,
}: {
  project: Project;
  initialScenes: SceneWithUrl[];
  initialHotspots: Hotspot[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [scenes, setScenes] = useState(initialScenes);
  const [hotspots, setHotspots] = useState(initialHotspots);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(
    initialScenes[0]?.id ?? null
  );

  // Sincroniza estado con props cuando llega data fresca del server
  // (después de router.refresh tras upload, delete, reorder, etc.).
  // Sin esto el estado quedaba "pegado" con los signed_url=null que
  // fija la actualización optimista.
  useEffect(() => {
    setScenes(initialScenes);
  }, [initialScenes]);
  useEffect(() => {
    setHotspots(initialHotspots);
  }, [initialHotspots]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function onDelete() {
    if (!confirm(`¿Eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      showToast('error', 'Error al eliminar');
      return;
    }
    showToast('success', 'Proyecto eliminado');
    router.push('/admin/projects');
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Columna izquierda: settings */}
      <div className="space-y-6 lg:col-span-1">
        <ProjectSettings
          project={project}
          onUpdated={refresh}
          onDelete={onDelete}
        />
      </div>

      {/* Columna derecha: escenas + hotspots */}
      <div className="space-y-6 lg:col-span-2">
        <ScenesManager
          projectId={project.id}
          scenes={scenes}
          setScenes={setScenes}
          activeSceneId={activeSceneId}
          setActiveSceneId={setActiveSceneId}
          onChanged={refresh}
        />

        <HotspotEditor
          scenes={scenes}
          hotspots={hotspots}
          setHotspots={setHotspots}
          activeSceneId={activeSceneId}
          projectSlug={project.slug}
        />
      </div>
    </div>
  );
}
