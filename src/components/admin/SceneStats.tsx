'use client';

// ============================================================
// Estadísticas por escena del proyecto.
//
// Trae /api/admin/projects/[id]/stats y muestra una barra por
// escena con su número de vistas y duración promedio.
// ============================================================

import { useEffect, useState } from 'react';

type SceneStat = {
  scene_id: string;
  title: string;
  views: number;
  avg_duration_ms: number;
  total_duration_ms: number;
};

export function SceneStats({ projectId }: { projectId: string }) {
  const [stats, setStats] = useState<SceneStat[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/projects/${projectId}/stats`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setStats(d.stats ?? []);
      })
      .catch(() => {
        if (!cancelled) setStats([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const maxViews = Math.max(1, ...(stats ?? []).map((s) => s.views));

  return (
    <section className="card">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-text-muted">
        📊 Estadísticas por escena
      </h2>
      <p className="mb-4 text-xs text-text-subtle">
        Cuántas veces se vio cada escena y cuánto tiempo en promedio.
        No incluye visitas en modo vista previa de admin.
      </p>

      {loading ? (
        <p className="text-xs text-text-subtle">Cargando…</p>
      ) : !stats || stats.length === 0 ? (
        <p className="text-xs text-text-subtle">
          Aún no hay escenas con vistas.
        </p>
      ) : (
        <ul className="space-y-2">
          {stats.map((s) => (
            <li
              key={s.scene_id}
              className="rounded-md border border-border bg-bg-elevated p-3"
            >
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="truncate text-text">{s.title}</span>
                <span className="tabular-nums text-text-muted">
                  {s.views} {s.views === 1 ? 'vista' : 'vistas'} ·{' '}
                  {formatDuration(s.avg_duration_ms)} promedio
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-hover">
                <div
                  className="h-full bg-gold transition-all"
                  style={{ width: `${(s.views / maxViews) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}
