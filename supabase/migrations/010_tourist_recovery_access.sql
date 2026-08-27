-- Migration 010: salted verifier for a one-time-issued tourist recovery code.
-- The raw recovery code is never stored server-side.
alter table tourists add column if not exists "touristAccessCodeHash" text;
alter table tourists add column if not exists "touristAccessCodeSalt" text;
