# 🛡️ Prahari (Big Hero 6) — Comprehensive Technical Architecture Specification & Implementation Guide

Welcome to the master technical specification for **Prahari** (`big-hero-6-sih`), an AI-powered tourist safety, spatial monitoring, emergency response, and blockchain identity platform designed for Indian tourism districts.

This document contains full engineering specifications, codebase directory maps, data flow sequence diagrams, exact mathematical formulas, Mongoose schemas, Solidity smart contract code contracts, Socket.IO event payloads, and deployment procedures.

---

## 1. System Architecture & Workspace Directory Layout

Prahari is structured as a high-performance `pnpm` monorepo workspace containing four main modules:

```text
big-hero-6-sih/
│
├── DOCUMENTATION.md                # 👈 Comprehensive technical specification & API blueprint
├── README.md                       # Quickstart commands & developer onboarding
├── package.json                    # Monorepo root workspace configuration & scripts
├── pnpm-workspace.yaml             # Workspace definitions (apps/*, packages/*)
├── .env / .env.local               # Environment variables (MongoDB URI, Socket URL, RPCs)
│
├── apps/
│   ├── web/                        # Next.js 15 App Router Full-Stack Application (@prahari/web)
│   │   ├── app/                    # Pages & Route Handlers
│   │   │   ├── page.tsx            # Official Govt of India Landing Portal
│   │   │   ├── citizen/page.tsx    # Citizen & Tourist Safety Hub (/citizen & /tourist)
│   │   │   ├── admin/page.tsx      # Authority Command Dashboard (/admin & /authority)
│   │   │   ├── dir/page.tsx        # Redirect alias to /citizen
│   │   │   ├── onboarding/page.tsx # Tourist Digital Identity & Passport Registration
│   │   │   ├── sos/page.tsx        # Standalone SOS Panic Trigger screen
│   │   │   └── api/                # REST API Route Handlers
│   │   │       ├── geofences/      # GET / POST geofence boundaries
│   │   │       ├── incidents/      # GET / POST emergency SOS & responder dispatch
│   │   │       ├── locations/      # GET / POST GPS telemetry logging
│   │   │       ├── tourists/       # GET tourist identity profiles & DID lookup
│   │   │       ├── efir/           # GET / POST automated draft E-FIR complaints
│   │   │       ├── attire/         # GET / POST AI visual clothing profiles
│   │   │       ├── health/         # Health check endpoint
│   │   │       └── seed/           # Database initial seeder script
│   │   │
│   │   ├── components/             # React UI Component Hierarchy
│   │   │   ├── authority/          # Incident Queue, Detail Modal, Responder Trackers
│   │   │   ├── dashboard/          # Sidebar, Header, Metric Cards, Risk Zones Panel
│   │   │   ├── maps/               # MapLibre GL & Leaflet OpenStreetMap live renderers
│   │   │   ├── tourist/            # SOS Panic Button, Digital ID Card, Risk Gauge
│   │   │   └── ui/                 # Shared design primitives (Button, Card, Badge, Modal)
│   │   │
│   │   └── lib/                    # Core Business Logic & DB Drivers
│   │       ├── db.ts               # MongoDB MongoClient pooling & collection getters
│   │       ├── mongodb.ts          # Mongoose connection client
│   │       ├── geospatial.ts       # Turf.js point-in-polygon spatial calculations
│   │       ├── risk.ts             # Deterministic multi-factor risk engine
│   │       ├── socketClient.ts     # Socket.IO client gateway listener
│   │       ├── models/             # Mongoose Schemas (Tourist, Location, Geofence, Incident, Responder)
│   │       └── services/           # Dispatch engine & Digital ID QR code generators
│   │
│   └── realtime/                   # Real-time WebSocket Gateway (@prahari/realtime)
│       └── src/
│           └── index.js            # Express + Socket.IO server listening on :3001
│
├── services/
│   └── ml/                         # Python 3.11 FastAPI Anomaly Scoring Service
│       └── app/
│           └── main.py             # Anomaly REST API (POST /risk-score, GET /health)
│
└── packages/
    └── contracts/                  # Hardhat Solidity Smart Contracts (@prahari/contracts)
        ├── contracts/              # Solidity Smart Contracts
        │   ├── IncidentRegistry.sol        # On-chain tamper-proof incident evidence ledger
        │   ├── GeofenceRegistry.sol        # Government-published boundary registry
        │   ├── ResponderRegistry.sol       # Verified emergency responder unit directory
        │   ├── TouristIdentityRegistry.sol # Verifiable credential status tracker
        │   └── TouristIdentity.sol         # Identity token contract
        └── hardhat.config.ts       # Hardhat compiler & Sepolia network configuration
```

