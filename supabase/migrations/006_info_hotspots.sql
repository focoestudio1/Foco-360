-- ============================================================
-- Migración 006 — Hotspots informativos
-- ============================================================
-- Cada hotspot ahora tiene un "kind":
--   - 'navigation' (default): cambia a target_scene_id (comportamiento actual)
--   - 'info': abre popup con info_text + info_image_url
--
-- Los hotspots existentes quedan como 'navigation' por compatibilidad.
-- ============================================================

alter table public.hotspots
  add column if not exists kind text not null default 'navigation',
  add column if not exists info_text text,
  add column if not exists info_image_url text;
