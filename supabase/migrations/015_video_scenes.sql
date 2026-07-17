-- ============================================================
-- 015 — Escenas de VIDEO 360 dentro de un tour
--
-- Hasta ahora una escena era siempre una FOTO 360 (image_url,
-- key de R2, renderizada con Pannellum). Con esto un mismo
-- recorrido puede mezclar escenas de foto y de VIDEO 360.
--
-- El video NO se sube a R2: se aloja en Bunny Stream (que ya se
-- usa en FOCO Plataforma y da streaming adaptativo, necesario
-- porque un 360 en 4K/5.7K pesa muchísimo). Aquí solo guardamos
-- la URL del playlist.
--
-- Es una migración ADITIVA y segura: las escenas que ya existen
-- quedan como kind='photo' y siguen funcionando igual.
-- ============================================================

-- 1) Tipo de escena. Por defecto 'photo' → nada se rompe.
alter table public.scenes
  add column if not exists kind text not null default 'photo';

-- 2) Fuente del video (playlist HLS de Bunny, o MP4 directo).
alter table public.scenes
  add column if not exists video_url text;

-- 3) Una escena de video no tiene panorama: image_url deja de ser
--    obligatorio (en video se usa, opcionalmente, como póster).
alter table public.scenes
  alter column image_url drop not null;

-- 4) Reglas de coherencia (se crean solo si aún no existen).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'scenes_kind_chk') then
    alter table public.scenes
      add constraint scenes_kind_chk check (kind in ('photo', 'video'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'scenes_fuente_chk') then
    -- Una escena de foto necesita su panorama; una de video, su video.
    alter table public.scenes
      add constraint scenes_fuente_chk check (
        (kind = 'photo' and image_url is not null) or
        (kind = 'video' and video_url is not null)
      );
  end if;
end $$;

comment on column public.scenes.kind is 'photo = panorama 360 en R2 (Pannellum) | video = video 360 en Bunny';
comment on column public.scenes.video_url is 'URL del playlist HLS de Bunny (o MP4). Solo para kind = video.';
