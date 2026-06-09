'use client';

// ============================================================
// Panel lateral con los detalles del proyecto:
// portada · logo · link público · datos · acceso · zona peligrosa.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';
import { CopyLinkButton } from './CopyLinkButton';
import {
  uploadCover as uploadCoverDirect,
  uploadLogo as uploadLogoDirect,
  uploadFloorplan as uploadFloorplanDirect,
  uploadSpecsImage as uploadSpecsImageDirect,
  uploadWelcomeVideo as uploadWelcomeVideoDirect,
} from '@/lib/uploads';
import {
  MUSIC_LIBRARY,
  MOOD_LABEL,
  getLibraryByMood,
  getTrackById,
  getTrackUrl,
  type MusicMood,
} from '@/lib/musicLibrary';
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
    whatsapp_phone: project.whatsapp_phone ?? '',
    whatsapp_message: project.whatsapp_message ?? '',
    brand_color: project.brand_color ?? '#d4af37',
    specs_title: project.specs_title ?? '',
    specs_price: project.specs_price ?? '',
    specs_features: project.specs_features ?? '',
    specs_description: project.specs_description ?? '',
    background_music_id: project.background_music_id ?? '',
    background_music_volume: project.background_music_volume ?? 0.4,
  });
  // Modo de acceso: derivado del estado actual del proyecto.
  // El usuario lo cambia con un toggle explícito.
  const [wantPassword, setWantPassword] = useState(project.has_password);
  const [saving, setSaving] = useState(false);

  // Estados de upload (portada y logo, separados).
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverPct, setCoverPct] = useState(0);
  const [coverPhase, setCoverPhase] = useState<'compressing' | 'uploading'>('compressing');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPct, setLogoPct] = useState(0);
  const [logoPhase, setLogoPhase] = useState<'compressing' | 'uploading'>('compressing');
  const [floorUploading, setFloorUploading] = useState(false);
  const [floorPct, setFloorPct] = useState(0);
  const [floorPhase, setFloorPhase] = useState<'compressing' | 'uploading'>('compressing');
  const [specsUploading, setSpecsUploading] = useState(false);
  const [specsPct, setSpecsPct] = useState(0);
  const [specsPhase, setSpecsPhase] = useState<'compressing' | 'uploading'>('compressing');
  const [welcomeUploading, setWelcomeUploading] = useState(false);
  const [welcomePct, setWelcomePct] = useState(0);

  const coverRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const floorRef = useRef<HTMLInputElement>(null);
  const specsRef = useRef<HTMLInputElement>(null);
  const welcomeRef = useRef<HTMLInputElement>(null);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const tourLink = `${siteUrl}/tour/${project.slug}`;

  async function save() {
    setSaving(true);
    const payload: any = {
      name: form.name,
      client_name: form.client_name,
      description: form.description,
      is_active: form.is_active,
      whatsapp_phone: form.whatsapp_phone,
      whatsapp_message: form.whatsapp_message,
      brand_color: form.brand_color,
      specs_title: form.specs_title,
      specs_price: form.specs_price,
      specs_features: form.specs_features,
      specs_description: form.specs_description,
      background_music_id: form.background_music_id || null,
      background_music_volume: form.background_music_volume,
    };
    // Si el usuario quiere contraseña y escribió una, la mandamos.
    if (wantPassword && form.password) {
      payload.password = form.password;
    }
    // Si quería sin contraseña pero ANTES tenía, la quitamos.
    if (!wantPassword && project.has_password) {
      payload.remove_password = true;
    }
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

  async function uploadCoverFile(file: File) {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Selecciona una imagen');
      return;
    }
    setCoverUploading(true);
    setCoverPct(0);
    setCoverPhase('compressing');
    try {
      await uploadCoverDirect(project.id, file, (p) => {
        setCoverPct(p.pct);
        setCoverPhase(p.phase);
      });
      showToast('success', 'Portada actualizada');
      onUpdated();
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setCoverUploading(false);
      setCoverPct(0);
    }
  }

  async function uploadLogoFile(file: File) {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Selecciona una imagen');
      return;
    }
    setLogoUploading(true);
    setLogoPct(0);
    setLogoPhase('compressing');
    try {
      await uploadLogoDirect(project.id, file, (p) => {
        setLogoPct(p.pct);
        setLogoPhase(p.phase);
      });
      showToast('success', 'Logo actualizado');
      onUpdated();
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setLogoUploading(false);
      setLogoPct(0);
    }
  }

  async function uploadSpecsFile(file: File) {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Selecciona una imagen');
      return;
    }
    setSpecsUploading(true);
    setSpecsPct(0);
    setSpecsPhase('compressing');
    try {
      await uploadSpecsImageDirect(project.id, file, (p) => {
        setSpecsPct(p.pct);
        setSpecsPhase(p.phase);
      });
      showToast('success', 'Foto de ficha actualizada');
      onUpdated();
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setSpecsUploading(false);
      setSpecsPct(0);
    }
  }

  async function removeSpecsImage() {
    if (!confirm('¿Quitar la foto de la ficha del inmueble?')) return;
    const res = await fetch(`/api/admin/projects/${project.id}/specs-image`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      showToast('error', 'Error al quitar foto');
      return;
    }
    showToast('success', 'Foto quitada');
    onUpdated();
  }

  async function uploadFloorplanFile(file: File) {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Selecciona una imagen');
      return;
    }
    setFloorUploading(true);
    setFloorPct(0);
    setFloorPhase('compressing');
    try {
      await uploadFloorplanDirect(project.id, file, (p) => {
        setFloorPct(p.pct);
        setFloorPhase(p.phase);
      });
      showToast('success', 'Plano actualizado');
      onUpdated();
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setFloorUploading(false);
      setFloorPct(0);
    }
  }

  async function uploadWelcomeFile(file: File) {
    if (!file.type.startsWith('video/')) {
      showToast('error', 'Selecciona un video (MP4, WebM, MOV)');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showToast('error', 'El video pesa más de 100 MB. Comprímelo antes.');
      return;
    }
    setWelcomeUploading(true);
    setWelcomePct(0);
    try {
      await uploadWelcomeVideoDirect(project.id, file, (p) => {
        setWelcomePct(p.pct);
      });
      showToast('success', 'Video de bienvenida actualizado');
      onUpdated();
    } catch (e) {
      showToast('error', (e as Error).message);
    } finally {
      setWelcomeUploading(false);
      setWelcomePct(0);
    }
  }

  async function removeWelcomeVideo() {
    if (!confirm('¿Quitar el video de bienvenida?')) return;
    const res = await fetch(
      `/api/admin/projects/${project.id}/welcome-video`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      showToast('error', 'Error al quitar video');
      return;
    }
    showToast('success', 'Video quitado');
    onUpdated();
  }

  async function removeFloorplan() {
    if (!confirm('¿Quitar el plano 2D del proyecto?')) return;
    const res = await fetch(`/api/admin/projects/${project.id}/floorplan`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      showToast('error', 'Error al quitar plano');
      return;
    }
    showToast('success', 'Plano quitado');
    onUpdated();
  }

  async function removeLogo() {
    if (!confirm('¿Quitar el logo personalizado? Volverá al logo global de FOCO.')) {
      return;
    }
    const res = await fetch(`/api/admin/projects/${project.id}/logo`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      showToast('error', 'Error al quitar logo');
      return;
    }
    showToast('success', 'Logo quitado');
    onUpdated();
  }

  return (
    <div className="space-y-6">
      {/* ---------- Card PORTADA ---------- */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Portada
        </h2>
        <p className="text-[11px] text-text-subtle">
          Imagen que ve el cliente antes de entrar al tour.
        </p>
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
          ref={coverRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadCoverFile(f);
            e.target.value = '';
          }}
        />
        <Button
          variant="secondary"
          onClick={() => coverRef.current?.click()}
          loading={coverUploading}
          className="w-full"
        >
          {coverUploading
            ? `${coverPhase === 'compressing' ? 'Optimizando' : 'Subiendo'}… ${coverPct}%`
            : project.cover_url
            ? 'Cambiar portada'
            : 'Subir portada'}
        </Button>
        {coverUploading && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-bg-hover">
            <div
              className={`h-full transition-all ${
                coverPhase === 'compressing' ? 'bg-blue-400' : 'bg-gold'
              }`}
              style={{ width: `${coverPct}%` }}
            />
          </div>
        )}
      </div>

      {/* ---------- Card LOGO ---------- */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Logo del proyecto
        </h2>
        <p className="text-[11px] text-text-subtle">
          Reemplaza el logo global FOCO en este tour. PNG con fondo
          transparente o SVG recomendado.
        </p>
        <div className="flex h-20 items-center justify-center rounded-md border border-border bg-white p-2">
          {project.logo_signed_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.logo_signed_url}
              alt="Logo"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="text-[11px] text-text-subtle">
              Usando logo global
            </span>
          )}
        </div>
        <input
          ref={logoRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadLogoFile(f);
            e.target.value = '';
          }}
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => logoRef.current?.click()}
            loading={logoUploading}
            className="flex-1"
          >
            {logoUploading
              ? `${logoPhase === 'compressing' ? 'Optimizando' : 'Subiendo'}… ${logoPct}%`
              : project.logo_url
              ? 'Cambiar logo'
              : 'Subir logo'}
          </Button>
          {project.logo_url && (
            <Button variant="ghost" onClick={removeLogo}>
              Quitar
            </Button>
          )}
        </div>
        {logoUploading && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-bg-hover">
            <div
              className={`h-full transition-all ${
                logoPhase === 'compressing' ? 'bg-blue-400' : 'bg-gold'
              }`}
              style={{ width: `${logoPct}%` }}
            />
          </div>
        )}
      </div>

      {/* ---------- Card LINK PÚBLICO ---------- */}
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

      {/* ---------- Card DETALLES ---------- */}
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

        <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-bg-elevated px-3 py-2">
          <span className="text-sm">Tour activo</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-gold"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
        </label>
      </div>

      {/* ---------- Card ACCESO (toggle privado/público claro) ---------- */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Acceso
        </h2>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setWantPassword(false)}
            className={`rounded-md border px-3 py-3 text-left transition-colors ${
              !wantPassword
                ? 'border-green-500/40 bg-green-500/10 text-green-200'
                : 'border-border bg-bg-elevated text-text-muted hover:border-text-subtle'
            }`}
          >
            <div className="text-xs uppercase tracking-wider">🌐 Público</div>
            <div className="mt-1 text-[11px] opacity-80">
              Cualquiera con el link entra.
            </div>
          </button>
          <button
            type="button"
            onClick={() => setWantPassword(true)}
            className={`rounded-md border px-3 py-3 text-left transition-colors ${
              wantPassword
                ? 'border-gold/40 bg-gold/10 text-gold'
                : 'border-border bg-bg-elevated text-text-muted hover:border-text-subtle'
            }`}
          >
            <div className="text-xs uppercase tracking-wider">🔒 Privado</div>
            <div className="mt-1 text-[11px] opacity-80">
              Requiere contraseña.
            </div>
          </button>
        </div>

        {wantPassword && (
          <Input
            label={project.has_password ? 'Cambiar contraseña' : 'Nueva contraseña'}
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
                ? 'Si dejas vacío, la contraseña actual se mantiene.'
                : 'Esta contraseña la usará el cliente al abrir el link.'
            }
          />
        )}

        {!wantPassword && project.has_password && (
          <p className="rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-[11px] text-yellow-200">
            ⚠ Al guardar, este tour quedará público (sin contraseña).
          </p>
        )}
      </div>

      {/* ---------- Card PLANO 2D ---------- */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          🗺 Plano 2D (opcional)
        </h2>
        <p className="text-[11px] text-text-subtle">
          Si subes un plano, aparece un mini-mapa flotante en el visor
          con pines de cada escena. Después coloca los pines en la
          sección "Posicionar escenas en plano".
        </p>
        {project.floorplan_signed_url ? (
          <div className="aspect-video w-full overflow-hidden rounded-md border border-border bg-bg-elevated">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.floorplan_signed_url}
              alt="Plano 2D"
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-[11px] text-text-subtle">
            Sin plano
          </div>
        )}
        <input
          ref={floorRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFloorplanFile(f);
            e.target.value = '';
          }}
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => floorRef.current?.click()}
            loading={floorUploading}
            className="flex-1"
          >
            {floorUploading
              ? `${floorPhase === 'compressing' ? 'Optimizando' : 'Subiendo'}… ${floorPct}%`
              : project.floorplan_url
              ? 'Cambiar plano'
              : 'Subir plano'}
          </Button>
          {project.floorplan_url && (
            <Button variant="ghost" onClick={removeFloorplan}>
              Quitar
            </Button>
          )}
        </div>
        {floorUploading && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-bg-hover">
            <div
              className={`h-full transition-all ${
                floorPhase === 'compressing' ? 'bg-blue-400' : 'bg-gold'
              }`}
              style={{ width: `${floorPct}%` }}
            />
          </div>
        )}
      </div>

      {/* ---------- Card FICHA DEL INMUEBLE ---------- */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          🏠 Ficha del inmueble
        </h2>
        <p className="text-[11px] text-text-subtle">
          Card flotante en el visor con foto + datos del inmueble (para venta,
          arriendo o muestra). Si dejas todo vacío, la card no aparece.
        </p>

        {/* Foto */}
        {project.specs_image_signed_url ? (
          <div className="aspect-video w-full overflow-hidden rounded-md border border-border bg-bg-elevated">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={project.specs_image_signed_url}
              alt="Foto ficha"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border text-[11px] text-text-subtle">
            Sin foto
          </div>
        )}
        <input
          ref={specsRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadSpecsFile(f);
            e.target.value = '';
          }}
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => specsRef.current?.click()}
            loading={specsUploading}
            className="flex-1"
          >
            {specsUploading
              ? `${specsPhase === 'compressing' ? 'Optimizando' : 'Subiendo'}… ${specsPct}%`
              : project.specs_image_url
              ? 'Cambiar foto'
              : 'Subir foto'}
          </Button>
          {project.specs_image_url && (
            <Button variant="ghost" onClick={removeSpecsImage}>
              Quitar
            </Button>
          )}
        </div>
        {specsUploading && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-bg-hover">
            <div
              className={`h-full transition-all ${
                specsPhase === 'compressing' ? 'bg-blue-400' : 'bg-gold'
              }`}
              style={{ width: `${specsPct}%` }}
            />
          </div>
        )}

        {/* Campos de la ficha */}
        <Input
          label="Título"
          value={form.specs_title}
          onChange={(e) => setForm({ ...form, specs_title: e.target.value })}
          placeholder="Ej. Casa 3 habitaciones con piscina"
        />
        <Input
          label="Precio"
          value={form.specs_price}
          onChange={(e) => setForm({ ...form, specs_price: e.target.value })}
          placeholder="Ej. $450.000.000 COP · En venta"
        />
        <div>
          <label className="label">Características (una por línea)</label>
          <textarea
            value={form.specs_features}
            onChange={(e) =>
              setForm({ ...form, specs_features: e.target.value })
            }
            rows={4}
            className="input-field resize-none"
            placeholder={'Ej.\n3 habitaciones\n2 baños\n120 m²\nParqueadero'}
          />
          <p className="mt-1 text-[10px] text-text-subtle">
            Cada línea aparece como un item con viñeta dorada en la card.
          </p>
        </div>
        <Textarea
          label="Descripción"
          value={form.specs_description}
          onChange={(e) =>
            setForm({ ...form, specs_description: e.target.value })
          }
          rows={3}
          placeholder="Ej. Casa esquinera en sector residencial, cocina integral..."
        />
      </div>

      {/* ---------- Card COLOR DE MARCA ---------- */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          🎨 Color de marca
        </h2>
        <p className="text-[11px] text-text-subtle">
          Color de acento del visor (bordes de hotspot, botones).
          Default = dorado FOCO. Hex válido: <code>#d4af37</code>.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.brand_color}
            onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
            className="h-10 w-16 cursor-pointer rounded border border-border bg-bg-elevated"
          />
          <Input
            value={form.brand_color}
            onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
            placeholder="#d4af37"
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => setForm({ ...form, brand_color: '#d4af37' })}
            className="text-xs text-text-muted hover:text-text"
            title="Restaurar dorado FOCO"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ---------- Card EMBED ---------- */}
      <div className="card space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          🔗 Código embebido
        </h2>
        <p className="text-[11px] text-text-subtle">
          Para que el cliente pegue el tour en su propia web (con
          <code> iframe</code>).
        </p>
        <code className="block break-all rounded bg-bg-elevated px-3 py-2 text-[10px] text-text-muted">{`<iframe src="${tourLink}?embed=1" width="100%" height="600" frameborder="0" allowfullscreen allow="autoplay; fullscreen"></iframe>`}</code>
        <CopyLinkButton
          url={`<iframe src="${tourLink}?embed=1" width="100%" height="600" frameborder="0" allowfullscreen allow="autoplay; fullscreen"></iframe>`}
        />
      </div>

      {/* ---------- Card VIDEO DE BIENVENIDA ---------- */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          🎥 Video de bienvenida (opcional)
        </h2>
        <p className="text-[11px] text-text-subtle">
          Video corto (15-60s) del agente inmobiliario o un avatar AI dando
          la bienvenida y explicando el inmueble. Aparece en un modal al abrir
          el tour, una sola vez por visitante. Recomendado MP4 720p, máx 100 MB.
        </p>

        {project.welcome_video_signed_url ? (
          <video
            src={project.welcome_video_signed_url}
            controls
            className="aspect-video w-full rounded-md border border-border bg-black"
          />
        ) : (
          <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-border text-[11px] text-text-subtle">
            Sin video
          </div>
        )}

        <input
          ref={welcomeRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadWelcomeFile(f);
            e.target.value = '';
          }}
        />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => welcomeRef.current?.click()}
            loading={welcomeUploading}
            className="flex-1"
          >
            {welcomeUploading
              ? `Subiendo… ${welcomePct}%`
              : project.welcome_video_url
              ? 'Cambiar video'
              : 'Subir video'}
          </Button>
          {project.welcome_video_url && (
            <Button variant="ghost" onClick={removeWelcomeVideo}>
              Quitar
            </Button>
          )}
        </div>
        {welcomeUploading && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-bg-hover">
            <div
              className="h-full bg-gold transition-all"
              style={{ width: `${welcomePct}%` }}
            />
          </div>
        )}
      </div>

      {/* ---------- Card MÚSICA DE FONDO ---------- */}
      <MusicCard
        selectedId={form.background_music_id}
        volume={form.background_music_volume}
        onChangeId={(id) =>
          setForm({ ...form, background_music_id: id })
        }
        onChangeVolume={(v) =>
          setForm({ ...form, background_music_volume: v })
        }
      />

      {/* ---------- Card WHATSAPP ---------- */}
      <div className="card space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          💬 Contacto WhatsApp (opcional)
        </h2>
        <p className="text-[11px] text-text-subtle">
          Si lo configuras, aparece un botón flotante verde en el visor que
          abre WhatsApp con un mensaje pre-cargado.
        </p>
        <Input
          label="Número (con código de país, sin + ni espacios)"
          value={form.whatsapp_phone}
          onChange={(e) =>
            setForm({ ...form, whatsapp_phone: e.target.value })
          }
          placeholder="Ej. 573177886527"
          hint="Formato internacional. Ejemplos: 573177886527 (Colombia), 5215512345678 (México)."
        />
        <Textarea
          label="Mensaje pre-cargado (opcional)"
          value={form.whatsapp_message}
          onChange={(e) =>
            setForm({ ...form, whatsapp_message: e.target.value })
          }
          placeholder="Ej. Hola, vi el tour de la Óptica La Bodega y me gustaría más info."
          rows={2}
        />
      </div>

      {/* ---------- Botón GUARDAR (sticky-ish al final) ---------- */}
      <div className="flex justify-end">
        <Button onClick={save} loading={saving} className="w-full">
          Guardar cambios
        </Button>
      </div>

      {/* ---------- ZONA PELIGRO (eliminar) ---------- */}
      <div className="card border-red-500/30 bg-red-500/5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-red-300">
          Zona peligrosa
        </h2>
        <p className="text-[11px] text-text-subtle">
          Eliminar este proyecto borra todas sus escenas, hotspots y
          archivos del bucket. <strong className="text-red-300">No se puede deshacer.</strong>
        </p>
        <Button variant="danger" onClick={onDelete} className="w-full">
          🗑 Eliminar proyecto
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Card: música de fondo
// ============================================================
// Dropdown agrupado por mood + preview ▶ + slider de volumen.
// La pista preview se reproduce desde /public/music/<file>.mp3
// (mismo origen, sin CORS). Auto-stop al cambiar de pista.
function MusicCard({
  selectedId,
  volume,
  onChangeId,
  onChangeVolume,
}: {
  selectedId: string;
  volume: number;
  onChangeId: (id: string) => void;
  onChangeVolume: (v: number) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const byMood = getLibraryByMood();
  const moods = Object.keys(byMood) as MusicMood[];

  function togglePreview(id: string) {
    const track = getTrackById(id);
    if (!track) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (previewId === id && !audio.paused) {
      audio.pause();
      setPreviewId(null);
      return;
    }
    audio.src = getTrackUrl(track);
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.play()
      .then(() => setPreviewId(id))
      .catch(() => {
        showToast(
          'error',
          'No se pudo reproducir. ¿Descargaste los mp3? Ver public/music/README.md'
        );
        setPreviewId(null);
      });
  }

  // Detectar fin/pausa externa.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setPreviewId(null);
    const onPause = () => {
      if (audio.ended) setPreviewId(null);
    };
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('pause', onPause);
    };
  }, []);

  return (
    <div className="card space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        🎵 Música de fondo (opcional)
      </h2>
      <p className="text-[11px] text-text-subtle">
        Suena en loop durante todo el tour. Cuando el cliente activa la
        narración de una escena, la música baja de volumen automáticamente
        y vuelve al terminar. El cliente siempre puede silenciarla con el
        botón flotante del visor.
      </p>

      {/* Opción "sin música" */}
      <button
        type="button"
        onClick={() => onChangeId('')}
        className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-colors ${
          selectedId === ''
            ? 'border-text-muted/40 bg-bg-elevated text-text'
            : 'border-border bg-bg-elevated/50 text-text-muted hover:border-text-subtle'
        }`}
      >
        <span className="text-xs">🔇 Sin música</span>
        {selectedId === '' && (
          <span className="text-[10px] uppercase tracking-wider text-text-muted">
            Activo
          </span>
        )}
      </button>

      {/* Lista agrupada por mood */}
      <div className="space-y-2">
        {moods.map((mood) => (
          <div key={mood} className="space-y-1">
            <div className="px-1 text-[10px] uppercase tracking-wider text-text-subtle">
              {MOOD_LABEL[mood]}
            </div>
            {byMood[mood].map((track) => {
              const isSelected = selectedId === track.id;
              const isPreviewing = previewId === track.id;
              return (
                <div
                  key={track.id}
                  className={`flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors ${
                    isSelected
                      ? 'border-gold/40 bg-gold/10'
                      : 'border-border bg-bg-elevated/50 hover:border-text-subtle'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => togglePreview(track.id)}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-bg-hover text-text-muted hover:text-text"
                    title={isPreviewing ? 'Pausar preview' : 'Escuchar preview'}
                    aria-label="Preview"
                  >
                    {isPreviewing ? (
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                        <rect x="6" y="5" width="4" height="14" rx="1" />
                        <rect x="14" y="5" width="4" height="14" rx="1" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeId(track.id)}
                    className="flex-1 text-left text-xs"
                  >
                    {track.title}
                  </button>
                  {isSelected && (
                    <span className="text-[10px] uppercase tracking-wider text-gold">
                      ✓ Elegida
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Slider de volumen base — solo si hay pista elegida */}
      {selectedId && (
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-text-muted">Volumen base</span>
            <span className="text-text">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.8"
            step="0.05"
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChangeVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
            }}
            className="w-full accent-gold"
          />
          <p className="text-[10px] text-text-subtle">
            Cuando suena la narración baja a {Math.round(volume * 15)}% y vuelve
            a {Math.round(volume * 100)}% al terminar.
          </p>
        </div>
      )}

      {/* Aviso si los archivos no están */}
      {selectedId && MUSIC_LIBRARY.length > 0 && (
        <p className="rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-[10px] text-blue-200">
          💡 ¿No suena la preview? Corre <code className="font-mono">pwsh ./scripts/download-music.ps1</code> para
          descargar los mp3 a <code className="font-mono">public/music/</code>.
        </p>
      )}

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="none" />
    </div>
  );
}
