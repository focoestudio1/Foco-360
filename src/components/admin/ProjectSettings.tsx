'use client';

// ============================================================
// Panel lateral con los detalles del proyecto:
// nombre, cliente, descripción, contraseña, activo/inactivo,
// portada y link público (con copy).
// ============================================================

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';
import { CopyLinkButton } from './CopyLinkButton';
import { uploadCover as uploadCoverDirect } from '@/lib/uploads';
import type { Project } from './ProjectEditor';

export function ProjectSettings({
  project,
  onUpdated,
  onDelete,
}: {
  project: Project;
  onUpdated: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    name: project.name,
    client_name: project.client_name ?? '',
    description: project.description ?? '',
    password: '',
    is_active: project.is_active,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<'compressing' | 'uploading'>(
    'compressing'
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const tourLink = `${siteUrl}/tour/${project.slug}`;

  async function save() {
    setSaving(true);
    const payload: any = {
      name: form.name,
      client_name: form.client_name,
      description: form.description,
      is_active: form.is_active,
    };
    if (form.password) payload.password = form.password;
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast('error', data.error || 'Error al guardar');
      setSaving(false);
      return;
    }
    showToast('success', 'Cambios guardados');
    setForm((f) => ({ ...f, password: '' }));
    onUpdated();
    setSaving(false);
  }

  async function removePassword() {
    if (
      !confirm(
        'El tour quedará público: cualquiera con el link podrá verlo sin contraseña. ¿Continuar?'
      )
    ) {
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/admin/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remove_password: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast('error', data.error || 'No se pudo quitar la contraseña');
      setSaving(false);
      return;
    }
    showToast('success', 'Tour ahora es público');
    onUpdated();
    setSaving(false);
  }

  async function uploadCover(file: File) {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Selecciona una imagen');
      return;
    }
    setUploading(true);
    setUploadPct(0);
    setUploadPhase('compressing');
    try {
      await uploadCoverDirect(project.id, file, (p) => {
        setUploadPct(p.pct);
        setUploadPhase(p.phase);
      });
      showToast('success', 'Portada actualizada');
      onUpdated();
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  }

  return (
    <div className="space-y-6">
      {/* Card portada */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Portada
        </h2>
        <div className="aspect-video w-full overflow-hidden rounded-md border border-border bg-bg-elevated">
          {project.cover_signed_url ? (
            <Image
              src={project.cover_signed_url}
              alt="Portada"
              width={640}
              height={360}
              sizes="(max-width: 768px) 100vw, 360px"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-text-subtle">
              Sin portada
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadCover(f);
            e.target.value = '';
          }}
        />
        <Button
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          loading={uploading}
          className="w-full"
        >
          {uploading
            ? `${uploadPhase === 'compressing' ? 'Optimizando' : 'Subiendo'}… ${uploadPct}%`
            : project.cover_url
            ? 'Cambiar portada'
            : 'Subir portada'}
        </Button>
        {uploading && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-bg-hover">
            <div
              className={`h-full transition-all ${
                uploadPhase === 'compressing' ? 'bg-blue-400' : 'bg-gold'
              }`}
              style={{ width: `${uploadPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Card link público */}
      <div className="card space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Link público
        </h2>
        <code className="block break-all rounded bg-bg-elevated px-3 py-2 text-xs text-gold">
          {tourLink}
        </code>
        <div className="flex items-center justify-between gap-2 text-xs">
          <a
            href={`${tourLink}?preview=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted underline-offset-2 hover:text-text hover:underline"
            title="Abre el tour como admin, saltando la contraseña."
          >
            Vista previa →
          </a>
          <CopyLinkButton url={tourLink} />
        </div>
      </div>

      {/* Card detalles */}
      <div className="card space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Detalles
        </h2>
        <Input
          label="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="Cliente"
          value={form.client_name}
          onChange={(e) => setForm({ ...form, client_name: e.target.value })}
        />
        <Textarea
          label="Descripción"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        {/* Estado actual de contraseña + cambio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-text-muted">
              Acceso
            </span>
            {project.has_password ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
                🔒 Con contraseña
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-green-300">
                🌐 Público
              </span>
            )}
          </div>
          <Input
            label={
              project.has_password ? 'Cambiar contraseña' : 'Agregar contraseña'
            }
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={
              project.has_password
                ? 'Dejar vacío para no cambiar'
                : 'Mínimo 4 caracteres'
            }
            hint={
              project.has_password
                ? 'Mínimo 4 caracteres. Dejar vacío para no cambiar.'
                : 'Si escribes una contraseña, el tour pasará a ser privado.'
            }
          />
          {project.has_password && (
            <button
              type="button"
              onClick={removePassword}
              className="text-xs text-text-muted underline-offset-2 hover:text-red-300 hover:underline"
            >
              Quitar contraseña (volver público)
            </button>
          )}
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-bg-elevated px-3 py-2">
          <span className="text-sm">Tour activo</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-gold"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
        </label>

        <div className="flex justify-between pt-2">
          <Button variant="danger" onClick={onDelete}>
            Eliminar
          </Button>
          <Button onClick={save} loading={saving}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
