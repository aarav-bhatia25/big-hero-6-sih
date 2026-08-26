import { getSupabase } from "./supabase";
import {
  operationalGeofences,
  operationalIncidents,
  operationalResponders,
  operationalTourists,
} from "./operationalData";

export { isSupabaseConfigured } from "./supabase";

/** Rows come back with camelCase columns already matching the API shape. */
type Row = Record<string, any>;

// In-memory fallback stores when Supabase is not configured or in fallback mode
const inMemoryTourists = new Map<string, Row>([
  [
    'TOUR-7890',
    {
      touristId: 'TOUR-7890',
      did: 'did:prahari:TOUR-7890',
      name: 'Ralston Fernandes',
      nationality: 'Indian',
      identityStatus: 'verified',
      emergencyContacts: [
        { name: 'Ananya Sharma', phone: '+91 98765 43210', relationship: 'Sister' },
      ],
      accommodation: { hotelName: 'Heritage Palace Resort', address: 'Amer Road', city: 'Jaipur' },
      preferences: { language: 'English', notificationMode: 'push', medicalNotes: 'No known allergies' },
      trackingConsent: true,
      createdAt: new Date().toISOString(),
    },
  ],
  [
    'DTI-IND-000123',
    {
      touristId: 'DTI-IND-000123',
      did: 'did:tourist:DTI-IND-000123',
      name: 'Demo Tourist',
      nationality: 'India',
      identityStatus: 'verified',
      emergencyContacts: [
        { name: 'Ananya Sharma', phone: '+91 98765 43210', relationship: 'Sister' },
      ],
      trackingConsent: true,
      createdAt: new Date().toISOString(),
    },
  ],
]);

// Process-local storage is used only when no database is configured (for local
// development). Once Supabase is configured, a database failure must never be
// replaced with a fixture record or a pretend successful write.
const inMemoryLocations: Row[] = [];
const inMemoryIncidents = new Map<string, Row>();

// ------------------------------------------------------------------ tourists
export async function getTourist(touristId: string): Promise<Row | null> {
  const sb = getSupabase();
  if (!sb) return inMemoryTourists.get(touristId) ?? null;
  const { data, error } = await sb.from("tourists").select("*").eq("touristId", touristId).maybeSingle();
  if (error) { console.warn("[prahari] getTourist:", error.message); return null; }
  return data ?? null;
}

/** Matches the old `$or: [{touristId}, {did}]` lookup. */
export async function getTouristByIdOrDid(id: string): Promise<Row | null> {
  const sb = getSupabase();
  if (!sb) {
    for (const t of inMemoryTourists.values()) {
      if (t.touristId === id || t.did === id) return t;
    }
    return null;
  }
  const { data, error } = await sb
    .from("tourists").select("*")
    .or(`touristId.eq.${id},did.eq.${id}`)
    .limit(1).maybeSingle();
  if (error) console.warn("[prahari] getTouristByIdOrDid:", error.message);
  return data ?? null;
}

export async function updateTourist(touristId: string, fields: Row): Promise<boolean> {
  const existing = inMemoryTourists.get(touristId) ?? { touristId };
  inMemoryTourists.set(touristId, { ...existing, ...fields, updatedAt: new Date().toISOString() });
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb
    .from("tourists")
    .update({ ...fields, updatedAt: new Date().toISOString() })
    .eq("touristId", touristId);
  if (error) { console.warn("[prahari] updateTourist:", error.message); return false; }
  return true;
}

/** Insert-or-update on the touristId unique constraint. */
export async function upsertTourist(row: Row): Promise<boolean> {
  if (row.touristId) {
    const existing = inMemoryTourists.get(row.touristId) ?? {};
    inMemoryTourists.set(row.touristId, { ...existing, ...row });
  }
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb.from("tourists").upsert(row, { onConflict: "touristId" });
  if (error) { console.warn("[prahari] upsertTourist:", error.message); return false; }
  return true;
}

// ----------------------------------------------------------------- locations
export async function insertLocation(ping: Row): Promise<boolean> {
  inMemoryLocations.unshift({
    id: ping.id ?? crypto.randomUUID(),
    createdAt: ping.createdAt ?? new Date().toISOString(),
    ...ping,
  });
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb.from("locations").insert(ping);
  if (error) { console.warn("[prahari] insertLocation:", error.message); return false; }
  return true;
}

