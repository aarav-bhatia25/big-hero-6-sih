# 🛡️ Prahari (Big Hero 6) — Master Architectural Blueprint & Technical Documentation

Welcome to the **Prahari Tourist Safety Platform** (`big-hero-6-sih`) master architectural documentation and execution blueprint.

This document serves as the single source of truth for the system architecture, pnpm monorepo layout, data flows, database schemas, machine learning risk engines, real-time WebSocket gateways, Sepolia smart contracts, and phased execution roadmap.

---

## 📐 1. Monorepo Directory Layout

The platform is organized as a high-performance `pnpm` workspace monorepo (`big-hero-6-sih`):

```text
big-hero-6-sih/
│
├── DOCUMENTATION.md           # 👈 Complete architecture, data flow & execution blueprint
├── README.md                  # Quickstart guide & environment setup instructions
├── package.json               # Root workspace manifest (scripts: dev, build, lint, etc.)
├── pnpm-workspace.yaml        # Workspace configuration (apps/*, packages/*)
├── pnpm-lock.yaml             # Lockfile for reproducible builds
│
├── apps/
│   ├── web/                   # Next.js 15 App Router Frontend (Traveller App & Authority Command Center)
│   │   ├── app/               # Pages & API Route Handlers
│   │   │   ├── authority/     # Authority Command Center Dashboard (Live Map, Incident Dispatch Queue)
│   │   │   ├── tourist/       # Mobile-first Traveller App (Digital ID, SOS, Safe Navigation)
│   │   │   ├── sos/           # One-Tap Dedicated Emergency Panic Trigger View
│   │   │   ├── onboarding/    # Tourist Digital Passport Registration & Consent Flow
│   │   │   ├── api/           # REST API endpoints
│   │   │   │   ├── geofences/ # Safe zone & hazard polygon CRUD endpoints
│   │   │   │   ├── incidents/ # Incident lifecycle management & emergency dispatch triggers
│   │   │   │   ├── locations/ # GPS telemetry ingestion & spatial tracking
│   │   │   │   ├── tourists/  # Tourist identity profiles & DID credential queries
│   │   │   │   ├── health/    # Service health check endpoint
│   │   │   │   └── seed/      # Database mock data seeder
│   │   │   ├── globals.css    # Tailwind CSS design system tokens & glassmorphism utilities
│   │   │   └── page.tsx       # District Command Center main view
│   │   ├── components/        # Reusable React UI Components
│   │   │   ├── authority/     # Incident Queue, Detail Modal, Responder Trackers
│   │   │   ├── dashboard/     # Sidebar, Header, Metric Cards, Risk Zones Panel
│   │   │   ├── map/           # MapLibre GL & Leaflet OpenStreetMap live renderers
│   │   │   ├── traveller/     # SOS Button, Digital ID Card, Risk Gauge
│   │   │   └── ui/            # Radix UI primitives (Button, Card, Badge, Modal)
│   │   └── lib/               # Shared utilities, database pooling, models & risk engines
│   │       ├── db.ts          # MongoDB connection pooling & collection getters
│   │       ├── mongodb.ts     # Mongoose connection client
│   │       ├── geospatial.ts  # Turf.js point-in-polygon & spatial calculations
│   │       ├── risk.ts        # Deterministic multi-factor risk scoring engine
│   │       ├── socketClient.ts# Socket.IO client event handler
│   │       ├── models/        # Mongoose Models (Tourist, Location, Geofence, Incident, Responder)
│   │       └── services/      # Dispatch engine & Digital ID QR code generators
│   │
│   └── realtime/              # Node.js + Express + Socket.IO Event Gateway
│       ├── src/
│       │   └── index.js       # WebSocket event broker (tourist:location, incident:create, incident:update)
│       └── package.json       # Service manifest
│
├── services/
│   └── ml/                    # Python 3.11 + FastAPI + scikit-learn Machine Learning Service
│       ├── app/
│       │   └── main.py        # Anomaly scoring REST API (`POST /risk-score`, `GET /health`)
│       └── requirements.txt   # FastAPI, Uvicorn, Scikit-Learn, Pydantic dependencies
│
└── packages/
    └── contracts/             # Solidity Smart Contracts (Ethereum Sepolia Audit Ledger)
        ├── contracts/         # Smart contracts source code
        │   ├── IncidentRegistry.sol        # Tamper-proof on-chain incident audit log
        │   ├── GeofenceRegistry.sol        # Government-published boundary registry
        │   ├── ResponderRegistry.sol       # Verified emergency unit registry
        │   ├── TouristIdentityRegistry.sol # Verifiable credential status registry
        │   └── TouristIdentity.sol         # Identity token definitions
        ├── scripts/           # Deployment & interaction scripts (deploy.ts)
        ├── test/              # Hardhat unit tests
        ├── hardhat.config.ts  # Hardhat compiler & Sepolia network configuration
        └── package.json       # Contracts package manifest
```