---

## 2. End-to-End Data Flow & Sequence Mechanics

### 🚨 Emergency SOS Trigger & Intelligent Dispatch Sequence
When a tourist presses the 🚨 SOS button on `/citizen`:

```text
[Tourist Mobile Client (/citizen)]
               │
   1. POST /api/incidents
      Payload: { touristId, type: "PANIC", location: { lat, lng } }
               │
               ▼
[Next.js API Handler (app/api/incidents/route.ts)]
               │
   2. Execute Turf.js Nearest Responder Matching (findNearestResponder)
      - Queries active responders from MongoDB
      - Computes geodesic distance (km) & estimated ETA (mins)
               │
   3. Write Incident Document to MongoDB Atlas ('incidents' collection)
               │
   4. Emit Socket.IO Event 'incident:create' → Realtime Gateway (:3001)
               │
               ▼
[Realtime WebSocket Gateway (apps/realtime)]
               │
   5. Broadcast 'incident:created' to connected Authority Dashboards
               │
               ▼
[Authority Command Dashboard (/admin)]
   6. Plays emergency audio chime
   7. Flashes incident card on Incident Queue
   8. Draws incident pin & nearest responder route on MapLibre / Leaflet Map
```

---

## 3. Verifiable Digital Identity & KYC Mechanics

Prahari uses a privacy-first decentralized identity model inspired by W3C Verifiable Credentials and the India AI Impact Summit framework:

* **Decentralized Identifier (DID)**: `did:tourist:DTI-IND-000123`
* **Credential Data Schema**:
  ```json
  {
    "touristId": "DTI-IND-000123",
    "name": "Demo Tourist",
    "nationality": "India",
    "verified": true,
    "did": "did:tourist:DTI-IND-000123",
    "issueDate": "2026-08-22",
    "kycType": "Aadhaar / Passport MRZ",
    "emergencyContacts": [
      { "name": "Ananya Sharma", "phone": "+91 98765 43210", "relationship": "Sister" }
    ]
  }
  ```
* **Offline Verification Checks**:
  - **Aadhaar QR Code**: Verified offline using Node.js `zlib` decompression and public key certificate signature validation (no UIDAI server calls needed).
  - **Passport MRZ**: Validated using ICAO Doc 9303 check-digit checksum algorithm across document number, date of birth, and expiry date fields.

---

## 4. Spatial Geofencing Engine (`lib/geospatial.ts`)

Evaluates whether GPS coordinates intersect with active restricted or high-risk polygons using **Turf.js**.

* **Coordinate System Notice**: Leaflet uses `[lat, lng]`, whereas GeoJSON / Turf.js requires `[lng, lat]`. The engine automatically flips coordinates before polygon evaluation.
* **Polygon Loop Closure**: Ensures the first and last point match to close the linear ring:
  ```typescript
  if (turfCoords[0][0] !== turfCoords[turfCoords.length - 1][0] ||
      turfCoords[0][1] !== turfCoords[turfCoords.length - 1][1]) {
    turfCoords.push(turfCoords[0]);
  }
  ```
* **Breach Result Structure**:
  ```typescript
  export interface GeofenceCheckResult {
    isBreached: boolean;
    breachedZone: GeofenceZone | null;
    riskPenalty: number;
    alertMessage: string | null;
  }
  ```

