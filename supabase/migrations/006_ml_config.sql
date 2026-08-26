-- Prahari :: ML Anomaly Classifier Configuration & Active Devices Schema
-- Additive migration for trek ML configurations and active device safety status.

-- 1. trek_ml_config table
create table if not exists public.trek_ml_config (
  id uuid primary key default gen_random_uuid(),
  trek_id text unique not null,
  name text not null,
  base_lat double precision not null,
  base_lon double precision not null,
  difficulty_score double precision default 2.0,
  max_altitude_m double precision default 3000.0,
  created_at timestamptz default now()
);

-- 2. active_devices table
create table if not exists public.active_devices (
  device_id text primary key,
  current_lat double precision,
  current_lon double precision,
  safety_status text default 'SAFE',
  updated_at timestamptz default now()
);

-- 3. Seed default demo trek configurations
insert into public.trek_ml_config (trek_id, name, base_lat, base_lon, difficulty_score, max_altitude_m)
values 
  ('TREK-001', 'Valley of Flowers Trail', 30.7280, 79.6053, 2.0, 3600.0),
  ('TREK-002', 'Kedarkantha Summit Route', 31.0225, 78.1725, 2.5, 3800.0),
  ('default_trek', 'Standard Baseline Trek', 30.3165, 78.0322, 2.0, 2500.0)
on conflict (trek_id) do nothing;

-- 4. Enable RLS (Server-side service role accesses table)
alter table public.trek_ml_config enable row level security;
alter table public.active_devices enable row level security;
