# Prahari — AI-Powered Tourist Safety & Incident Response System

Geofencing · Predictive Risk Detection · Blockchain-Based Digital Identity

> **Document status:** this is the single source of truth for what Prahari
> actually does. Every feature carries a status tag. Claims without a tag do
> not belong in this document.
>
> | Tag | Meaning |
> |---|---|
> | ✅ **Implemented** | Works end-to-end against the real database. Demoable today. |
> | 🟡 **Partial** | Code exists but is unwired, or wired to hardcoded inputs. |
> | ❌ **Not Implemented** | Does not exist yet. |

---

## 1. Problem Statement

Traveller security is central to India's international standing and tourism
economy. The prevailing safety framework is **reactive** (response begins only
after a tourist manually raises an alarm), **decentralised** (no shared view
across police, tourism, and medical services), and **frequently compromised by
language barriers**.

Prahari integrates AI-driven proactive monitoring with a consent-governed,
tamper-evident identity and audit layer.

### The four gaps

| Gap | Current reality | Prahari's approach |
|---|---|---|
| **Reactive safety** | Response starts only after a manual trigger. Fails entirely if the tourist is incapacitated. | Anomaly detection on signal loss, inactivity, and route deviation to surface distress the tourist never reported. |
| **The unaware tourist** | Visitors enter high-risk, restricted, or disaster-prone areas with no knowledge of local hazards. | Automated geofencing with instant alerts on perimeter breach. |
| **Language & dispatch fragmentation** | Under stress, tourists cannot communicate coordinates or navigate local emergency numbers. | One-tap panic button with multilingual voice assistance and automated nearest-unit dispatch. |
| **Identity & trust** | Verifying a foreign passport during a missing-person case takes hours. Tourists fear blanket surveillance. | Decentralised Digital Tourist ID — tamper-proof verification, strict consent-based location sharing. |

---

## 2. Feature Register

### 2.1 ✅ Implemented

Working end-to-end against Supabase Postgres.

| # | Feature | Where it lives |
|---|---|---|
| 1 | Authority command dashboard — live counts, incident queue, spatial map | `apps/web/app/admin/page.tsx` |
| 2 | Live spatial map — geofence polygons, incident pins, responder units, auto-fit viewport | `components/maps/ClientMapInner.tsx` |
| 3 | Centralised incident management — report → dispatch → resolve | `app/api/incidents` (GET/POST/PATCH) |
| 4 | Intelligent responder dispatch — nearest available unit by haversine distance + ETA | `lib/services/dispatchEngine.ts` |
| 5 | Government-controlled geofence creation and management | `app/api/geofences` |
| 6 | Location telemetry ingestion and movement history | `app/api/locations` |
| 7 | Geofence breach **detection** — point-in-polygon | `lib/geospatial.ts` |
| 8 | Dynamic tourist risk score (0–100) across five weighted factors | `lib/risk.ts` |
| 9 | Automated E-FIR draft generation from verified profile, location, and attire | `app/api/efir` |
| 10 | AI emergency attire profile — structured description for missing-person cases | `app/api/attire` |
| 11 | Persistence with row-level security; service-key access confined to the server | `supabase/schema.sql`, `lib/supabase.ts` |
| 12 | ML risk-scoring service (rule-based explainable baseline) | `services/ml` |
| 13 | **Aadhaar eKYC** — Verhoeff checksum, OTP challenge, lockout | `lib/kyc/{verhoeff,sandboxProvider}.ts` |
| 14 | **Passport verification** — ICAO 9303 MRZ parse + check digits | `lib/kyc/passportMrz.ts` |
| 15 | **DID issuance** — deterministic `did:prahari:<base58>` | `lib/identity/did.ts` |
| 16 | **W3C Verifiable Credential** — Ed25519 signed, tamper-evident | `lib/identity/credential.ts` |
| 17 | **Onboarding wizard** — full enrolment flow, both nationalities | `app/onboarding/page.tsx` |
| 18 | **Credential verification endpoint** — public QR-scan target | `app/api/identity/verify/[did]` |
| 19 | Privacy-preserving storage — salted hashes only, no raw document numbers | `lib/kyc/hash.ts` |
| 20 | **Geofence breach → incident** — auto-creates incident on breach (client + server-side, 30-min dedup) | `app/citizen/page.tsx`, `app/api/locations/route.ts` |
| 21 | **Real-time gateway** — dashboard subscribes to Socket.IO events; live connection badge; API routes emit on create/update | `app/admin/page.tsx`, `lib/services/gatewayEmit.ts` |
| 22 | **Risk scoring ML integration** — citizen risk score calls the ML FastAPI service with graceful fallback to local engine | `lib/services/mlRiskClient.ts`, `app/citizen/page.tsx` |
| 23 | **Missing Tourist Investigation Mode** — real DID, attire, and movement history fetched from API | `app/admin/page.tsx` |
| 24 | **Multilingual voice SOS** — real browser-native Web Speech API (8 Indian languages), interim transcripts, error handling | `app/citizen/page.tsx` |
| 25 | **E-FIR officer verification workflow** — PATCH endpoint for approve/reject; review panel with status badges in admin dashboard | `app/api/efir/route.ts`, `app/admin/page.tsx` |
| 26 | **Authentication** — Stateless signed session tokens (`prahari_session`), staff email/password login, tourist DID login, auto-session on enrolment | `lib/auth/session.ts`, `app/api/auth/*`, `app/login/page.tsx` |
| 27 | **Role-Based Access Control (RBAC)** — Four roles (`admin`, `authority`, `responder`, `tourist`), edge middleware protection, and API route guards | `lib/auth/guards.ts`, `middleware.ts`, `supabase/migrations/003_auth_rbac.sql` |

