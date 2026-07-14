'use client';

// ============================================================
// Lightbox de galería de fotos (fotos planas, no 360°).
//
// Vistas:
//  1. Grid inicial (thumbnails 3-4 columnas).
//  2. Vista individual: foto grande, flechas ← →, caption.
//
// Interacción:
//  - Click en thumbnail → vista individual
//  - Flechas del teclado ← → para navegar
//  - ESC para cerrar
//  - Swipe en mobile (touch events)
// ============================================================

import { useEffect, useState, useRef } from 'react';

export type GalleryPhoto = {
  id: string;
  url: string;
  caption: string | null;
};

export function GalleryLightbox({
  photos,
  onClose,
  color,
}: {
  photos: GalleryPhoto[];
  onClose: () => void;
  color: string;
}) {
  // Vista actual: null = grid, número = índice en photos.
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Keyboard: ESC cierra, ← → navegan cuando hay foto activa.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (activeIdx !== null) setActiveIdx(null);
        else onClose();
        return;
      }
      if (activeIdx !== null) {
        if (e.key === 'ArrowLeft') {
          setActiveIdx((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
        } else if (e.key === 'ArrowRight') {
          setActiveIdx((i) => (i === null ? null : (i + 1) % photos.length));
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIdx, photos.length, onClose]);

  // Swipe en mobile (foto individual).
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0) {
        setActiveIdx((i) => (i === null ? null : (i + 1) % photos.length));
      } else {
        setActiveIdx((i) =>
          i === null ? null : (i - 1 + photos.length) % photos.length
        );
      }
    }
    touchStartX.current = null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md">
      {/* Header con título y botón cerrar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (activeIdx !== null) setActiveIdx(null);
              else onClose();
            }}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white transition-colors hover:bg-white/20"
          >
            {activeIdx !== null ? '← Volver a galería' : '← Cerrar'}
          </button>
          <span className="text-xs uppercase tracking-wider text-white/60">
            {activeIdx !== null
              ? `Foto ${activeIdx + 1} de ${photos.length}`
              : `Galería (${photos.length} foto${photos.length === 1 ? '' : 's'})`}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="Cerrar galería"
        >
          ✕
        </button>
      </div>

      {/* Contenido */}
      {activeIdx === null ? (
        // Vista grid
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveIdx(i)}
                className="group relative aspect-square overflow-hidden rounded-md bg-white/5 transition-transform hover:scale-[1.02]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.caption || `Foto ${i + 1}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {p.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <p className="truncate text-xs text-white">{p.caption}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Vista individual
        <div
          className="relative flex flex-1 flex-col items-center justify-center overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Flecha izquierda */}
          <button
            type="button"
            onClick={() =>
              setActiveIdx(
                (i) => (i === null ? null : (i - 1 + photos.length) % photos.length)
              )
            }
            className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/80 sm:left-6 sm:h-14 sm:w-14"
            aria-label="Foto anterior"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18L9 12L15 6" />
            </svg>
          </button>

          {/* Foto */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[activeIdx].url}
            alt={photos[activeIdx].caption || `Foto ${activeIdx + 1}`}
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />

          {/* Flecha derecha */}
          <button
            type="button"
            onClick={() =>
              setActiveIdx((i) => (i === null ? null : (i + 1) % photos.length))
            }
            className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/80 sm:right-6 sm:h-14 sm:w-14"
            aria-label="Foto siguiente"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6L15 12L9 18" />
            </svg>
          </button>

          {/* Caption abajo */}
          {photos[activeIdx].caption && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-8 text-center">
              <p
                className="text-sm text-white sm:text-base"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
              >
                {photos[activeIdx].caption}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Franja de miniaturas en la parte inferior de vista individual */}
      {activeIdx !== null && (
        <div className="border-t border-white/10 bg-black/80 p-2">
          <div className="flex gap-2 overflow-x-auto">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={`relative h-14 w-20 flex-shrink-0 overflow-hidden rounded transition-all ${
                  i === activeIdx
                    ? 'ring-2 ring-offset-2 ring-offset-black'
                    : 'opacity-60 hover:opacity-100'
                }`}
                style={i === activeIdx ? { '--tw-ring-color': color } as any : undefined}
                aria-label={`Ver foto ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
