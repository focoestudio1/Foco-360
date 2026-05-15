-- ============================================================
-- Migración 004 — Audio por escena + WhatsApp por proyecto
-- ============================================================
-- 1. Cada escena puede tener un audio (narración) que se
--    reproduce cuando el visitante entra a esa escena.
-- 2. Cada proyecto puede mostrar un botón flotante de WhatsApp
--    en el visor para contactar a la inmobiliaria/agente.
-- ============================================================

alter table public.scenes
  add column if not exists audio_url text;

alter table public.projects
  add column if not exists whatsapp_phone text,
  add column if not exists whatsapp_message text;
