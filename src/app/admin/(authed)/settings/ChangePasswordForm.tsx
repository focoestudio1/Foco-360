'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';

export function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      showToast('error', 'La confirmación no coincide');
      return;
    }
    if (next.length < 6) {
      showToast('error', 'Mínimo 6 caracteres');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current, new: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast('error', data.error || 'Error al cambiar contraseña');
      setSaving(false);
      return;
    }
    showToast('success', 'Contraseña actualizada');
    setCurrent('');
    setNext('');
    setConfirm('');
    setSaving(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Input
        label="Contraseña actual"
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        required
      />
      <Input
        label="Nueva contraseña"
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        hint="Mínimo 6 caracteres"
        required
        minLength={6}
      />
      <Input
        label="Confirmar nueva contraseña"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />
      <Button type="submit" loading={saving}>
        Cambiar contraseña
      </Button>
    </form>
  );
}
