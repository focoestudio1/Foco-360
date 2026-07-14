'use client';

// ============================================================
// Formulario de contacto que aparece ANTES del intro cinematografico
// cuando el proyecto tiene requires_lead = true.
//
// Diseno consistente con el intro:
//  - Fondo con cover blurred + overlay radial oscuro
//  - Logo FOCO (o del proyecto)
//  - Card centrado con campos + boton dorado
//
// Al submit exitoso, la API setea cookie lead_captured_[slug] y
// hacemos router.refresh() para que el server-side detecte la cookie
// y sirva el TourViewer normal.
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';

export function LeadForm({
  slug,
  projectName,
  clientName,
  coverUrl,
  logoUrl,
  brandColor,
}: {
  slug: string;
  projectName: string;
  clientName?: string | null;
  coverUrl?: string | null;
  logoUrl?: string | null;
  brandColor?: string | null;
}) {
  const router = useRouter();
  const color = brandColor || '#d4af37';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Ingresá tu nombre';
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Email inválido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tour/${slug}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          message: message.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast('error', err.error || 'No se pudo enviar. Intentá de nuevo.');
        setSubmitting(false);
        return;
      }
      // Cookie seteada por la API — recargamos para que el server sirva el tour.
      router.refresh();
    } catch {
      showToast('error', 'Error de conexión. Verificá tu internet.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black p-4">
      {/* Fondo cover blurred */}
      {coverUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-md"
            draggable={false}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.98) 100%)`,
            }}
          />
        </>
      )}

      {/* Card del formulario */}
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-md rounded-lg border border-white/10 bg-black/70 p-6 shadow-2xl backdrop-blur-md sm:p-8"
      >
        {/* Logo / branding */}
        <div className="mb-6 flex flex-col items-center text-center">
          {logoUrl ? (
            <span className="mb-4 inline-flex items-center rounded-md bg-white/95 px-3 py-1.5 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={projectName}
                className="h-10 w-auto"
                draggable={false}
              />
            </span>
          ) : (
            <div
              className="mb-3 h-2 w-2 rounded-full"
              style={{ background: color, boxShadow: `0 0 16px ${color}` }}
            />
          )}
          <p className="mb-1 text-[10px] uppercase tracking-[0.35em] text-white/50">
            Tour virtual 360°
          </p>
          <h1
            className="font-display text-xl font-medium leading-tight tracking-wider text-white sm:text-2xl"
            style={{ textShadow: `0 4px 24px ${color}40` }}
          >
            {projectName.toUpperCase()}
          </h1>
          {clientName && (
            <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/50">
              {clientName}
            </p>
          )}
        </div>

        {/* Subtítulo */}
        <p className="mb-6 text-center text-sm text-white/70">
          Déjanos tus datos para acceder al recorrido virtual completo.
        </p>

        {/* Campos */}
        <div className="space-y-3">
          <FormField
            label="Nombre completo *"
            value={name}
            onChange={setName}
            error={errors.name}
            autoComplete="name"
            required
          />
          <FormField
            label="Email *"
            type="email"
            value={email}
            onChange={setEmail}
            error={errors.email}
            autoComplete="email"
            required
          />
          <FormField
            label="Teléfono (opcional)"
            type="tel"
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
          />
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/60">
              Mensaje (opcional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="¿Alguna pregunta sobre el inmueble?"
              className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
          </div>
        </div>

        {/* Botón */}
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-black transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 sm:text-sm"
          style={{
            background: color,
            boxShadow: `0 4px 24px ${color}40`,
          }}
        >
          {submitting ? (
            <span>Enviando…</span>
          ) : (
            <>
              <span>Ver el tour</span>
              <span>→</span>
            </>
          )}
        </button>

        <p className="mt-4 text-center text-[10px] leading-relaxed text-white/40">
          Tus datos solo serán utilizados para contactarte sobre este inmueble.
        </p>
      </form>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  error,
  autoComplete,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] uppercase tracking-wider text-white/60">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        className={`w-full rounded border bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 ${
          error
            ? 'border-red-500/60 focus:border-red-400'
            : 'border-white/20 focus:border-white/40'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
