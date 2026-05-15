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

  async function createHotspot() {
    if (!activeSceneId) return;
    setCreating(true);
    const res = await fetch(
      `/api/admin/scenes/${activeSceneId}/hotspots`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitch: 0, yaw: 0, label: 'Ir a otra escena' }),
      }
    );
    if (!res.ok) {
      showToast('error', 'No se pudo crear el hotspot');
      setCreating(false);
      return;
    }
    const { hotspot } = await res.json();
    setHotspots((prev) => [...prev, hotspot]);
    setCreating(false);
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

      {!activeScene ? null : sceneHotspots.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-8 text-center text-xs text-text-subtle">
          Aún no hay hotspots. Crea uno para enlazar con otra escena.
        </div>
      ) : (
        <ul className="space-y-3">
          {sceneHotspots.map((h) => (
            <li
              key={h.id}
              className="rounded-md border border-border bg-bg-elevated p-3"
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
        <strong>Tip:</strong> pitch va de -90 a 90 (vertical), yaw de -180 a 180
        (horizontal). En el visor puedes navegar a una escena, abrir la consola
        del navegador y leer las coordenadas actuales para anotarlas aquí.
      </p>
    </section>
  );
}
