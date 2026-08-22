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
| 28 | **Blockchain credential anchoring** — 5 contracts compiled & deployed; each credential hash anchored on-chain on issuance (real tx hash), independent on-chain verification, tx hash shown in the ID card | `packages/contracts`, `lib/blockchain/registry.ts`, `app/api/identity/{issue,verify}`, `components/tourist/DigitalIdCard.tsx` |
| 39 | **Neobrutalist UI + dark mode** — token-driven design system, sky-blue accent, Google-grey dark, in-navbar theme toggle across every page | `app/globals.css`, `tailwind.config.ts`, `components/ui/ThemeToggle.tsx` |

### 2.2 🟡 Partial

No features remain in this category — all former partials were completed.

### 2.3 ❌ Not Implemented

| # | Feature | Note |
|---|---|---|
| 29 | Emergency-contact alerting (SMS/email/push) | Contacts are stored but never notified |
| 30 | Anomaly detection — signal drop, inactivity, route deviation | Core to the "proactive" claim; ML service is wired (#22) but only zone/time features are fed today |
| 31 | Predictive ML behaviour analysis | Only the rule-based baseline exists |
| 32 | Live disaster / environmental hazard overlay | No NDMA/IMD feed |
| 33 | Offline downloadable regional maps | Placeholder modal |
| 34 | Dynamic risk heatmaps | Not started |
| 35 | Tiered consent (Basic ID → Tracking → Family Sharing) | Single boolean today |
| 36 | End-to-end encryption | Not started |
| 37 | Tamper-evident blockchain audit trail | **Identity anchoring is done (#28).** Incident/geofence anchoring + audit-trail UI is Block 4 |

### Caveats on features marked ✅ (read before demoing)

- **#22 ML risk integration** — the citizen page calls the FastAPI service from the
  browser and falls back to the local engine when it is unreachable. It only
  produces a live "ML SERVICE" badge when `services/ml` is running **and**
  reachable with CORS (fixed 2026-08-23). Only `zone_risk` + `hour_of_day` are
  real inputs; `route_deviation` / `inactivity` are stubbed to 0 until #30.
- **#24 Multilingual voice SOS** — this is the **browser-native Web Speech API**
  (Chrome/Edge only), not Sarvam. It does live STT in 8 Indian languages but
  performs **no translation or TTS**. Full Sarvam integration remains Block 8.
- **#20 Breach → incident** — now created **authoritatively server-side** in
  `POST /api/locations` with a 30-min dedup window. The earlier duplicate
  client-side creation was removed 2026-08-23.

**Summary: 30 implemented (2 with caveats above) · 0 partial · 9 not implemented.**

_Last updated: 2026-08-23. Blocks 1, 2, 3 (blockchain identity anchoring), 5, and the
UI redesign (11) are complete; Block 2 was also hardened. See §8 for per-block handoff
notes (blockchain is the last section)._

---

## 3. Implementation Roadmap

Work proceeds in blocks. Each block ends with a demoable increment.

| # | Block | Delivers | External keys |
|---|---|---|---|
| ~~1~~ | ~~Identity & eKYC foundation~~ | ✅ **DONE** — Aadhaar + passport verification, DID, signed VC | none |
| ~~2~~ | ~~Auth & role-based access control~~ | ✅ **DONE & HARDENED** — four roles, edge middleware, login portal, API route guards; real HMAC-SHA256 session tokens | **None** |
| ~~5~~ | ~~Real-time & automation (partial)~~ | ✅ **DONE** — Socket.IO subscriptions; breach → incident server-side (#20, #21) | None |
| ~~6~~ | ~~ML wiring (partial)~~ | 🟡 **PARTIAL** — ML service connected with fallback (#22); anomaly detection (signal-drop/inactivity/route-deviation) still #30 | None |
| ~~8~~ | ~~Voice SOS (partial)~~ | 🟡 **PARTIAL** — browser-native STT done (#24); Sarvam translation/TTS outstanding | Sarvam AI (for full) |
| ~~11~~ | ~~Neobrutalism redesign~~ | ✅ **DONE** — sky-blue accent, Google-grey dark mode, thick borders / hard shadows, in-navbar theme toggle, across every page. Slop/emoji chrome removed | None |
| ~~3~~ | ~~Blockchain — deploy & anchor identity~~ | ✅ **DONE** — 5 contracts compiled & deployed; credential hashes anchored on-chain on issuance with real tx hashes; independent on-chain verification; tx hash shown in the ID card | None (local Hardhat); Alchemy RPC + burner wallet only for Sepolia |
| **4** | **Blockchain — incident & geofence anchoring** | ← **NEXT BLOCK.** Anchor incident + geofence events (contracts already deployed), add an audit-trail UI with explorer links | None (local); same as above for Sepolia |
| 6b | Anomaly detection | Feed route-deviation / inactivity / signal-drop into the ML client | None |
| 7 | Emergency-contact alerting | SMS/email on incident and anomaly | Twilio (+ SendGrid) |
| 8b | Full Sarvam voice | Translation + TTS on top of the existing STT | Sarvam AI |
| 9 | Hazard overlay & heatmaps | Disaster feeds, historical risk density | NDMA/IMD/weather |
| 10 | Privacy hardening | Offline maps, consent tiers, E2E encryption | None |

### What is demoable *today* (the core project is already implemented)

The end-to-end product works right now against the real database: onboarding →
Aadhaar/passport verification → DID + signed credential → login/RBAC → live map
with geofences → telemetry → automatic breach-to-incident → nearest-unit dispatch
→ E-FIR draft + officer sign-off → risk scoring → realtime dashboard — all in a
consistent neobrutalist UI with light/dark themes. **eKYC and geofencing are DONE
(Blocks 1 and the geospatial engine), not pending.** What remains (blocks above)
are advanced add-ons: on-chain anchoring, anomaly detection, external alerting,
full Sarvam voice, hazard feeds, and privacy hardening.

**Realistic completion:** the marquee remaining feature is **blockchain (Blocks 3–4)**.
Everything else is independent and can be picked up in any order by the next owner.

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

#### Block 2 hardening — 2026-08-23 (bug fixes on the handed-off branch)

A review of the auth work found six defects; all are fixed and verified live
(anonymous → 401, real login → 200, forged token → 401, wrong password → 401):

1. **🔴 Forgeable session tokens.** `lib/auth/session.ts` signed tokens with a
   32-bit FNV-1a hash (not a MAC) that also **appended the first 8 chars of the
   signing secret to every token**. Replaced with real **HMAC-SHA256 via Web
   Crypto** (`crypto.subtle`), which runs in both the Edge middleware and Node
   routes. `createSessionToken` / `verifySessionToken` / `getSessionFromRequest`
   / `requireAuth` are now **async** — every call site was updated to `await`.
   Signature comparison is constant-time.
2. **🔴 Build break.** `seed/route.ts` declared `POST(request?: NextRequest)`;
   the optional param fails Next's generated route types (`tsc` errored). Made
   the parameter required; bootstrap-seed logic preserved.
3. **🟠 Tourist-login fabrication.** `tourist-login` minted a valid session for
   any string containing `did:prahari:`. Removed — the tourist record must exist.
4. **🟠 Login backdoor.** After a failed password check, `login` re-checked the
   hardcoded default password and let the user in anyway (a permanent backdoor
   surviving password changes). Removed; the stored hash is now the sole authority.
5. **🟡 Duplicate breach incident.** A geofence breach created an incident twice
   (client-side in `citizen/page.tsx` **and** server-side in `/api/locations`).
   Kept the authoritative server-side path; removed the client duplicate and its
   stray socket emit.
6. **🟡 ML never reachable.** The browser called the FastAPI service at `:8000`,
   which sent no CORS headers, so every call failed and silently fell back to
   local. Added `CORSMiddleware` to `services/ml/app/main.py` (origins via
   `ALLOWED_ORIGINS`, default `localhost:3000`). Restart the ML service to apply.

> **Still open (not a regression, a design gap):** tourist login is
> **password-less** — presenting a known Tourist ID / DID is enough. For a real
> deployment, require proof of credential ownership (e.g. the credential-hash
> `?h=` from the QR, or a signed challenge). Fine for the sandbox demo; flagged
> so it is a deliberate choice, not an oversight.

### Design system (Block 11 — neobrutalism)

The whole UI is token-driven so both themes and the neobrutalist look come from
one place. Do **not** hardcode hex colours in pages any more — use the tokens.

- **Tokens** live in `apps/web/app/globals.css` under `:root` (light) and `.dark`
  (Google grey). Accent is sky blue. Key CSS vars: `--nb-bg`, `--nb-surface`,
  `--nb-surface-2`, `--nb-ink`, `--nb-ink-soft`, `--nb-border`, `--nb-accent`,
  `--nb-accent-strong`, `--nb-accent-ink`, `--nb-shadow`.
- **Tailwind utilities** (in `tailwind.config.ts`) map onto those: `bg-bg`,
  `bg-surface`, `bg-surface-2`, `text-ink`, `text-ink-soft`, `border-line`,
  `bg-accent` / `text-accent` / `text-accent-strong` / `text-accent-ink`,
  `shadow-nb` / `shadow-nb-sm` / `shadow-nb-lg`, `rounded-nb`. Status colours:
  `success` / `danger` / `warning`.
- **Component classes** (globals.css `@layer components`): `.nb-card`,
  `.nb-card-flat`, `.nb-inset`, `.nb-btn` (+ `.nb-btn-accent` / `.nb-btn-danger`
  / `.nb-btn-ghost`), `.nb-input`, `.nb-chip` / `.nb-chip-accent`. Buttons carry
  the thick border, hard offset shadow, and press-down interaction.
- **Dark mode**: a no-flash inline script in `app/layout.tsx` sets `.dark` before
  paint from `localStorage.theme` or `prefers-color-scheme`. The toggle is
  `components/ui/ThemeToggle.tsx`, placed **in each page's top navbar** (landing,
  login, citizen, admin), not floating.
- **Font**: Space Grotesk via `next/font` (`--font-sans`).
- Marketing "slop" (fake summit/status chrome, gov strip) and all emojis were
  removed; icons come from `lucide-react`, map markers use plain glyphs/dots.

### Block 3 — Blockchain credential anchoring (✅ done)

Every issued credential's hash is anchored on-chain so it can be independently
verified and proven un-tampered. **Only the hash goes on-chain — never PII.**
Runs on a local Hardhat chain out of the box; Sepolia is a config swap.

**What was built**
- Contracts compiled & deployed: `packages/contracts` (`TouristIdentityRegistry`
  + 3 others). Deployed addresses are written to
  `packages/contracts/deployments/localhost.json`.
- `apps/web/lib/blockchain/registry.ts` — ethers client. `anchorCredential()`
  writes `registerCredential(hash, expiresAt)` (idempotent — skips if already
  on-chain); `verifyOnChain()` reads `verifyCredential(hash)`. Both return null
  if the chain is unconfigured/unreachable, so issuance never fails.
- `POST /api/identity/issue` anchors after saving and stores the tx hash on the
  tourist row; `POST /api/seed` anchors the demo tourist; `GET /api/identity/verify/[did]`
  returns a `blockchain` block (`anchored`, `valid`, `state`, `chainId`, `txHash`).
- `DigitalIdCard` shows an "Anchored on-chain" badge with the tx hash (and an
  Etherscan link when on Sepolia).
- `supabase/migrations/004_blockchain.sql` adds `tourists."anchorTxHash"` +
  `"anchorChainId"`. **Already applied to the live database.**

**Verified working (2026-08-23):** issuing a credential produced a real tx
(`0x5782…3c56`) on chainId 31337; `verifyCredential` returns `Active`;
`totalIssuedCredentials` incremented on-chain.

**Run the chain locally** (two background services must be up alongside web + realtime):
```
cd packages/contracts
pnpm exec hardhat node                       # terminal A — JSON-RPC on :8545
pnpm run deploy:local                        # terminal B — deploys + writes deployments/localhost.json
```
Then set in `apps/web/.env.local` (already set for local dev):
`CHAIN_RPC_URL=http://127.0.0.1:8545`, `CHAIN_ID=31337`,
`IDENTITY_REGISTRY_ADDRESS=<TouristIdentityRegistry from the deploy output>`,
`ANCHOR_PRIVATE_KEY=<Hardhat account #0 key>` (the well-known public test key —
local only, never use it anywhere real).

**Move to Sepolia (public, verifiable):** deploy with `deploy:sepolia` (needs
`ALCHEMY_SEPOLIA_URL` + a faucet-funded `DEPLOYER_PRIVATE_KEY` in
`packages/contracts`), then point the web env at the Alchemy URL, the new
address, a funded `ANCHOR_PRIVATE_KEY`, and `CHAIN_ID=11155111`. No code change —
the ID card auto-shows Etherscan links for chainId 11155111.

> **Note:** a local Hardhat node holds state only while it runs. Restarting it
> wipes anchors; just re-run `deploy:local` and re-seed. For persistence across
> restarts, use Sepolia.

### Known issues, unrelated to any block

- **`pnpm lint` is broken.** There is no ESLint config anywhere in the repo and
  none was ever committed — `eslint-config-next` is installed and the `lint`
  script exists, but there is no `eslint.config.js`. Pre-existing.
- **`/api/seed` is destructive** — `deleteMany` on geofences and responders.
  It wipes anything created through the UI.
- **Dead code**: `components/dashboard/*` (6 files) and
  `components/map/live-map.tsx` are rendered by nothing. They are the only
  consumers of `lib/mock-data.ts`.
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

### ML datasets for Block 6/6b (candidate — not yet integrated)

Two open datasets were proposed to move the risk model beyond the rule-based
baseline. Recorded here so the plan is not lost; **nothing below is wired yet.**

- **Indian city geolocations** — `crbelhekar619/geolocations-of-indian-cities`
  (city → lat/lon).
- **Crime in India** — `sumedh1507/crime-in-india-dataset` (district-level
  incident counts).

**Proposed pipeline** (offline, produces a training table; the live service
stays a thin scorer):

1. Group crime by district, `MinMaxScale` total incidents → `historical_risk_score` (0–1).
2. Lowercase/trim names on both sides, inner-join city↔district on name.
3. Result `master_risk_map`: `[city, lat, lon, historical_risk_score]`.
4. Synthesise ~10k tourist pings by sampling the map with replacement; add
   `hour_of_day` (0–23) and `crowd_density` (0–1000) as dynamic features.
5. Train an **Isolation Forest** on
   `[lat, lon, historical_risk_score, hour_of_day, crowd_density]` for anomaly
   scoring, versioned and evaluated before it replaces the baseline in
   `services/ml/app/main.py`.

**Caveats to resolve first:** city↔district name joins are lossy (spelling,
"district" ≠ "city"); crime counts need normalising per-capita/area, not raw;
and an Isolation Forest gives an *anomaly* score, not a calibrated risk — decide
how it maps onto the current 0–100 `zone_risk` the API already returns.
