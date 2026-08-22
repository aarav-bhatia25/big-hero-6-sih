import { NextRequest, NextResponse } from "next/server";
import { insertLocation, listLocations, listActiveGeofences, insertIncident, listIncidents } from "@/lib/db";
import { checkPointInGeofence, type GeofenceZone } from "@/lib/geospatial";
import { emitToGateway } from "@/lib/services/gatewayEmit";
import { requireAuth, canAccessTouristData } from "@/lib/auth/guards";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['tourist', 'authority', 'admin', 'responder']);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;

  try {
    const body = await request.json();
    const { touristId = session.touristId || "TOUR-7890", lat, lng, accuracy = 5, source = "gps" } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ success: false, error: "Invalid coordinates" }, { status: 400 });
    }

    if (!canAccessTouristData(session, touristId)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot post telemetry for another tourist." },
        { status: 403 }
      );
    }

    const ping = {
      touristId,
      coordinates: { lat, lng },
      timestamp: new Date().toISOString(),
      accuracy,
      source,
    };

    await insertLocation({ ...ping, lat, lng });

    // Broadcast the location update to the realtime gateway
    emitToGateway("tourist:location", { touristId, lat, lng, timestamp: ping.timestamp });

    // ── Server-side geofence breach detection ────────────────────────
    let breach: { incidentId: string; zone: string } | null = null;
    try {
      const dbGeofences = await listActiveGeofences();
      const zones: GeofenceZone[] = dbGeofences.map((g: any) => ({
        id: g.id || g.name,
        name: g.name,
        type: "HIGH_RISK" as const,
        severity: (String(g.severity).toUpperCase() || "HIGH") as any,
        coordinates:
          g.coordinates ||
          g.geometry?.coordinates?.[0]?.map(([gLng, gLat]: [number, number]) => [gLat, gLng]) ||
          [],
      }));

      const check = checkPointInGeofence(lat, lng, zones);
      if (check.isBreached && check.breachedZone) {
        // Only create an incident if there isn't already an active breach incident
        // for this tourist in the last 30 minutes
        const recentIncidents = await listIncidents(50);
        const recentBreach = recentIncidents.find(
          (i: any) =>
            i.touristId === touristId &&
            i.type === "GEOFENCE_BREACH" &&
            i.status !== "resolved" &&
            i.status !== "RESOLVED" &&
            Date.now() - new Date(i.createdAt).getTime() < 30 * 60 * 1000
        );

        if (!recentBreach) {
          const incidentId = `INC-GF-${Math.floor(1000 + Math.random() * 9000)}`;
          const incident = {
            incidentId,
            touristId,
            touristName: touristId,
            type: "GEOFENCE_BREACH",
            status: "ACTIVE",
            location: { lat, lng, address: `Inside ${check.breachedZone.name}` },
            severity: check.breachedZone.severity,
            riskScore: check.riskPenalty + 50,
            createdAt: new Date().toISOString(),
            assignedResponder: null,
            assignedResponderUnitId: null,
            assignedResponderName: null,
            etaMinutes: null,
            resolvedAt: null,
          };

          await insertIncident(incident as any);
          emitToGateway("incident:create", incident);
          breach = { incidentId, zone: check.breachedZone.name };
        }
      }
    } catch (err) {
      console.warn("[prahari] server-side breach check failed:", err);
    }

    return NextResponse.json({ success: true, ping, breach });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;
  const { searchParams } = new URL(request.url);
  const targetTouristId = searchParams.get("touristId") || (session.role === 'tourist' ? session.touristId : "TOUR-7890") || "TOUR-7890";

  if (!canAccessTouristData(session, targetTouristId)) {
    return NextResponse.json(
      { success: false, error: "Forbidden: You are not authorized to access movement history for this tourist." },
      { status: 403 }
    );
  }

  try {
    const history = await listLocations(targetTouristId, 50);

    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

