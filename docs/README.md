# Prahari documentation

Prahari is a consent-first tourist-safety prototype. It gives travellers a sandbox-verified Digital Tourist ID, an opt-in safety dashboard, emergency reporting, authorised operational review, and offline safety information.

## Read this first

- [Project overview and scope](PROJECT_OVERVIEW.md) — what the product does today and what it deliberately does not claim.
- [Architecture](ARCHITECTURE.md) — the browser, API, database, notification, identity, and optional offline-delivery flows.
- [Local setup and operations](SETUP.md) — environment variables, migrations, health checks, and verification commands.
- [Evaluation and demo guide](DEMO_GUIDE.md) — a truthful five-minute product walkthrough.
- [Optional BLE relay](BLE_OPTIONAL_RELAY.md) — only for an internet-free relay scenario; normal Wi-Fi/mobile-data use does not need it.
- [BLE relay wire protocol](ble-relay-gateway-protocol.md) — implementation-level GATT framing for the optional hardware gateway.

## The delivery rule

When a traveller has Wi-Fi or mobile data, an SOS is sent directly from the authenticated browser to `/api/incidents`. The route records the incident, attempts configured emergency-contact email, and emits an authority update. Bluetooth is not required for any normal product flow.

If the browser has no internet, the SOS is retained in the browser’s local retry queue. A separately provisioned BLE gateway may be enabled as an optional extra offline handoff, but it is not a phone-to-phone mesh and a BLE acknowledgement is not an authority or emergency-service receipt.

## Repository map

```text
apps/web/             Next.js traveller, onboarding, and authority application
packages/contracts/   Solidity registries and deployment scripts
supabase/             schema, migrations, and Realtime policies
tools/ble-gateway/    optional Linux/Raspberry Pi relay gateway
docs/                 product, setup, architecture, and demo documentation
```
