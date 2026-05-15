'use client';

// ============================================================
// Editor de hotspots de la escena seleccionada.
// Permite agregar/editar/eliminar puntos de navegación.
// Coordenadas pitch/yaw editables manualmente (en grados).
// ============================================================

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showToast } from '@/components/ui/Toast';
import { HotspotPlacementViewer } from './HotspotPlacementViewer';
import type { Hotspot, SceneWithUrl } from './ProjectEditor';

export function HotspotEditor({
  scenes,
  hotspots,
  setHotspots,
  activeSceneId,
}: {
  scenes: SceneWithUrl[];
  hotspots: Hotspot[];
  setHotspots: React.Dispatch<React.SetStateAction<Hotspot[]>>;
  activeSceneId: string | null;
}) {
  const activeScene = useMemo(
    () => scenes.find((s) => s.id === activeSceneId) ?? null,
    [scenes, activeSceneId]
  );

  const sceneHotspots = useMemo(
    () => hotspots.filter((h) => h.scene_id === activeSceneId),
    [hotspots, activeSceneId]
  );

  const otherScenes = useMemo(
    () => scenes.filter((s) => s.id !== activeSceneId),
    [scenes, activeSceneId]
  );

  const [creating, setCreating] = useState(false);
  // Hotspot recién creado — lo resaltamos brevemente en la lista.
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

  // Crea un hotspot con pitch/yaw arbitrarios (usado por la vista previa).
  async function createHotspotAt(pitch: number, yaw: number) {
    if (!activeSceneId) return;
    setCreating(true);
    const res = await fetch(
      `/api/admin/scenes/${activeSceneId}/hotspots`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitch, yaw, label: 'Ir a otra escena' }),
      }
    );
    if (!res.ok) {
      showToast('error', 'No se pudo crear el hotspot');
      setCreating(false);
      return;
    }
    const { hotspot } = await res.json();
    setHotspots((prev) => [...prev, hotspot]);
    setJustCreatedId(hotspot.id);
    setTimeout(() => setJustCreatedId(null), 2000);
    showToast('success', 'Hotspot agregado — elige la escena destino abajo');
    setCreating(false);
  }

  // Crea un hotspot en el centro de la vista (fallback manual).
  function createHotspot() {
    return createHotspotAt(0, 0);
  }

  async function updateHotspot(id: string, patch: Partial<Hotspot>) {
    const res = await fetch(`/api/admin/hotspots/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      showToast('error', 'No se pudo guardar');
      return;
    }
    const { hotspot } = await res.json();
    setHotspots((prev) =>
      prev.map((h) => (h.id === id ? hotspot : h))
    );
  }

  async function deleteHotspot(id: string) {
    if (!confirm('¿Eliminar este hotspot?')) return;
    const res = await fetch(`/api/admin/hotspots/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      showToast('error', 'No se pudo eliminar');
      return;
    }
    setHotspots((prev) => prev.filter((h) => h.id !== id));
  }

  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            Hotspots
          </h2>
          <p className="mt-1 text-xs text-text-subtle">
            {activeScene
              ? `Editando hotspots de: "${activeScene.title}"`
              : 'Selecciona una escena arriba para ver sus hotspots.'}
          </p>
        </div>
        {activeScene && (
          <Button onClick={createHotspot} loading={creating} variant="secondary">
            + Agregar hotspot
          </Button>
        )}
      </div>

      {!activeScene ? null : (
        <>
          {/* Vista previa Pannellum con colocación por click */}
          {activeScene.signed_url && (
            <div className="mb-5">
              <HotspotPlacementViewer
                imageUrl={activeScene.signed_url}
                hotspots={sceneHotspots}
                onPlace={(pitch, yaw) => createHotspotAt(pitch, yaw)}
                onHotspotClick={(h) => {
                  setJustCreatedId(h.id);
                  setTimeout(() => setJustCreatedId(null), 1500);
                  // Hace scroll al item de la lista.
                  const el = document.getElementById(`hotspot-${h.id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />
            </div>
          )}
        </>
      )}

      {!activeScene ? null : sceneHotspots.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-8 text-center text-xs text-text-subtle">
          Aún no hay hotspots. Usa <strong>+ Agregar con click</strong> arriba o
          el botón de la cabecera para crear uno.
        </div>
      ) : (
        <ul className="space-y-3">
          {sceneHotspots.map((h) => (
            <li
              key={h.id}
              id={`hotspot-${h.id}`}
              className={`rounded-md border bg-bg-elevated p-3 transition-colors ${
                justCreatedId === h.id
                  ? 'border-gold shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                  : 'border-border'
              }`}
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
                <div className="sm:col-span-4">
                  <Input
                    label="Etiqueta"
                    defaultValue={h.label ?? ''}
                    onBlur={(e) => updateHotspot(h.id, { label: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="label">Escena destino</label>
                  <select
                    defaultValue={h.target_scene_id ?? ''}
                    onChange={(e) =>
                      updateHotspot(h.id, {
                        target_scene_id: e.target.value || null,
                      })
                    }
                    className="input-field"
                  >
                    <option value="">— Sin destino —</option>
                    {otherScenes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Pitch"
                    type="number"
                    step="0.1"
                    defaultValue={h.pitch}
                    onBlur={(e) =>
                      updateHotspot(h.id, { pitch: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Yaw"
                    type="number"
                    step="0.1"
                    defaultValue={h.yaw}
                    onBlur={(e) =>
                      updateHotspot(h.id, { yaw: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => deleteHotspot(h.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[11px] text-text-subtle">
        <strong>Tip:</strong> usa <em>+ Agregar con click</em> en la vista
        previa para colocar el hotspot visualmente. Los campos pitch (-90 a 90,
        vertical) y yaw (-180 a 180, horizontal) sirven para ajuste fino.
      </p>
    </section>
  );
}
