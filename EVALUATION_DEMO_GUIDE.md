# Prahari — Evaluation Demo & Technical Guide

## One-line overview

**Prahari is a consent-first tourist-safety workflow that creates a sandbox-verified digital identity, monitors only opted-in GPS telemetry, surfaces explainable safety signals for human review, and creates a traceable SOS/E-FIR response record.**

Use the deployed site: <https://prahari-mu.vercel.app>. Before presenting, hard-refresh the page and sign in to the authority view in a separate browser tab.

## Honest project status

| Capability | Demonstrable now | What to say |
| --- | --- | --- |
| Digital tourist identity | Yes | A signed credential is issued after sandbox KYC validation. It is **not** a government credential. |
| KYC checks | Yes, sandbox | Aadhaar checksum + sandbox OTP and passport MRZ check digits are validated; there is no UIDAI/passport-provider lookup. |
| Blockchain identity proof | Yes, Sepolia | The server anchors a credential hash with its own protected wallet. No personal KYC is placed on-chain and no MetaMask is connected. |
| Location, zones, risk assessment | Yes, with consent | Browser GPS is stored only after consent; the server checks configured geofences and creates explainable signals. |
| SOS | Yes | It requires a valid GPS position, creates a durable incident first, then attempts emergency-contact email. This is a prototype queue, not a police-control-room integration. |
| E-FIR workflow | Yes | A tourist submits a reviewable E-FIR; an authorised officer approves or rejects it. Approval can anchor evidence when the incident registry is configured. |
| Authority dashboard | Yes | Metrics, queue, locations, geofences, and responders come from the application database; no static incident feed is intentionally shown. |
| Instant authority updates | Conditional | The UI tests the authenticated Supabase Broadcast channel. A verified state means it worked in this browser; otherwise the dashboard refreshes securely every 15 seconds. |
| Trained ML Anomaly Model | **Yes — Trained & Live** (`apps/ml-api`) | Isolation Forest safety classifier (`isolation_forest_v1.pkl`) trained on tourist telemetry & distance features, deployed via FastAPI microservice and Next.js `/api/predict`. |

## Five-minute presentation script

Do **not** create a real-looking incident with invented details in front of evaluators. Use your own test identity/contact and make clear that the app is a prototype.

### 0:00–0:25 — Start on the home page

Say:

> “Prahari focuses on the journey from verified entry to consented safety support. It has a traveller view and an authority view, with a human review step before any operational action.”

Point to **Create a tourist ID** and **Authority Command**. Mention that the visual design is deliberately quiet because emergency workflows must be readable quickly.

### 0:25–1:20 — Create and verify the tourist ID

Click **Create a tourist ID**.

1. Pick either citizen flow. Use the validation helper/example shown by the form, not a real Aadhaar or passport number.
2. Explain: “The client/server checks the Aadhaar Verhoeff checksum and a sandbox OTP, or the ICAO passport MRZ check digits. This proves input integrity in a sandbox; it is not government authentication.”
3. Enter a test emergency-contact email you control and explicitly grant location consent.
4. Complete the form. On the issued screen, point to the DID and credential hash.
5. Click **Verify credential**.

Say:

> “This page validates the credential’s Ed25519 signature and then independently asks the Sepolia registry whether this exact hash is active. The blockchain has a commitment hash and lifecycle state—not a person’s passport, Aadhaar, address, contacts, or location.”

If the chain panel shows an explorer link, open it only to show the Sepolia transaction/hash. Do not describe it as a MetaMask transaction; the project server submitted it from its safeguarded wallet.

### 1:20–2:20 — Traveller safety dashboard

Click **Open my safety dashboard**.

1. Allow browser location only if you are comfortable doing so. Explain that sharing is opt-in and can be paused.
2. Point to the current safety score and its reason chips.
3. Say: “The current engine is explainable, not opaque ML. It assesses the gap since the previous ping, whether a configured risk zone contains this point, GPS accuracy, unusually fast movement, and—only if a coordinate itinerary was supplied—route deviation.”
4. Toggle/pause tracking briefly only if you want to show consent control; turn it back on afterward.

Avoid promising that a score predicts crime. Say: “A high score opens a human-review item; it never automatically dispatches police.”

### 2:20–3:05 — SOS and emergency contacts

With GPS available, click the **SOS** action and use your own test contact. Confirm only once.

Say:

> “The SOS cannot be created without a location. The system writes the incident to the database before it calls the email provider, so a provider outage cannot erase an emergency record. If Resend says accepted, that means the provider accepted the message—not that we can prove it reached an inbox.”

Show the created incident/status. If you do not want to create a test SOS during the evaluation, show an existing **non-fixture** record and narrate this exact sequence instead.

### 3:05–4:05 — Authority workflow

Open **Authority Command** (or the authority tab) and sign in with the supplied staff account.