---

## 5. Dynamic Risk Engine (`lib/risk.ts`)

Calculates a numerical safety score between `0` and `100` using a multi-factor rule-based algorithm:

$$\text{Risk Score} = \min\left(100, \text{Geofence Risk} + \text{Time Risk} + \text{Crime Risk} + \text{Anomaly Risk} + \text{Disaster Risk}\right)$$

### Scoring Factors:
1. **Geofence Breach**:
   - `CRITICAL` Severity: `+40`
   - `HIGH` Severity: `+30`
   - `MEDIUM` Severity: `+15`
2. **Night-Time Factor**:
   - Active if local hour is between 22:00 (10 PM) and 05:00 (5 AM): `+10`
3. **Crime Density Index**:
   - Micro-incident density score: `0` to `30`
4. **Route Anomaly Score**:
   - Deviation score from typical route: `0` to `20`
5. **Active Disaster Warning**:
   - Flood / Landslide / Forest Fire alert: `+20`

### Tiers & Badge Display:
- `0 – 30`: 🟢 **LOW** (`#10b981`)
- `31 – 60`: 🟡 **MODERATE** (`#eab308`)
- `61 – 80`: 🟠 **HIGH** (`#f97316`)
- `81 – 100`: 🔴 **CRITICAL** (`#ef4444`)

---

## 6. Core Database Schemas (MongoDB / Mongoose)

The platform relies on 5 core collections in MongoDB Atlas (`prahari` database):

### 1. `tourists` Collection
```typescript
{
  touristId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  nationality: { type: String, default: 'India' },
  identityStatus: { type: String, enum: ['verified', 'pending', 'flagged', 'revoked'], default: 'verified' },
  emergencyContacts: [{ name: String, phone: String, relationship: String }],
  accommodation: { hotelName: String, address: String, city: String },
  preferences: { language: String, notificationMode: String, medicalNotes: String },
  trackingConsent: { type: Boolean, default: true },
  status: { type: String, enum: ['SAFE', 'WARN', 'SOS'], default: 'SAFE' },
  riskScore: { type: Number, default: 15 },
  clothingProfile: {
    top: String,
    bottom: String,
    footwear: String,
    accessories: String,
    updatedAt: Date
  }
}
```

### 2. `incidents` Collection
```typescript
{
  incidentId: { type: String, required: true, unique: true },
  touristId: { type: String, required: true },
  touristName: String,
  type: { type: String, enum: ['SOS', 'geofence_breach', 'medical', 'theft', 'PANIC', 'HAZARD'], default: 'SOS' },
  status: { type: String, enum: ['new', 'assigned', 'in_progress', 'resolved', 'ACTIVE', 'DISPATCHED'], default: 'new' },
  location: { lat: Number, lng: Number, address: String },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical', 'CRITICAL'], default: 'critical' },
  riskScore: { type: Number, default: 91 },
  assignedResponder: String,
  assignedResponderUnitId: String,
  assignedResponderName: String,
  etaMinutes: Number,
  resolvedAt: Date,
  efirDraft: {
    efirId: String,
    passportAadhaar: String,
    incidentType: String,
    clothingProfile: String,
    status: String,
    policeVerification: String,
    createdAt: Date
  }
}
```

### 3. `geofences` Collection
```typescript
{
  name: { type: String, required: true },
  type: { type: String, enum: ['safe_zone', 'restricted', 'high_risk', 'hazard'], default: 'high_risk' },
  geometry: {
    type: { type: String, enum: ['Polygon'], default: 'Polygon' },
    coordinates: { type: Schema.Types.Mixed, required: true }
  },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'high' },
  active: { type: Boolean, default: true },
  metadata: { description: String, advisoryMsg: String, speedLimit: Number }
}
```