---

## 🏗️ 2. High-Level Architecture Diagram

```text
                    ┌────────────────────────┐
                    │  Tourist Mobile App    │
                    │   (Next.js App Router) │
                    └───────────┬────────────┘
                                │
                    HTTPS / WSS (Socket.IO)
                                │
                                ▼
               ┌─────────────────────────────────┐
               │    PRAHARI WEB FRONTEND APP     │
               │         (@prahari/web)          │
               │                                 │
               │  - Route Handlers               │
               │  - Turf.js Geofence Engine      │
               │  - Deterministic Risk Engine    │
               │  - Emergency Dispatch Matching  │
               └────────┬───────┬───────┬────────┘
                        │       │       │
              ┌─────────┘       │       └──────────┐
              ▼                 ▼                  ▼
      ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐
      │ MongoDB Atlas │ │ Realtime WS   │ │ Python FastAPI ML │
      │ Database      │ │ Server        │ │ Anomaly Engine    │
      │ (Mongoose)    │ │ (@prahari/    │ │ (services/ml)     │
      │               │ │  realtime)    │ │                   │
      └───────────────┘ └───────────────┘ └───────────────────┘
                                                 │
                                                 ▼
                                        ┌───────────────────┐
                                        │ Ethereum Sepolia  │
                                        │ Audit Ledger      │
                                        │ (@prahari/        │
                                        │  contracts)       │
                                        └───────────────────┘
```

---

## 🗺️ 3. Phased Implementation Plan (v0.1 → v2.0)

| Milestone | Stage Name | Core Focus | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **v0.1** | Setup & DB | Monorepo Foundation | pnpm workspace setup, MongoDB collection client (`lib/db.ts`) |
| **v0.2** | Tourist Auth | Identity & Sessions | Role-based access control (`tourist`, `authority`, `responder`, `admin`) |
| **v0.3** | Digital Tourist ID | Mock Verifiable ID | `DTI-IND-XXXXXX` JSON schema, QR Code generator (`did:tourist:...`) |
| **v0.4** | Maps & GPS | Telemetry Tracking | MapLibre GL + OpenStreetMap layer, continuous GPS location logging |
| **v0.5** | Geofence Engine | Spatial Safety | Turf.js `booleanPointInPolygon` checks against registered danger zones |
| **v0.6** | 🚨 Panic Button | Emergency SOS | One-tap SOS trigger (`POST /api/incidents`), automated dispatcher alert |
| **v0.7** | Command Dashboard | Authority Center | Command Center UI with live map, incident queue, responder trackers |
| **v0.8** | Realtime WebSockets | Event Streaming | Socket.IO gateway (`tourist:location`, `incident:create` events) |
| **v0.9** | Risk Engine (Rules) | Dynamic Safety Score | Deterministic score formula (0-100) combining geofence, time, & hazards |
| **v1.0** | **Working Monorepo MVP** | Hackathon Milestone | End-to-end working monorepo from Tourist SOS to Authority Dispatch |
| **v1.1** | Anomaly Engine | FastAPI ML Model | Telemetry feature extraction & Isolation Forest anomaly scoring |
| **v1.2** | Disaster Feeds | Weather & Hazards | Ingest IMD/NDMA disaster warning polygons (floods, landslides) |
| **v1.3** | Multilingual Voice | Accessibility | Speech recognition & emergency intent classification |
| **v1.4** | Sepolia Audit Log | Blockchain Hashing | SHA-256 incident evidence hashing anchored to Ethereum Sepolia |
| **v1.5** | E-FIR & Visual AI | Investigation Tools | Draft E-FIR generator with officer review + visual outfit profiles |
| **v2.0** | Production Hardening | Security & Compliance | TTL auto-purging, access audit logs, permission enforcement |

---

## 🔬 4. Detailed Feature Specifications

### 🆔 Phase 1: Digital Tourist ID (v0.3)
Prevents fake emergency reports while preserving tourist privacy through Decentralized Identifiers (DIDs).

