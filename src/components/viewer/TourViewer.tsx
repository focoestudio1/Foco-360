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
};
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
  logoUrl,
  whatsappPhone,
  whatsappMessage,
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

        {/* Título + descripción de escena */}
        {activeScene && (
          <div className="pointer-events-none absolute right-4 top-4 z-20 max-w-xs rounded-md bg-black/40 px-3 py-2 backdrop-blur">
            <div className="text-xs uppercase tracking-wider">
              <span className="text-text-subtle">{projectName}</span>{' '}
              <span className="mx-1 text-text-subtle">·</span>
              <span className="text-gold">{activeScene.title}</span>
            </div>
            {activeScene.description && (
              <div className="mt-1 text-[11px] leading-snug text-white/85">
                {activeScene.description}
              </div>
            )}
          </div>
        )}

        {/* Barra lateral derecha de acciones (audio, whatsapp, fullscreen).
            Estilo R360: pastilla vertical con botones redondos. */}
        <div className="absolute right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-2 rounded-full border border-white/15 bg-black/55 px-1.5 py-2 backdrop-blur-md">
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

