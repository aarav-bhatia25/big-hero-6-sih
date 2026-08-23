import { NextRequest, NextResponse } from "next/server";
import { insertLocation, listLocations, listActiveGeofences, insertIncident, listIncidents, getTourist, updateTourist } from "@/lib/db";
import { checkPointInGeofence, type GeofenceZone } from "@/lib/geospatial";
import { emitToGateway } from "@/lib/services/gatewayEmit";
import { requireAuth, canAccessTouristData } from "@/lib/auth/guards";
import { assessSafetyRisk, type SafetyCoordinates } from "@/lib/safetyRisk";
import { operationalGeofences } from "@/lib/operationalData";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['tourist', 'authority', 'admin', 'responder']);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;

  try {
    const body = await request.json();
    const { lat, lng, accuracy = 5, speed, batteryLevel, source = "gps" } = body;
    const touristId = body.touristId ?? session.touristId;

    if (!touristId) {
      return NextResponse.json({ success: false, error: "An authenticated tourist identity is required." }, { status: 400 });
    }

    if (
      typeof lat !== "number" || typeof lng !== "number" ||
      !Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180
    ) {
      return NextResponse.json({ success: false, error: "Invalid coordinates" }, { status: 400 });
    }

    if (!['gps', 'cellular', 'manual'].includes(source)) {
      return NextResponse.json({ success: false, error: "Invalid location source" }, { status: 400 });
    }

    if (!canAccessTouristData(session, touristId)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot post telemetry for another tourist." },
        { status: 403 }
      );
    }

    const tourist = await getTourist(touristId);
    if (tourist?.trackingConsent === false) {
      return NextResponse.json(
        { success: false, error: "Location sharing is disabled for this tourist." },
        { status: 403 }
      );
    }
    // Read history before storing this ping so the assessment can measure the
    // preceding telemetry gap and transition speed without trusting the client.
    const previousLocations = await listLocations(touristId, 2);

    const ping = {
      touristId,
      coordinates: { lat, lng },
      timestamp: new Date().toISOString(),
      accuracy,
      speed: typeof speed === "number" ? speed : null,
      batteryLevel: typeof batteryLevel === "number" ? batteryLevel : null,
      source,
    };

    // ── Server-side geofence and safety-signal assessment ─────────────
    let breach: { incidentId: string; zone: string } | null = null;
    let safetyReview: { incidentId: string } | null = null;
    let zones: GeofenceZone[] = [];
    try {
      const dbGeofences = operationalGeofences(await listActiveGeofences());
      zones = dbGeofences.map((g: any) => ({
        id: g.id || g.name,
        name: g.name,
        type: String(g.type ?? '').toLowerCase() === 'safe_zone'
          ? "SAFE"
          : String(g.type ?? '').toLowerCase() === 'restricted'
            ? "RESTRICTED"
            : "HIGH_RISK",
        severity: (String(g.severity).toUpperCase() || "HIGH") as any,
        coordinates:
          g.coordinates ||
          g.geometry?.coordinates?.[0]?.map(([gLng, gLat]: [number, number]) => [gLat, gLng]) ||
          [],
      }));

    } catch (err) {
      console.warn("[prahari] geofence lookup failed:", err);
    }

    const check = checkPointInGeofence(lat, lng, zones);
    const itineraryRoute = Array.isArray(tourist?.itinerary?.route)
      ? tourist.itinerary.route.filter((point: any): point is SafetyCoordinates =>
          typeof point?.lat === "number" && typeof point?.lng === "number"
        )
      : null;
    const safety = assessSafetyRisk({
      current: { lat, lng },
      previousLocations,
      accuracy,
      reportedSpeedMps: typeof speed === "number" ? speed : null,
      zoneRisk: check.riskPenalty,
      plannedRoute: itineraryRoute,
    });

    if (!await insertLocation({ ...ping, lat, lng })) {
      return NextResponse.json({ success: false, error: 'Your location could not be saved. Check your connection and try again.' }, { status: 503 });
    }
    if (!await updateTourist(touristId, {
      currentLocation: { lat, lng, accuracy, timestamp: ping.timestamp },
      riskScore: safety.score,
    })) {
      return NextResponse.json({ success: false, error: 'Your location was saved, but the safety assessment could not be recorded.' }, { status: 503 });
    }

    // Broadcast the location update to the authorised staff dashboard.
    await emitToGateway("tourist:location", { touristId, lat, lng, timestamp: ping.timestamp, safety });

    try {
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
            touristName: tourist?.name ?? touristId,
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

          if (!await insertIncident(incident as any)) throw new Error('Could not record the geofence incident.');
          await emitToGateway("incident:create", incident);
          breach = { incidentId, zone: check.breachedZone.name };
        }
      }

      // A score is an investigation lead, not a finding of danger. Only a
      // high/critical multi-signal score opens an explicit review queue item;
      // it never dispatches police or messages contacts automatically.
      if (safety.requiresHumanReview) {
        const recentIncidents = await listIncidents(50);
        const existingReview = recentIncidents.find(
          (incident: any) =>
            incident.touristId === touristId &&
            incident.type === "SAFETY_SIGNAL" &&
            !["resolved", "RESOLVED", "CANCELLED"].includes(incident.status) &&
            Date.now() - new Date(incident.createdAt).getTime() < 30 * 60 * 1000
        );
        if (!existingReview) {
          const incidentId = `INC-SAFETY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
          const incident = {
            incidentId,
            touristId,
            touristName: tourist?.name ?? touristId,
            type: "SAFETY_SIGNAL",
            status: "REVIEW_REQUIRED",
            location: { lat, lng, address: "Automated safety-signal review" },
            severity: safety.level.toUpperCase(),
            riskScore: safety.score,
            createdAt: new Date().toISOString(),
            assignedResponder: null,
            assignedResponderUnitId: null,
            assignedResponderName: null,
            etaMinutes: null,
            resolvedAt: null,
            timeline: [{
              event: "Safety signal requires human review",
              at: new Date().toISOString(),
              actor: "Prahari safety engine",
              signals: safety.signals.map((signal) => signal.code),
            }],
          };
          if (!await insertIncident(incident)) throw new Error('Could not record the safety-review incident.');
          await emitToGateway("incident:create", incident);
          safetyReview = { incidentId };
        }
      }
    } catch (err) {
      console.warn("[prahari] server-side safety assessment failed:", err);
    }

    return NextResponse.json({ success: true, ping, breach, safety, safetyReview });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;
  const { searchParams } = new URL(request.url);
  const targetTouristId = searchParams.get("touristId") || session.touristId;

  if (!targetTouristId) {
    return NextResponse.json({ success: false, error: "A tourist ID is required." }, { status: 400 });
  }

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
