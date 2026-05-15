'use client';

// ============================================================
// Visor Pannellum embebido en el editor admin.
//
// - Muestra la escena activa con sus hotspots existentes.
// - En "modo agregar": el próximo click crea un hotspot en la
//   posición clicada (pitch/yaw calculados por Pannellum).
// - Click en un hotspot existente → ejecuta onHotspotClick.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import type { Hotspot } from './ProjectEditor';

declare global {
  interface Window {
    pannellum?: {
      viewer: (
        el: string | HTMLElement,
        config: Record<string, unknown>
      ) => any;
    };
  }
}

const PANNELLUM_CSS =
  'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
const PANNELLUM_JS =
  'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';

let loadingPromise: Promise<void> | null = null;
function loadPannellum(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.pannellum) return Promise.resolve();
  if (loadingPromise) return loadingPromise;
  loadingPromise = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${PANNELLUM_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = PANNELLUM_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = PANNELLUM_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Pannellum'));
    document.body.appendChild(script);
  });
  return loadingPromise;
}

export function HotspotPlacementViewer({
  imageUrl,
  hotspots,
  onPlace,
  onHotspotClick,
}: {
  imageUrl: string;
  hotspots: Hotspot[];
  // Llamado cuando el usuario hace click en el panorama en modo agregar.
  onPlace: (pitch: number, yaw: number) => void;
  // Click en un hotspot existente (para resaltar / editar).
  onHotspotClick?: (h: Hotspot) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [addMode, setAddMode] = useState(false);
  // Usamos un ref espejo del estado para leerlo dentro del callback de
  // Pannellum (que se registra una sola vez al montar).
  const addModeRef = useRef(false);
  useEffect(() => {
    addModeRef.current = addMode;
  }, [addMode]);

  useEffect(() => {
    let cancelled = false;

    loadPannellum().then(() => {
      if (cancelled || !containerRef.current || !window.pannellum) return;

      try {
        viewerRef.current?.destroy?.();
      } catch {}

      const viewer = window.pannellum.viewer(containerRef.current, {
        type: 'equirectangular',
        panorama: imageUrl,
        autoLoad: true,
        showZoomCtrl: true,
        showFullscreenCtrl: false,
        compass: false,
        hfov: 100,
        minHfov: 40,
        maxHfov: 120,
        // Idem PannellumViewer: nunca exponer la URL firmada.
        strings: {
          loadingLabel: 'Cargando',
          bylineLabel: '',
          noPanoramaError: 'No se pudo cargar la escena.',
          fileAccessError: 'No se pudo acceder a la escena.',
          malformedURLError: 'No se pudo cargar la escena.',
          unknownError: 'Error al cargar la escena.',
        },
        hotSpots: hotspots.map((h) => ({
          id: h.id,
          pitch: h.pitch,
          yaw: h.yaw,
          type: 'info',
          cssClass: 'foco-hotspot',
          text: h.label || '(sin etiqueta)',
          clickHandlerFunc: () => onHotspotClick?.(h),
        })),
        crossOrigin: 'anonymous',
      });

      viewerRef.current = viewer;

      // Al hacer click en el panorama, calculamos coords y disparamos onPlace
      // SOLO si estamos en modo agregar.
      const handler = (event: MouseEvent) => {
        if (!addModeRef.current) return;
        // Pannellum expone mouseEventToCoords (event) → [pitch, yaw].
        const coords = viewer.mouseEventToCoords?.(event);
        if (!coords) return;
        const [pitch, yaw] = coords;
        // Salimos del modo y notificamos.
        setAddMode(false);
        onPlace(pitch, yaw);
      };
      // Pannellum no expone API de eventos para click sobre canvas; usamos
      // el DOM directamente. La propagación desde hotspots Pannellum se
      // detiene por su propio handler, así que no se confunde con esto.
      containerRef.current.addEventListener('click', handler);
      // Guardamos en el viewer para limpieza.
      (viewer as any).__customClickHandler = handler;
    }).catch((e) => {
      // eslint-disable-next-line no-console
      console.error('[Pannellum admin]', e);
    });

    const containerEl = containerRef.current;
    return () => {
      cancelled = true;
      try {
        const h = (viewerRef.current as any)?.__customClickHandler;
        if (h && containerEl) containerEl.removeEventListener('click', h);
        viewerRef.current?.destroy?.();
      } catch {}
      viewerRef.current = null;
    };
    // Re-crea el visor cuando cambia la imagen O la lista de hotspots
    // (para que se reflejen los nuevos puntos sin recargar la página).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, hotspots]);

  return (
    <div className="space-y-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-black">
        <div
          ref={containerRef}
          className="absolute inset-0 h-full w-full"
          style={{ cursor: addMode ? 'crosshair' : 'default' }}
        />
        {addMode && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-3">
            <div className="animate-pulse rounded-full bg-gold/20 px-4 py-1.5 text-xs font-medium text-gold backdrop-blur">
              Haz click sobre el punto donde quieres el hotspot
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-text-subtle">
          Vista previa de la escena · click en marcadores existentes para
          identificarlos.
        </p>
        {addMode ? (
          <button
            type="button"
            onClick={() => setAddMode(false)}
            className="text-xs text-text-muted underline hover:text-text"
          >
            Cancelar
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setAddMode(true)}
            className="btn-primary text-xs"
          >
            + Agregar con click
          </button>
        )}
      </div>
    </div>
  );
}
