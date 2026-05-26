-- ============================================================
-- Migración 010 — Ficha del inmueble (property specs card)
-- ============================================================
-- Card flotante en el visor con foto + datos clave del inmueble:
-- título, precio, características (1 por línea), descripción.
--
-- Todos los campos son opcionales. Si ninguno está seteado, la
-- card no aparece en el visor.
-- ============================================================

alter table public.projects
  add column if not exists specs_image_url   text,
  add column if not exists specs_title       text,
  add column if not exists specs_price       text,
  add column if not exists specs_features    text,
  add column if not exists specs_description text;
