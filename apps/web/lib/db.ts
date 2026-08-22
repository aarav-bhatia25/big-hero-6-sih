import { getSupabase } from "./supabase";

export { isSupabaseConfigured } from "./supabase";

/** Rows come back with camelCase columns already matching the API shape. */
type Row = Record<string, any>;

// ------------------------------------------------------------------ tourists
export async function getTourist(touristId: string): Promise<Row | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("tourists").select("*").eq("touristId", touristId).maybeSingle();
  if (error) { console.warn("[prahari] getTourist:", error.message); return null; }
  return data;
}

/** Matches the old `$or: [{touristId}, {did}]` lookup. */
export async function getTouristByIdOrDid(id: string): Promise<Row | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("tourists").select("*")
    .or(`touristId.eq.${id},did.eq.${id}`)
    .limit(1).maybeSingle();
  if (error) { console.warn("[prahari] getTouristByIdOrDid:", error.message); return null; }
  return data;
}

export async function updateTourist(touristId: string, fields: Row): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("tourists")
    .update({ ...fields, updatedAt: new Date().toISOString() })
    .eq("touristId", touristId);
  if (error) { console.warn("[prahari] updateTourist:", error.message); return false; }
  return true;
}

/** Insert-or-update on the touristId unique constraint. */
export async function upsertTourist(row: Row): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("tourists").upsert(row, { onConflict: "touristId" });
  if (error) { console.warn("[prahari] upsertTourist:", error.message); return false; }
  return true;
}

// ----------------------------------------------------------------- locations
export async function insertLocation(ping: Row): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("locations").insert(ping);
  if (error) { console.warn("[prahari] insertLocation:", error.message); return false; }
  return true;
}

export async function listLocations(touristId: string, limit = 50): Promise<Row[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("locations").select("*")
    .eq("touristId", touristId)
    .order("timestamp", { ascending: false })
    .limit(limit);
  if (error) { console.warn("[prahari] listLocations:", error.message); return []; }
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
export async function listIncidents(limit = 20): Promise<Row[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("incidents").select("*")
    .order("createdAt", { ascending: false })
    .limit(limit);
  if (error) { console.warn("[prahari] listIncidents:", error.message); return []; }
  return data ?? [];
}

export async function insertIncident(row: Row): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("incidents").insert(row);
  if (error) { console.warn("[prahari] insertIncident:", error.message); return false; }
  return true;
}

export async function upsertIncident(row: Row): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("incidents").upsert(row, { onConflict: "incidentId" });
  if (error) { console.warn("[prahari] upsertIncident:", error.message); return false; }
  return true;
}

/** Replaces the old `find({ efirDraft: { $exists: true } })`. */
export async function listIncidentsWithEfir(): Promise<Row[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("incidents").select("*").not("efirDraft", "is", null);
  if (error) { console.warn("[prahari] listIncidentsWithEfir:", error.message); return []; }
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

  const head = { count: "exact" as const, head: true };
  const [tourists, incidents, zones, avail, respTotal] = await Promise.all([
    sb.from("tourists").select("*", head),
    // "live" = anything not yet resolved (schema allows both casings)
    sb.from("incidents").select("*", head).not("status", "in", '("resolved","RESOLVED")'),
    sb.from("geofences").select("*", head).eq("active", true)
      .in("severity", ["high", "critical", "HIGH", "CRITICAL"]),
    sb.from("responders").select("*", head).in("status", ["available", "AVAILABLE"]),
    sb.from("responders").select("*", head),
  ]);

  const err = [tourists, incidents, zones, avail, respTotal].find((r) => r.error);
  if (err?.error) { console.warn("[prahari] getDashboardStats:", err.error.message); return null; }

  return {
    activeTourists: tourists.count ?? 0,
    liveIncidents: incidents.count ?? 0,
    highRiskZones: zones.count ?? 0,
    respondersAvailable: avail.count ?? 0,
    respondersTotal: respTotal.count ?? 0,
  };
}

/** Partial update of an incident by its business key. */
export async function updateIncident(incidentId: string, fields: Row): Promise<Row | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("incidents").update(fields).eq("incidentId", incidentId).select().maybeSingle();
  if (error) { console.warn("[prahari] updateIncident:", error.message); return null; }
  return data;
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

export async function createKycSession(row: {
  sessionId: string; method: string; status: string; subjectHash: string;
  challengeHash: string | null; expiresAt: string; payload: Record<string, unknown>;
}): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("kyc_sessions").insert(row);
  if (error) { console.warn("[prahari] createKycSession:", error.message); return false; }
  return true;
}

export async function getKycSession(sessionId: string): Promise<KycSessionRow | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("kyc_sessions").select("*").eq("sessionId", sessionId).maybeSingle();
  if (error) { console.warn("[prahari] getKycSession:", error.message); return null; }
  return (data as KycSessionRow) ?? null;
}

/** Atomically bumps the attempt counter and returns the new value. */
export async function incrementKycAttempts(sessionId: string): Promise<number> {
  const sb = getSupabase();
  if (!sb) return 0;
  const current = await getKycSession(sessionId);
  const next = (current?.attempts ?? 0) + 1;
  const { error } = await sb.from("kyc_sessions").update({ attempts: next }).eq("sessionId", sessionId);
  if (error) { console.warn("[prahari] incrementKycAttempts:", error.message); return next; }
  return next;
}

export async function markKycSessionVerified(sessionId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("kyc_sessions")
    .update({ status: "verified", verifiedAt: new Date().toISOString() })
    .eq("sessionId", sessionId);
  if (error) { console.warn("[prahari] markKycSessionVerified:", error.message); return false; }
  return true;
}

export async function markKycSessionFailed(sessionId: string, status: "failed" | "expired" | "locked"): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("kyc_sessions").update({ status }).eq("sessionId", sessionId);
  if (error) { console.warn("[prahari] markKycSessionFailed:", error.message); return false; }
  return true;
}

// --------------------------------------------------------------- identity
export async function getTouristByDid(did: string): Promise<Row | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("tourists").select("*").eq("did", did).maybeSingle();
  if (error) { console.warn("[prahari] getTouristByDid:", error.message); return null; }
  return data;
}

export async function getTouristBySubjectHash(subjectHash: string): Promise<Row | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("tourists").select("*").eq("kycSubjectHash", subjectHash).maybeSingle();
  if (error) { console.warn("[prahari] getTouristBySubjectHash:", error.message); return null; }
  return data;
}

/** Appends to the immutable issuance log (also the Block 3 anchoring queue). */
export async function logCredentialIssuance(row: {
  touristId: string; did: string; credentialHash: string;
  kycMethod: string; kycProvider: string; action?: string;
}): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("credential_issuance").insert(row);
  if (error) { console.warn("[prahari] logCredentialIssuance:", error.message); return false; }
  return true;
}
