-- Prahari :: Supabase (Postgres) schema
-- Run this in the Supabase dashboard -> SQL Editor -> New query -> Run.
--
-- NOTE ON COLUMN NAMING: columns use quoted camelCase ("touristId") to exactly
-- match the JSON shape the existing API routes and frontend already consume.
-- This keeps API responses byte-identical to the old MongoDB ones, so no
-- frontend changes were needed. The tradeoff: in the SQL editor you must
-- double-quote these names, e.g.  select "touristId" from tourists;

-- Idempotent: safe to re-run.
drop table if exists incidents cascade;
drop table if exists locations cascade;
drop table if exists geofences cascade;
drop table if exists responders cascade;
drop table if exists tourists cascade;

-- ---------------------------------------------------------------- tourists
create table tourists (
  id                  uuid primary key default gen_random_uuid(),
  "touristId"         text unique not null,
  name                text not null,
  nationality         text default 'India',
  "identityStatus"    text default 'verified'
                        check ("identityStatus" in ('verified','pending','flagged','revoked')),
  did                 text,
  "issueDate"         text,
  "emergencyContacts" jsonb default '[]'::jsonb,
  accommodation       jsonb default '{}'::jsonb,
  preferences         jsonb default '{}'::jsonb,
  "currentLocation"   jsonb,
  "clothingProfile"   jsonb,
  "trackingConsent"   boolean default true,
  status              text default 'SAFE',
  "riskScore"         integer default 15,
  "createdAt"         timestamptz default now(),
  "updatedAt"         timestamptz default now()
);
create index tourists_did_idx on tourists (did);

-- --------------------------------------------------------------- locations
create table locations (
  id             uuid primary key default gen_random_uuid(),
  "touristId"    text not null,
  coordinates    jsonb not null,          -- { lat, lng }
  lat            double precision,
  lng            double precision,
  accuracy       double precision default 5,
  source         text default 'gps' check (source in ('gps','cellular','manual')),
  speed          double precision,
  "batteryLevel" double precision,
  "timestamp"    timestamptz default now(),
  "createdAt"    timestamptz default now()
);
create index locations_tourist_time_idx on locations ("touristId", "timestamp" desc);

-- --------------------------------------------------------------- geofences
create table geofences (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text default 'high_risk',
  geometry      jsonb not null,           -- GeoJSON; Turf.js does the math app-side
  coordinates   jsonb,                    -- legacy [lat,lng][] form kept for the map UI
  severity      text default 'high',
  active        boolean default true,
  metadata      jsonb default '{}'::jsonb,
  "createdAt"   timestamptz default now()
);
create index geofences_active_idx on geofences (active);

-- -------------------------------------------------------------- responders
create table responders (
  id             uuid primary key default gen_random_uuid(),
  "responderId"  text unique not null,
  "unitId"       text,
  name           text,
  phone          text,
  department     text default 'Police',
  location       jsonb not null,          -- { lat, lng }
  status         text default 'available',
  capabilities   jsonb default '[]'::jsonb,
  type           text default 'POLICE',
  "createdAt"    timestamptz default now()
);

-- --------------------------------------------------------------- incidents
create table incidents (
  id                        uuid primary key default gen_random_uuid(),
  "incidentId"              text unique not null,
  "touristId"               text not null,
  "touristName"             text,
  type                      text default 'SOS',
  status                    text default 'new',
  location                  jsonb not null,   -- { lat, lng, address }
  severity                  text default 'critical',
  "riskScore"               integer default 91,
  "assignedResponder"       text,
  "assignedResponderUnitId" text,
  "assignedResponderName"   text,
  "etaMinutes"              integer,
  timeline                  jsonb default '[]'::jsonb,
  "efirDraft"               jsonb,
  "resolvedAt"              timestamptz,
  "createdAt"               timestamptz default now()
);
create index incidents_created_idx on incidents ("createdAt" desc);
create index incidents_efir_idx on incidents (("efirDraft" is not null));

-- ------------------------------------------------------------------- RLS
-- Every query runs server-side in Next.js API routes using the service_role
-- key, which bypasses RLS. RLS is still enabled so that if the publishable
-- key ever leaks into the browser, the tables are not world-readable.
alter table tourists   enable row level security;
alter table locations  enable row level security;
alter table geofences  enable row level security;
alter table responders enable row level security;
alter table incidents  enable row level security;

-- Deliberately no permissive policies: anon/publishable access is denied by
-- default. Add scoped policies here when real auth is introduced.
