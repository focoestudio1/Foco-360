'use client';

// ============================================================
// Gestor de escenas: lista con drag&drop, upload múltiple,
// renombrar y eliminar.
// ============================================================

import { useRef, useState } from 'react';
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

  const sensors = useSensors(
    // PointerSensor con distancia mínima para no interferir con clicks.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function uploadFiles(files: FileList) {
    setUploading(true);
    let done = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const fd = new FormData();
      fd.append('file', file);
      // Título por defecto = nombre del archivo sin extensión.
      fd.append('title', file.name.replace(/\.[^/.]+$/, ''));
      const res = await fetch(`/api/admin/projects/${projectId}/scenes`, {
        method: 'POST',
        body: fd,
      });
      if (res.ok) {
        const { scene } = await res.json();
        setScenes((prev) => [...prev, { ...scene, signed_url: null }]);
        done++;
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('error', `Error subiendo ${file.name}: ${err.error || ''}`);
      }
    }
    if (done > 0) {
      showToast('success', `${done} escena${done === 1 ? '' : 's'} subida${done === 1 ? '' : 's'}`);
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

  async function renameScene(id: string, title: string) {
    const res = await fetch(`/api/admin/scenes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      showToast('error', 'No se pudo renombrar');
      return;
    }
    setScenes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s))
    );
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
      </div>

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
    </section>
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={scene.signed_url}
            alt={scene.title}
            className="h-full w-full object-cover"
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
