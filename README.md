# Prahari

Prahari is a consent-first tourist-safety prototype. It lets a traveller create a **sandbox-verified digital tourist credential**, opt in to location sharing, trigger a GPS-backed SOS, and submit an E-FIR for officer review. Authorised staff can review the operational queue, create geofences, and see only the data they are permitted to access.

The deployed demonstrator is a prototype, not a government emergency service. See the [evaluation demo guide](EVALUATION_DEMO_GUIDE.md) for the exact working scope, a click-by-click presentation script, and planned work.

## What works in the deployed prototype

- Sandbox KYC validation: Aadhaar Verhoeff checksum + sandbox OTP, or passport MRZ check digits. This is **not** UIDAI or passport-authority authentication.
- A signed digital credential with a `did:prahari:` identifier and public verification page.
- Server-custodied, hash-only credential anchoring on Ethereum Sepolia when the identity registry is configured. No MetaMask or personal wallet is required or connected.
- Consent-controlled browser GPS telemetry, server-side geofence evaluation, and explainable safety signals.
- GPS-backed SOS creation, durable authority-queue records, and emergency-contact email through Resend when an email contact and provider configuration are present.
- Traveller E-FIR submission; authorised officer approval/rejection; hash-only E-FIR evidence anchoring when the incident registry is configured.
- Authenticated authority dashboard with live database records, map markers, responder availability, geofence creation, and a truthful realtime status indicator. If Supabase Broadcast cannot be verified in the browser, it falls back to authenticated 15-second refresh.

## Important scope boundaries

- The safety engine is explainable, deterministic signal analysis—not a trained ML classifier. It evaluates telemetry gaps, configured risk zones, GPS quality, unusual speed, and route deviation only when a coordinate route is supplied. High-risk results require human review and never dispatch police automatically.
- Production records are application data for this demonstration; they are not a connection to police, UIDAI, or government systems.
- Only hashes/commitments go on-chain. KYC, itinerary, contacts, and location history remain off-chain in the configured database.
- A Resend `ACCEPTED` status means the email provider accepted the request; it does not prove inbox delivery.

## Workspace layout

```text
apps/web/             Next.js traveller and authority application
packages/contracts/   Solidity contracts and Hardhat deployment scripts
supabase/             schema and additive migration SQL
```

## Local development

```bash
pnpm install
pnpm dev:web
# Visit http://localhost:3000
```

Copy the relevant environment variables into `apps/web/.env.local`. Never place `ANCHOR_PRIVATE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in browser-exposed `NEXT_PUBLIC_*` variables.

## Key environment variables

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `CHAIN_RPC_URL`, `IDENTITY_REGISTRY_ADDRESS`, `ANCHOR_PRIVATE_KEY`
- `INCIDENT_REGISTRY_ADDRESS` for E-FIR evidence anchoring
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` for emergency-contact email

## Contract commands

```bash
pnpm contract:compile
pnpm contract:deploy:sepolia
```

`packages/contracts/deployments/sepolia.json` records the current deployment addresses. The deployment script refuses any public network other than Sepolia.
