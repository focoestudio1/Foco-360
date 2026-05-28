-- ============================================================
-- Migración 011 — Música de fondo del tour
-- ============================================================
-- Cada proyecto puede tener una pista instrumental que suena en
-- loop durante todo el tour. La biblioteca de pistas vive en
-- src/lib/musicLibrary.ts (archivos en public/music/).
--
-- background_music_id      — id de la pista en la biblioteca
--                            (null = sin música de fondo).
-- background_music_volume  — volumen base 0..1 (default 0.4).
--                            Cuando suena la narración de la
--                            escena, baja a este valor × 0.15
--                            y vuelve al base al terminar.
-- ============================================================

alter table public.projects
  add column if not exists background_music_id     text,
  add column if not exists background_music_volume numeric(3,2) default 0.40
    check (background_music_volume >= 0 and background_music_volume <= 1);
