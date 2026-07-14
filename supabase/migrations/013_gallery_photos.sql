-- ============================================================
-- Migración 013 — Galería de fotos normales (no 360°)
-- ============================================================
-- Cada proyecto puede tener N fotos "planas" adicionales al tour:
-- detalles cerca de la cocina, primer plano del baño, vista del
-- balcón como foto normal, etc.
--
-- Estas fotos NO son escenas 360° — se muestran en un lightbox
-- estilo galería fotográfica al tocar el botón "📷 Galería" del
-- visor. Si el proyecto no tiene fotos, el botón no aparece.
-- ============================================================

create table if not exists public.gallery_photos (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  image_url   text not null,
  caption     text,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists gallery_photos_project_order_idx
  on public.gallery_photos (project_id, order_index);

alter table public.gallery_photos enable row level security;
