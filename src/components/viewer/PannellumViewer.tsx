'use client';

// ============================================================
// Wrapper de Pannellum.js.
//
// Pannellum no es un paquete React; lo cargamos vía CDN (CSS+JS)
// en montaje. Esto evita problemas con SSR y reduce el bundle.
//
// IMPORTANTE de seguridad/UX: la pantalla de carga default de
// Pannellum imprime la URL del archivo (incluye credenciales
// firmadas de R2). Cubrimos eso con:
//   - strings customizados (mensaje genérico en vez de URL)
//   - overlay propio mientras la imagen no termina de cargar
//   - CSS que oculta el container de carga nativo
// ============================================================

import { useEffect, useRef, useState } from 'react';
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
  // Estado de la imagen: loading | ready | error.
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    loadPannellum().then(() => {
      if (cancelled || !containerRef.current || !window.pannellum) return;

      // Destruye instancia previa antes de crear una nueva.
      try {
        viewerRef.current?.destroy?.();
      } catch {}

      const viewer = window.pannellum.viewer(containerRef.current, {
        type: 'equirectangular',
        panorama: imageUrl,
        autoLoad: true,
        showZoomCtrl: true,
        showFullscreenCtrl: false, // tenemos botón propio
        compass: false,
        hfov: 100,
        minHfov: 50,
        maxHfov: 120,
        autoRotate: 0,
        // Mensajes customizados: NUNCA mostrar la URL del archivo.
        // Por defecto Pannellum imprime "The file <URL>..." en errores
        // y la barra de carga; eso filtraría la firma R2.
        strings: {
          loadButtonLabel: 'Cargar tour',
          loadingLabel: 'Cargando',
          bylineLabel: '',
          noPanoramaError: 'No se pudo cargar la escena.',
          fileAccessError: 'No se pudo acceder a la escena.',
          malformedURLError: 'No se pudo cargar la escena.',
          iOS8WebGLError: 'Tu navegador no soporta WebGL.',
          genericWebGLError: 'Tu navegador no soporta WebGL.',
          textureSizeError: 'La imagen es demasiado grande para tu dispositivo.',
          unknownError: 'Error al cargar la escena.',
        },
        hotSpots: hotspots.map((h) => ({
          id: h.id,
          pitch: h.pitch,
          yaw: h.yaw,
          // Usamos cssClass propio para estilo personalizado (flecha animada).
          type: 'info',
          cssClass: 'foco-hotspot',
          text: h.label || 'Ir',
          clickHandlerFunc: () => {
            // Efecto zoom-in cinematográfico antes de cambiar de escena.
            // - El usuario ve la cámara acercarse al hotspot durante 500ms.
            // - Después aparece el overlay de carga (cubre el corte).
            // - A los 650ms se monta la siguiente escena.
            try {
              viewerRef.current?.lookAt?.(h.pitch, h.yaw, 30, 600);
            } catch {}
            setTimeout(() => setState('loading'), 500);
            setTimeout(() => onHotspotClick(h), 650);
          },
        })),
        crossOrigin: 'anonymous',
      });

      viewerRef.current = viewer;

      // Pannellum dispara 'load' cuando termina de procesar la pano.
      viewer.on?.('load', () => {
        if (!cancelled) setState('ready');
      });
      viewer.on?.('error', () => {
        if (!cancelled) setState('error');
      });
    }).catch(() => {
      if (!cancelled) setState('error');
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
    <>
      {/* Overlay propio: cubre la pantalla de carga nativa de Pannellum
          (que muestra la URL del archivo). Se desvanece cuando 'load'. */}
      <div
        className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black transition-opacity duration-500 ${
          state === 'ready' ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden={state === 'ready'}
      >
        {state === 'error' ? (
          <p className="text-sm text-text-muted">
            No se pudo cargar la escena. Reintenta más tarde.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {/* Spinner dorado */}
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
            <p className="text-xs uppercase tracking-[0.2em] text-text-muted">
              Cargando escena
            </p>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full bg-black"
        aria-label="Visor 360°"
      />

      {/* Globales:
          - Ocultar load-screen y error nativo de Pannellum (filtran URL firmada).
          - Estilizar hotspots como flecha dorada animada (foco-hotspot). */}
      <style jsx global>{`
        .pnlm-load-box,
        .pnlm-load-button {
          display: none !important;
        }
        .pnlm-error-msg {
          display: none !important;
        }

        /* ====== Hotspot flotante con cambio de color ====== */
        /* Usamos un wrapper interno (::before) animado y un ::after
           con la flecha. Animamos transform en ::before sin tocar
           el transform del wrapper Pannellum (que lo usa para
           posicionar el hotspot en 2D según pitch/yaw). */

        .pnlm-hotspot.foco-hotspot {
          width: 70px !important;
          height: 70px !important;
          margin-left: -35px !important;
          margin-top: -35px !important;
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          /* Sin transform aquí — pannellum lo usa para posicionar */
        }

        /* Círculo principal con cambio de color y movimiento flotante */
        .pnlm-hotspot.foco-hotspot::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #d4af37;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5),
            0 0 0 0 rgba(212, 175, 55, 0.7);
          animation:
            foco-hotspot-float 2.4s ease-in-out infinite,
            foco-hotspot-color 2s ease-in-out infinite,
            foco-hotspot-pulse 2s ease-out infinite;
        }

        /* Flecha "→" centrada arriba del fondo */
        .pnlm-hotspot.foco-hotspot::after {
          content: '';
          position: relative;
          width: 18px;
          height: 18px;
          border-top: 4px solid #1a1a1a;
          border-right: 4px solid #1a1a1a;
          transform: rotate(45deg);
          margin-left: -6px;
          pointer-events: none;
          animation: foco-hotspot-arrow-color 2s ease-in-out infinite,
            foco-hotspot-float 2.4s ease-in-out infinite;
        }

        .pnlm-hotspot.foco-hotspot:hover::before {
          animation-play-state: paused;
          background: #d4af37 !important;
          transform: scale(1.15);
        }
        .pnlm-hotspot.foco-hotspot:hover::after {
          animation-play-state: paused;
          border-color: #fff;
          transform: rotate(45deg) scale(1.15);
        }

        /* Movimiento flotante arriba/abajo */
        @keyframes foco-hotspot-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        /* La flecha tiene su propia transform rotate, así que se la
           combinamos con el translateY mediante un keyframe distinto */
        .pnlm-hotspot.foco-hotspot::after {
          animation:
            foco-hotspot-arrow-color 2s ease-in-out infinite,
            foco-hotspot-arrow-float 2.4s ease-in-out infinite;
        }
        @keyframes foco-hotspot-arrow-float {
          0%, 100% {
            transform: rotate(45deg) translateY(0);
          }
          50% {
            transform: rotate(45deg) translateY(-8px);
          }
        }
        /* Cambio de color blanco → dorado → blanco */
        @keyframes foco-hotspot-color {
          0%, 100% {
            background: #fff;
            border-color: #d4af37;
          }
          50% {
            background: #d4af37;
            border-color: #fff;
          }
        }
        /* Flecha negra → blanca para contrastar con el fondo dorado */
        @keyframes foco-hotspot-arrow-color {
          0%, 100% {
            border-color: #1a1a1a;
          }
          50% {
            border-color: #fff;
          }
        }
        /* Halo expansivo */
        @keyframes foco-hotspot-pulse {
          0% {
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5),
              0 0 0 0 rgba(212, 175, 55, 0.7);
          }
          70% {
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5),
              0 0 0 30px rgba(212, 175, 55, 0);
          }
          100% {
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5),
              0 0 0 0 rgba(212, 175, 55, 0);
          }
        }

        /* Tooltip default de Pannellum: lo restilizamos */
        .pnlm-hotspot.foco-hotspot .pnlm-tooltip span {
          background: rgba(0, 0, 0, 0.85) !important;
          color: #fff !important;
          padding: 6px 10px !important;
          border-radius: 6px !important;
          font-size: 11px !important;
          letter-spacing: 0.5px !important;
          text-transform: uppercase !important;
          border: 1px solid rgba(212, 175, 55, 0.4) !important;
          white-space: nowrap;
        }
      `}</style>
    </>
  );
}
