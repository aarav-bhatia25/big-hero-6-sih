-- Emergency identification profile generated from a traveller-provided photo.
-- The application stores only the structured description, never the raw photo.
alter table tourists add column if not exists "clothingProfile" jsonb;
