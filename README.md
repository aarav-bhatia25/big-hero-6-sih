# Prahari

Prahari is a consent-first tourist-safety prototype. It lets a traveller create a **sandbox-verified digital tourist credential**, opt in to location sharing, trigger a GPS-backed SOS, and prepare a police-ready incident-information draft for authorised review. Authorised staff can review the operational queue, create geofences, and see only the data they are permitted to access.

The deployed demonstrator is a prototype, not a government emergency service. Start with the [documentation index](docs/README.md), then use the [evaluation demo guide](docs/DEMO_GUIDE.md) for the exact working scope and click-by-click presentation script.

## What works in the deployed prototype

- Sandbox KYC validation: Aadhaar Verhoeff checksum + sandbox OTP, or passport MRZ check digits. This is **not** UIDAI or passport-authority authentication.
- A signed digital credential with a `did:prahari:` identifier and public verification page.
- Server-custodied, hash-only credential anchoring on Ethereum Sepolia when the identity registry is configured. No MetaMask or personal wallet is required or connected.
- Consent-controlled browser GPS telemetry, server-side geofence evaluation, and explainable safety signals. The review score incorporates location history, current geofence type, nearby recent operational incidents, official nearby hazards, time of day, GPS quality, speed, and optional itinerary deviation; it never automatically dispatches responders.
- Location-matched, official multi-hazard advisories from India’s NDMA SACHET feed (weather, flood, landslide, forest-fire, and other alerts when published). Matches are deliberately labelled approximate because the source exposes a centroid and reported coverage area rather than a guaranteed boundary.
- Optional onboarding download of an offline regional safety pack: chosen 2–25 km area, nearby tourist places and emergency services, emergency numbers, and safety guidance stored on the device and exported as a JSON backup.
- GPS-backed SOS creation, durable authority-queue records, and emergency-contact email through Resend when an email contact and provider configuration are present.
- Direct SOS delivery over Wi-Fi or mobile data to the authenticated authority queue, with browser-local retry when the device is offline. A paired Prahari BLE GATT gateway is an optional no-internet relay only; it is never required for normal use.
- Police-ready incident-information and missing-person drafts for authorised review; these are explicitly not police/CCTNS filings. The report integrity hash can be anchored when the incident registry is configured.
- Authenticated authority dashboard with live database records, map markers, responder availability, geofence creation, and a truthful realtime status indicator. If Supabase Broadcast cannot be verified in the browser, it falls back to authenticated 15-second refresh.
- Authority-only Sarvam AI incident briefs and authenticated, on-demand translations for incident chat. Officers can write in their own language, transmit a translated version in the traveller's preferred language, and translate incoming messages to English while retaining the original.
- Traveller voice assistance with Sarvam speech-to-text and text-to-speech across 11 Indian languages plus English. Travellers review the transcript before using it in an incident draft or sending a critical voice SOS; selected international languages use a clearly labelled browser-speech and server translation fallback.
- Emergency identification profiles: a traveller can enter attire details or consent to a current-photo analysis. The application retains only a structured description of visible clothing and possessions—never the uploaded photo—and attaches it to new emergency records for authorised case handling.

## Digital Tourist ID architecture

The Digital Tourist ID follows consent, accessibility, and trustworthy-public-service principles rather than claiming government issuance or a partnership with the India AI Impact Summit. The traveller can show a full in-app card; its QR code contains only a verification URL and current credential-claim hash. A scan checks the Ed25519-signed credential, expiry/revocation state, and—when configured—the hash-only chain anchor. It does not reveal the holder’s name, nationality, document data, emergency contacts, itinerary, or location. Protected information remains off-chain and is visible only through a signed-in authority case workflow.

## Important scope boundaries