* **Mock Payload Schema**:
  ```json
  {
    "touristId": "DTI-IND-000123",
    "name": "Demo Tourist",
    "nationality": "India",
    "verified": true,
    "did": "did:tourist:DTI-IND-000123",
    "issueDate": "2026-08-22"
  }
  ```
* **QR Code Format**: Encodes Decentralized Identifier string: `did:tourist:DTI-IND-000123`
* **Verification Flow**: Scanned by safety officers -> Queries `/api/tourists/DTI-IND-000123` -> Validates active status and emergency contacts.

---

### 🗺️ Phase 2: Interactive Map & Telemetry Pipeline (v0.4)
Renders a live vector map displaying tourist positions, high-risk danger zones, active incidents, and patrol units.

* **Tech Stack**: MapLibre GL JS + Leaflet + OpenStreetMap tiles + Turf.js.
* **Map Layer Elements**:
  - 🟢 **Tourist Marker**: Live location of monitored traveller.
  - 🔴 **High-Risk Zones**: Polygon overlays indicating restricted/hazardous areas.
  - 🟠 **Active Incidents**: Incident markers with severity pulses.
  - 🚓 **Responders**: Live positions of assigned police, medical, and SAR patrol units.

---

### 🎯 Phase 3: Turf.js Geofence Engine (v0.5)
Evaluates whether GPS coordinates intersect with active restricted or hazard zones.

```text
Tourist GPS Coordinates
          ↓
Turf.js Point Object
          ↓
Turf.js booleanPointInPolygon(point, geofencePolygon)
          ↓
     [INSIDE?]
     /       \
   YES        NO
    ↓          ↓
- Increase Risk Score (+30)
- Trigger Danger Alert Banner
- Broadcast Geofence Breach to Authority
```

---

### 🚨 Phase 4: Emergency SOS Panic Trigger (v0.6)
The primary emergency trigger mechanism.

* **API Endpoint**: `POST /api/incidents`
* **Request Payload**:
  ```json
  {
    "type": "PANIC",
    "touristId": "DTI-IND-000123",
    "location": { "lat": 19.0760, "lng": 72.8777 },
    "severity": "CRITICAL",
    "status": "ACTIVE"
  }
  ```
* **Cascade Actions**:
  1. Create `Incident` record in MongoDB.
  2. Execute `findNearestResponder()` using geodesic distance calculations.
  3. Emit `incident:create` event via Socket.IO gateway.
  4. Flash incident card and highlight emergency route on Command Center dashboard.

---

### 🧮 Phase 5: Deterministic Risk Engine (v0.9)
Calculates a numerical risk score (0-100) using a transparent rule-based algorithm:

$$\text{Risk Score} = \text{Geofence Risk} + \text{Time Risk} + \text{Crime Density} + \text{Route Anomaly} + \text{Disaster Warning}$$

* **Risk Tiers**:
  - `0 – 30`: 🟢 **LOW**
  - `31 – 60`: 🟡 **MODERATE**
  - `61 – 80`: 🟠 **HIGH**
  - `81 – 100`: 🔴 **CRITICAL**

---

### 🤖 Phase 6: Machine Learning Risk Service (`services/ml`) (v1.1)
FastAPI service calculating movement pattern anomaly scores and risk classification.

* **Endpoint**: `POST http://localhost:8000/risk-score`
* **Request Payload**:
  ```json
  {
    "route_deviation_m": 150.0,
    "inactivity_minutes": 25.0,
    "zone_risk": 40.0,
    "hour_of_day": 23
  }
  ```
* **Response**:
  ```json
  {
    "score": 88,
    "level": "critical",
    "requires_human_review": true
  }
  ```

---

### ⛓️ Phase 7: Sepolia Smart Contracts Audit Ledger (`packages/contracts`) (v1.4)
Preserves incident evidence and geofence integrity without storing sensitive personal identity data on-chain.

* **Architecture Rule**: **Never store raw personal data or unencrypted GPS coordinates on Ethereum.**
* **Contracts**:
  1. `IncidentRegistry.sol`: Stores cryptographic incident hashes (`SHA256`) and lifecycle state transitions (`Reported`, `Dispatched`, `Resolved`, `Audited`).
  2. `GeofenceRegistry.sol`: On-chain registry for government-published hazard boundaries.
  3. `ResponderRegistry.sol`: Directory for verifying accredited emergency responder units.
  4. `TouristIdentityRegistry.sol`: On-chain verifiable credential status tracker (`Active`, `Suspended`, `Revoked`).
  5. `TouristIdentity.sol`: Identity token contracts.

---

