'use client';

// ============================================================
// Gestor de escenas: lista con drag&drop, upload múltiple,
// renombrar y eliminar.
// ============================================================

import { useRef, useState } from 'react';
import Image from 'next/image';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';
import { uploadScene, uploadAudio, getImageDimensions } from '@/lib/uploads';
import type { SceneWithUrl } from './ProjectEditor';

export function ScenesManager({
  projectId,
  scenes,
  setScenes,
  activeSceneId,
  setActiveSceneId,
  onChanged,
}: {
  projectId: string;
  scenes: SceneWithUrl[];
  setScenes: React.Dispatch<React.SetStateAction<SceneWithUrl[]>>;
  activeSceneId: string | null;
  setActiveSceneId: (id: string | null) => void;
  onChanged: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Estado de subida: cuál archivo va, su fase, % y total de la cola.
  const [progress, setProgress] = useState<{
    fileName: string;
    phase: 'compressing' | 'uploading';
    pct: number;
    index: number;
    total: number;
  } | null>(null);

  const sensors = useSensors(
    // PointerSensor con distancia mínima para no interferir con clicks.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Agrega una escena de VIDEO 360. El video NO se sube aquí: se sube antes a
  // FOCO Player (que lo manda a Bunny con streaming adaptativo, imprescindible
  // porque un 360 en 4K pesa muchísimo) y aquí solo se pega su link.
  async function agregarEscenaVideo() {
    const url = window.prompt(
      'Pega el link del VIDEO 360 (el playlist de Bunny, termina en .m3u8).\n\n' +
        'Lo obtienes en FOCO Player: sube el video, márcalo "🥽 Es un video 360°" y copia su enlace.'
    );
    if (!url) return;
    if (!/^https:\/\/\S+$/i.test(url.trim())) {
      showToast('error', 'El link debe empezar por https://');
      return;
    }
    const title = window.prompt('Título de la escena (ej: Recorrido del salón)') || 'Video 360°';

    try {
      const res = await fetch(`/api/admin/projects/${projectId}/scenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'video', videoUrl: url.trim(), title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear la escena');
      setScenes((prev) => [...prev, { ...data.scene, signed_url: null }]);
      showToast('success', 'Escena de video 360 agregada');
    } catch (e) {
      showToast('error', (e as Error).message);
    }
  }

  async function uploadFiles(files: FileList) {
    setUploading(true);
    const candidates = Array.from(files).filter((f) =>
      f.type.startsWith('image/')
    );

    // Validación de aspect ratio: panoramas equirrectangulares son 2:1.
    // Aceptamos rango 1.8–2.2 para tolerar pequeñas variaciones de cámara.
    const checked = await Promise.all(
      candidates.map(async (file) => {
        const dim = await getImageDimensions(file);
        const ratio = dim ? dim.width / dim.height : null;
        return {
          file,
          ratio,
          ok: ratio === null ? true : ratio >= 1.8 && ratio <= 2.2,
        };
      })
    );

    let all = candidates;
    const bad = checked.filter((c) => !c.ok);
    if (bad.length > 0) {
      const list = bad
        .map((b) => `• ${b.file.name} (ratio ${b.ratio?.toFixed(2)}:1)`)
        .join('\n');
      const proceed = confirm(
        `Estos archivos no parecen fotos 360° equirrectangulares ` +
          `(deberían tener proporción 2:1):\n\n${list}\n\n` +
          `Si los subes igual, se verán deformados en el visor. ¿Continuar?`
      );
      if (!proceed) {
        all = checked.filter((c) => c.ok).map((c) => c.file);
        if (all.length === 0) {
          setUploading(false);
          return;
        }
      }
    }

    let done = 0;
    for (let i = 0; i < all.length; i++) {
      const file = all[i];
      const title = file.name.replace(/\.[^/.]+$/, '');
      try {
        setProgress({
          fileName: file.name,
          phase: 'compressing',
          pct: 0,
          index: i + 1,
          total: all.length,
        });
        const { scene } = await uploadScene(projectId, file, title, (p) => {
          setProgress({
            fileName: file.name,
            phase: p.phase,
            pct: p.pct,
            index: i + 1,
            total: all.length,
          });
        });
        setScenes((prev) => [...prev, { ...scene, signed_url: null }]);
        done++;
      } catch (e) {
        showToast('error', `Error subiendo ${file.name}: ${(e as Error).message}`);
      }
    }
    setProgress(null);
    if (done > 0) {
      showToast(
        'success',
        `${done} escena${done === 1 ? '' : 's'} subida${done === 1 ? '' : 's'}`
      );
      // Refresca para obtener URLs firmadas.
      onChanged();
    }
    setUploading(false);
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = scenes.findIndex((s) => s.id === active.id);
    const newIdx = scenes.findIndex((s) => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const newOrder = arrayMove(scenes, oldIdx, newIdx);
    // Optimistic UI: pintamos primero, sincronizamos luego.
    setScenes(newOrder);

    const res = await fetch(`/api/admin/projects/${projectId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newOrder.map((s) => s.id) }),
    });
    if (!res.ok) {
      showToast('error', 'No se pudo guardar el orden');
      setScenes(scenes); // revertir
    }
  }

  async function updateScene(
    id: string,
    patch: { title?: string; description?: string | null }
  ) {
    const res = await fetch(`/api/admin/scenes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      showToast('error', 'No se pudo guardar');
      return false;
    }
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
    return true;
  }

  // Para SortableScene (rename inline).
  async function renameScene(id: string, title: string) {
    await updateScene(id, { title });
  }

  async function deleteScene(id: string) {
    if (!confirm('¿Eliminar esta escena? Sus hotspots también se borrarán.')) {
      return;
    }
    const res = await fetch(`/api/admin/scenes/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      showToast('error', 'No se pudo eliminar');
      return;
    }
    setScenes((prev) => prev.filter((s) => s.id !== id));
    if (activeSceneId === id) setActiveSceneId(null);
    showToast('success', 'Escena eliminada');
  }

  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            Escenas del tour
          </h2>
          <p className="mt-1 text-xs text-text-subtle">
            Arrastra para reordenar. Click para seleccionar y editar hotspots.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              uploadFiles(e.target.files);
            }
            e.target.value = '';
          }}
        />
        <Button
          onClick={() => fileRef.current?.click()}
          loading={uploading}
        >
          + Subir escenas
        </Button>
        <button
          type="button"
          onClick={agregarEscenaVideo}
          className="btn-secondary text-xs"
          title="Agrega una escena que sea un VIDEO 360 (se sube antes en FOCO Player)"
        >
          🎬 + Video 360°
        </button>
      </div>

      {/* Barra de progreso mientras se procesa/sube */}
      {progress && (
        <div className="mb-4 rounded-md border border-border bg-bg-elevated p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="truncate text-text-muted">
              {progress.phase === 'compressing' ? 'Optimizando' : 'Subiendo'}{' '}
              <span className="text-text">{progress.fileName}</span>{' '}
              ({progress.index}/{progress.total})
            </span>
            <span className="tabular-nums text-gold">{progress.pct}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-bg-hover">
            <div
              className={`h-full transition-all ${
                progress.phase === 'compressing'
                  ? 'bg-blue-400'
                  : 'bg-gold'
              }`}
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {scenes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border py-12 text-center">
          <p className="text-sm text-text-muted">Aún no hay escenas.</p>
          <p className="mt-1 text-xs text-text-subtle">
            Sube fotos 360° equirrectangulares (2:1).
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={scenes.map((s) => s.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {scenes.map((scene, idx) => (
                <SortableScene
                  key={scene.id}
                  scene={scene}
                  index={idx}
                  active={activeSceneId === scene.id}
                  onSelect={() => setActiveSceneId(scene.id)}
                  onRename={(t) => renameScene(scene.id, t)}
                  onDelete={() => deleteScene(scene.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Panel de detalles de la escena activa */}
      {activeSceneId && (
        <ActiveSceneDetails
          key={activeSceneId}
          projectId={projectId}
          scene={scenes.find((s) => s.id === activeSceneId)!}
          onSave={(patch) => updateScene(activeSceneId, patch)}
          onAudioChanged={(audio_url) =>
            setScenes((prev) =>
              prev.map((s) =>
                s.id === activeSceneId ? { ...s, audio_url } : s
              )
            )
          }
        />
      )}
    </section>
  );
}

// Editor de título + descripción + audio de la escena activa.
function ActiveSceneDetails({
  projectId,
  scene,
  onSave,
  onAudioChanged,
}: {
  projectId: string;
  scene: SceneWithUrl;
  onSave: (patch: { title?: string; description?: string | null }) => Promise<boolean | void>;
  onAudioChanged: (audio_url: string | null) => void;
}) {
  const [title, setTitle] = useState(scene.title);
  const [description, setDescription] = useState(scene.description ?? '');
  const [saving, setSaving] = useState(false);
  const audioRef = useRef<HTMLInputElement>(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioPct, setAudioPct] = useState(0);

  // Detectamos si hay cambios sin guardar.
  const dirty =
    title.trim() !== scene.title ||
    (description.trim() || null) !== (scene.description || null);

  async function handleSave() {
    setSaving(true);
    // Solo enviamos los campos que realmente cambiaron — así el PATCH
    // no toca columnas innecesarias y es más resistente.
    const patch: { title?: string; description?: string | null } = {};
    const newTitle = title.trim() || 'Escena sin título';
    const newDesc = description.trim() || null;
    if (newTitle !== scene.title) patch.title = newTitle;
    if (newDesc !== (scene.description ?? null)) patch.description = newDesc;
    if (Object.keys(patch).length > 0) {
      await onSave(patch);
    }
    setSaving(false);
  }

  return (
    <div className="mt-5 rounded-md border border-gold/20 bg-bg-elevated/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gold">
          ▸ Escena seleccionada
        </h3>
        {dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary text-xs"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        )}
      </div>

      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wider text-text-muted">
          Título (visible en el visor)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-field"
          placeholder="Ej. Sala de espera"
        />
      </div>

      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wider text-text-muted">
          Descripción (visible al cambiar de escena)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="input-field resize-none"
          placeholder="Ej. Recibidor con monitores informativos y muestrario de gafas."
        />
        <p className="mt-1 text-[10px] text-text-subtle">
          Opcional. Si la escribes, aparece como overlay al entrar a esta escena.
        </p>
      </div>

      {/* AUDIO de narración */}
      <div>
        <label className="mb-1 block text-[11px] uppercase tracking-wider text-text-muted">
          Audio (opcional)
        </label>
        <input
          ref={audioRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (!f.type.startsWith('audio/')) {
              showToast('error', 'Selecciona un archivo de audio');
              return;
            }
            setAudioUploading(true);
            setAudioPct(0);
            try {
              const { key } = await uploadAudio(projectId, scene.id, f, (p) =>
                setAudioPct(p.pct)
              );
              onAudioChanged(key);
              showToast('success', 'Audio subido');
            } catch (err) {
              showToast('error', (err as Error).message);
            } finally {
              setAudioUploading(false);
              setAudioPct(0);
            }
          }}
        />

        {scene.audio_url ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate rounded-md border border-border bg-bg-elevated px-3 py-2 text-xs text-text-muted">
              🎵 Audio configurado
            </span>
            <button
              type="button"
              onClick={() => audioRef.current?.click()}
              disabled={audioUploading}
              className="btn-secondary text-xs"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirm('¿Quitar el audio de esta escena?')) return;
                const res = await fetch(`/api/admin/scenes/${scene.id}/audio`, {
                  method: 'DELETE',
                });
                if (!res.ok) {
                  showToast('error', 'Error al quitar audio');
                  return;
                }
                onAudioChanged(null);
                showToast('success', 'Audio quitado');
              }}
              className="text-xs text-text-muted hover:text-red-300"
            >
              Quitar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => audioRef.current?.click()}
            disabled={audioUploading}
            className="btn-secondary w-full text-xs"
          >
            {audioUploading ? `Subiendo… ${audioPct}%` : '🎵 Subir audio'}
          </button>
        )}
        {audioUploading && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-bg-hover">
            <div
              className="h-full bg-gold transition-all"
              style={{ width: `${audioPct}%` }}
            />
          </div>
        )}
        <p className="mt-1 text-[10px] text-text-subtle">
          Reproducción automática controlable por el visitante (MP3, M4A, OGG).
        </p>
      </div>
    </div>
  );
}

// Card de escena arrastrable.
function SortableScene({
  scene,
  index,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  scene: SceneWithUrl;
  index: number;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(scene.title);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative overflow-hidden rounded-md border ${
        active ? 'border-gold' : 'border-border'
      } bg-bg-elevated`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="block aspect-video w-full overflow-hidden"
      >
        {scene.signed_url ? (
          // next/image -> Vercel optimiza on-the-fly: descarga la
          // panorámica original UNA vez en el servidor, genera una
          // versión chiquita (~640px ancho) y la cachea en el edge.
          // El navegador solo descarga ~30-80 KB en vez de 30 MB.
          <Image
            src={scene.signed_url}
            alt={scene.title}
            width={320}
            height={180}
            sizes="(max-width: 768px) 50vw, 200px"
            className="h-full w-full object-cover"
            unoptimized={false}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-text-subtle">
            Cargando…
          </div>
        )}
      </button>

      {/* Handle drag */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1 cursor-grab rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-text-muted backdrop-blur active:cursor-grabbing"
        title="Arrastrar para reordenar"
      >
        ⋮⋮ {index + 1}
      </div>

      {/* Botón eliminar */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute right-1 top-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-red-300 opacity-0 backdrop-blur transition-opacity hover:bg-red-950/80 group-hover:opacity-100"
        title="Eliminar escena"
      >
        ✕
      </button>

      {/* Título / editar */}
      <div className="p-2">
        {editing ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (draftTitle !== scene.title) onRename(draftTitle);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setDraftTitle(scene.title);
                setEditing(false);
              }
            }}
            className="w-full bg-transparent text-xs outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="block w-full truncate text-left text-xs text-text hover:text-gold"
            title={scene.title}
          >
            {scene.title}
          </button>
        )}
      </div>
    </div>
  );
}
