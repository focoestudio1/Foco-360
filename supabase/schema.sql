-- ============================================================
-- FOCO 360° - Schema de base de datos
-- ============================================================
-- Ejecuta este script completo en el SQL Editor de Supabase
-- (Dashboard → SQL Editor → New Query → pega → Run)
-- ============================================================

-- Extensión para generar UUIDs aleatorios
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabla: projects (proyectos / tours)
-- ------------------------------------------------------------
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  client_name   text,
  description   text,
  -- Hash bcrypt de la contraseña del tour (NO guardar texto plano)
  password_hash text not null,
  -- Key R2 de la foto de portada (no es URL — se firma al servir)
  cover_url     text,
  is_active     boolean not null default true,
  views         integer not null default 0,
  last_viewed_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists projects_slug_idx on public.projects (slug);
create index if not exists projects_created_at_idx on public.projects (created_at desc);

-- ------------------------------------------------------------
-- Tabla: scenes (escenas / fotos 360 del tour)
-- ------------------------------------------------------------
create table if not exists public.scenes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  -- Key R2 (ej. projects/casa-azul/sala.jpg) — se firma al servir
  image_url   text not null,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists scenes_project_idx on public.scenes (project_id, order_index);

-- ------------------------------------------------------------
-- Tabla: hotspots (puntos de interés entre escenas)
-- ------------------------------------------------------------
create table if not exists public.hotspots (
  id              uuid primary key default gen_random_uuid(),
  scene_id        uuid not null references public.scenes(id) on delete cascade,
  -- Escena destino al hacer click (puede ser null para hotspots informativos)
  target_scene_id uuid references public.scenes(id) on delete set null,
  -- Coordenadas Pannellum: pitch (-90..90), yaw (-180..180)
  pitch           numeric(6,3) not null default 0,
  yaw             numeric(6,3) not null default 0,
  label           text,
  created_at      timestamptz not null default now()
);

create index if not exists hotspots_scene_idx on public.hotspots (scene_id);

-- ------------------------------------------------------------
-- Trigger: actualizar updated_at en projects
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
-- Todas las tablas están protegidas. El backend usa Service Role
-- (bypass RLS) para operar. Esto evita acceso directo desde
-- clientes con la anon key.
-- ------------------------------------------------------------
alter table public.projects  enable row level security;
alter table public.scenes    enable row level security;
alter table public.hotspots  enable row level security;

-- Sin políticas públicas: el cliente NO puede leer ni escribir
-- nada con la anon key. Todo el acceso pasa por API routes
-- usando SUPABASE_SERVICE_ROLE_KEY en el servidor.

-- ------------------------------------------------------------
-- Listo. Ahora crea tu usuario admin desde:
-- Authentication → Users → Add user
-- ------------------------------------------------------------