### 2.2 🟡 Partial

No features remain in this category — all former partials were completed.

### 2.3 ❌ Not Implemented

| # | Feature | Note |
|---|---|---|
| 28 | **Blockchain integration** | Five contracts written and reviewed; never compiled, never deployed, no client wiring ← **Block 3, next up** |
| 29 | Emergency-contact alerting (SMS/email/push) | Contacts are stored but never notified |
| 30 | Anomaly detection — signal drop, inactivity, route deviation | Core to the "proactive" claim |
| 31 | Predictive ML behaviour analysis | Only the rule-based baseline exists |
| 32 | Live disaster / environmental hazard overlay | No NDMA/IMD feed |
| 33 | Offline downloadable regional maps | Placeholder modal |
| 34 | Dynamic risk heatmaps | Not started |
| 35 | Tiered consent (Basic ID → Tracking → Family Sharing) | Single boolean today |
| 36 | End-to-end encryption | Not started |
| 37 | Tamper-evident blockchain audit trail | Depends on #28 |

**Summary: 27 implemented · 0 partial · 10 not implemented.**

_Last updated: 2026-08-23, end of Block 2 (Authentication & RBAC complete)._

---

## 3. Implementation Roadmap

Work proceeds in blocks. Each block ends with a demoable increment.

| # | Block | Delivers | External keys |
|---|---|---|---|
| ~~1~~ | ~~Identity & eKYC foundation~~ | ✅ **DONE** — Aadhaar + passport verification, DID, signed VC | none |
| ~~2~~ | ~~Auth & role-based access control~~ | ✅ **DONE** — Four roles (`admin`, `authority`, `responder`, `tourist`), edge middleware, login portal, API route guards | **None** |
| **3** | **Blockchain — deploy & anchor identity** | ← **NEXT.** Contracts live on Sepolia; credentials anchored | Alchemy RPC + burner wallet |
| 4 | Blockchain — incident & geofence anchoring | Tamper-evident audit trail with Etherscan links | (same) |
| 5 | Real-time & automation | Socket.IO subscriptions; breach automatically raises an incident | None |
| 6 | Anomaly detection & ML wiring | Signal-drop, inactivity, route deviation; ML service connected | None |
| 7 | Emergency-contact alerting | SMS/email on incident and anomaly | Twilio (+ SendGrid) |
| 8 | Multilingual & voice SOS | Real STT, translation, TTS | Sarvam AI |
| 9 | Hazard overlay & heatmaps | Disaster feeds, historical risk density | NDMA/IMD/weather |
| 10 | Privacy hardening | Offline maps, consent tiers, E2E encryption | None |

### Standing technical decisions

