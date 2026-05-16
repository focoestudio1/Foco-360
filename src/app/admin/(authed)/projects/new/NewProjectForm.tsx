'use client';

// Formulario de creación de proyecto.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';

export function NewProjectForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // Toggle: con contraseña (privado) o sin contraseña (público).
  const [usePassword, setUsePassword] = useState(true);
  const [form, setForm] = useState({
    name: '',
    client_name: '',
    description: '',
    password: '',
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('error', 'El nombre es obligatorio');
      return;
    }
    if (usePassword && form.password.length < 4) {
      showToast('error', 'La contraseña debe tener al menos 4 caracteres');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, password: usePassword ? form.password : '' };
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Error al crear');
        setLoading(false);
        return;
      }
      showToast('success', 'Proyecto creado');
      router.push(`/admin/projects/${data.project.slug}`);
    } catch {
      showToast('error', 'Error de red');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Nombre del proyecto *"
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
        placeholder="Ej. Casa Azul — Carrera 5"
        required
      />
      <Input
        label="Cliente"
        value={form.client_name}
        onChange={(e) => update('client_name', e.target.value)}
        placeholder="Ej. Inmobiliaria XYZ"
      />
      <Textarea
        label="Descripción"
        value={form.description}
        onChange={(e) => update('description', e.target.value)}
        placeholder="Breve descripción del inmueble..."
        rows={3}
      />
      {/* Toggle privado/público */}
      <div className="rounded-md border border-border bg-bg-elevated p-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={usePassword}
            onChange={(e) => setUsePassword(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-gold"
          />
          <div className="flex-1 text-sm">
            <div className="text-text">Proteger con contraseña</div>
            <div className="mt-0.5 text-xs text-text-subtle">
              {usePassword
                ? 'El cliente necesita la contraseña para ver el tour.'
                : 'Tour público: cualquiera con el link podrá verlo.'}
            </div>
          </div>
        </label>
      </div>

      {usePassword && (
        <Input
          label="Contraseña del tour *"
          type="text"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          placeholder="Mínimo 4 caracteres"
          hint="El cliente la usará para acceder al tour."
          required
          minLength={4}
        />
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={loading}>
          Crear proyecto
        </Button>
      </div>
    </form>
  );
}
