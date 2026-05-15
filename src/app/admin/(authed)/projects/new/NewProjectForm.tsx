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
    if (form.password.length < 4) {
      showToast('error', 'La contraseña debe tener al menos 4 caracteres');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Error al crear');
        setLoading(false);
        return;
      }
      showToast('success', 'Proyecto creado');
      router.push(`/admin/projects/${data.project.id}`);
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
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" loading={loading}>
          Crear proyecto
        </Button>
      </div>
    </form>
  );
}