- The safety engine is explainable, deterministic signal analysis—not a trained ML classifier. It evaluates recent consented location history, configured risk zones, official hazard advisories, nearby operational incident density, local time, GPS quality, unusual speed, and route deviation only when a coordinate route is supplied. High-risk results require human review and never dispatch police automatically.
- Production records are application data for this demonstration; they are not a connection to police, UIDAI, or government systems.
- Only hashes/commitments go on-chain. KYC, itinerary, contacts, and location history remain off-chain in the configured database.
- `DEPLOYER_PRIVATE_KEY` is a server-custodied issuer key, not the wallet a traveller connects in the browser. To anchor publicly, configure the root deployment environment with a funded Sepolia deployer key, `ALCHEMY_SEPOLIA_URL`, and both deployed Sepolia registry addresses. If those values are absent, the app uses only the explicitly configured local chain; `/api/health` identifies the active network and expected chain ID.
- A Resend `ACCEPTED` status means the email provider accepted the request; it does not prove inbox delivery.
- The public `tile.openstreetmap.org` service must not be used for offline map downloads. Configure a self-hosted or licensed tile provider that explicitly permits offline caching before enabling offline base-map tiles; the safety-pack data works without that optional provider.
- Offline SOS can be retained in the browser and retried after reconnection. True cross-device BLE relay is optional and requires a paired native/hardware Prahari GATT gateway; a web browser cannot advertise as a BLE peripheral. See the [optional relay setup](docs/BLE_OPTIONAL_RELAY.md) and [gateway protocol](docs/ble-relay-gateway-protocol.md).
- A browser GATT write proves only that the paired gateway accepted a packet. It is not an authority or emergency-service delivery receipt. The `/api/health` response reports whether the gateway’s server-side uplink key is configured.

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

Before deployment, apply the additive SQL files in `supabase/migrations/` in numeric order. The emergency-contact, emergency profile, relay provenance, missing-person draft, durable incident chat, recovery-code, and authority-geofence flows require migrations `005` through `012`; `/api/health` reports exact missing tables or columns as `degraded` until they are present.

## Key environment variables

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Local Hardhat: `CHAIN_RPC_URL`, `IDENTITY_REGISTRY_ADDRESS`, `ANCHOR_PRIVATE_KEY`
- Sepolia: `ALCHEMY_SEPOLIA_URL`, `DEPLOYER_PRIVATE_KEY`,
  `SEPOLIA_IDENTITY_REGISTRY_ADDRESS`, and `SEPOLIA_INCIDENT_REGISTRY_ADDRESS`
- `RESEND_API_KEY`, `EMERGENCY_FROM_EMAIL` for emergency-contact email
- `HAZARD_ALERT_CACHE_TTL_MS` (optional; default 300000) for the NDMA SACHET feed cache
- `NEXT_PUBLIC_OFFLINE_TILE_TEMPLATE`, `NEXT_PUBLIC_OFFLINE_TILE_ATTRIBUTION` only for an approved offline-capable base-map provider
- `SARVAM_API_KEY` for Indic/English translation, AI-assisted authority briefs, voice transcription, and voice playback; optional `SARVAM_CHAT_MODEL=sarvam-105b`, `SARVAM_STT_MODEL=saaras:v3`, `SARVAM_TTS_MODEL=bulbul:v3`
- `OPENAI_API_KEY` for emergency-identification photo analysis and the selected international translation fallback; optional `OPENAI_VISION_MODEL` and `OPENAI_TEXT_MODEL`
- `PRAHARI_MESH_GATEWAY_KEY` for the native/hardware BLE gateway’s authenticated uplink. It must never appear in browser code or device-advertised data.

## Account provisioning and recovery

Identity issuance displays a one-time traveller recovery code. Store it safely: an ID or DID by itself cannot sign a traveller in. Authority and administrator accounts are not pre-seeded; provision a password-hashed record in the protected `users` table through your approved administration process before using the authority dashboard.

## Contract commands

```bash
pnpm contract:compile
pnpm contract:deploy:sepolia
```

`packages/contracts/deployments/sepolia.json` records the current deployment addresses. The deployment script refuses any public network other than Sepolia.
