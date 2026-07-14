-- ============================================================
-- Migración 014 — Lead capture (formulario de contacto opcional)
-- ============================================================
-- Cada proyecto puede activar un "lead form" que aparece ANTES del
-- intro cinematográfico. El visitante debe ingresar nombre, email
-- y (opcionalmente) teléfono/mensaje para acceder al tour.
--
-- Los leads quedan visibles en el panel admin (/admin/leads) con
-- opción de exportar a CSV para importar en el CRM del cliente.
--
-- El toggle "requires_lead" es por proyecto — algunos abiertos
-- (tours de portafolio), otros con lead gate (tours de venta).
-- ============================================================

-- Nueva tabla: leads
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  email       text not null,
  phone       text,
  message     text,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists leads_project_created_idx
  on public.leads (project_id, created_at desc);

create index if not exists leads_created_idx
  on public.leads (created_at desc);

alter table public.leads enable row level security;

-- Nuevo campo en projects para activar/desactivar el lead form
alter table public.projects
  add column if not exists requires_lead boolean not null default false;
