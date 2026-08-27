# Architecture

## Main components

```text
Traveller browser                         Authority browser
  ├─ onboarding + Digital Tourist ID        ├─ incident queue and operations map
  ├─ consented GPS + safety dashboard       ├─ human review, dispatch, case chat
  ├─ SOS, local retry queue, offline pack   └─ Realtime subscription or polling fallback
  └─ multilingual and accessibility tools
                    │                                  │
                    └──────── Next.js route handlers ──┘
                                      │
     ┌────────────────────────────────┼─────────────────────────────────┐
     │                                │                                 │
Supabase Postgres                Server-only providers             Ethereum Sepolia
tourists, locations,             Resend, Sarvam AI,                identity/evidence
incidents, geofences,            OpenAI, NDMA SACHET               commitments only
messages, credential state       and optional map provider
```

## Identity flow

1. The browser submits either sandbox Aadhaar input or passport MRZ input.
2. The server validates format/check digits, starts a short-lived verification session, and verifies the sandbox OTP where applicable.
3. `/api/identity/issue` creates the protected tourist record, signs a credential, and optionally anchors its hash with the server-custodied deployment key.
4. The QR verification page validates the credential signature and can check the configured registry hash.

The wallet used for blockchain anchoring is a server deployment wallet. A traveller does not need MetaMask or a private key to use Prahari.

## Online SOS flow

1. `SosButton` obtains a supplied or browser GPS coordinate; it never substitutes a demo coordinate.
2. `SOSTransportManager` sends the packet directly with `InternetTransport` to `/api/incidents`.
3. The route checks the signed-in traveller/session, validates the location, deduplicates the incident ID, writes the durable record, and finds only genuinely registered available responders.
4. The route attempts configured emergency-contact email and emits an update to the authority channel.
5. The authority dashboard receives a verified Broadcast when available, otherwise refreshes from the same authenticated API every 15 seconds.

`InternetTransport` is always first. The BLE module is dynamically loaded only after an internet failure and only if the traveller explicitly opted into a paired gateway.

## Internet-free SOS behavior

```text
No browser internet
  ├─ optional paired BLE gateway enabled → gateway may accept a packet for later uplink
  └─ otherwise → browser IndexedDB retry queue → direct Internet POST on reconnect
```

The local queue is device/browser storage, not an authority receipt. A BLE gateway acknowledgement only proves the gateway saved the packet. The authority queue changes only after a durable API write succeeds.

## Safety, hazards, and maps

- `apps/web/app/api/locations/route.ts` stores consented pings and invokes deterministic signal analysis.
- `apps/web/lib/safetyRisk.ts` provides auditable inputs and contributions, including configured geofences, GPS quality, timing, route deviation when an itinerary exists, and official hazard context.
- `apps/web/lib/services/indiaHazards.ts` retrieves and caches official NDMA SACHET advisories. A stale or unavailable result is clearly labelled rather than treated as all-clear.
- The offline safety pack remains useful even if a base-map tile provider is not configured.

## Key code locations

| Concern | Location |
| --- | --- |
| Traveller experience | `apps/web/app/citizen/page.tsx` |
| Authority experience | `apps/web/app/admin/page.tsx` |
| Identity onboarding | `apps/web/app/onboarding/page.tsx` |
| Direct SOS API | `apps/web/app/api/incidents/route.ts` |
| SOS transport and local queue | `apps/web/lib/sos-mesh/` |
| Optional BLE relay gateway | `tools/ble-gateway/` |
| Notifications | `apps/web/lib/services/emergencyNotifications.ts` |
| Language/voice support | `apps/web/lib/services/multilingualCommunication.ts` |
| Database readiness | `apps/web/lib/supabase.ts` and `/api/health` |
| Database migrations | `supabase/migrations/` |
