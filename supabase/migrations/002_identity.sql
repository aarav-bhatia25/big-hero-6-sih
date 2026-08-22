-- Prahari :: Block 1 — Identity & eKYC
-- ADDITIVE migration. Safe to run on the existing database; destroys nothing.
-- Run in Supabase dashboard -> SQL Editor -> New query -> Run.

-- ─────────────────────────────────────────────── tourists: identity columns
alter table tourists add column if not exists "didDocument"      jsonb;
alter table tourists add column if not exists "credential"       jsonb;
alter table tourists add column if not exists "credentialHash"   text;
alter table tourists add column if not exists "credentialStatus" text default 'none';
alter table tourists add column if not exists "kycMethod"        text;
alter table tourists add column if not exists "kycProvider"      text;
alter table tourists add column if not exists "kycVerifiedAt"    timestamptz;
alter table tourists add column if not exists "nationalityCode"  text;
alter table tourists add column if not exists "kycSubjectHash"   text;

-- did is already declared in 001; make lookups by DID and credential fast/unique
create unique index if not exists tourists_did_uniq
  on tourists (did) where did is not null;
create index if not exists tourists_credhash_idx on tourists ("credentialHash");

-- kycSubjectHash is the salted hash of the Aadhaar number / passport number.
-- It lets us detect "this document already has a credential" WITHOUT ever
-- storing the document number itself.
create unique index if not exists tourists_kyc_subject_uniq
  on tourists ("kycSubjectHash") where "kycSubjectHash" is not null;

-- ──────────────────────────────────────────────────────────── kyc_sessions
-- Short-lived verification sessions. Never holds a raw Aadhaar or passport
-- number — only a salted hash and non-identifying display fragments.
create table if not exists kyc_sessions (
  id              uuid primary key default gen_random_uuid(),
  "sessionId"     text unique not null,
  method          text not null check (method in ('aadhaar', 'passport')),
  status          text not null default 'pending'
                    check (status in ('pending','verified','failed','expired','locked')),
  "subjectHash"   text not null,
  "challengeHash" text,
  attempts        integer not null default 0,
  "maxAttempts"   integer not null default 3,
  payload         jsonb default '{}'::jsonb,
  "expiresAt"     timestamptz not null,
  "verifiedAt"    timestamptz,
  "createdAt"     timestamptz default now()
);
create index if not exists kyc_sessions_expiry_idx on kyc_sessions ("expiresAt");
create index if not exists kyc_sessions_status_idx on kyc_sessions (status);

alter table kyc_sessions enable row level security;
-- No permissive policies: reachable only via the server-side service key.

-- ───────────────────────────────────────────────────── credential_issuance
-- Append-only issuance log. Survives credential revocation/reissue so the
-- audit trail stays intact, and is what Block 3 will anchor on-chain.
create table if not exists credential_issuance (
  id                uuid primary key default gen_random_uuid(),
  "touristId"       text not null,
  did               text not null,
  "credentialHash"  text not null,
  "kycMethod"       text not null,
  "kycProvider"     text not null,
  action            text not null default 'issued'
                      check (action in ('issued','revoked','suspended','reinstated')),
  "anchorTxHash"    text,          -- populated in Block 3 (Sepolia)
  "anchoredAt"      timestamptz,
  "createdAt"       timestamptz default now()
);
create index if not exists cred_issuance_tourist_idx on credential_issuance ("touristId");
create index if not exists cred_issuance_hash_idx    on credential_issuance ("credentialHash");

alter table credential_issuance enable row level security;
