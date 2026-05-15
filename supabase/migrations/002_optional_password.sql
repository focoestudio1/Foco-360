-- ============================================================
-- Migración 002 — Contraseña opcional por proyecto
-- ============================================================
-- Permite que projects.password_hash sea NULL: cuando es NULL
-- el tour es de acceso libre (sin pantalla de contraseña).
-- ============================================================

alter table public.projects
  alter column password_hash drop not null;

-- (idempotente: correr esta migración dos veces no hace nada)
