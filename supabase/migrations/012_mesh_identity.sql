-- Migration 012: offline SOS mesh device identity and relay provenance.
--
-- meshPubkeys holds the BIP-340 x-only public keys of a traveller's devices.
-- Only public halves are stored; the secret never leaves the device. This is
-- what lets the gateway accept an SOS relayed by a stranger's phone: the packet
-- is trusted on the origin's signature, not on the relaying session's identity.
alter table tourists add column if not exists "meshPubkeys" jsonb not null default '[]'::jsonb;

-- Records that an incident arrived second-hand across the mesh, and which
-- origin key vouched for it, so an officer can see the delivery path.
alter table incidents add column if not exists "meshRelayed" boolean not null default false;
alter table incidents add column if not exists "meshOriginPubkey" text;
