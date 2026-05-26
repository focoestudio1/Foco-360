'use client';

// ============================================================
// Visor 360° principal del tour.
// Carga Pannellum dinámicamente (sin SSR) y monta una escena
// configurada con sus hotspots. Permite cambiar entre escenas
// vía miniaturas o hotspots.
// ============================================================

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Logo } from '@/components/ui/Logo';
import { showToast } from '@/components/ui/Toast';
import type { PannellumHandle } from './PannellumViewer';

const Pannellum = dynamic(() => import('./PannellumViewer').then((m) => m.PannellumViewer), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-black text-xs text-text-subtle">
      Cargando visor 360°…
    </div>
  ),
});

export type ViewerScene = {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  // URL firmada de audio narración (no pasa por proxy: no requiere CORS).
  audioUrl?: string | null;
  // Posición en el plano 2D (0..1) — null si no se ha colocado el pin.
  floorplanX?: number | null;
  floorplanY?: number | null;
};
export type ViewerHotspot = {
  id: string;
  scene_id: string;
  target_scene_id: string | null;
  pitch: number;
  yaw: number;
  label: string | null;
  kind: 'navigation' | 'info' | 'url';
  info_text: string | null;
  info_image_url: string | null;
  external_url: string | null;
  // Título de la escena destino — calculado en TourViewer y pasado
  // al PannellumViewer para mostrar en el tooltip del hotspot.
  target_title?: string | null;
  // URL del panorama de la escena destino (para preview tipo portal en hover).
  target_image_url?: string | null;
};