## 🗄️ 5. Core Database Models (MongoDB / Mongoose Collections)

The database architecture consists of 5 core collections:

### 1. `tourists` Collection
- `touristId`: Unique string identifier (e.g. `DTI-IND-000123`)
- `name`: Full name of traveller
- `nationality`: Country of origin
- `identityStatus`: Verification state (`verified`, `pending`, `flagged`, `revoked`)
- `emergencyContacts`: Array of `{ name, phone, relationship }`
- `accommodation`: Object `{ hotelName, address, city }`
- `preferences`: Object `{ language, notificationMode, medicalNotes }`
- `trackingConsent`: Boolean flag
- `status`: Safety state (`SAFE`, `WARN`, `SOS`)
- `riskScore`: Numerical risk rating (0-100)

### 2. `locations` Collection
- `touristId`: Reference tourist ID
- `coordinates`: Coordinates object `{ lat, lng }`
- `accuracy`: Accuracy in meters
- `source`: Telemetry source (`gps`, `cellular`, `manual`)
- `speed`: Speed in km/h
- `batteryLevel`: Device battery level percentage
- `timestamp`: Date timestamp

### 3. `geofences` Collection
- `name`: Boundary title
- `type`: Classification (`safe_zone`, `restricted`, `high_risk`, `hazard`)
- `geometry`: GeoJSON object `{ type: "Polygon", coordinates: [...] }`
- `severity`: Level (`low`, `medium`, `high`, `critical`)
- `active`: Boolean status
- `metadata`: `{ description, advisoryMsg, speedLimit, radius }`

### 4. `incidents` Collection
- `incidentId`: Unique ticket ID (e.g. `INC-1724320000`)
- `touristId`: Reference tourist ID
- `type`: Incident category (`SOS`, `PANIC`, `geofence_breach`, `medical`, `HAZARD`)
- `status`: Lifecycle state (`new`, `assigned`, `in_progress`, `resolved`, `ACTIVE`, `DISPATCHED`)
- `location`: Location object `{ lat, lng, address }`
- `severity`: Level (`low`, `medium`, `high`, `critical`)
- `riskScore`: Calculated risk score
- `assignedResponderUnitId`: Assigned patrol unit
- `etaMinutes`: Calculated arrival time

### 5. `responders` Collection
- `responderId`: Unique unit ID (e.g. `RESP-POLICE-01`)
- `unitId`: Display unit tag (e.g. `Unit #17`)
- `department`: Division (`Police`, `Medical`, `Search & Rescue`, `Tourism Patrol`)
- `location`: Current coordinates `{ lat, lng }`
- `status`: Operating status (`available`, `dispatched`, `off_duty`)
- `capabilities`: Array of unit capabilities

---

## ⚡ 6. Realtime WebSocket Gateway (`apps/realtime`)

The real-time service coordinates bi-directional communication between travellers and the district command center.

* **Port**: `3001` (configurable via `SOCKET_PORT`)
* **Events Overview**:
  - `tourist:location`: Broadcasts live GPS telemetry updates across connected maps.
  - `incident:create`: Broadcasts new emergency SOS triggers to all authority command dashboards.
  - `incident:update`: Broadcasts dispatch status changes and responder assignments.

---

## 🧪 7. Verification & Test Suite Matrix

| Test ID | Scenario | Verification Procedure | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **TEST-01** | Normal Movement | Tourist moves inside designated safe zone | Risk score remains Low (🟢), no alerts generated |
| **TEST-02** | Geofence Breach | Tourist crosses into high-risk zone polygon | Push warning triggered, map flashes red, risk score updates (+30) |
| **TEST-03** | SOS Panic Trigger | Tap 🚨 SOS button on Tourist app | `POST /api/incidents` succeeds, WebSocket emits `incident:create`, command center alert plays |
| **TEST-04** | Responder Dispatch | Authority clicks DISPATCH on active incident | Nearest responder assigned, ETA computed, status changed to `DISPATCHED` |
| **TEST-05** | ML Risk API | Query `POST /risk-score` on `services/ml` | Returns JSON risk score and `requires_human_review` flag |
| **TEST-06** | Sepolia Smart Contract | Execute `registerGeofence()` or `anchorIncident()` | Hardhat posts transaction hash to Sepolia testnet |
| **TEST-07** | Monorepo Build | Run `pnpm build` at monorepo root | All apps (`web`, `realtime`) and packages (`contracts`) compile with zero errors |

---

*Maintained by the Prahari Engineering Team (Big Hero 6).*
