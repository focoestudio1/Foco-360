'use client';

// ============================================================
// Tabla de leads con filtro por proyecto y export CSV.
// Client component para permitir interactividad sin re-fetch.
// ============================================================

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';

export type LeadRow = {
  id: string;
  project_id: string;
  project_name: string;
  project_slug: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  created_at: string;
  created_at_formatted: string;
};

export function LeadsTable({
  rows,
  projects,
}: {
  rows: LeadRow[];
  projects: { id: string; name: string; slug: string }[];
}) {
  const [projectFilter, setProjectFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    if (projectFilter === 'all') return rows;
    return rows.filter((r) => r.project_id === projectFilter);
  }, [rows, projectFilter]);

  function exportCSV() {
    if (filtered.length === 0) {
      showToast('info', 'No hay leads para exportar');
      return;
    }
    // Escapa un valor para CSV — envuelve en comillas y escapa comillas dobles.
    const esc = (v: string | null) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ');
      return `"${s}"`;
    };
    const header = [
      'Fecha',
      'Proyecto',
      'Nombre',
      'Email',
      'Telefono',
      'Mensaje',
    ].join(',');
    const lines = filtered.map((r) =>
      [
        esc(r.created_at_formatted),
        esc(r.project_name),
        esc(r.name),
        esc(r.email),
        esc(r.phone),
        esc(r.message),
      ].join(',')
    );
    // BOM UTF-8 para que Excel abra bien tildes/eñes.
    const csv = '﻿' + header + '\n' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    const scope =
      projectFilter === 'all'
        ? 'todos'
        : projects.find((p) => p.id === projectFilter)?.slug ?? 'proyecto';
    a.download = `leads-${scope}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('success', `${filtered.length} leads exportados`);
  }

  return (
    <div className="card space-y-4">
      {/* Barra de filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="project-filter"
            className="text-xs uppercase tracking-wider text-text-muted"
          >
            Proyecto:
          </label>
          <select
            id="project-filter"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded border border-border bg-bg-elevated px-3 py-1.5 text-sm text-text focus:border-gold focus:outline-none"
          >
            <option value="all">Todos ({rows.length})</option>
            {projects.map((p) => {
              const count = rows.filter((r) => r.project_id === p.id).length;
              if (count === 0) return null;
              return (
                <option key={p.id} value={p.id}>
                  {p.name} ({count})
                </option>
              );
            })}
          </select>
        </div>
        <Button onClick={exportCSV} variant="secondary">
          ⇩ Descargar CSV
        </Button>
      </div>

      {/* Tabla scrollable en mobile */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-text-subtle">
              <th className="whitespace-nowrap py-2 pr-3">Fecha</th>
              <th className="whitespace-nowrap py-2 pr-3">Proyecto</th>
              <th className="whitespace-nowrap py-2 pr-3">Nombre</th>
              <th className="whitespace-nowrap py-2 pr-3">Email</th>
              <th className="whitespace-nowrap py-2 pr-3">Teléfono</th>
              <th className="py-2">Mensaje</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="border-b border-border/60 last:border-0 hover:bg-bg-hover/40"
              >
                <td className="whitespace-nowrap py-2.5 pr-3 text-text-muted">
                  {r.created_at_formatted}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3">
                  <span className="text-text">{r.project_name}</span>
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 font-medium">
                  {r.name}
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3">
                  <a
                    href={`mailto:${r.email}`}
                    className="text-gold hover:underline"
                  >
                    {r.email}
                  </a>
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 text-text-muted">
                  {r.phone ? (
                    <a
                      href={`https://wa.me/${r.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-text"
                      title="Abrir WhatsApp"
                    >
                      {r.phone}
                    </a>
                  ) : (
                    <span className="text-text-subtle">—</span>
                  )}
                </td>
                <td className="max-w-md py-2.5 text-text-muted">
                  {r.message ? (
                    <span className="line-clamp-2" title={r.message}>
                      {r.message}
                    </span>
                  ) : (
                    <span className="text-text-subtle">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-text-muted">
            Sin leads para este filtro.
          </p>
        )}
      </div>
    </div>
  );
}