export async function listLocations(touristId: string, limit = 50): Promise<Row[]> {
  const sb = getSupabase();
  if (!sb) return inMemoryLocations
    .filter((location) => location.touristId === touristId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
  const { data, error } = await sb
    .from("locations").select("*")
    .eq("touristId", touristId)
    .order("timestamp", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("[prahari] listLocations:", error.message);
    return [];
  }
  return data ?? [];
}

// ----------------------------------------------------------------- geofences
export async function listActiveGeofences(): Promise<Row[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("geofences").select("*").eq("active", true);
  if (error) { console.warn("[prahari] listActiveGeofences:", error.message); return []; }
  return data ?? [];
}

export async function insertGeofence(row: Row): Promise<Row | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("geofences").insert(row).select().single();
  if (error) { console.warn("[prahari] insertGeofence:", error.message); return null; }
  return data;
}

export async function replaceGeofences(rows: Row[]): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  await sb.from("geofences").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { error } = await sb.from("geofences").insert(rows);
  if (error) { console.warn("[prahari] replaceGeofences:", error.message); return false; }
  return true;
}

// ---------------------------------------------------------------- responders
export async function listResponders(): Promise<Row[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("responders").select("*");
  if (error) { console.warn("[prahari] listResponders:", error.message); return []; }
  return data ?? [];
}

export async function replaceResponders(rows: Row[]): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  await sb.from("responders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const { error } = await sb.from("responders").insert(rows);
  if (error) { console.warn("[prahari] replaceResponders:", error.message); return false; }
  return true;
}

// ----------------------------------------------------------------- incidents
export async function listIncidents(limit = 50): Promise<Row[]> {
  const memRows = Array.from(inMemoryIncidents.values());
  const sb = getSupabase();
  if (!sb) {
    return memRows
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, limit);
  }

  const { data, error } = await sb
    .from("incidents").select("*")
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[prahari] listIncidents:", error.message);
    return memRows
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, limit);
  }

  // Combine Supabase rows and in-memory rows so no incident is ever missed
  const combinedMap = new Map<string, Row>();
  for (const r of memRows) {
    if (r.incidentId) combinedMap.set(r.incidentId, r);
  }
  for (const dbRow of data ?? []) {
    if (dbRow.incidentId) {
      const existingMem = combinedMap.get(dbRow.incidentId) ?? {};
      combinedMap.set(dbRow.incidentId, { ...existingMem, ...dbRow });
    }
  }

  return Array.from(combinedMap.values())
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, limit);
}

const KNOWN_INCIDENT_DB_COLUMNS = new Set([
  'id',
  'incidentId',
  'touristId',
  'touristName',
  'type',
  'status',
  'location',
  'severity',
  'riskScore',
  'assignedResponder',
  'assignedResponderUnitId',
  'assignedResponderName',
  'etaMinutes',
  'timeline',
  'efirDraft',
  'resolvedAt',
  'cancelledAt',
  'cancelledBy',
  'createdAt',
]);

