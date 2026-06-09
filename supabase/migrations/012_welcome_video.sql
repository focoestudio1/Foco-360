-- ============================================================
-- Migración 012 — Video de bienvenida por proyecto
-- ============================================================
-- Cada proyecto puede tener un video corto (15-60s) del agente
-- inmobiliario o un avatar AI dando la bienvenida + instrucciones
-- de uso del tour. Aparece en un modal al abrir el tour, una sola
-- vez por dispositivo (localStorage por slug).
--
-- welcome_video_url — key R2 del .mp4 (null = sin video).
-- ============================================================

alter table public.projects
  add column if not exists welcome_video_url text;
