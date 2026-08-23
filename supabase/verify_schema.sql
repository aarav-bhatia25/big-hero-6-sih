-- Prahari :: non-destructive Supabase schema verification
-- Run after schema.sql and migrations in the Supabase SQL Editor.

with required_tables(table_name) as (
  values
    ('tourists'), ('locations'), ('geofences'), ('responders'),
    ('incidents'), ('users'), ('kyc_sessions'), ('credential_issuance')
)
select
  required_tables.table_name,
  exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and tables.table_name = required_tables.table_name
  ) as exists
from required_tables
order by required_tables.table_name;
