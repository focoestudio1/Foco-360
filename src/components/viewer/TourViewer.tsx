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
import { getTrackById, getTrackUrl } from '@/lib/musicLibrary';
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
  backgroundMusicId,
  backgroundMusicVolume,
  welcomeVideoUrl,
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
  // Música de fondo del tour (opcional). Si backgroundMusicId es null,
  // no se renderiza el componente.
  backgroundMusicId?: string | null;
  backgroundMusicVolume?: number | null;
  // Video de bienvenida del agente (opcional). URL firmada del MP4.
  welcomeVideoUrl?: string | null;
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

  // Música de fondo + ducking: cuando la narración de la escena
  // está sonando, BackgroundMusic baja su volumen automáticamente.
  const musicTrack = getTrackById(backgroundMusicId);
  const [narrationPlaying, setNarrationPlaying] = useState(false);

  // Recorrido automático: cuando está activo, avanza por las escenas
  // en orden. Si la escena tiene narración, espera a que termine; si
  // no, espera 8s antes de saltar a la siguiente.
  const [isAutoTour, setIsAutoTour] = useState(false);
  const autoTourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advanceTour = useCallback(() => {
    const idx = scenes.findIndex((s) => s.id === activeId);
    const next = scenes[idx + 1];
    if (next) {
      setActiveId(next.id);
    } else {
      // Terminamos. Vuelve a la primera y apaga el modo auto.
      setIsAutoTour(false);
      if (scenes[0]) setActiveId(scenes[0].id);
    }
  }, [scenes, activeId]);

  // Timer de 8s cuando la escena actual NO tiene narración.
  useEffect(() => {
    if (autoTourTimerRef.current) {
      clearTimeout(autoTourTimerRef.current);
      autoTourTimerRef.current = null;
    }
    if (!isAutoTour) return;
    const current = scenes.find((s) => s.id === activeId);
    if (!current) return;
    // Si tiene audio, el componente de audio se encarga (vía onEnded).
    if (current.audioUrl) return;
    // Sin audio: timer fijo.
    autoTourTimerRef.current = setTimeout(advanceTour, 8000);
    return () => {
      if (autoTourTimerRef.current) {
        clearTimeout(autoTourTimerRef.current);
        autoTourTimerRef.current = null;
      }
    };
  }, [isAutoTour, activeId, scenes, advanceTour]);

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

        {/* Hint visual: mano animada de "arrastrar" los primeros 4s.
            Solo aparece en la primera escena del tour para no molestar. */}
        {!isPreview && <SwipeHint />}

        {/* Tutorial overlay primera visita: 3 tips animados. Se guarda
            en localStorage para no mostrarse de nuevo. */}
        {!isPreview && <FirstVisitTutorial color={color} />}

        {/* Video de bienvenida del agente. Modal que aparece una vez. */}
        {!isPreview && welcomeVideoUrl && (
          <WelcomeVideoModal
            src={welcomeVideoUrl}
            slug={slug}
            color={color}
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

          {/* Recorrido guiado: solo si hay 2+ escenas */}
          {scenes.length > 1 && (
            <button
              type="button"
              onClick={() => setIsAutoTour((v) => !v)}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                isAutoTour
                  ? 'bg-gold text-black hover:bg-gold-light animate-pulse-gold'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={
                isAutoTour
                  ? 'Detener recorrido guiado'
                  : 'Comenzar recorrido guiado (avanza solo por las escenas)'
              }
              aria-label="Recorrido guiado"
            >
              {isAutoTour ? (
                // Ícono stop
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="1.5" />
                </svg>
              ) : (
                // Ícono "play en círculo" (auto-tour)
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
                </svg>
              )}
            </button>
          )}

          {/* Skip a la siguiente escena (solo si auto-tour activo) */}
          {isAutoTour && (
            <button
              type="button"
              onClick={advanceTour}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Saltar a la siguiente escena"
              aria-label="Siguiente escena"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <polygon points="5,4 15,12 5,20" />
                <rect x="17" y="4" width="2.5" height="16" rx="0.5" />
              </svg>
            </button>
          )}

          {/* Audio de la escena (si la escena tiene audio cargado) */}
          {activeScene?.audioUrl && (
            <SceneAudioButton
              key={activeScene.id}
              src={activeScene.audioUrl}
              onPlayingChange={setNarrationPlaying}
              autoStart={isAutoTour}
              onEnded={isAutoTour ? advanceTour : undefined}
            />
          )}

          {/* Música de fondo del tour (autoplay muteado por default) */}
          {musicTrack && (
            <BackgroundMusic
              src={getTrackUrl(musicTrack)}
              baseVolume={backgroundMusicVolume ?? 0.4}
              ducking={narrationPlaying}
              startAfterMs={2500}
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

        {/* Ficha del inmueble: dentro del relative flex-1 para que
            bottom-4 sea relativo al area del visor — sin overlap con
            el strip de thumbnails que vive afuera del flex-1. */}
        {hasSpecs && (
          <button
            type="button"
            onClick={() => setSpecsModalOpen(true)}
            className={`group absolute left-4 z-20 max-w-[260px] cursor-pointer rounded-md border border-white/15 bg-black/65 px-3 py-2 text-left backdrop-blur-md transition-all hover:bg-black/80 ${
              floorplanUrl ? 'bottom-[210px]' : 'bottom-4'
            }`}
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
      </div>

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
function SceneAudioButton({
  src,
  onPlayingChange,
  autoStart = false,
  onEnded,
}: {
  src: string;
  // Avisa al padre cuando la narración arranca/para, para que la
  // música de fondo pueda hacer ducking.
  onPlayingChange?: (playing: boolean) => void;
  // En modo auto-tour, arranca solo al montar.
  autoStart?: boolean;
  // Callback cuando el audio termina naturalmente (usado por auto-tour).
  onEnded?: () => void;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  // Auto-start cuando se monta en modo auto-tour.
  useEffect(() => {
    if (!autoStart) return;
    const audio = ref.current;
    if (!audio) return;
    // Pequeño delay para que cargue metadata primero.
    const t = setTimeout(() => {
      audio.play().catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [autoStart]);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    const onPlay = () => {
      setPlaying(true);
      onPlayingChange?.(true);
    };
    const onPause = () => {
      setPlaying(false);
      onPlayingChange?.(false);
    };
    const onEndedHandler = () => {
      setPlaying(false);
      onPlayingChange?.(false);
      onEnded?.();
    };
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEndedHandler);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEndedHandler);
      // Al cambiar de escena, asegurarse de soltar el ducking.
      onPlayingChange?.(false);
    };
  }, [onPlayingChange, onEnded]);

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

// ===== Música de fondo del tour (loop + ducking + mute) =====
// Componente que vive en la barra lateral derecha. Reproduce una
// pista en loop con autoplay muteado (cumple políticas browser),
// y muestra un botón mute/unmute que pulsa los primeros segundos
// para invitar al cliente a activar el sonido.
//
// Ducking: cuando `ducking === true` la música baja a baseVolume×0.15
// con fade de 200ms; vuelve a baseVolume al soltar.
function BackgroundMusic({
  src,
  baseVolume,
  ducking,
  startAfterMs = 0,
}: {
  src: string;
  baseVolume: number;
  ducking: boolean;
  // Espera N ms antes de intentar autoplay (deja terminar splash).
  startAfterMs?: number;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeRafRef = useRef<number | null>(null);
  const [muted, setMuted] = useState(true);
  // Pulso visual del ícono hasta que el cliente interactúa por
  // primera vez con el botón. Indica "hay música, dale unmute".
  const [hasInteracted, setHasInteracted] = useState(false);

  // Arranca el audio muteado tras el delay (cumple autoplay policy).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = baseVolume;
    audio.muted = true;
    const id = setTimeout(() => {
      audio.play().catch(() => {});
    }, startAfterMs);
    return () => clearTimeout(id);
  }, [baseVolume, startAfterMs]);

  // Fade del volumen para ducking. Cancela el RAF previo en cada cambio.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = ducking ? baseVolume * 0.15 : baseVolume;
    const start = audio.volume;
    const startTime = performance.now();
    const duration = 200;

    if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);

    function step(now: number) {
      if (!audio) return;
      const t = Math.min(1, (now - startTime) / duration);
      audio.volume = start + (target - start) * t;
      if (t < 1) {
        fadeRafRef.current = requestAnimationFrame(step);
      } else {
        fadeRafRef.current = null;
      }
    }
    fadeRafRef.current = requestAnimationFrame(step);

    return () => {
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
    };
  }, [ducking, baseVolume]);

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !muted;
    audio.muted = next;
    setMuted(next);
    setHasInteracted(true);
    // Si el cliente unmutea y el audio aún no arrancó (autoplay bloqueado
    // pese a estar muted en algunos navegadores), lo dispara ahora.
    if (!next && audio.paused) {
      audio.play().catch(() => {});
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggleMute}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
          !muted
            ? 'bg-gold text-black hover:bg-gold-light'
            : 'bg-white/10 text-white hover:bg-white/20'
        } ${!hasInteracted && muted ? 'animate-pulse-gold' : ''}`}
        title={muted ? 'Activar música del tour' : 'Silenciar música del tour'}
        aria-label={muted ? 'Activar música' : 'Silenciar música'}
      >
        {muted ? (
          // Altavoz tachado
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.96 8.96 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          </svg>
        ) : (
          // Nota musical (música ON)
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
          </svg>
        )}
        {/* Punto rojo discreto mientras está muted y aún no han interactuado */}
        {!hasInteracted && muted && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-black/70" />
        )}
      </button>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} src={src} loop preload="auto" />
    </>
  );
}

// ===== Hint visual de "arrastrar para mirar" =====
// Aparece centrado en el visor los primeros 5 segundos con una
// mano grande animada haciendo gesto de swipe horizontal:
//  - Trail dorado de estela detrás del dedo
//  - Glow pulsante dorado debajo
//  - Ondas concéntricas saliendo del dedo
//  - Flechas grandes a los lados
//  - Texto con escala pulsante
// Desaparece al primer toque/click en el visor o tras 5s.
function SwipeHint() {
  // Aparece DESPUÉS del splash (2.5s) para que el cliente lo vea con
  // claridad sobre la escena ya cargada. Dura 6s más, así que el
  // hint está visible entre el segundo 2.5 y 8.5 del tour.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Espera a que termine el splash.
    const tShow = setTimeout(() => setVisible(true), 2500);
    // Auto-cierre 6s después de aparecer.
    const tHide = setTimeout(() => setVisible(false), 8500);
    // También oculta al primer pointerdown.
    const onInteract = () => setVisible(false);
    window.addEventListener('pointerdown', onInteract, { once: true });
    window.addEventListener('touchstart', onInteract, { once: true });
    return () => {
      clearTimeout(tShow);
      clearTimeout(tHide);
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('touchstart', onInteract);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="swipe-hint-root pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-5">
        {/* Caja con mano animada */}
        <div className="relative h-32 w-72 overflow-visible">
          {/* Glow dorado de fondo que pulsa */}
          <div className="swipe-glow absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />

          {/* Flecha IZQUIERDA grande */}
          <svg
            viewBox="0 0 24 24"
            className="swipe-arrow-left absolute left-0 top-1/2 h-12 w-12 -translate-y-1/2"
            fill="none"
            stroke="#d4af37"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>

          {/* Flecha DERECHA grande */}
          <svg
            viewBox="0 0 24 24"
            className="swipe-arrow-right absolute right-0 top-1/2 h-12 w-12 -translate-y-1/2"
            fill="none"
            stroke="#d4af37"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>

          {/* Estela dorada detrás de la mano */}
          <div className="swipe-trail absolute left-1/2 top-1/2 -translate-y-1/2" />

          {/* Mano con dedo apuntando — más grande y reconocible */}
          <div className="swipe-hand absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <svg
              viewBox="0 0 64 64"
              className="h-20 w-20 drop-shadow-[0_4px_12px_rgba(212,175,55,0.6)]"
              fill="#fff"
              stroke="#1a1a1a"
              strokeWidth="2"
              strokeLinejoin="round"
            >
              {/* Dedo índice extendido apuntando hacia arriba/abajo */}
              <path d="M28 8c-2 0-4 2-4 4v22l-3-2c-3-2-6 0-6 3v3l5 8c2 3 4 6 8 7l4 1c5 1 10-1 13-5l3-4c1-2 1-4 1-6v-9c0-2-2-4-4-4s-4 2-4 4v-2c0-2-2-4-4-4s-4 2-4 4v-2c0-2-2-4-4-4s-4 2-4 4v-1V12c0-2-2-4-4-4z" />
              {/* Ondas tap saliendo del dedo */}
              <circle cx="26" cy="6" r="2" fill="#d4af37" stroke="none" className="tap-ring-1" />
              <circle cx="26" cy="6" r="4" fill="none" stroke="#d4af37" strokeWidth="1.5" className="tap-ring-2" />
              <circle cx="26" cy="6" r="6" fill="none" stroke="#d4af37" strokeWidth="1.5" className="tap-ring-3" />
            </svg>
          </div>
        </div>

        {/* Texto con efecto pulsante */}
        <div className="swipe-text-box rounded-full bg-black/75 px-6 py-3 backdrop-blur-md border border-gold/40">
          <p className="swipe-text text-sm font-semibold uppercase tracking-[0.3em] text-white">
            ✦ Arrastra para mirar ✦
          </p>
        </div>
      </div>

      <style jsx>{`
        .swipe-hint-root {
          animation: swipeFadeOut 0.6s ease-in 5.4s forwards;
        }
        @keyframes swipeFadeOut {
          to { opacity: 0; }
        }

        /* ===== Mano: vaivén horizontal con escala ===== */
        .swipe-hand {
          animation: swipeHandMove 2s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes swipeHandMove {
          0% {
            transform: translate(calc(-50% - 80px), -50%) rotate(-12deg) scale(0.92);
            opacity: 0.55;
          }
          50% {
            transform: translate(calc(-50% + 80px), -50%) rotate(12deg) scale(1.05);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% - 80px), -50%) rotate(-12deg) scale(0.92);
            opacity: 0.55;
          }
        }

        /* ===== Estela dorada que sigue a la mano ===== */
        .swipe-trail {
          width: 200px;
          height: 6px;
          border-radius: 3px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(212, 175, 55, 0) 10%,
            rgba(212, 175, 55, 0.7) 50%,
            rgba(212, 175, 55, 0) 90%,
            transparent 100%);
          filter: blur(2px);
          animation: swipeTrail 2s ease-in-out infinite;
        }
        @keyframes swipeTrail {
          0%, 100% { transform: translate(calc(-50% - 60px), -50%) scaleX(0.6); opacity: 0.3; }
          25% { transform: translate(calc(-50% - 30px), -50%) scaleX(1); opacity: 0.9; }
          50% { transform: translate(calc(-50% + 60px), -50%) scaleX(0.6); opacity: 0.3; }
          75% { transform: translate(calc(-50% + 30px), -50%) scaleX(1); opacity: 0.9; }
        }

        /* ===== Glow dorado pulsante de fondo ===== */
        .swipe-glow {
          width: 240px;
          height: 80px;
          background: radial-gradient(ellipse at center,
            rgba(212, 175, 55, 0.45) 0%,
            rgba(212, 175, 55, 0.15) 35%,
            transparent 70%);
          filter: blur(8px);
          animation: swipeGlowPulse 2s ease-in-out infinite;
        }
        @keyframes swipeGlowPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(0.9); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
        }

        /* ===== Flechas pulsando a los lados ===== */
        .swipe-arrow-left {
          filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.7));
          animation: arrowPulseLeft 1.5s ease-in-out infinite;
        }
        .swipe-arrow-right {
          filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.7));
          animation: arrowPulseRight 1.5s ease-in-out infinite;
        }
        @keyframes arrowPulseLeft {
          0%, 100% { transform: translateY(-50%) translateX(0); opacity: 0.55; }
          50% { transform: translateY(-50%) translateX(-8px); opacity: 1; }
        }
        @keyframes arrowPulseRight {
          0%, 100% { transform: translateY(-50%) translateX(0); opacity: 0.55; }
          50% { transform: translateY(-50%) translateX(8px); opacity: 1; }
        }

        /* ===== Ondas tap saliendo del dedo ===== */
        :global(.tap-ring-1),
        :global(.tap-ring-2),
        :global(.tap-ring-3) {
          transform-origin: 26px 6px;
          animation: tapRing 1.6s ease-out infinite;
        }
        :global(.tap-ring-2) {
          animation-delay: 0.25s;
        }
        :global(.tap-ring-3) {
          animation-delay: 0.5s;
        }
        @keyframes tapRing {
          0% { transform: scale(0.4); opacity: 1; }
          70% { transform: scale(1.6); opacity: 0.3; }
          100% { transform: scale(2); opacity: 0; }
        }

        /* ===== Texto: pulso sutil de escala ===== */
        .swipe-text-box {
          animation: textPulse 2s ease-in-out infinite;
          box-shadow: 0 0 24px rgba(212, 175, 55, 0.4);
        }
        @keyframes textPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .swipe-text {
          text-shadow: 0 0 12px rgba(212, 175, 55, 0.6);
        }
      `}</style>
    </div>
  );
}

// ===== Tutorial overlay primera visita =====
// 3 slides con tips animados que explican cómo usar el tour.
// Se guarda flag en localStorage para no mostrarse otra vez.
// Aparece centrado con backdrop blur. Botón ESC también cierra.
const TUTORIAL_STORAGE_KEY = 'foco360-tutorial-seen';

const TUTORIAL_SLIDES = [
  {
    title: 'Mira en 360°',
    body: 'Arrastra con el dedo o el mouse para girar y ver toda la habitación.',
    icon: '🌐',
  },
  {
    title: 'Camina entre habitaciones',
    body: 'Toca los círculos dorados que aparecen en el espacio para teletransportarte a otra escena.',
    icon: '🚪',
  },
  {
    title: 'Más herramientas',
    body: 'En la barra derecha tienes pantalla completa, música, narración, compartir y contacto.',
    icon: '🎛',
  },
] as const;

function FirstVisitTutorial({ color }: { color: string }) {
  const [show, setShow] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    // SSR-safe: solo en client.
    if (typeof window === 'undefined') return;
    try {
      const seen = window.localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (!seen) {
        // Aparece DESPUÉS del SwipeHint (que dura hasta los 8.5s),
        // así el cliente primero ve la mano sola y después el tutorial.
        const t = setTimeout(() => setShow(true), 9000);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage bloqueado (modo incógnito estricto). Lo mostramos igual.
      const t = setTimeout(() => setShow(true), 9000);
      return () => clearTimeout(t);
    }
  }, []);

  // Cerrar con ESC
  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  function close() {
    try {
      window.localStorage.setItem(TUTORIAL_STORAGE_KEY, '1');
    } catch {}
    setShow(false);
  }

  if (!show) return null;

  const current = TUTORIAL_SLIDES[slide];
  const isLast = slide === TUTORIAL_SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm animate-fade-in"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial del tour"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: `3px solid ${color}` }}
      >
        {/* Cerrar (top-right) */}
        <button
          type="button"
          onClick={close}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:bg-bg-hover hover:text-text"
          aria-label="Cerrar tutorial"
        >
          ✕
        </button>

        {/* Icono grande */}
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
          style={{
            background: `${color}15`,
            border: `1px solid ${color}40`,
          }}
        >
          {current.icon}
        </div>

        {/* Texto */}
        <h3 className="mb-2 text-center font-display text-xl font-medium tracking-wide text-text">
          {current.title}
        </h3>
        <p className="mb-6 text-center text-sm leading-relaxed text-text-muted">
          {current.body}
        </p>

        {/* Dots indicador */}
        <div className="mb-5 flex items-center justify-center gap-2">
          {TUTORIAL_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlide(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === slide ? 20 : 6,
                background: i === slide ? color : 'rgba(255,255,255,0.25)',
              }}
              aria-label={`Tip ${i + 1}`}
            />
          ))}
        </div>

        {/* Botones */}
        <div className="flex gap-2">
          {slide > 0 && (
            <button
              type="button"
              onClick={() => setSlide((s) => s - 1)}
              className="flex-1 rounded-md border border-border bg-bg-elevated px-4 py-2 text-sm text-text-muted hover:bg-bg-hover"
            >
              ← Anterior
            </button>
          )}
          {!isLast ? (
            <button
              type="button"
              onClick={() => setSlide((s) => s + 1)}
              className="flex-1 rounded-md px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
              style={{ background: color }}
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              onClick={close}
              className="flex-1 rounded-md px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
              style={{ background: color }}
            >
              ¡Entendido!
            </button>
          )}
        </div>

        <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-text-subtle">
          Solo se muestra una vez
        </p>
      </div>
    </div>
  );
}

// ===== Modal de video de bienvenida =====
// Aparece al cargar el tour si el proyecto tiene un video subido.
// Se muestra una sola vez por dispositivo y por slug (localStorage).
// El cliente puede saltarlo con "Comenzar tour" o esperar a que termine
// el video (botón cambia a "Cerrar"). Tiene su propio botón de mute.
function WelcomeVideoModal({
  src,
  slug,
  color,
}: {
  src: string;
  slug: string;
  color: string;
}) {
  const storageKey = `foco360-welcome-seen-${slug}`;
  const [show, setShow] = useState(false);
  const [ended, setEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const seen = window.localStorage.getItem(storageKey);
      if (!seen) {
        // Aparece DESPUÉS del SwipeHint (8.5s) para no amontonarse.
        // Tiene z-50 vs tutorial z-40, así que si ambos están visibles
        // el welcome queda arriba.
        const t = setTimeout(() => setShow(true), 9000);
        return () => clearTimeout(t);
      }
    } catch {
      const t = setTimeout(() => setShow(true), 9000);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  // Intenta autoplay con sonido cuando se muestra. Si el navegador
  // lo bloquea (suele pasar), intenta muteado para que al menos arranque.
  useEffect(() => {
    if (!show) return;
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => {});
    });
  }, [show]);

  function close() {
    try {
      window.localStorage.setItem(storageKey, '1');
    } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-md animate-fade-in"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Video de bienvenida"
    >
      <div
        className="relative w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          className="w-full rounded-lg shadow-2xl"
          style={{ border: `2px solid ${color}40` }}
          onEnded={() => setEnded(true)}
        />
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={close}
            className="rounded-md px-6 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90"
            style={{ background: color }}
          >
            {ended ? '✓ Cerrar' : 'Saltar y comenzar tour →'}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] uppercase tracking-wider text-white/50">
          Solo se muestra una vez
        </p>
      </div>
    </div>
  );
}
