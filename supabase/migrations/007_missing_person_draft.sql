-- Migration 007: retain a police-ready missing-person information draft on the
-- protected incident record. This is a Prahari review artefact, not an FIR.
alter table incidents add column if not exists "missingPersonDraft" jsonb;

create index if not exists incidents_missing_person_draft_idx
  on incidents (("missingPersonDraft" is not null));
