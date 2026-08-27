# Online E2E test log

**Date:** 2026-08-27  
**Scope:** Browser-led testing on `http://localhost:3001`; BLE pairing/relay intentionally excluded.

All records below use the application's sandbox identity flow and fictional test data. No real identity document, emergency-contact recipient, microphone recording, or newly granted browser permission was used.

| Area | Result | Evidence / follow-up |
| --- | --- | --- |
| Aadhaar sandbox OTP | Pass | An incorrect OTP was rejected with remaining-attempt feedback; the correct sandbox OTP completed verification. |
| Passport MRZ onboarding | Pass | The ICAO specimen path reached consent, issued a separate Digital Tourist ID, and completed chain anchoring. |
| Consent, map-area selection, and issuance | Pass | A custom offline-map point and 10 km radius were selectable before issuance. |
| Digital ID and blockchain anchor | Pass | The traveller dashboard displayed an active credential and a Sepolia transaction. The public verification screen confirmed the signed credential was active without exposing protected profile data. |
| QR credential | Pass | The dashboard rendered a QR code; its public verification route showed active status and the hash-only blockchain anchor. |
| AI emergency identification profile | Pass | A fictional clothing description was accepted and saved as a structured, authority-restricted emergency profile. |
| Official hazard lookup | Pass | The dashboard evaluated the previously consented browser location and returned the NDMA SACHET no-match state. No new browser location permission was granted during this run. |
| Offline area-pack download | Pass with configuration caveat | The browser generated and downloaded a portable safety-map JSON backup containing 100 nearby places/services and guidance. Base-map tiles were correctly reported as unavailable because no licensed offline tile template is configured. |
| Voice-assistance entry point | Pass with permission boundary | The Sarvam-powered voice panel opens and presents the selected-language workflow. Recording was not started because that would request microphone access and send audio for transcription. |
| Authority authentication and dashboard | Pass | A separately authenticated authority session loaded the live dashboard, operational counts, map, and incident queue. |
| Role/session guards | Pass | A tourist requesting an authority redirect is returned to the citizen hub rather than left in a staff-only loop. The authority and citizen pages now re-check their role before refreshing protected data. |
| Authority geofence publication | Not completed | Safari and Chrome both rendered the form, but the Computer Use bridge mis-targeted or could not focus its multiline coordinate control. Each unsaved form was cancelled; no geofence was published. This is an automation limitation, not a verified product result. Manually paste three coordinate pairs and publish/deactivate one offshore test boundary to finish this browser test. |
| Direct online SOS and cancellation | Pass | With explicit owner approval, a fictional traveller shared the browser's current GPS with the local Prahari authority queue over the `INTERNET` path. The authority desk received `INC-5611`; the tourist then cancelled that synthetic alert, and it disappeared from the live incident count. BLE was not involved. |
| Authority traveller watch table | Pass | The desk now lists consented traveller name/ID, precise last shared coordinates, freshness, profile availability, and case status. Full clothing detail is visible only while that traveller has an active case; it returned to “Profile on file” after the synthetic case was cancelled. |
| Authority incident record and emergency identification | Pass | The authorised case view displayed the delivery provenance, location history, verified identity status, and the structured fictional clothing profile. |
| Sarvam AI incident brief | Pass after fix | An initial response could truncate before completing the strict JSON schema. The response budget was increased to 1,000 tokens and the prompt capped the display text. A subsequent live brief correctly included the authorised latitude/longitude, cancelled status, and uncertainty list. |
| Missing-person information draft | Pass | The authority case generated a factual missing-person information draft. It explicitly states that it is not filed with police and needs authorised fact verification and the appropriate State/UT process. |
| Police-ready report review | Pass | A fictional, explicitly labelled test report was saved as `NOT_FILED_WITH_POLICE`, appeared in the authority queue with masked identity reference and consented coordinates, and was marked reviewed. |
| Authority-to-traveller multilingual message | Pass | A harmless Hindi test message was translated to English through Sarvam, saved to the protected command record, and received in the traveller dashboard with both original and delivered text. |
| Emergency email delivery | Awaiting recipient | Email delivery is configured, but no test recipient was supplied; no alert was sent to avoid contacting an unintended person. |

## Fixes made while testing

- The authority workspace now checks the current session before every refresh and redirects to sign-in if a different role replaces the shared browser session in another tab.
- The login page no longer sends a tourist back to a staff-only redirect URL, avoiding a stale-session redirect loop.
- The tourist dashboard now validates the active role before loading traveller data, so expired or staff sessions cannot leave a blank citizen dashboard behind.
- The authority workspace now has a consent-based traveller watch table. It exposes precise location only for travellers who have opted in and gates full emergency-identification detail behind an active case.
- Sarvam structured incident briefs now have sufficient completion budget and concise output limits, preventing valid JSON from being cut off before the final required field.

## Code checks

- `npm --prefix apps/web run lint` and `git diff --check` passed after the authority-table and Sarvam brief fixes.

## Required offline-map setup

The non-map safety pack works with the current configuration. To include navigable base-map tiles offline, configure `NEXT_PUBLIC_OFFLINE_TILE_TEMPLATE` with a licensed provider that explicitly permits offline caching. Do **not** bulk-download public OpenStreetMap tiles.
