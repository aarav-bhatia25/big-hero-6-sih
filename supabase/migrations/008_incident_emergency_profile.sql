-- Migration 008: persist reviewed emergency context with the protected
-- incident record. Raw audio and raw identification photos are never stored.
alter table incidents add column if not exists "transportType" text;
alter table incidents add column if not exists "hopCount" integer;
alter table incidents add column if not exists "originalTimestamp" timestamptz;
alter table incidents add column if not exists "relayPath" jsonb;
alter table incidents add column if not exists "originDeviceId" text;
alter table incidents add column if not exists "packetId" text;
alter table incidents add column if not exists "voiceStatement" text;
alter table incidents add column if not exists "voiceStatementLanguage" text;
alter table incidents add column if not exists "emergencyIdentificationProfile" jsonb;
alter table incidents add column if not exists "emergencyIdentificationProfileSharedAt" timestamptz;
