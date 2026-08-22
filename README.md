# Prahari

Prahari is a predictive tourist safety platform for India. This repository is a monorepo starter containing the Next.js traveller and authority dashboard, a Socket.IO gateway, an ML risk service, and Sepolia smart contracts.

## Workspace layout

```text
apps/web/             Next.js frontend (traveller + authority views)
apps/realtime/        Node.js + Socket.IO event gateway
services/ml/          FastAPI + scikit-learn risk scoring service
packages/contracts/   Solidity contracts and Hardhat deployment setup
```

## Quick start

1. Install Node.js 20.9+ and Python 3.11+.
2. Copy `.env.example` to `.env` and fill in the values you need.
3. Run `pnpm install` at the repository root, then `pnpm dev`.
4. Open `http://localhost:3000` for the authority dashboard or `/sos` for the traveller safety view.

## Key environment variables

- `NEXT_PUBLIC_MAPTILER_KEY`: optional MapTiler key for a production basemap. The UI uses OpenFreeMap by default.
- `MONGODB_URI`: MongoDB connection string.
- `NEXT_PUBLIC_SOCKET_URL`: Socket.IO service URL (defaults to `http://localhost:3001`).
- `ALCHEMY_SEPOLIA_URL`, `DEPLOYER_PRIVATE_KEY`: required only when deploying contracts to Sepolia. Never expose the private key in frontend variables.

## Development commands

```bash
pnpm dev                 # web + realtime service
pnpm dev:web             # frontend only
pnpm dev:socket          # Socket.IO only
pnpm lint
pnpm contract:compile
pnpm ml:dev
```

## What is scaffolded

- Responsive authority dashboard, live map, incident queue, risk-area panel, traveller SOS screen, and onboarding flow.
- Typed frontend models and mock data, ready to replace with MongoDB/API results.
- A Socket.IO event contract for location and incident updates.
- A minimal FastAPI/scikit-learn-compatible risk endpoint.
- An access-controlled, hash-only incident-anchor contract. Keep identity data off-chain; store only consented credential or incident hashes.

## Recommended next steps

1. Add Clerk/Auth.js or your government SSO provider with roles: tourist, responder, authority, admin.
2. Replace `lib/mock-data.ts` with protected route handlers backed by MongoDB.
3. Feed anonymised movement features to `services/ml`, and keep a human confirmation step before dispatch.
4. Use a hosted tile provider and HTTPS/WSS in production.
5. Complete a threat model, consent flows, retention policy, and an independent security review before handling real identity/location data.
