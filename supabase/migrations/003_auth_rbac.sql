-- Prahari :: Block 2 — Authentication & Role-Based Access Control (RBAC)
-- ADDITIVE migration. Safe to run on existing database.
-- Run in Supabase dashboard -> SQL Editor -> New query -> Run.

-- ───────────────────────────────────────────────────────────── users / staff
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  "userId"        text unique not null,
  email           text unique not null,
  "passwordHash"  text not null,
  salt            text not null,
  name            text not null,
  role            text not null check (role in ('admin', 'authority', 'responder', 'tourist')),
  "entityId"      text, -- links to responder unitId / touristId if applicable
  department      text,
  badge           text,
  phone           text,
  active          boolean default true,
  "createdAt"     timestamptz default now(),
  "updatedAt"     timestamptz default now()
);

create index if not exists users_email_idx on users (email);
create index if not exists users_role_idx on users (role);
create index if not exists users_entity_idx on users ("entityId");

alter table users enable row level security;
-- No permissive policies: reachable only via server-side service key.
