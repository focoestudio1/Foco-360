-- ============================================================
-- Migración 007 — Plano 2D del proyecto + posiciones de escenas
-- ============================================================
-- 1. projects.floorplan_url: imagen del plano (key R2).
-- 2. scenes.floorplan_x, floorplan_y: posición del pin de cada
--    escena sobre el plano (0..1, fracción del ancho/alto).
--
-- Cuando el visitante ve el visor, aparece un mini-mapa con los
-- pines de cada escena; click → navega a esa escena.
-- ============================================================

alter table public.projects
  add column if not exists floorplan_url text;

alter table public.scenes
  add column if not exists floorplan_x numeric,
  add column if not exists floorplan_y numeric;
