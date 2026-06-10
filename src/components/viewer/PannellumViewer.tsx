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

// API que el visor expone al padre (TourViewer) vía callback onReady.
export type PannellumHandle = {
  reset: () => void;
  toggleOrientation: () => boolean; // devuelve true si quedó activado
  getYaw: () => number | null;
};

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
  onReady,
}: {
  imageUrl: string;
  hotspots: ViewerHotspot[];
  onHotspotClick: (h: ViewerHotspot) => void;
  brandColor?: string;
  // Callback invocado tras crear el viewer; entrega la API imperativa.
  onReady?: (handle: PannellumHandle) => void;
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
        // Rota lentamente cuando el usuario no interactúa 2 segundos.
        // El delay corto hace evidente que es 360° apenas carga.
        autoRotate: -2,
        autoRotateInactivityDelay: 2000,
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
            // Cada tipo de hotspot tiene su color + icono SVG.
            const isInfo = h.kind === 'info';
            const isUrl = h.kind === 'url';
            const ringColor = isInfo
              ? '#3b82f6'
              : isUrl
              ? '#22c55e'
              : brandColor;
            const iconSvg = isInfo
              ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>`
              : isUrl
              ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>`
              : (() => {
                  // Si hay preview portal, el icono va blanco sobre el fondo oscuro.
                  const stroke = h.kind === 'navigation' && h.target_image_url
                    ? '#fff'
                    : '#1a1a1a';
                  return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 11.5V6a2 2 0 0 1 4 0v4"/>
                    <path d="M13 10V4a2 2 0 0 1 4 0v6"/>
                    <path d="M17 10v-3a2 2 0 0 1 4 0v10a7 7 0 0 1-7 7H10c-1.4 0-2.78-.6-3.71-1.6L3.5 18.5a2 2 0 0 1 2.7-2.96L9 18"/>
                  </svg>`;
                })();
            // Preview "portal" para hotspots de navegación: muestra la
            // escena destino como fondo del círculo, revelado al hover.
            const hasPreview = h.kind === 'navigation' && h.target_image_url;
            const previewBg = hasPreview
              ? `background-image: url('${h.target_image_url}'); background-size: cover; background-position: center;`
              : 'background: rgba(255,255,255,0.95);';

            hotspotDiv.innerHTML = `
              <div class="foco-hotspot-inner ${hasPreview ? 'foco-hotspot-portal' : ''}" style="
                width: 64px;
                height: 64px;
                margin-left: -32px;
                margin-top: -32px;
                border-radius: 50%;
                ${previewBg}
                border: 3px solid ${ringColor};
                box-shadow:
                  0 4px 16px rgba(0,0,0,0.55),
                  0 0 0 1px rgba(255,255,255,0.15) inset,
                  0 0 28px ${ringColor}90;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                position: relative;
                animation: foco-hotspot-bob 3.6s ease-in-out infinite;
                overflow: hidden;
                transition: width 0.3s ease, height 0.3s ease, margin 0.3s ease;
              ">
                <div class="foco-hotspot-icon" style="
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 100%;
                  height: 100%;
                  ${hasPreview ? 'background: rgba(0,0,0,0.35); backdrop-filter: blur(1px);' : ''}
                  transition: opacity 0.3s ease;
                  transform: scale(1.25);
                ">
                  ${iconSvg}
                </div>
              </div>
              ${
                // Prioridad: nombre de la escena destino > etiqueta manual.
                // Si es info hotspot, usa la etiqueta del usuario.
                (() => {
                  const text =
                    h.kind === 'navigation' && h.target_title
                      ? h.target_title
                      : h.label;
                  if (!text) return '';
                  const arrow = h.kind === 'navigation' ? ' →' : '';
                  return `<div class="foco-hotspot-label" style="
                      position: absolute;
                      top: 48px;
                      left: 50%;
                      transform: translateX(-50%);
                      background: linear-gradient(135deg, rgba(0,0,0,0.92), rgba(0,0,0,0.78));
                      color: #fff;
                      padding: 6px 14px;
                      border-radius: 999px;
                      font-size: 12px;
                      font-weight: 600;
                      letter-spacing: 0.4px;
                      white-space: nowrap;
                      pointer-events: none;
                      border: 1.5px solid ${ringColor};
                      box-shadow: 0 4px 12px rgba(0,0,0,0.5), 0 0 16px ${ringColor}60;
                      text-shadow: 0 1px 2px rgba(0,0,0,0.8);
                      animation: foco-label-bounce 2.4s ease-in-out infinite;
                    ">${escapeHtml(text)}${arrow}</div>`;
                })()
              }
            `;
          },
          clickHandlerFunc: () => {
            // Info y URL no necesitan zoom ni cambio de escena.
            if (h.kind === 'info' || h.kind === 'url') {
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

      // Entregamos API imperativa al padre.
      onReady?.({
        reset: () => {
          try {
            viewerRef.current?.lookAt?.(0, 0, 100, 600);
          } catch {}
        },
        toggleOrientation: () => {
          try {
            const v = viewerRef.current;
            if (!v) return false;
            if (v.isOrientationActive?.()) {
              v.stopOrientation?.();
              return false;
            }
            v.startOrientation?.();
            return true;
          } catch {
            return false;
          }
        },
        getYaw: () => {
          try {
            return viewerRef.current?.getYaw?.() ?? null;
          } catch {
            return null;
          }
        },
      });

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
        className="foco-pano-cursor absolute inset-0 h-full w-full bg-black"
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
          width: 110px !important;
          height: 110px !important;
          margin-left: -55px !important;
          margin-top: -55px !important;
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

        /* Halo dorado expansivo GIGANTE — efecto "salud" pulsante.
           Va detrás de todo, llena el wrapper completo. */
        .pnlm-hotspot.foco-hotspot::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          width: 64px;
          height: 64px;
          margin-left: -32px;
          margin-top: -32px;
          border-radius: 50%;
          background: radial-gradient(circle,
            rgba(212, 175, 55, 0.35) 0%,
            rgba(212, 175, 55, 0.15) 50%,
            transparent 75%);
          animation: foco-hotspot-mega-pulse 2.4s ease-out infinite;
          pointer-events: none;
          z-index: 0;
        }

        /* Anillo dorado rotativo punteado — efecto "click aquí" */
        .pnlm-hotspot.foco-hotspot::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 50%;
          width: 82px;
          height: 82px;
          margin-left: -41px;
          margin-top: -41px;
          border-radius: 50%;
          border: 3px dashed rgba(212, 175, 55, 0.9);
          animation: foco-hotspot-rotate 6s linear infinite,
            foco-hotspot-ring-pulse 2.4s ease-in-out infinite;
          pointer-events: none;
          z-index: 0;
          filter: drop-shadow(0 0 6px rgba(212, 175, 55, 0.6));
        }

        /* Inner del hotspot (renderizado por createTooltipFunc):
           se sienta encima del halo y del ring. */
        .pnlm-hotspot.foco-hotspot .foco-hotspot-inner {
          position: relative;
          z-index: 2;
        }

        /* Halo MEGA pulsante: empieza chico, crece hasta cubrir todo */
        @keyframes foco-hotspot-mega-pulse {
          0% {
            transform: scale(0.7);
            opacity: 1;
          }
          70% {
            transform: scale(1.7);
            opacity: 0.2;
          }
          100% {
            transform: scale(1.9);
            opacity: 0;
          }
        }

        /* Anillo rotativo */
        @keyframes foco-hotspot-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Anillo cambia opacidad: visible → atenuado → visible */
        @keyframes foco-hotspot-ring-pulse {
          0%, 100% {
            border-color: rgba(212, 175, 55, 0.9);
            filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.7));
          }
          50% {
            border-color: rgba(255, 255, 255, 0.95);
            filter: drop-shadow(0 0 14px rgba(212, 175, 55, 0.9));
          }
        }

        /* Animación bob sutil (sube/baja 3px, lento) — usada por
           el inner div al renderizar */
        @keyframes foco-hotspot-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* Bounce del label para llamar atención hacia el destino */
        @keyframes foco-label-bounce {
          0%, 100% {
            transform: translateX(-50%) translateY(0) scale(1);
          }
          50% {
            transform: translateX(-50%) translateY(2px) scale(1.04);
          }
        }

        /* Cursor estilo videojuego sobre el panorama */
        /* Cursor 'grab' cuando puedes arrastrar la vista */
        .foco-pano-cursor,
        .foco-pano-cursor canvas {
          cursor: grab !important;
        }
        .foco-pano-cursor:active,
        .foco-pano-cursor canvas:active {
          cursor: grabbing !important;
        }
        /* Cuando el cursor esta sobre un hotspot, mostramos crosshair custom */
        .pnlm-hotspot.foco-hotspot {
          /* SVG crosshair tipo target/aim de videojuego */
          cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'><circle cx='18' cy='18' r='12' fill='none' stroke='%23ffffff' stroke-width='2'/><circle cx='18' cy='18' r='2.5' fill='%23ffffff'/><line x1='18' y1='2' x2='18' y2='8' stroke='%23ffffff' stroke-width='2'/><line x1='18' y1='28' x2='18' y2='34' stroke='%23ffffff' stroke-width='2'/><line x1='2' y1='18' x2='8' y2='18' stroke='%23ffffff' stroke-width='2'/><line x1='28' y1='18' x2='34' y2='18' stroke='%23ffffff' stroke-width='2'/></svg>") 18 18, pointer !important;
        }
        .pnlm-hotspot.foco-hotspot .foco-hotspot-inner:hover {
          animation-play-state: paused;
        }
        /* Hotspot sin preview: hover dorado solido (info y url) */
        .pnlm-hotspot.foco-hotspot .foco-hotspot-inner:not(.foco-hotspot-portal):hover {
          background: #d4af37 !important;
          transform: scale(1.12);
        }
        .pnlm-hotspot.foco-hotspot .foco-hotspot-inner:not(.foco-hotspot-portal):hover svg {
          stroke: #fff;
        }
        /* Hotspot con preview (navegacion): expande mostrando portal */
        .pnlm-hotspot.foco-hotspot .foco-hotspot-portal:hover {
          width: 130px !important;
          height: 130px !important;
          margin-left: -65px !important;
          margin-top: -65px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6),
            0 0 0 4px rgba(255, 255, 255, 0.15) !important;
        }
        .pnlm-hotspot.foco-hotspot .foco-hotspot-portal:hover .foco-hotspot-icon {
          opacity: 0;
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