1. Start at the realtime badge. Say: “Green/verified means the browser has received an authenticated test broadcast. If it says ‘Syncing every 15 seconds’, the secure fallback is in effect; we do not pretend that push delivery is working.”
2. Show the incident queue created by the SOS. It should have the actual traveller, current coordinates, timestamp, and any real responder assignment—never an invented patrol unit or ETA.
3. Show the map: “This uses OpenStreetMap tiles and the stored application locations; the markers reflect our project data, not a police data feed.”
4. If there is a registered responder, show how it can be assigned. If not, show the unassigned state and say it is intentionally truthful.

### 4:05–4:40 — Geofence and E-FIR

Click **Add geofence** only if you have three prepared, genuine coordinate points. Create a zone and explain that future consented location pings are checked server-side against it. Do not use a made-up polygon just to make a red marker appear.

Then show the E-FIR form or a previously submitted test E-FIR:

> “The traveller must provide a live location, a narrative of at least 20 characters, and accept a declaration. An officer then approves or rejects it. On approval, the evidence document is hashed; when the incident registry is configured, that hash can be anchored to Sepolia.”

### 4:40–5:00 — Close

> “The important design choice is that the prototype makes its limits explicit: sandbox KYC, testnet blockchain, consented app data, explainable safety signals, and human review. The production path is to integrate verified providers, real responder systems, and a properly evaluated model—not to overclaim automation.”

## Click-by-click feature reference

| Page / control | Demonstrates | Expected result | Do not claim |
| --- | --- | --- | --- |
| Home → Create a tourist ID | Entry flow | Opens onboarding | Government registration |
| Onboarding → citizen / foreign national | Sandbox KYC path | Checksum/MRZ validation then credential issue | UIDAI/passport lookup |
| Issued → Verify credential | Signature + chain verification | Human-readable verification screen; Sepolia link when anchored | MetaMask signature or on-chain PII |
| Citizen → start/pause location sharing | Consent control | Browser GPS submissions start/stop; score updates | Continuous tracking without consent |
| Citizen → safety assessment | Explainable risk review | Reasons and score calculated server-side | A trained AI predicting danger |
| Citizen → SOS | Incident creation + notification attempt | GPS-backed database incident; authority receives it; optional Resend email | Direct 112/police dispatch |
| Citizen → E-FIR | Report creation | Required declaration/location/narrative; officer review queue | A legally filed police FIR |
| Citizen → visual/attire note | Traveller-provided context | Optional stored description | Computer-vision inference |
| Authority → realtime badge | Honest delivery state | Broadcast verified or 15-second secure refresh | Always-instant WebSockets |
| Authority → map & queue | Operational view | Current project database locations/incidents/geofences | Government live-feed coverage |
| Authority → Add geofence | Configured zone | Valid polygon saved; future location checks use it | A zone built from arbitrary fake inputs |
| Authority → E-FIR approve/reject | Human verification | Status/audit trail changes; possible evidence anchor | Automatic officer approval |

## Architecture and data flow

```text
Traveller browser
  ├─ sandbox KYC → Next.js route handlers → Supabase Postgres
  ├─ credential signing → server wallet → Ethereum Sepolia (hash only)
  ├─ opted-in GPS → safety/geofence evaluation → Supabase incident/location records
  └─ SOS → database record first → Resend email attempt → authorised authority queue

Authority browser
  └─ authenticated Supabase Broadcast, when verified
       └─ otherwise authenticated 15-second data refresh
```

## Technology stack

| Layer | Used technology | Role |
| --- | --- | --- |
| Front end | Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Lucide | Traveller and authority workflows |
| Server/API | Next.js Route Handlers on Vercel | Authenticated business logic and server-only secrets |
| Data | Supabase Postgres and Supabase Realtime | Durable records, authorisation, private Broadcast/fallback refresh |
| Mapping/geospatial | Leaflet, React Leaflet, OpenStreetMap, Turf.js/custom geometry | Map rendering and server-side geofence evaluation |
| Identity | Ed25519-signed credential, `did:prahari:` identifier | Digital credential and public verification |
| Blockchain | Solidity, Hardhat, ethers v6, Ethereum Sepolia | Hash-only identity and E-FIR evidence anchoring |
| Notifications | Resend | Emergency-contact email attempt |
| Hosting | Vercel | Deployed web/API application |

## Codebase guide

