'use client';

// ============================================================
// Wrapper de Pannellum.js.
//
// Pannellum no es un paquete React; lo cargamos vía CDN (CSS+JS)
// en montaje. Esto evita problemas con SSR y reduce el bundle.
//
// Soporta carga progresiva (multiRes) si la imagen lo permite,
// aunque por defecto Pannellum hace fallback gradual.
// ============================================================

import { useEffect, useRef } from 'react';
import type { ViewerHotspot } from './TourViewer';

// Tipado mínimo del global de Pannellum.
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

// Carga el script de Pannellum una sola vez (cache global).
let loadingPromise: Promise<void> | null = null;
function loadPannellum(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.pannellum) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise<void>((resolve, reject) => {
    // CSS
    if (!document.querySelector(`link[href="${PANNELLUM_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = PANNELLUM_CSS;
      document.head.appendChild(link);
    }
    // JS
    const script = document.createElement('script');
    script.src = PANNELLUM_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Pannellum'));
    document.body.appendChild(script);
  });
  return loadingPromise;
}

export function PannellumViewer({
  imageUrl,
  hotspots,
  onHotspotClick,
}: {
  imageUrl: string;
  hotspots: ViewerHotspot[];
  onHotspotClick: (h: ViewerHotspot) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    loadPannellum().then(() => {
      if (cancelled || !containerRef.current || !window.pannellum) return;

      // Destruye instancia previa antes de crear una nueva.
      try {
        viewerRef.current?.destroy?.();
      } catch {}

      viewerRef.current = window.pannellum.viewer(containerRef.current, {
        type: 'equirectangular',
        panorama: imageUrl,
        autoLoad: true,
        showZoomCtrl: true,
        showFullscreenCtrl: false, // tenemos botón propio
        compass: false,
        // Calidad progresiva: Pannellum carga la imagen completa y
        // el navegador muestra progresivamente mientras decodifica.
        // (Para multi-res habría que pre-procesar la imagen.)
        hfov: 100,
        minHfov: 50,
        maxHfov: 120,
        autoRotate: 0,
        hotSpots: hotspots.map((h) => ({
          id: h.id,
          pitch: h.pitch,
          yaw: h.yaw,
          type: 'scene',
          text: h.label || 'Ir',
          // Pannellum llama clickHandlerFunc con (event, args).
          clickHandlerFunc: () => onHotspotClick(h),
        })),
        // Estilo del cursor mientras carga.
        crossOrigin: 'anonymous',
      });
    }).catch((e) => {
      // eslint-disable-next-line no-console
      console.error('[Pannellum]', e);
    });

    return () => {
      cancelled = true;
      try {
        viewerRef.current?.destroy?.();
      } catch {}
      viewerRef.current = null;
    };
    // Cambiar imageUrl recrea el visor (es lo que queremos).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full bg-black"
      aria-label="Visor 360°"
    />
  );
}