### 4. `locations` Collection
```typescript
{
  touristId: { type: String, required: true, index: true },
  coordinates: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  accuracy: { type: Number, default: 5 },
  source: { type: String, enum: ['gps', 'cellular', 'manual'], default: 'gps' },
  timestamp: { type: Date, default: Date.now }
}
```

### 5. `responders` Collection
```typescript
{
  responderId: { type: String, required: true, unique: true },
  unitId: String,
  name: String,
  department: { type: String, enum: ['Police', 'Medical', 'Search & Rescue', 'Tourism Patrol'] },
  location: { lat: Number, lng: Number },
  status: { type: String, enum: ['available', 'dispatched', 'off_duty'] },
  capabilities: [String]
}
```

---

## 7. Ethereum Sepolia Smart Contracts (`packages/contracts`)

Incident evidence and geofences are anchored to the Ethereum Sepolia testnet to provide tamper-proof, legally auditable records.

### Cryptographic Evidence Hashing Formula:
$$\text{Incident Hash} = \text{keccak256}(\text{abi.encodePacked}(\text{incidentId}, \text{touristId}, \text{timestamp}, \text{evidenceHash}))$$

### Contracts Matrix:
1. `IncidentRegistry.sol`: On-chain registry recording incident hashes and lifecycle status changes.
2. `GeofenceRegistry.sol`: Government access-controlled registry for publishing official hazard zone polygon hashes.
3. `ResponderRegistry.sol`: Accredited responder unit verification ledger.
4. `TouristIdentityRegistry.sol`: Credential revocation status tracker.

---

## 8. Realtime WebSocket Gateway (`apps/realtime`)

The Express + Socket.IO server runs on port `3001`.

### Event Handlers (`apps/realtime/src/index.js`):
* `tourist:location`: Broadcasts live GPS telemetry.
* `incident:create`: Emits new emergency panic alerts to all authority dashboards.
* `incident:update`: Emits responder assignment and status updates.

---

## 9. Machine Learning Risk Service (`services/ml`)

A Python 3.11 FastAPI service using scikit-learn Isolation Forest classifiers to identify movement anomalies.

* **Endpoint**: `POST http://localhost:8000/risk-score`
* **Request Body**:
  ```json
  {
    "route_deviation_m": 150.0,
    "inactivity_minutes": 25.0,
    "zone_risk": 40.0,
    "hour_of_day": 23
  }
  ```
* **Response Payload**:
  ```json
  {
    "score": 88,
    "level": "critical",
    "requires_human_review": true
  }
  ```

---

## 10. API Route Handlers Specification

| Route Path | Method | Purpose | Response Payload Key |
| :--- | :--- | :--- | :--- |
| `/api/geofences` | `GET` | Fetch active geofence polygons | `{ success: true, geofences: [...] }` |
| `/api/geofences` | `POST` | Create new government geofence | `{ success: true, geofence: {...} }` |
| `/api/incidents` | `GET` | Fetch active incident queue | `{ success: true, incidents: [...] }` |
| `/api/incidents` | `POST` | Trigger emergency SOS panic | `{ success: true, incident: {...} }` |
| `/api/locations` | `POST` | Ingest tourist GPS telemetry | `{ success: true, ping: {...} }` |
| `/api/tourists/[id]`| `GET` | Lookup tourist identity & DID | `{ success: true, tourist: {...} }` |
| `/api/efir` | `POST` | Generate automated draft E-FIR | `{ success: true, efir: {...} }` |
| `/api/attire` | `POST` | Save AI visual clothing profile | `{ success: true, clothingProfile: {...} }` |

---

## 11. Verification & Operations Guide

### Developer Setup Commands:
```bash
# 1. Install workspace dependencies
pnpm install

# 2. Start full development stack (web + realtime gateway)
pnpm dev

# 3. Start Python ML Anomaly Service
pnpm ml:dev

# 4. Compile Hardhat Sepolia Smart Contracts
pnpm contract:compile

# 5. Build Next.js Production Bundle
pnpm --filter @prahari/web build
```

---

*Maintained by the Prahari Engineering Team (Big Hero 6).*