| Concern | Key files |
| --- | --- |
| Home, onboarding, citizen, authority pages | `apps/web/app/page.tsx`, `onboarding/page.tsx`, `citizen/page.tsx`, `admin/page.tsx` |
| Credential issue/verification | `apps/web/lib/identity/credential.ts`, `apps/web/app/api/identity/verify/[did]/route.ts`, `apps/web/app/verify/[did]/page.tsx` |
| Sandbox KYC rules | `apps/web/lib/kyc/verhoeff.ts`, `passportMrz.ts`, `sandboxProvider.ts` |
| Safety analysis | `apps/web/lib/safetyRisk.ts`, `apps/web/app/api/locations/route.ts` |
| SOS, dispatch matching, Resend | `apps/web/app/api/incidents/route.ts`, `apps/web/lib/services/dispatchEngine.ts`, `emergencyNotifications.ts` |
| E-FIR lifecycle | `apps/web/app/api/efir/route.ts`, `apps/web/lib/blockchain/incidentEvidence.ts` |
| Realtime status/delivery | `apps/web/lib/services/gatewayEmit.ts`, `apps/web/lib/supabaseRealtime.ts`, `apps/web/app/api/realtime/probe/route.ts` |
| Supabase storage/access | `apps/web/lib/db.ts`, `apps/web/lib/auth/guards.ts`, `supabase/*.sql` |
| Contracts and Sepolia deployment | `packages/contracts/contracts/`, `packages/contracts/scripts/deploy.ts`, `packages/contracts/deployments/sepolia.json` |

## Current Sepolia contracts

The recorded Sepolia deployment uses chain ID `11155111`:

- `TouristIdentityRegistry`: `0x763Ae697425D4baDD7FB665796c5745e4E9d82aF`
- `IncidentRegistry`: `0xC75cF5C5B0a071F43fD389a3c667c529AEFdfeA9`
- `GeofenceRegistry`: `0x5faDFCc59BBAd5d218772BeaF6921d60077aaFda`
- `ResponderRegistry`: `0x087676f0C6069114DC8C28C5720b9F3b28CF2b8a`

The public app currently uses the identity and incident registry addresses. Deployments are testnet records, not production legal evidence.

## Trained Machine-Learning Model Microservice (`apps/ml-api`)

The project features a dedicated **Isolation Forest Anomaly Classifier** deployed in `apps/ml-api`:
- **Model Architecture**: Scikit-Learn `IsolationForest` ($n\_estimators=150$, $contamination=0.05$) with `StandardScaler` feature scaling.
- **Trained Feature Matrix**:
  1. `Difficulty_Score`: Numerical trek difficulty (1.0 to 4.0).
  2. `Max_Altitude_m`: Maximum altitude of terrain / location.
  3. `Hour_of_Day`: Time of day (0–23).
  4. `Distance_From_Trail_km`: Haversine distance from baseline trail / basecamp coordinates.
  5. `Bad_Weather_Flag`: Weather severity indicator.
- **Live API Endpoint**: `POST /api/predict` via Next.js proxy and Python FastAPI microservice.
- **Dynamic Configuration**: Zero hardcoding — all basecamp coordinates, model artifact paths, ports, and database credentials load from environment variables and `trek_ml_config` table.
- **Human-in-the-Loop Safeguard**: When an anomaly is detected (`status: "DANGER"`), it initiates a `REVIEW_REQUIRED` incident for authority staff review.

### External government and emergency integrations

The next production phase needs formal, approved integrations for identity verification, 112/police dispatch, responder CAD systems, and protected legal E-FIR filing. These require agreements, security review, data protection controls, and operational ownership—not merely API keys.

### Realtime hardening

Private Supabase Broadcast is implemented and self-tested by the staff browser. If a particular deployment/browser cannot confirm receipt, the product falls back to authenticated polling every 15 seconds. Before calling this guaranteed instant delivery, investigate Supabase Realtime project settings/logs and add end-to-end monitoring/alerts.

## Evaluation preparation checklist

1. Use a normal browser window, hard-refresh, and confirm the deployed URL loads.
2. Keep one traveller tab and one logged-in authority tab open.
3. Have a safe test email inbox ready. Never show a real Aadhaar, passport, private contact, or production secret.
4. Allow browser location only if you choose; otherwise narrate the GPS-gated validation truthfully.
5. Check the authority realtime badge before saying anything about instant updates.
6. Prefer an existing test record rather than creating repeated SOS/E-FIR items during an evaluation.
7. If a provider or browser permission fails, state the relevant boundary and show the durable database/queue state instead of improvising a claim.

## Strong answers to likely evaluator questions

**“Where is personal data stored?”** In the configured Supabase database with access checks. The chain receives a hash/commitment, not KYC or live coordinates.

**“Why blockchain?”** It provides an independently verifiable, tamper-evident record that a specific credential/evidence hash existed and was in a particular lifecycle state on Sepolia. It is not used as a public personal-data store.

**“Is the ML model trained?”** No. It is an explainable safety-signal engine today; training without enough consented, reviewed data would be misleading and unsafe.

**“Does SOS call police?”** It creates a real application incident and can email the configured contact. It is not connected to 112 or a police CAD system; that needs a formal future integration.

**“Is this realtime?”** The dashboard detects and shows whether authenticated Broadcast delivery is verified in that browser. If not, it safely refreshes from the same data source every 15 seconds.
