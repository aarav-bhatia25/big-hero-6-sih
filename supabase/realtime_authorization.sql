-- Prahari managed Realtime authorization
--
-- Run this once in the Supabase SQL Editor, then disable "Allow public access"
-- in the project's Realtime Settings. Only a short-lived custom JWT minted by
-- the Prahari server for an authority or admin may receive this channel.

drop policy if exists "prahari operational realtime receive" on realtime.messages;

create policy "prahari operational realtime receive"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and realtime.topic() = 'prahari:live'
  and (current_setting('request.jwt.claims', true)::jsonb ->> 'prahari_role') in ('authority', 'admin')
);

-- Server events use Supabase's Realtime REST Broadcast API, not a database
-- `realtime.send()` function. This avoids the WAL replication-slot and daily
-- partition lifecycle that database-originated broadcasts depend on.
-- Browser sessions retain receive-only access through the SELECT policy above.
drop function if exists public.prahari_broadcast_operational_event(text, jsonb);
