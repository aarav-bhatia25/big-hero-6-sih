# Project overview and boundaries

## What Prahari does

Prahari brings together these consent-led workflows for travellers and authorised operational users:

1. **Digital Tourist ID** — Aadhaar checksum + sandbox OTP for Indian citizens, or ICAO passport-MRZ validation for foreign nationals. A W3C-style signed credential is issued with a `did:prahari:` identifier and QR verification page.
2. **Safety dashboard** — with explicit location consent, browser GPS is stored and evaluated against authority-published geofences, official NDMA SACHET hazard data, and deterministic safety signals.
3. **Emergency assistance** — a GPS-backed SOS is written to the application incident queue, optional emergency-contact email is attempted through Resend, and authorised users can review, dispatch, resolve, and communicate about it.
4. **Offline preparation** — travellers can save a regional safety pack with places, emergency services, and guidance; licensed/approved map tiles are optional.
5. **Accessible multilingual support** — Sarvam AI supports Indic-language translation, authority incident briefs, transcription, and speech playback where configured. Browser tools support selected international languages.
6. **Emergency identification profile** — a traveller can supply clothing notes or a photo; the server creates a constrained description of visible attire and belongings for an active authorised case.
7. **Missing-person and report drafts** — factual drafts use verified records for authorised review. They are not a police FIR receipt or a filing with any government system.

## What works end to end on Wi-Fi or mobile data

The standard flow needs a browser, an authenticated session, location permission for location-bearing SOS, the Next.js API, and the configured database. It does **not** need Web Bluetooth, a paired gateway, or any BLE hardware.

```text
Traveller browser
  └─ SOS with current GPS
       └─ authenticated POST /api/incidents
            ├─ durable incident record in Supabase
            ├─ attempted Resend emergency-contact email
            └─ authority update through Realtime or the 15-second refresh fallback
```

The authority dashboard reads the same durable records. Realtime is an enhancement: if Broadcast cannot be verified, the dashboard continues with authenticated polling.

## Important limitations

- KYC is a sandbox validation flow. It is not UIDAI, passport-provider, immigration, or government identity verification.
- The Digital Tourist ID is an application credential, not a government-recognised identity document.
- Sepolia anchoring records a hash/commitment only. It does not place KYC, contacts, location, or identity documents on-chain.
- Safety scoring is explainable rule/signal analysis, not a trained model and not a crime prediction tool. It never automatically dispatches police.
- An SOS creates an application incident and can attempt email to registered contacts. It is not a connection to 112, police CAD, CCTNS, or a government control room.
- A missing-person or E-FIR-style draft is a factual aid for human review. The relevant State/UT police authority determines the required process, signature, and any formal record.
- A Resend acceptance status proves only that the provider accepted the request; it does not prove inbox delivery.
- Offline map tiles require a provider that explicitly permits offline caching. Public OpenStreetMap tiles must not be bulk-cached.

## Data and access principles

- Location sharing is opt-in and may be paused by the traveller.
- An authority record is visible through authenticated case workflows only.
- Server-side secrets such as Supabase service keys, deployment keys, Resend, Sarvam, OpenAI, and gateway credentials must never be exposed as `NEXT_PUBLIC_*` values.
- Emergency identification output is constrained to observed clothing and belongings. It is not identity verification and must not infer sensitive personal traits.

## Optional BLE relay

BLE is a separately provisioned offline enhancement. It is never needed for onboarding, sign-in, identity issuance, map packs, hazard alerts, normal SOS delivery, email alerts, authority review, translation, or blockchain verification. See [the optional relay guide](BLE_OPTIONAL_RELAY.md) only if demonstrating a no-internet relay scenario.
