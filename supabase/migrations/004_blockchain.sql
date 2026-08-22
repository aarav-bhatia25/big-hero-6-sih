-- Prahari :: Block 3 — Blockchain anchoring
-- ADDITIVE migration. Safe to run on an existing database.
-- Stores the on-chain anchoring result for a tourist's credential. Only the
-- transaction hash + chain id are kept here; the credential hash itself already
-- lives on tourists."credentialHash". No PII is ever written on-chain.

alter table tourists add column if not exists "anchorTxHash"  text;
alter table tourists add column if not exists "anchorChainId" integer;

-- credential_issuance already has "anchorTxHash" (migration 002); nothing to add.