| Area | Decision | Why |
|---|---|---|
| **Aadhaar eKYC** | Simulated provider behind a swappable `KycProvider` interface | Real UIDAI authentication requires an AUA/KUA licence — a registered entity, security audit, and government contract. Not obtainable as an API key. Commercial "Aadhaar APIs" resell that licence and their sandboxes return synthetic data regardless. The flow, validation, and storage model are built correctly so a licensed provider drops in by replacing one module. **Every screen is labelled as a sandbox.** |
| **Aadhaar number validation** | Verhoeff checksum — real | Genuinely rejects malformed Aadhaar numbers. Not simulated. |
| **Passport verification** | ICAO 9303 MRZ parsing + check digits — real | Real offline validation of document self-consistency. No third party, no key. |
| **Blockchain** | Sepolia testnet | Public, verifiable transaction hashes. Hashes only — never PII or raw coordinates. |

---

## 4. Novelty

**Reactive SOS → predictive monitoring.** Behavioural monitoring identifies
implicit distress — abrupt signal loss, route deviation, prolonged inactivity
in a high-risk zone — rather than waiting for a button press.

**Privacy-first decentralised credentials.** Blockchain-anchored verifiable
credentials replace centralised identity databases. Only salted hashes go
on-chain. Access to a traveller profile is restricted by role and permitted
only during an authorised emergency.

**Context-aware regional risk analytics.** A hyper-local safety rating combines
live telemetry, geofence status, time of day, and historical micro-incident
data — pickpocketing hotspots, harassment risk, environmental hazards.

**Multilingual SOS and visual incident profiling.** Voice reporting in 10+
Indian languages; attire descriptions processed into structured emergency
tickets and E-FIR drafts.

**Intelligent dispatch with immutable auditing.** Nearest-unit routing by live
distance and ETA, with every operational timestamp and responder action
cryptographically anchored.

---

## 5. Feasibility

**Technical.** Built on mature technology — geofencing, mobile telemetry,
standard ML classifiers, permissioned blockchain. Nothing experimental. Digital
ID issuance can pilot at a single high-traffic entry point before wider rollout.

**Data.** Geofence boundaries, historical incident zones, and footfall data are
obtainable from state tourism/police records and open government sources (NDMA,
IMD). Risk scoring bootstraps with rule-based logic, avoiding a cold-start
dependency on large historical datasets.

**Resource.** Modular architecture means the core (Digital ID + Panic Button +
Geofencing) demonstrates as an MVP within prototype timelines, with anomaly
detection layered on afterwards.

**Scalability.** The framework is state-agnostic. Risk zones and language packs
are configurable rather than hardcoded, so extending to another state is a
data exercise, not an architectural one.

### Expected impact

- **Tourists** — reduced response time, real-time hazard awareness, multilingual accessibility for elderly and differently-abled travellers.
- **Authorities** — faster identity verification, automated E-FIR drafting cutting missing-person investigation time, heatmap-driven resource allocation.
- **Region** — improved safety perception supporting tourist inflow in a sector that is a primary economic driver for several states.

---

## 6. Risks & Mitigations

| Risk | Description | Mitigation |
|---|---|---|
| **Connectivity gaps** | Remote terrain has poor coverage, undermining real-time tracking | Offline-first app with pre-downloadable maps, cached contacts, SMS fallback for panic alerts |
| **Privacy & consent sensitivity** | Continuous tracking and Aadhaar-linked IDs raise surveillance concerns | Strict opt-in tiers (Basic ID → Tracking → Family Sharing), E2E encryption, role-based access limited to authorised emergencies |
| **False positives** | Legitimate behaviour misflagged as distress, causing alert fatigue | Human-in-the-loop: a lightweight "Are you okay?" confirmation window precedes escalation |
| **Adoption friction** | Tourists skip onboarding or disable tracking | Frictionless issuance at checkpoints where KYC is already collected — piggyback rather than add a step |
| **Institutional integration** | Departments must adopt a new dashboard and workflow | Phased pilot with one police unit, structured training, feedback loop before expansion |
| **Blockchain cost & latency** | Public-chain costs are problematic at high frequency | Hash-only anchoring; permissioned/hybrid chain in production rather than a public L1 |
| **Language model accuracy** | Regional dialects and code-mixed speech reduce transcription accuracy | Continuous fine-tuning on consented pilot voice data, prioritising the densest language groups |
| **Battery constraints** | Continuous GPS drains devices where charging is unavailable | Adaptive polling — lower GPS frequency in low-risk zones, higher in high-risk zones |

