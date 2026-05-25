-- ============================================================
-- Migración 009 — Hotspot tipo URL (link externo)
-- ============================================================
-- Tercer tipo de hotspot: 'url'. Al click abre una URL externa
-- en una pestaña nueva (ej. ficha del inmueble en el sitio del
-- cliente, formulario de contacto, video de YouTube, etc.).
-- ============================================================

alter table public.hotspots
  add column if not exists external_url text;