export function TourViewer({
  slug,
  projectName,
  scenes,
  hotspots,
  isPreview = false,
  isInactive = false,
  logoUrl,
  whatsappPhone,
  whatsappMessage,
  brandColor,
  isEmbed = false,
  floorplanUrl,
  specs,
}: {
  slug: string;
  projectName: string;
  scenes: ViewerScene[];
  hotspots: ViewerHotspot[];
  // Modo preview de admin (bypass contraseña).
  isPreview?: boolean;
  // El proyecto está desactivado (solo visible en preview).
  isInactive?: boolean;
  // Si el proyecto tiene logo propio, lo usamos en vez del global.
  logoUrl?: string | null;
  // Botón flotante de WhatsApp (opcional).
  whatsappPhone?: string | null;
  whatsappMessage?: string | null;
  // Color de marca del proyecto (default dorado FOCO).
  brandColor?: string | null;
  // Modo embed (dentro de iframe en sitio externo).
  isEmbed?: boolean;
  // URL firmada del plano 2D si el proyecto tiene uno.
  floorplanUrl?: string | null;
  // Ficha del inmueble (opcional, todos campos opcionales).
  specs?: {
    imageUrl: string | null;
    title: string | null;
    price: string | null;
    features: string | null;
    description: string | null;
  };
}) {
  // Color final usado en hotspots, acentos.
  const color = brandColor || '#d4af37';
  const [activeId, setActiveId] = useState<string>(scenes[0]?.id);
  const [fullscreen, setFullscreen] = useState(false);
  // Hotspot tipo 'info' actualmente abierto en modal (null = cerrado).
  const [infoModal, setInfoModal] = useState<ViewerHotspot | null>(null);
  // Modal ficha del inmueble.
  const [specsModalOpen, setSpecsModalOpen] = useState(false);

  // ¿Hay ficha del inmueble para mostrar?
  const hasSpecs = !!(
    specs?.imageUrl ||
    specs?.title ||
    specs?.price ||
    specs?.features ||
    specs?.description
  );
  const featuresList = (specs?.features ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  // Splash de intro: visible los primeros 2.5s al cargar el tour.
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(t);
  }, []);

  // Handle del visor Pannellum (para Home, VR, etc).
  const pnRef = useRef<PannellumHandle | null>(null);
  const [vrActive, setVrActive] = useState(false);
  // Yaw actual del visor — polled para mostrar radar en el minimap.
  const [currentYaw, setCurrentYaw] = useState<number>(0);
  useEffect(() => {
    const id = setInterval(() => {
      const y = pnRef.current?.getYaw?.();
      if (typeof y === 'number') setCurrentYaw(y);
    }, 120);
    return () => clearInterval(id);
  }, []);

  const activeScene = scenes.find((s) => s.id === activeId);
  // Enriquecemos cada hotspot con el título de su escena destino para que
  // el tooltip muestre "Sala de espera" en vez de la etiqueta genérica.
  const activeHotspots = hotspots
    .filter((h) => h.scene_id === activeId)
    .map((h) => {
      if (h.kind !== 'navigation' || !h.target_scene_id) {
        return { ...h, target_title: null, target_image_url: null };
      }
      const target = scenes.find((s) => s.id === h.target_scene_id);
      return {
        ...h,
        target_title: target?.title ?? null,
        target_image_url: target?.url ?? null,
      };
    });

  const goToScene = useCallback((sceneId: string) => {
    setActiveId(sceneId);
  }, []);

  // Detectar cambios de fullscreen para sincronizar el icono.
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Tracking de vistas por escena para stats. Cuando cambia la escena
  // activa (o al desmontar), envía la duración de la escena anterior.
  // No tracking en modo preview (admin).
  const sceneEnterTimeRef = useRef<{ id: string; t: number } | null>(null);
  useEffect(() => {
    if (isPreview || !activeId) return;
    // Si había una escena previa, mandar su duración.
    const prev = sceneEnterTimeRef.current;
    if (prev && prev.id !== activeId) {
      const duration = Date.now() - prev.t;
      // Fire-and-forget; no bloqueamos UI.
      fetch(`/api/tour/${slug}/scene-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene_id: prev.id, duration_ms: duration }),
        keepalive: true,
      }).catch(() => {});
    }
    sceneEnterTimeRef.current = { id: activeId, t: Date.now() };

    // Al desmontar (cerrar pestaña, salir del tour) registra la actual.
    return () => {
      const cur = sceneEnterTimeRef.current;
      if (!cur || isPreview) return;
      const duration = Date.now() - cur.t;
      fetch(`/api/tour/${slug}/scene-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene_id: cur.id, duration_ms: duration }),
        keepalive: true,
      }).catch(() => {});
    };
  }, [activeId, isPreview, slug]);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-black text-white">
      {/* Splash de intro: aparece 2.5s al cargar y se desvanece */}
      <div
        className={`pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-700 ${
          showSplash ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden={!showSplash}
      >
        {logoUrl ? (
          <span className="mb-6 inline-flex items-center rounded-md bg-white/95 px-3 py-1.5 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={projectName}
              className="h-10 w-auto"
              draggable={false}
            />
          </span>
        ) : (
          <div
            className="mb-4 h-2 w-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 16px ${color}` }}
          />
        )}
        <h1
          className="font-display text-4xl font-medium tracking-[0.25em] text-white animate-fade-in md:text-5xl"
          style={{ textShadow: `0 4px 24px ${color}40` }}
        >
          {projectName.toUpperCase()}
        </h1>
        <div className="mt-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-white/50">
          <span className="h-px w-10" style={{ background: color }} />
          <span>Tour virtual 360°</span>
          <span className="h-px w-10" style={{ background: color }} />
        </div>
      </div>

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
            brandColor={color}
            onReady={(h) => {
              pnRef.current = h;
            }}
            onHotspotClick={(h) => {
              if (h.kind === 'info') {
                setInfoModal(h);
              } else if (h.kind === 'url' && h.external_url) {
                window.open(h.external_url, '_blank', 'noopener,noreferrer');
              } else if (h.target_scene_id) {
                goToScene(h.target_scene_id);
              }
            }}
          />
        )}

        {/* Overlay logo: ubicado bajo la barra lateral derecha, más chico.
            Si el proyecto tiene logo propio lo usa, sino el global. */}
        <div className="pointer-events-none absolute right-4 bottom-4 z-20">
          {logoUrl ? (
            <span className="inline-flex items-center rounded-md bg-white/95 px-1.5 py-0.5 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={projectName}
                className="h-5 w-auto"
                draggable={false}
              />
            </span>
          ) : (
            <Logo
              asLink={false}
              className="rounded-md bg-black/50 px-2 py-1 backdrop-blur text-[10px]"
            />
          )}
        </div>

        {/* Watermark central: nombre del proyecto en serif elegante + escena */}
        {activeScene && (
          <div className="pointer-events-none absolute left-1/2 top-6 z-20 flex -translate-x-1/2 flex-col items-center text-center max-w-[80%]">
            <h2
              className="font-display text-2xl font-medium tracking-[0.18em] text-white/90 uppercase"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}
            >
              {projectName}
            </h2>
            <div className="mt-1 flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-white/65">
              <span className="h-px w-6 bg-white/40" />
              <span>{activeScene.title}</span>
              <span className="h-px w-6 bg-white/40" />
            </div>
            {activeScene.description && (
              <p
                className="mt-2 max-w-md text-[11px] leading-snug text-white/75 italic"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
              >
                {activeScene.description}
              </p>
            )}
          </div>
        )}

        {/* Barra lateral derecha de acciones */}
        <div className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-2 rounded-full border border-white/15 bg-black/55 px-1.5 py-2 backdrop-blur-md">
          {/* Home: reset vista a 0,0 */}
          <button
            type="button"
            onClick={() => pnRef.current?.reset()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            title="Volver a la vista inicial"
            aria-label="Home"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5h-2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </button>

          {/* VR / giroscopio (móvil) */}
          <button
            type="button"
            onClick={() => {
              const active = pnRef.current?.toggleOrientation?.() ?? false;
              setVrActive(active);
              if (active && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
              }
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              vrActive
                ? 'bg-gold text-black hover:bg-gold-light'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title="Modo VR / Giroscopio (mueve el celular para mirar)"
            aria-label="VR"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h18a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-5l-3-3h-2l-3 3H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
              <circle cx="7.5" cy="12" r="1.5" />
              <circle cx="16.5" cy="12" r="1.5" />
            </svg>
          </button>

          {/* Share: Web Share API en móvil, fallback copy link */}
          <button
            type="button"
            onClick={async () => {
              const shareUrl = `${window.location.origin}/tour/${slug}`;
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: projectName,
                    text: `Tour 360° de ${projectName}`,
                    url: shareUrl,
                  });
                } catch {}
              } else {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  showToast('success', 'Link copiado al portapapeles');
                } catch {
                  showToast('error', 'No se pudo copiar');
                }
              }
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            title="Compartir tour"
            aria-label="Share"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
              <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
            </svg>
          </button>

          {/* Separador */}
          <div className="my-1 h-px w-6 bg-white/15" />

          {/* Audio de la escena (si la escena tiene audio cargado) */}
          {activeScene?.audioUrl && (
            <SceneAudioButton
              key={activeScene.id}
              src={activeScene.audioUrl}
            />
          )}

          {/* WhatsApp (si el proyecto tiene número configurado) */}
          {whatsappPhone && (
            <a
              href={`https://wa.me/${whatsappPhone}${
                whatsappMessage
                  ? `?text=${encodeURIComponent(whatsappMessage)}`
                  : ''
              }`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white transition-transform hover:scale-110"
              title="Contactar por WhatsApp"
              aria-label="WhatsApp"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </a>
          )}

          {/* Pantalla completa */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            aria-label="Pantalla completa"
          >
            {fullscreen ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 9H4M9 9V4M9 9L4 4M15 9h5M15 9V4m0 5l5-5M9 15H4m5 0v5m0-5l-5 5M15 15h5m-5 0v5m0-5l5 5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Ficha del inmueble: pastilla compacta arriba-izquierda
          (no compite con thumbnails de abajo) */}
      {hasSpecs && (
        <button
          type="button"
          onClick={() => setSpecsModalOpen(true)}
          className="group absolute left-4 top-20 z-20 max-w-[260px] cursor-pointer rounded-md border border-white/15 bg-black/60 px-3 py-2 text-left backdrop-blur-md transition-all hover:bg-black/80"
          title="Ver ficha del inmueble completa"
          style={{ borderLeft: `3px solid ${color}` }}
        >
          {specs?.title && (
            <div className="text-xs font-semibold text-white">
              {specs.title}
            </div>
          )}
          {specs?.price && (
            <div
              className="mt-0.5 text-[11px] font-medium"
              style={{ color }}
            >
              {specs.price}
            </div>
          )}
          <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/60">
            <span>🏠 Ver detalles</span>
            <span className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </div>
        </button>
      )}

      {/* Modal expandido de ficha del inmueble */}
      {specsModalOpen && hasSpecs && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setSpecsModalOpen(false)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSpecsModalOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80"
              aria-label="Cerrar"
            >
              ✕
            </button>
            {specs?.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={specs.imageUrl}
                alt={specs.title ?? 'Ficha'}
                className="h-64 w-full object-cover"
              />
            )}
            <div className="space-y-4 p-6">
              {specs?.title && (
                <h2 className="font-display text-2xl font-medium tracking-wide text-text">
                  {specs.title}
                </h2>
              )}
              {specs?.price && (
                <div
                  className="text-lg font-medium"
                  style={{ color }}
                >
                  {specs.price}
                </div>
              )}
              {featuresList.length > 0 && (
                <ul className="space-y-1.5">
                  {featuresList.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-text-muted"
                    >
                      <span
                        className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ background: color }}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
              {specs?.description && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-text-muted">
                  {specs.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mini-mapa del plano 2D (esquina inferior izquierda) */}
      {floorplanUrl && (
        <FloorplanMinimap
          src={floorplanUrl}
          scenes={scenes}
          activeId={activeId}
          color={color}
          currentYaw={currentYaw}
          onPick={goToScene}
        />
      )}

      {/* Modal de hotspot informativo */}
      {infoModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
          onClick={() => setInfoModal(null)}
        >
          <div
            className="relative w-full max-w-md rounded-lg border border-border bg-bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setInfoModal(null)}
              className="absolute right-3 top-3 text-text-muted hover:text-text"
              aria-label="Cerrar"
            >
              ✕
            </button>
            {infoModal.label && (
              <h3 className="mb-3 text-base font-semibold tracking-wide text-text">
                {infoModal.label}
              </h3>
            )}
            {infoModal.info_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={infoModal.info_image_url}
                alt={infoModal.label ?? ''}
                className="mb-3 w-full rounded-md"
              />
            )}
            {infoModal.info_text && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-text-muted">
                {infoModal.info_text}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Galería inferior de miniaturas (oculta en modo embed) */}
      {!isEmbed && scenes.length > 1 && (
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

// ===== Mini-mapa del plano 2D =====
// Pastilla flotante en la esquina inferior izquierda. Muestra el
// plano con un pin por escena. Click en pin → goToScene.
// Se puede colapsar/expandir.
function FloorplanMinimap({
  src,
  scenes,
  activeId,
  color,
  currentYaw,
  onPick,
}: {
  src: string;
  scenes: ViewerScene[];
  activeId: string;
  color: string;
  currentYaw: number;
  onPick: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="absolute left-4 bottom-4 z-20 max-w-[220px] overflow-hidden rounded-md border border-white/15 bg-black/55 backdrop-blur-md">
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-text-muted">
          🗺 Plano
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-text-muted hover:text-text"
          title={expanded ? 'Colapsar' : 'Expandir'}
        >
          {expanded ? '▾' : '▴'}
        </button>
      </div>
      {expanded && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Plano" className="block w-full" draggable={false} />
          {scenes.map((s, idx) => {
            if (s.floorplanX == null || s.floorplanY == null) return null;
            const isActive = s.id === activeId;
            return (
              <div
                key={s.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${s.floorplanX * 100}%`,
                  top: `${s.floorplanY * 100}%`,
                }}
              >
                {/* Cono/radar de orientación (solo en pin activo) */}
                {isActive && (
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      width: 60,
                      height: 60,
                      transform: `translate(-50%, -50%) rotate(${currentYaw}deg)`,
                      transition: 'transform 80ms linear',
                    }}
                  >
                    <div
                      className="absolute left-1/2 top-1/2"
                      style={{
                        width: 0,
                        height: 0,
                        marginLeft: -18,
                        marginTop: -36,
                        borderLeft: '18px solid transparent',
                        borderRight: '18px solid transparent',
                        borderBottom: `30px solid ${color}`,
                        opacity: 0.4,
                        filter: `drop-shadow(0 0 4px ${color})`,
                      }}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onPick(s.id)}
                  className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 text-[9px] font-bold transition-transform hover:scale-110"
                  style={{
                    background: isActive ? color : 'rgba(0,0,0,0.7)',
                    color: isActive ? '#000' : '#fff',
                    borderColor: isActive ? '#fff' : 'rgba(255,255,255,0.8)',
                    boxShadow: isActive
                      ? `0 0 10px ${color}`
                      : '0 0 4px rgba(0,0,0,0.5)',
                  }}
                  title={s.title}
                >
                  {idx + 1}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== Botón de audio (encaja en la barra lateral) =====
function SceneAudioButton({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  function toggle() {
    const audio = ref.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
          playing
            ? 'bg-gold text-black hover:bg-gold-light'
            : 'bg-white/10 text-white hover:bg-white/20'
        }`}
        title={playing ? 'Pausar narración' : 'Escuchar narración'}
        aria-label="Audio"
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          // Icono altavoz con ondas (audio disponible)
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4.03v8.06A4.5 4.5 0 0016.5 12zM14 3.23v2.06A7 7 0 0119 12a7 7 0 01-5 6.71v2.06A9 9 0 0021 12 9 9 0 0014 3.23z" />
          </svg>
        )}
      </button>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={ref} src={src} preload="metadata" />
    </>
  );
}

