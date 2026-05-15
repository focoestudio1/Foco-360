'use client';

// ============================================================
// Visor 360° principal del tour.
// Carga Pannellum dinámicamente (sin SSR) y monta una escena
// configurada con sus hotspots. Permite cambiar entre escenas
// vía miniaturas o hotspots.
// ============================================================

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect } from 'react';
import { Logo } from '@/components/ui/Logo';

const Pannellum = dynamic(() => import('./PannellumViewer').then((m) => m.PannellumViewer), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-black text-xs text-text-subtle">
      Cargando visor 360°…
    </div>
  ),
});

export type ViewerScene = { id: string; title: string; url: string };
export type ViewerHotspot = {
  id: string;
  scene_id: string;
  target_scene_id: string | null;
  pitch: number;
  yaw: number;
  label: string | null;
};

export function TourViewer({
  slug: _slug,
  projectName,
  scenes,
  hotspots,
  isPreview = false,
  isInactive = false,
}: {
  slug: string;
  projectName: string;
  scenes: ViewerScene[];
  hotspots: ViewerHotspot[];
  // Modo preview de admin (bypass contraseña).
  isPreview?: boolean;
  // El proyecto está desactivado (solo visible en preview).
  isInactive?: boolean;
}) {
  const [activeId, setActiveId] = useState<string>(scenes[0]?.id);
  const [fullscreen, setFullscreen] = useState(false);

  const activeScene = scenes.find((s) => s.id === activeId);
  const activeHotspots = hotspots.filter((h) => h.scene_id === activeId);

  const goToScene = useCallback((sceneId: string) => {
    setActiveId(sceneId);
  }, []);

  // Detectar cambios de fullscreen para sincronizar el icono.
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white">
      {/* Banner de vista previa de admin */}
      {isPreview && (
        <div className="z-30 flex items-center justify-center gap-3 border-b border-gold/30 bg-gold/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider text-gold backdrop-blur">
          <span>Vista previa (admin)</span>
          {isInactive && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-red-200">
              Tour desactivado · no visible para clientes
            </span>
          )}
        </div>
      )}

      {/* Visor 360° (ocupa toda la altura) */}
      <div className="relative flex-1">
        {activeScene && (
          <Pannellum
            key={activeScene.id}
            imageUrl={activeScene.url}
            hotspots={activeHotspots}
            onHotspotClick={(h) => {
              if (h.target_scene_id) goToScene(h.target_scene_id);
            }}
          />
        )}

        {/* Overlay logo */}
        <div className="pointer-events-none absolute left-4 top-4 z-20">
          <Logo asLink={false} className="rounded-md bg-black/40 px-3 py-2 backdrop-blur" />
        </div>

        {/* Título de escena */}
        {activeScene && (
          <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-md bg-black/40 px-3 py-2 text-xs uppercase tracking-wider backdrop-blur">
            <span className="text-text-subtle">{projectName}</span>{' '}
            <span className="mx-1 text-text-subtle">·</span>
            <span className="text-gold">{activeScene.title}</span>
          </div>
        )}

        {/* Botón pantalla completa */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute right-4 bottom-4 z-20 rounded-md border border-white/20 bg-black/50 px-3 py-2 text-xs backdrop-blur transition-colors hover:bg-black/80"
          title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {fullscreen ? '⤡ Salir' : '⤢ Pantalla completa'}
        </button>
      </div>

      {/* Galería inferior de miniaturas */}
      {scenes.length > 1 && (
        <div className="z-10 border-t border-white/10 bg-black/80 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto px-4 py-3">
            {scenes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goToScene(s.id)}
                className={`group relative h-16 w-28 flex-shrink-0 overflow-hidden rounded border-2 transition-all ${
                  s.id === activeId
                    ? 'border-gold shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                    : 'border-white/10 hover:border-white/40'
                }`}
                title={s.title}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.url}
                  alt={s.title}
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-1.5 py-0.5 text-[10px]">
                  {s.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
