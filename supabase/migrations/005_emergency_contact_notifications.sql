-- Migration 005: Add emergencyContactNotifications, cancelledAt, and cancelledBy columns to incidents table
alter table incidents add column if not exists "emergencyContactNotifications" jsonb;
alter table incidents add column if not exists "cancelledAt" timestamptz;
alter table incidents add column if not exists "cancelledBy" text;
