'use client';

// ============================================================
// Gestor de galería de fotos planas (no 360°) del proyecto.
// - Multi-upload con progreso (comprime a max 2400px, ~1.5 MB).
// - Grid de thumbnails con caption editable inline.
// - Drag & drop para reordenar.
// - Borrar por foto (confirma antes).
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
import { uploadGalleryPhoto } from '@/lib/uploads';

export type GalleryPhotoWithUrl = {
  id: string;
  project_id: string;
  image_url: string;
  caption: string | null;
  order_index: number;
  signed_url: string | null;
};

export function GalleryManager({
  projectId,
  photos,
  setPhotos,
  onChanged,
}: {
  projectId: string;
  photos: GalleryPhotoWithUrl[];
  setPhotos: React.Dispatch<React.SetStateAction<GalleryPhotoWithUrl[]>>;
  onChanged: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{
    fileName: string;
    phase: 'compressing' | 'uploading';
    pct: number;
    index: number;
    total: number;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function uploadFiles(files: FileList) {
    setUploading(true);
    const candidates = Array.from(files).filter((f) =>
      f.type.startsWith('image/')
    );

    let done = 0;
    for (let i = 0; i < candidates.length; i++) {
      const file = candidates[i];
      try {
        setProgress({
          fileName: file.name,
          phase: 'compressing',
          pct: 0,
          index: i + 1,
          total: candidates.length,
        });
        const { photo } = await uploadGalleryPhoto(
          projectId,
          file,
          undefined,
          (p) => {
            setProgress({
              fileName: file.name,
              phase: p.phase,
              pct: p.pct,
              index: i + 1,
              total: candidates.length,
            });
          }
        );
        setPhotos((prev) => [...prev, { ...photo, signed_url: null }]);
        done++;
      } catch (e) {
        showToast('error', `Error subiendo ${file.name}: ${(e as Error).message}`);
      }
    }
    setProgress(null);
    if (done > 0) {
      showToast(
        'success',
        `${done} foto${done === 1 ? '' : 's'} subida${done === 1 ? '' : 's'}`
      );
      // Refresh para obtener signed URLs.
      onChanged();
    }
    setUploading(false);
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = photos.findIndex((p) => p.id === active.id);
    const newIdx = photos.findIndex((p) => p.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const newOrder = arrayMove(photos, oldIdx, newIdx);
    setPhotos(newOrder);

    const res = await fetch(
      `/api/admin/projects/${projectId}/gallery/reorder`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder.map((p) => p.id) }),
      }
    );
    if (!res.ok) {
      showToast('error', 'No se pudo guardar el orden');
      setPhotos(photos);
    }
  }

  async function updateCaption(id: string, caption: string) {
    const res = await fetch(
      `/api/admin/projects/${projectId}/gallery/${id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      }
    );
    if (!res.ok) {
      showToast('error', 'No se pudo guardar el caption');
      return;
    }
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption: caption || null } : p))
    );
  }

  async function deletePhoto(id: string) {
    if (!confirm('¿Eliminar esta foto de la galería?')) return;
    const res = await fetch(
      `/api/admin/projects/${projectId}/gallery/${id}`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      showToast('error', 'No se pudo eliminar');
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    showToast('success', 'Foto eliminada');
  }

  return (
    <section className="card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            Galería de fotos
          </h2>
          <p className="mt-1 text-xs text-text-subtle">
            Fotos planas (no 360°) que se muestran en el visor como galería.
            Ideal para detalles: primer plano de cocina, vista desde el balcón, etc.
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
        <Button onClick={() => fileRef.current?.click()} loading={uploading}>
          + Subir fotos
        </Button>
      </div>

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
                progress.phase === 'compressing' ? 'bg-blue-400' : 'bg-gold'
              }`}
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center">
          <p className="text-xs text-text-subtle">
            Aún no hay fotos en la galería. Subí las que quieras mostrar
            además del tour 360°.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={photos.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((p) => (
                <SortablePhoto
                  key={p.id}
                  photo={p}
                  onUpdateCaption={updateCaption}
                  onDelete={deletePhoto}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

function SortablePhoto({
  photo,
  onUpdateCaption,
  onDelete,
}: {
  photo: GalleryPhotoWithUrl;
  onUpdateCaption: (id: string, caption: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const [caption, setCaption] = useState(photo.caption ?? '');
  const [editing, setEditing] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative overflow-hidden rounded-md border border-border bg-bg-elevated"
    >
      {/* Handle de drag: cubre toda la foto salvo los botones */}
      <div
        {...attributes}
        {...listeners}
        className="relative aspect-square w-full cursor-grab active:cursor-grabbing"
      >
        {photo.signed_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.signed_url}
            alt={photo.caption || 'Foto de galería'}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-subtle">
            (cargando...)
          </div>
        )}
      </div>

      {/* Botón eliminar (arriba a la derecha) */}
      <button
        type="button"
        onClick={() => onDelete(photo.id)}
        className="absolute right-1.5 top-1.5 z-10 rounded-full bg-black/70 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
        title="Eliminar foto"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Caption (edición inline) */}
      <div className="p-2">
        {editing ? (
          <input
            autoFocus
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={async () => {
              setEditing(false);
              if (caption !== (photo.caption ?? '')) {
                await onUpdateCaption(photo.id, caption);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setCaption(photo.caption ?? '');
                setEditing(false);
              }
            }}
            placeholder="Caption (opcional)"
            className="w-full rounded bg-bg px-2 py-1 text-xs text-text outline-none ring-1 ring-border focus:ring-gold"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="w-full truncate text-left text-xs text-text-muted hover:text-text"
            title="Click para editar"
          >
            {photo.caption || <span className="italic">+ caption</span>}
          </button>
        )}
      </div>
    </div>
  );
}
