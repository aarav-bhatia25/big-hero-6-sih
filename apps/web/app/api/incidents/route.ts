import { NextRequest, NextResponse } from "next/server";
import { insertIncident, listIncidents, updateIncident, listResponders, getTourist } from "@/lib/db";
import { findNearestResponder } from "@/lib/services/dispatchEngine";
import { emitToGateway } from "@/lib/services/gatewayEmit";
import { canAccessTouristData, requireAuth } from "@/lib/auth/guards";
import { notifyEmergencyContacts } from "@/lib/services/emergencyNotifications";
import { isFixtureIncident, operationalIncidents, operationalResponders } from "@/lib/operationalData";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['tourist', 'authority', 'admin', 'responder']);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;

  try {
    const body = await request.json();
    const touristId = body.touristId ?? session.touristId;
    const touristName = body.touristName ?? session.name;
    const { type = "PANIC", location, lat, lng, severity = "CRITICAL", status = "ACTIVE" } = body;

    const incidentLat = location?.lat ?? lat;
    const incidentLng = location?.lng ?? lng;
    const incidentId = `INC-${Math.floor(1000 + Math.random() * 9000)}`;

    if (!touristId) {
      return NextResponse.json({ success: false, error: 'An authenticated tourist identity is required.' }, { status: 400 });
    }
    if (!canAccessTouristData(session, touristId)) {
      return NextResponse.json({ success: false, error: 'You cannot create an incident for another tourist.' }, { status: 403 });
    }
    if (!Number.isFinite(incidentLat) || !Number.isFinite(incidentLng)) {
      return NextResponse.json({ success: false, error: 'A valid emergency location is required.' }, { status: 400 });
    }
    const tourist = await getTourist(touristId);
    if (!tourist) {
      return NextResponse.json({ success: false, error: 'Tourist record not found.' }, { status: 404 });
    }
    // Matching is limited to responder units genuinely registered in the
    // database.  If none are available, the incident remains unassigned.
    const candidates = operationalResponders(await listResponders())
      .map((r: any) => ({
        id: r.id ?? r.responderId,
        unitId: r.unitId ?? r.responderId,
        name: r.name ?? r.responderId ?? 'Unnamed responder',
        type: r.type ?? r.department,
        phone: r.phone ?? '',
        lat: r.location?.lat,
        lng: r.location?.lng,
      }))
      .filter((r: any) => typeof r.lat === 'number' && typeof r.lng === 'number');

    const match = findNearestResponder(incidentLat, incidentLng, candidates);

    const incident = {
      incidentId,
      touristId,
      touristName: tourist.name ?? touristName ?? touristId,
      type,
      status,
      location: { lat: incidentLat, lng: incidentLng, ...(location?.address || body.address ? { address: location?.address ?? body.address } : {}) },
      severity,
      riskScore: severity === 'CRITICAL' ? 95 : 75,
      createdAt: new Date().toISOString(),
      assignedResponder: match?.responder?.id ?? null,
      assignedResponderUnitId: match?.responder?.unitId ?? null,
      assignedResponderName: match?.responder?.name ?? null,
      etaMinutes: match?.etaMinutes ?? null,
      resolvedAt: null,
      emergencyContactNotifications: null,
      timeline: [{ event: 'SOS created', at: new Date().toISOString(), actor: session.name }],
    };

    if (!await insertIncident(incident as any)) {
      return NextResponse.json({ success: false, error: 'The emergency incident could not be recorded. Call local emergency services directly.' }, { status: 503 });
    }

    // Persist the incident before attempting external delivery, so a Resend
    // outage cannot make an SOS disappear from the authority queue.
    const notificationPlan = await notifyEmergencyContacts(tourist.emergencyContacts, incidentId);
    const updated = await updateIncident(incidentId, { emergencyContactNotifications: notificationPlan });
    if (!updated) {
      return NextResponse.json({
        success: false,
        error: 'The incident was recorded, but its notification audit could not be saved. Contact local emergency services directly.',
        incidentId,
      }, { status: 503 });
    }

    // Notify the realtime gateway so the authority dashboard updates instantly
    await emitToGateway("incident:create", updated);

    return NextResponse.json({
      success: true,
      message: notificationPlan.message,
      incident: updated,
      contactNotification: { status: notificationPlan.status, recipientCount: notificationPlan.contacts.length },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;

  try {
    let incidents: any[] = operationalIncidents(await listIncidents(50));

    // If tourist, filter to only their incidents
    if (session.role === 'tourist' && session.touristId) {
      incidents = incidents.filter(
        (i) => i.touristId === session.touristId || i.touristId === session.userId
      );
    }

    return NextResponse.json({ success: true, incidents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Dispatch / status update. A tourist may only cancel their own active alert.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ['tourist', 'responder', 'authority', 'admin']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const { session } = auth;
    const { incidentId, status, assignedResponderUnitId, assignedResponderName, etaMinutes } = body;

    if (!incidentId) {
      return NextResponse.json({ success: false, error: "incidentId is required" }, { status: 400 });
    }

    const existing = (await listIncidents(200)).find((incident: any) => incident.incidentId === incidentId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Incident not found.' }, { status: 404 });
    }
    if (isFixtureIncident(existing)) {
      return NextResponse.json({ success: false, error: 'Fixture incidents cannot be changed through the operational workflow.' }, { status: 400 });
    }
    if (session.role === 'tourist') {
      if (status !== 'CANCELLED' || !canAccessTouristData(session, existing.touristId)) {
        return NextResponse.json({ success: false, error: 'Tourists may only cancel their own alert.' }, { status: 403 });
      }
    }

    const fields: Record<string, any> = {};
    if (status) fields.status = status;
    if (assignedResponderUnitId) fields.assignedResponderUnitId = assignedResponderUnitId;
    if (assignedResponderName) fields.assignedResponderName = assignedResponderName;
    if (typeof etaMinutes === "number") fields.etaMinutes = etaMinutes;
    if (status === "resolved" || status === "RESOLVED") fields.resolvedAt = new Date().toISOString();
    if (status === 'CANCELLED') {
      fields.cancelledAt = new Date().toISOString();
      fields.cancelledBy = session.name;
      fields.assignedResponder = null;
      fields.assignedResponderUnitId = null;
      fields.assignedResponderName = null;
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ success: false, error: "No updatable fields supplied" }, { status: 400 });
    }

    const updated = await updateIncident(incidentId, fields);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Incident ${incidentId} not found or database unavailable` },
        { status: 404 }
      );
    }

    await emitToGateway("incident:update", updated);

    return NextResponse.json({ success: true, incident: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