---

## 7. References

- <https://ijirt.org/publishedpaper/IJIRT202990_PAPER.pdf>
- <https://matjournals.net/engineering/index.php/JoCNSDC/article/view/3397>
- <https://ijsrem.com/download/ai-powered-smart-tourist-safety-system-with-geo-fencing-and-blockchain-identity>

---

## 8. Current State & Handoff

_Written 2026-08-23 at the end of Block 2. Read this first if you are picking
the project up cold._

### Running it locally

Nothing is half-finished. The repo is in a working, type-clean state.

```bash
pnpm install
pnpm dev            # web :3000, Socket.IO :3001
```

The ML service is separate and needs **Python 3.11** — 3.12+ has no wheels for
the pinned `pydantic-core`/`scikit-learn`, and the root `pnpm ml:dev` script
uses bare `python`, so it will fail on a newer default. Use:

```bash
cd services/ml && .venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

Reseed the database (creates the demo tourist, geofences, responders, incident,
**and issues a real signed credential**):

```bash
curl -X POST http://localhost:3000/api/seed
```

### Environment

Real values live in `.env` (root, for the Socket.IO service) and
`apps/web/.env.local` (Next.js reads from its own directory — a root-only
`.env` is silently ignored by the web app). Both are gitignored.
`.env.example` is **tracked**; never put real values there.

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access. Bypasses RLS. Never expose to the browser |
| `SUPABASE_DB_PASSWORD` | Only needed for direct Postgres/migrations |
| `IDENTITY_SIGNING_KEY` | Ed25519 issuer key (PKCS#8 PEM, base64). **Rotating it invalidates every credential** |
| `KYC_HASH_SALT` | HMAC salt for document-number hashing. Changing it orphans every existing `kycSubjectHash` |
| `NEXT_PUBLIC_MAPTILER_KEY` | Optional. Maps use keyless OpenFreeMap/OSM without it |
| `ALCHEMY_SEPOLIA_URL`, `DEPLOYER_PRIVATE_KEY` | Block 3 only. Unset today |

Generate a fresh signing key with `pnpm identity:keygen` (prints the line to
add; never writes it for you).

### Running migrations

Supabase's **direct** connection (`db.<ref>.supabase.co`) is **IPv6-only** and
is unreachable from most home ISPs — you will get `EHOSTUNREACH`. Two options
that do work:

1. **SQL Editor** in the Supabase dashboard — paste and run. Always works.
2. **The pooler**, which is IPv4: host `aws-0-ap-south-1.pooler.supabase.com`,
   port 5432, user `postgres.<project-ref>`, `ssl: { rejectUnauthorized: false }`.
   This is how `002_identity.sql` was applied.

Note that macOS `getaddrinfo` will not return AAAA-only records even when `dig`
does, so Node's `dns.lookup` fails where `dns.resolve6` succeeds. Do not waste
time on this — use the pooler.

Migrations, in order:
- `supabase/schema.sql` — base tables. **Destructive** (`drop table ... cascade`).
- `supabase/migrations/002_identity.sql` — identity columns, `kyc_sessions`,
  `credential_issuance`. Additive and safe to re-run.
- `supabase/migrations/003_auth_rbac.sql` — `users` table for staff credentials
  and RBAC roles (`admin`, `authority`, `responder`, `tourist`). Additive.

### Block 1 — what was built

The identity layer is complete and tested. Two things in it are **genuinely
real**, not simulated, and worth understanding before changing them:

- **Verhoeff checksum** (`lib/kyc/verhoeff.ts`) — the actual UIDAI algorithm.
  Rejects invented Aadhaar numbers. 12 digits, never starting 0 or 1.
- **ICAO 9303 MRZ** (`lib/kyc/passportMrz.ts`) — real 7-3-1 weighted check
  digits over document number, DOB, expiry, and a composite. Verified against
  the official ICAO specimen passport.

What **is** simulated: the identity *lookup*. No UIDAI call happens, the OTP is
returned in the API response rather than sent by SMS, and the holder's name is
self-asserted. This is unavoidable — UIDAI authentication requires an AUA/KUA
licence (registered entity, security audit, government contract), which is not
obtainable as an API key. Commercial "Aadhaar APIs" resell that licence and
their sandboxes return synthetic data anyway.

The provider sits behind the `KycProvider` interface (`lib/kyc/types.ts`), so
swapping in a licensed gateway means writing one module and changing one export.

**Do not remove the sandbox labelling** in `app/onboarding/page.tsx` or
`DigitalIdCard.tsx` while the provider is simulated.

Test fixtures that work:
- Valid sandbox Aadhaar: `234567890124`, `345678901238`, `456789012341`, `567890123458`
- ICAO specimen MRZ:
  - line 1 `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<`
  - line 2 `L898902C36UTO7408122F3404159ZE184226B<<<<<16`
  - (the widely-quoted ICAO line 2 ends `...<<<<<10` and expires in 2012 — the
    variant above is the same document re-dated to 2034 with recomputed check
    digits, so it passes the expiry test)

Algorithm tests: 23/23 passing. There is **no test runner configured** — they
were run as a standalone Node script. Node 26 strips TypeScript natively, so
`node some-test.ts` works with absolute import paths.

### Block 2 — Auth & RBAC (✅ Completed)

Delivered complete authentication and role-based access control without external API dependencies:

- **Users & Staff Table:** Schema created (`supabase/migrations/003_auth_rbac.sql`) with password hashing via PBKDF2 (SHA-512).
- **Four Roles:** `admin`, `authority`, `responder`, `tourist` with scoped permissions.
- **Edge-Compatible Session Management:** HMAC-signed stateless session tokens stored in HTTP-only cookies (`prahari_session`) or Bearer headers.
- **Login Portal:** Government-styled portal at `/login` supporting staff email/password credentials and tourist DID verification with quick-fill presets.
- **Page Route Protection:** Next.js `middleware.ts` redirecting unauthenticated users to `/login` and enforcing role boundaries.
- **API Protection:** All 21 endpoints guarded via `requireAuth()` and tourist isolation checks.
- **Validated with `scripts/auth-matrix.mjs`:** Anonymous requests are blocked with 401 or redirected; authenticated roles receive granular scoped access.

The design workflow script is saved and can be re-run cheaply:

```
.claude/projects/-Users-arav-Desktop-Prahari-apps-web/…/workflows/scripts/prahari-auth-design-wf_fb515864-125.js
```

### Known issues, unrelated to any block

- **`pnpm lint` is broken.** There is no ESLint config anywhere in the repo and
  none was ever committed — `eslint-config-next` is installed and the `lint`
  script exists, but there is no `eslint.config.js`. Pre-existing.
- **`/api/seed` is destructive** — `deleteMany` on geofences and responders.
  It wipes anything created through the UI.
- **Dead code**: `components/dashboard/*` (6 files) and
  `components/map/live-map.tsx` are rendered by nothing. They are the only
  consumers of `lib/mock-data.ts`.
- **Citizen risk scoring** connects to the FastAPI ML service via `mlRiskClient.ts`
  with automatic fallback to the deterministic local engine when ML is offline.
- **`tsconfig` target is ES2020** (raised from ES2017 for BigInt literals used
  in base58 encoding). If you see `TS2737`, delete `tsconfig.tsbuildinfo` —
  incremental builds cache the old target.
- **Rotate the Supabase database password.** It was exposed in plaintext during
  development. Nothing in the app uses it — only direct/pooler connections do.

### Architecture notes worth knowing

- The app was migrated from MongoDB to Supabase Postgres. Mongo, Mongoose, and
  all five model files are gone. If you find `_id` anywhere, it is a leftover
  bug — Supabase returns `id`.
- Postgres columns use **quoted camelCase** (`"touristId"`, not `tourist_id`).
  This is deliberate: it keeps API responses byte-identical to the old Mongo
  shapes so no frontend mapping layer is needed. In the SQL editor you must
  double-quote them: `select "touristId" from tourists;`
- `lib/db.ts` holds ~26 thin domain functions. They **log and continue** on
  error, returning `null`/`[]`/`false`. A route returning 200 therefore does
  **not** prove a write succeeded — always verify against the database.
- RLS is enabled on every table with **no permissive policies**. The
  publishable key reads nothing. This is intentional: if that key ever leaks
  into browser code, tourist location data is not world-readable.
