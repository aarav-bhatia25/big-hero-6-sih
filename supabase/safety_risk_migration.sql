-- Prahari :: trip plan and safety-signal storage
-- Run this once in the Supabase SQL Editor. It is additive: it never deletes
-- existing travellers, location history, credentials, incidents, or alerts.

alter table public.tourists
  add column if not exists itinerary jsonb default '{}'::jsonb,
  add column if not exists "lastSafetyAssessment" jsonb;

-- All application access remains server-side through the service role.
-- The existing tourists RLS setting therefore continues to deny browser access.
