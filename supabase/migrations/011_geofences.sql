-- Prahari :: durable authority geofences
-- ADDITIVE and idempotent. Safe for an existing project: it creates only the
-- missing operational boundary table and its supporting index.
--
-- This was previously present only in supabase/schema.sql, so projects that
-- applied the feature migrations to an older database did not receive it.

create table if not exists public.geofences (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  type         text not null default 'high_risk',
  geometry     jsonb not null,
  coordinates  jsonb,
  severity     text not null default 'high',
  active       boolean not null default true,
  metadata     jsonb not null default '{}'::jsonb,
  "createdAt"  timestamptz not null default now()
);

create index if not exists geofences_active_idx on public.geofences (active);

alter table public.geofences enable row level security;
-- No permissive browser policies: application access is mediated by the
-- server-side service role and the authority RBAC checks in API routes.
