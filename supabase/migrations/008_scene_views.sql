-- ============================================================
-- Migración 008 — Estadísticas por escena
-- ============================================================
-- Tabla scene_views: registra cada visita a una escena, con
-- duración (ms). Usada para mostrar al admin qué tan vista es
-- cada habitación del tour.
--
-- Una "vista" = una entrada del usuario a una escena (puede haber
-- varias por sesión si vuelve a la misma escena).
-- ============================================================

create table if not exists public.scene_views (
  id          uuid primary key default gen_random_uuid(),
  scene_id    uuid not null references public.scenes(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  duration_ms integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists scene_views_project_idx
  on public.scene_views (project_id, created_at desc);

create index if not exists scene_views_scene_idx
  on public.scene_views (scene_id);

alter table public.scene_views enable row level security;
