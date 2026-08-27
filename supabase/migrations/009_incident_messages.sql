-- Migration 009: retain emergency messages on the protected incident record.
-- Messages are capped by application logic; raw audio is never stored here.
alter table incidents add column if not exists "incidentMessages" jsonb not null default '[]'::jsonb;
