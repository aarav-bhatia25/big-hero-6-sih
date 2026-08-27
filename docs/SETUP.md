# Local setup and operational checks

## Prerequisites

- Node.js and pnpm
- A Supabase project for durable records
- Optional provider credentials only for the features you want to demonstrate

## Install and run

```bash
pnpm install
pnpm dev:web
# http://localhost:3000
```

Run a production check before deploying:

```bash
pnpm build
pnpm lint
```

## Database migrations

Apply the additive SQL in `supabase/migrations/` in numeric order. The current durable emergency, emergency-profile, chat, recovery-code, and geofence flows require migrations `005` through `012` in addition to the earlier base migrations.

After applying them, open:

```text
/api/health
```

The response lists unavailable tables or columns and reports `degraded` instead of inventing readiness.

## Environment variables

Put local values in `apps/web/.env.local`. Never commit secrets and never expose a server-only secret through `NEXT_PUBLIC_*`.

| Feature | Required settings |
| --- | --- |
| Database | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Session security | `SESSION_SECRET` |
| Email alerts | `RESEND_API_KEY`, `EMERGENCY_FROM_EMAIL` |
| Sarvam language/voice | `SARVAM_API_KEY`; optional model overrides listed in `.env.example` |
| Emergency attire photo analysis | `OPENAI_API_KEY`; optional `OPENAI_VISION_MODEL` |
| Blockchain anchoring | local `CHAIN_RPC_URL`, `IDENTITY_REGISTRY_ADDRESS`, `ANCHOR_PRIVATE_KEY`, or the documented Sepolia equivalents |
| Approved offline base maps | `NEXT_PUBLIC_OFFLINE_TILE_TEMPLATE`, `NEXT_PUBLIC_OFFLINE_TILE_ATTRIBUTION` |
| Optional BLE gateway only | `PRAHARI_MESH_GATEWAY_KEY` on the API and hardware gateway; never in browser code |

## Verify normal Wi-Fi operation

1. Create a sandbox traveller credential and keep the recovery code.
2. Sign into the traveller dashboard and grant location permission only if you are comfortable doing so.
3. Trigger a test SOS with a valid location. The transport should report `INTERNET` and the authority queue should show the durable record.
4. If Realtime cannot self-verify, wait for the dashboard’s 15-second authenticated refresh instead of claiming instant updates.
5. Confirm `/api/health` reports the expected database/provider state.

No BLE browser permission, paired device, native app, or gateway is required for this flow.

## Optional focused tests

```bash
pnpm dlx tsx --test apps/web/lib/sos-mesh/__tests__/sosMesh.test.ts
node --test tools/ble-gateway/gatewayCore.test.mjs
```

The SOS test suite includes a check that direct internet delivery completes without loading the optional BLE transport.