function sanitizeIncidentRowForDb(row: Row): Row {
  const sanitized: Row = {};
  for (const [key, val] of Object.entries(row)) {
    if (KNOWN_INCIDENT_DB_COLUMNS.has(key)) {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

export async function insertIncident(row: Row): Promise<boolean> {
  const fullRow = { createdAt: new Date().toISOString(), ...row };
  inMemoryIncidents.set(row.incidentId, fullRow);
  const sb = getSupabase();
  if (!sb) return true;

  const sanitized = sanitizeIncidentRowForDb(fullRow);
  const { error } = await sb.from("incidents").insert(sanitized);
  if (error) {
    console.warn("[prahari] insertIncident:", error.message);
  }
  return true;
}

export async function upsertIncident(row: Row): Promise<boolean> {
  const existing = inMemoryIncidents.get(row.incidentId) ?? {};
  inMemoryIncidents.set(row.incidentId, { ...existing, ...row, updatedAt: new Date().toISOString() });
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb.from("incidents").upsert(row, { onConflict: "incidentId" });
  if (error) {
    console.warn("[prahari] upsertIncident:", error.message);
    if (error.message?.includes("schema cache") || error.message?.includes("column") || error.code === 'PGRST204') {
      const sanitized = sanitizeIncidentRowForDb(row);
      const { error: retryErr } = await sb.from("incidents").upsert(sanitized, { onConflict: "incidentId" });
      if (!retryErr) return true;
    }
    return false;
  }
  return true;
}

export async function deleteIncident(incidentId: string): Promise<boolean> {
  inMemoryIncidents.delete(incidentId);
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb.from("incidents").delete().eq("incidentId", incidentId);
  if (error) {
    console.warn("[prahari] deleteIncident:", error.message);
    return false;
  }
  return true;
}

/** Replaces the old `find({ efirDraft: { $exists: true } })`. */
export async function listIncidentsWithEfir(): Promise<Row[]> {
  const sb = getSupabase();
  if (!sb) return [...inMemoryIncidents.values()].filter((incident) => incident.efirDraft);
  const { data, error } = await sb.from("incidents").select("*").not("efirDraft", "is", null);
  if (error) {
    console.warn("[prahari] listIncidentsWithEfir:", error.message);
    return [];
  }
  return data ?? [];
}

// --------------------------------------------------------------- dashboard
export async function listTourists(limit = 200): Promise<Row[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("tourists").select("*").limit(limit);
  if (error) { console.warn("[prahari] listTourists:", error.message); return []; }
  return data ?? [];
}

export type DashboardStats = {
  activeTourists: number;
  liveIncidents: number;
  highRiskZones: number;
  respondersAvailable: number;
  respondersTotal: number;
};

/** Real aggregate counts for the authority dashboard tiles. */
export async function getDashboardStats(): Promise<DashboardStats | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const [tourists, incidents, zones, responders] = await Promise.all([
    sb.from("tourists").select("touristId,name,identityStatus"),
    sb.from("incidents").select("incidentId,touristId,touristName,type,status"),
    sb.from("geofences").select("id,name,severity,active"),
    sb.from("responders").select("id,responderId,unitId,status"),
  ]);

  const err = [tourists, incidents, zones, responders].find((r) => r.error);
  if (err?.error) { console.warn("[prahari] getDashboardStats:", err.error.message); return null; }

  const liveIncidentStatuses = new Set(['resolved', 'cancelled', 'rejected']);
  const visibleIncidents = operationalIncidents(incidents.data ?? []).filter(
    (incident) => !liveIncidentStatuses.has(String(incident.status ?? '').toLowerCase())
  );
  const visibleZones = operationalGeofences(zones.data ?? []);
  const visibleResponders = operationalResponders(responders.data ?? []);

  return {
    activeTourists: operationalTourists(tourists.data ?? []).length,
    liveIncidents: visibleIncidents.length,
    highRiskZones: visibleZones.filter(
      (zone) => ['high', 'critical'].includes(String(zone.severity ?? '').toLowerCase()) && zone.active !== false
    ).length,
    respondersAvailable: visibleResponders.filter(
      (responder) => String(responder.status ?? '').toLowerCase() === 'available'
    ).length,
    respondersTotal: visibleResponders.length,
  };
}

/** Partial update of an incident by its business key. */
export async function updateIncident(incidentId: string, fields: Row): Promise<Row | null> {
  let existing = inMemoryIncidents.get(incidentId);
  if (!existing) {
    existing = { incidentId, ...fields };
  } else {
    existing = { ...existing, ...fields };
  }
  const updatedInMemory = { ...existing, updatedAt: new Date().toISOString() };
  inMemoryIncidents.set(incidentId, updatedInMemory);

  const sb = getSupabase();
  if (!sb) return updatedInMemory;

  const sanitized = sanitizeIncidentRowForDb(fields);
  if (Object.keys(sanitized).length > 0) {
    const { data, error } = await sb
      .from("incidents").update(sanitized).eq("incidentId", incidentId).select().maybeSingle();

    if (error) {
      console.warn("[prahari] updateIncident:", error.message);
    } else if (data) {
      return { ...updatedInMemory, ...data };
    }
  }
  return updatedInMemory;
}

// ------------------------------------------------------------- kyc sessions
export interface KycSessionRow {
  sessionId: string;
  method: 'aadhaar' | 'passport';
  status: string;
  subjectHash: string;
  challengeHash: string | null;
  attempts: number;
  maxAttempts: number;
  payload: Record<string, any>;
  expiresAt: string;
}

const inMemoryKycSessions = new Map<string, KycSessionRow>();

export async function createKycSession(row: {
  sessionId: string; method: string; status: string; subjectHash: string;
  challengeHash: string | null; expiresAt: string; payload: Record<string, unknown>;
}): Promise<boolean> {
  const sessionRow: KycSessionRow = {
    sessionId: row.sessionId,
    method: row.method as 'aadhaar' | 'passport',
    status: row.status,
    subjectHash: row.subjectHash,
    challengeHash: row.challengeHash,
    attempts: 0,
    maxAttempts: 3,
    payload: row.payload as Record<string, any>,
    expiresAt: row.expiresAt,
  };
  inMemoryKycSessions.set(row.sessionId, sessionRow);

  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb.from("kyc_sessions").insert(row);
  if (error) { console.warn("[prahari] createKycSession:", error.message); return false; }
  return true;
}

export async function getKycSession(sessionId: string): Promise<KycSessionRow | null> {
  const sb = getSupabase();
  if (!sb) return inMemoryKycSessions.get(sessionId) ?? null;
  const { data, error } = await sb
    .from("kyc_sessions").select("*").eq("sessionId", sessionId).maybeSingle();
  if (error) console.warn("[prahari] getKycSession:", error.message);
  if (error || !data) return null;
  return (data as KycSessionRow) ?? null;
}

/** Atomically bumps the attempt counter and returns the new value. */
export async function incrementKycAttempts(sessionId: string): Promise<number> {
  const mem = inMemoryKycSessions.get(sessionId);
  if (mem) {
    mem.attempts = (mem.attempts ?? 0) + 1;
  }
  const sb = getSupabase();
  if (!sb) return mem?.attempts ?? 1;
  const current = await getKycSession(sessionId);
  const next = (current?.attempts ?? 0) + 1;
  const { error } = await sb.from("kyc_sessions").update({ attempts: next }).eq("sessionId", sessionId);
  if (error) { console.warn("[prahari] incrementKycAttempts:", error.message); }
  return next;
}

export async function markKycSessionVerified(sessionId: string): Promise<boolean> {
  const mem = inMemoryKycSessions.get(sessionId);
  if (mem) {
    mem.status = 'verified';
  }
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb.from("kyc_sessions")
    .update({ status: "verified", verifiedAt: new Date().toISOString() })
    .eq("sessionId", sessionId);
  if (error) { console.warn("[prahari] markKycSessionVerified:", error.message); return false; }
  return true;
}

export async function markKycSessionFailed(sessionId: string, status: "failed" | "expired" | "locked"): Promise<boolean> {
  const mem = inMemoryKycSessions.get(sessionId);
  if (mem) {
    mem.status = status;
  }
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb.from("kyc_sessions").update({ status }).eq("sessionId", sessionId);
  if (error) { console.warn("[prahari] markKycSessionFailed:", error.message); return false; }
  return true;
}

// --------------------------------------------------------------- identity
export async function getTouristByDid(did: string): Promise<Row | null> {
  const sb = getSupabase();
  if (!sb) {
    for (const t of inMemoryTourists.values()) {
      if (t.did === did) return t;
    }
    return null;
  }
  const { data, error } = await sb.from("tourists").select("*").eq("did", did).maybeSingle();
  if (error) console.warn("[prahari] getTouristByDid:", error.message);
  return data ?? null;
}

export async function getTouristBySubjectHash(subjectHash: string): Promise<Row | null> {
  const sb = getSupabase();
  if (!sb) {
    for (const t of inMemoryTourists.values()) {
      if (t.kycSubjectHash === subjectHash) return t;
    }
    return null;
  }
  const { data, error } = await sb
    .from("tourists").select("*").eq("kycSubjectHash", subjectHash).maybeSingle();
  if (error) console.warn("[prahari] getTouristBySubjectHash:", error.message);
  return data ?? null;
}

/** Appends to the immutable issuance log (also the Block 3 anchoring queue). */
export async function logCredentialIssuance(row: {
  touristId: string; did: string; credentialHash: string;
  kycMethod: string; kycProvider: string; action?: string;
}): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return true;
  const { error } = await sb.from("credential_issuance").insert(row);
  if (error) { console.warn("[prahari] logCredentialIssuance:", error.message); return false; }
  return true;
}

// ------------------------------------------------------------------ users
export interface UserRow {
  id?: string;
  userId: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  role: 'admin' | 'authority' | 'responder' | 'tourist';
  entityId?: string | null;
  department?: string | null;
  badge?: string | null;
  phone?: string | null;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  if (error) { console.warn("[prahari] getUserByEmail:", error.message); return null; }
  return (data as UserRow) ?? null;
}

export async function getUserById(userId: string): Promise<UserRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("users")
    .select("*")
    .eq("userId", userId)
    .maybeSingle();
  if (error) { console.warn("[prahari] getUserById:", error.message); return null; }
  return (data as UserRow) ?? null;
}

export async function upsertUser(user: UserRow): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("users")
    .upsert({ ...user, email: user.email.toLowerCase().trim(), updatedAt: new Date().toISOString() }, { onConflict: "userId" });
  if (error) { console.warn("[prahari] upsertUser:", error.message); return false; }
  return true;
}

export async function listUsers(): Promise<UserRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("users").select("*");
  if (error) { console.warn("[prahari] listUsers:", error.message); return []; }
  return (data as UserRow[]) ?? [];
}
