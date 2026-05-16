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

// Escapa HTML para insertar texto del usuario sin riesgo de XSS.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
  brandColor = '#d4af37',
}: {
  imageUrl: string;
  hotspots: ViewerHotspot[];
  onHotspotClick: (h: ViewerHotspot) => void;
  brandColor?: string;
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
          type: 'info',
          cssClass: 'foco-hotspot',
          // createTooltipFunc: Pannellum llama a esta función pasando el
          // div del hotspot. Inyectamos HTML propio con estilos inline —
          // garantiza visibilidad sin depender del CSS class.
          createTooltipFunc: (hotspotDiv: HTMLElement) => {
            hotspotDiv.classList.add('foco-hotspot');
            // Info hotspots usan color azul + icono 'i' en vez de mano.
            const isInfo = h.kind === 'info';
            const ringColor = isInfo ? '#3b82f6' : brandColor;
            const iconSvg = isInfo
              ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>`
              : `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 11.5V6a2 2 0 0 1 4 0v4"/>
                  <path d="M13 10V4a2 2 0 0 1 4 0v6"/>
                  <path d="M17 10v-3a2 2 0 0 1 4 0v10a7 7 0 0 1-7 7H10c-1.4 0-2.78-.6-3.71-1.6L3.5 18.5a2 2 0 0 1 2.7-2.96L9 18"/>
                </svg>`;
            hotspotDiv.innerHTML = `
              <div class="foco-hotspot-inner" style="
                width: 48px;
                height: 48px;
                margin-left: -24px;
                margin-top: -24px;
                border-radius: 50%;
                background: rgba(255,255,255,0.95);
                border: 2px solid ${ringColor};
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                position: relative;
                animation: foco-hotspot-bob 3.6s ease-in-out infinite;
              ">
                ${iconSvg}
              </div>
              ${
                h.label
                  ? `<div class="foco-hotspot-label" style="
                      position: absolute;
                      top: 42px;
                      left: 50%;
                      transform: translateX(-50%);
                      background: rgba(0,0,0,0.85);
                      color: #fff;
                      padding: 4px 10px;
                      border-radius: 6px;
                      font-size: 11px;
                      white-space: nowrap;
                      pointer-events: none;
                      font-weight: 500;
                      letter-spacing: 0.3px;
                    ">${escapeHtml(h.label)}</div>`
                  : ''
              }
            `;
          },
          clickHandlerFunc: () => {
            // Info hotspot: solo abre modal, sin zoom ni cambio de escena.
            if (h.kind === 'info') {
              onHotspotClick(h);
              return;
            }
            // Navegación: zoom-in cinematográfico + cambio de escena.
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

        /* Animacion de bob sutil (sube/baja 3px, lento) */
        @keyframes foco-hotspot-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .pnlm-hotspot.foco-hotspot .foco-hotspot-inner:hover {
          background: #d4af37 !important;
          transform: scale(1.12);
          animation-play-state: paused;
        }
        .pnlm-hotspot.foco-hotspot .foco-hotspot-inner:hover svg {
          stroke: #fff;
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
