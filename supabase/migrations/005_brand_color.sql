-- ============================================================
-- Migración 005 — Color de marca personalizable por proyecto
-- ============================================================
-- Permite que cada proyecto use su propio color de acento (en
-- vez del dorado FOCO global). Útil para clientes con identidad
-- de marca propia.
--
-- Default = #d4af37 (dorado FOCO). Cualquier hex válido sirve.
-- ============================================================

alter table public.projects
  add column if not exists brand_color text default '#d4af37';
