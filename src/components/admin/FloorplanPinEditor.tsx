'use client';

// ============================================================
// Editor visual de pines de escenas sobre el plano 2D.
//
// - Muestra el plano del proyecto a tamaño completo.
// - Cada escena con (floorplan_x, floorplan_y) aparece como pin.
// - Click sobre el plano = coloca el pin de la escena activa.
// - Drag sobre un pin existente = lo reposiciona.
// - Click en pin existente (sin drag) = selecciona esa escena.
// ============================================================

import { useRef, useState } from 'react';
import type { SceneWithUrl } from './ProjectEditor';

type Props = {
  floorplanUrl: string;
  scenes: SceneWithUrl[];
  activeSceneId: string | null;
  setActiveSceneId: (id: string) => void;
  onPlacePin: (sceneId: string, x: number, y: number) => Promise<void>;
};

export function FloorplanPinEditor({
  floorplanUrl,
  scenes,
  activeSceneId,
  setActiveSceneId,
  onPlacePin,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  // Calcula coords 0..1 a partir de un evento puntero sobre el contenedor.
  function getCoords(
    e: React.MouseEvent | React.PointerEvent
  ): { x: number; y: number } | null {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  }

  // Click en el plano (no en un pin): coloca pin de la escena activa.
  async function handleContainerClick(e: React.MouseEvent) {
    if (!activeSceneId) return;
    if ((e.target as HTMLElement).closest('[data-pin]')) return;
    const c = getCoords(e);
    if (!c) return;
    await onPlacePin(activeSceneId, c.x, c.y);
  }

  // Drag de un pin: actualiza posición al soltar.
  async function handlePinPointerUp(
    e: React.PointerEvent,
    sceneId: string
  ) {
    if (dragId !== sceneId) return;
    const c = getCoords(e);
    setDragId(null);
    if (!c) return;
    await onPlacePin(sceneId, c.x, c.y);
  }

  return (
    <section className="card">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-text-muted">
        Posicionar escenas en plano
      </h2>
      <p className="mb-3 text-xs text-text-subtle">
        Selecciona una escena arriba y haz click sobre el plano para
        colocar su pin. Arrastra un pin para reposicionarlo.
      </p>

      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className="relative w-full select-none overflow-hidden rounded-md border border-border bg-bg-elevated"
        style={{ aspectRatio: 'auto' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={floorplanUrl}
          alt="Plano"
          className="block w-full"
          draggable={false}
        />
        {scenes.map((s, idx) => {
          if (s.floorplan_x == null || s.floorplan_y == null) return null;
          const isActive = s.id === activeSceneId;
          return (
            <div
              key={s.id}
              data-pin
              onPointerDown={(e) => {
                e.stopPropagation();
                setDragId(s.id);
              }}
              onPointerUp={(e) => handlePinPointerUp(e, s.id)}
              onClick={(e) => {
                e.stopPropagation();
                setActiveSceneId(s.id);
              }}
              className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 text-[10px] font-bold transition-transform hover:scale-110 ${
                isActive
                  ? 'border-white bg-gold text-black shadow-[0_0_12px_rgba(212,175,55,0.6)]'
                  : 'border-white/80 bg-black/70 text-white'
              }`}
              style={{
                left: `${s.floorplan_x * 100}%`,
                top: `${s.floorplan_y * 100}%`,
              }}
              title={s.title}
            >
              {idx + 1}
            </div>
          );
        })}
      </div>

      {/* Lista compacta del estado de cada escena */}
      <ul className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {scenes.map((s, idx) => {
          const placed = s.floorplan_x != null && s.floorplan_y != null;
          return (
            <li
              key={s.id}
              className={`flex items-center justify-between rounded border px-2 py-1.5 ${
                s.id === activeSceneId
                  ? 'border-gold/50 bg-gold/5'
                  : 'border-border bg-bg-elevated'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveSceneId(s.id)}
                className="flex flex-1 items-center gap-2 truncate text-left"
              >
                <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-text-subtle/20 text-[10px] font-bold">
                  {idx + 1}
                </span>
                <span className="truncate text-text">{s.title}</span>
              </button>
              <span
                className={`ml-2 flex-shrink-0 text-[10px] ${
                  placed ? 'text-green-300' : 'text-text-subtle'
                }`}
              >
                {placed ? '✓ Ubicado' : '— Sin pin'}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
