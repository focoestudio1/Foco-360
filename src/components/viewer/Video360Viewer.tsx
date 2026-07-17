'use client';

// ============================================================
// Visor de escenas de VIDEO 360.
//
// Pannellum solo sabe de fotos, así que las escenas kind='video'
// se dibujan aquí: Video.js + videojs-vr proyectan el video en una
// esfera navegable (arrastrar para mirar, giroscopio en celular).
//
// El video vive en Bunny Stream (HLS): pesa mucho menos por la red
// y ajusta la calidad al internet de quien mira.
//
// Se cargan las librerías desde CDN y una sola vez, igual que
// PannellumViewer — así no hay que instalar nada por npm.
// ============================================================

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    videojs?: any;
  }
}

const VJS_CSS = 'https://cdn.jsdelivr.net/npm/video.js@8.10.0/dist/video-js.min.css';
const VJS_JS = 'https://cdn.jsdelivr.net/npm/video.js@8.10.0/dist/video.min.js';
const VR_JS = 'https://cdn.jsdelivr.net/npm/videojs-vr@2.0.0/dist/videojs-vr.min.js';

let loadingPromise: Promise<void> | null = null;

function cargarScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar ' + src));
    document.body.appendChild(s);
  });
}

// Carga Video.js y luego el plugin VR (el plugin necesita que Video.js ya exista).
function loadVideoJs(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.videojs && (window.videojs as any).getPlugin?.('vr')) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    if (!document.querySelector(`link[href="${VJS_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = VJS_CSS;
      document.head.appendChild(link);
    }
    await cargarScript(VJS_JS);
    await cargarScript(VR_JS);
  })();
  return loadingPromise;
}

export function Video360Viewer({
  videoUrl,
  poster,
  autoPlay = true,
}: {
  videoUrl: string;
  poster?: string | null;
  autoPlay?: boolean;
}) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    let cancelado = false;

    loadVideoJs()
      .then(() => {
        if (cancelado || !nodeRef.current) return;

        // Video.js necesita un <video> propio; lo creamos aquí para poder
        // destruirlo limpio al cambiar de escena.
        const el = document.createElement('video');
        el.className = 'video-js vjs-default-skin vjs-big-play-centered';
        el.setAttribute('playsinline', '');
        el.setAttribute('crossorigin', 'anonymous');
        if (poster) el.setAttribute('poster', poster);
        nodeRef.current.appendChild(el);

        const esHls = /\.m3u8(\?|$)/i.test(videoUrl);
        const player = window.videojs(el, {
          controls: true,
          autoplay: autoPlay,
          preload: 'auto',
          playsinline: true,
          // fluid + 16:9: sin esto Video.js usa su alto por defecto (150px)
          // y la esfera sale aplastada.
          fluid: true,
          aspectRatio: '16:9',
          responsive: true,
          html5: {
            vhs: {
              overrideNative: true,
              // 360: la esfera amplía un trozo del cuadro, así que NUNCA hay que
              // bajar la calidad por el tamaño del reproductor (por defecto sí lo
              // hace y se ve borroso). Forzamos la máxima resolución disponible.
              limitRenditionByPlayerDimensions: false,
              useDevicePixelRatio: true,
            },
            nativeVideoTracks: false,
            nativeAudioTracks: false,
          },
        });
        playerRef.current = player;

        // ORDEN IMPORTANTE: primero el plugin VR (así engancha 'loadedmetadata')
        // y DESPUÉS la fuente. Al revés, si el video ya está en caché el evento
        // se dispara antes y la esfera nunca arranca.
        player.vr({ projection: '360', forceCardboard: false, debug: false });
        player.src({ src: videoUrl, type: esHls ? 'application/x-mpegURL' : 'video/mp4' });

        // Red de seguridad: si el video ya tenía metadata, 'loadedmetadata' no
        // vuelve a dispararse y el plugin no se inicia solo.
        const asegurarInit = () => {
          try {
            const vr = player.vr();
            if (vr && !vr.initialized_) vr.init();
          } catch {
            /* si no se puede, el video igual se ve plano */
          }
        };
        player.ready(() => {
          player.one('loadedmetadata', asegurarInit);
          if (player.readyState() >= 1) asegurarInit();
          setTimeout(asegurarInit, 1200);
        });

        player.on('error', () => {
          const e = player.error?.();
          setError(e?.message || 'No se pudo cargar el video 360');
        });
      })
      .catch((e) => setError(e.message));

    const t = setTimeout(() => setHintVisible(false), 6000);

    return () => {
      cancelado = true;
      clearTimeout(t);
      try {
        playerRef.current?.dispose();
      } catch {
        /* ya estaba destruido */
      }
      playerRef.current = null;
      if (nodeRef.current) nodeRef.current.innerHTML = '';
    };
  }, [videoUrl, poster, autoPlay]);

  return (
    <div className="relative h-full w-full bg-black">
      <div ref={nodeRef} className="flex h-full w-full items-center justify-center" />

      {hintVisible && !error && (
        <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-opacity">
          🥽 Video 360° · arrastra para mirar alrededor
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/80 p-6 text-center">
          <div className="text-3xl">😕</div>
          <p className="text-sm text-white/80">{error}</p>
        </div>
      )}
    </div>
  );
}
