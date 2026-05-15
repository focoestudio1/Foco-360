-- ============================================================
-- Migración 003 — Descripciones por escena + logo por proyecto
-- ============================================================
-- 1. Cada escena puede tener una descripción que el visitante ve
--    cuando navega entre habitaciones.
-- 2. Cada proyecto puede tener su propio logo (anula el global).
-- ============================================================

alter table public.scenes
  add column if not exists description text;

alter table public.projects
  add column if not exists logo_url text;
