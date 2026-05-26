'use client';

// ============================================================
// Acciones rápidas para cada card de la lista de proyectos:
// pausar/activar (toggle is_active) y eliminar.
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/ui/Toast';

export function ProjectCardActions({
  projectId,
  projectName,
  isActive,
}: {
  projectId: string;
  projectName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(isActive);

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/admin/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !active }),
    });
    if (!res.ok) {
      showToast('error', 'No se pudo cambiar el estado');
      setBusy(false);
      return;
    }
    setActive(!active);
    showToast('success', !active ? 'Tour activado' : 'Tour pausado');
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (
      !confirm(
        `¿Eliminar "${projectName}"?\n\nEsto borra todas las escenas, hotspots y archivos del bucket. No se puede deshacer.`
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/projects/${projectId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      showToast('error', 'No se pudo eliminar');
      setBusy(false);
      return;
    }
    showToast('success', 'Proyecto eliminado');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`flex h-7 w-7 items-center justify-center rounded transition-colors disabled:opacity-50 ${
          active
            ? 'text-gold hover:bg-gold/10'
            : 'text-text-subtle hover:bg-bg-hover'
        }`}
        title={active ? 'Pausar tour (clientes no podrán verlo)' : 'Activar tour'}
        aria-label={active ? 'Pausar' : 'Activar'}
      >
        {active ? (
          // Icono pause
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          // Icono play
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="flex h-7 w-7 items-center justify-center rounded text-text-subtle transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
        title="Eliminar tour"
        aria-label="Eliminar"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}
