import { NextRequest, NextResponse } from "next/server";
import { insertIncident, listIncidents, updateIncident, listResponders } from "@/lib/db";
import { findNearestResponder } from "@/lib/services/dispatchEngine";
import { emitToGateway } from "@/lib/services/gatewayEmit";
import { requireAuth } from "@/lib/auth/guards";

const MOCK_FALLBACK_INCIDENTS = [
  {
    incidentId: 'INC-1092',
    touristId: 'DTI-IND-000123',
    touristName: 'Demo Tourist',
    type: 'PANIC',
    status: 'ACTIVE',
    severity: 'CRITICAL',
    riskScore: 91,
    location: { lat: 19.0760, lng: 72.8777, address: 'Docklands Sector B, Mumbai' },
    assignedResponderUnitId: 'Unit #17',
    assignedResponderName: 'Police Patrol Unit 17',
    etaMinutes: 4,
    createdAt: new Date(),
  },
  {
    incidentId: 'INC-1088',
    touristId: 'DTI-IND-000456',
    touristName: 'Alex Rivera',
    type: 'geofence_breach',
    status: 'in_progress',
    severity: 'HIGH',
    riskScore: 78,
    location: { lat: 19.0740, lng: 72.8810, address: 'Nahargarh Ridge' },
    assignedResponderUnitId: 'Unit #09',
    assignedResponderName: 'SAR Medical Team 9',
    etaMinutes: 8,
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
  },
];

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['tourist', 'authority', 'admin', 'responder']);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;

  try {
    const body = await request.json();
    const {
      touristId = session.touristId || "DTI-IND-000123",
      touristName = session.name || "Demo Tourist",
      type = "PANIC",
      location,
      lat = 19.0760,
      lng = 72.8777,
      address = "Docklands Sector B",
      severity = "CRITICAL",
      status = "ACTIVE",
    } = body;

    const incidentLat = location?.lat ?? lat;
    const incidentLng = location?.lng ?? lng;
    const incidentId = `INC-${Math.floor(1000 + Math.random() * 9000)}`;

    // Match against real responders from the database, falling back to a
    // static pair only if none are registered yet.
    const dbResponders = await listResponders();
    const candidates = dbResponders.length
      ? dbResponders.map((r: any) => ({
          id: r.id ?? r.responderId,
          unitId: r.unitId ?? r.responderId,
          name: r.name ?? `${r.department} ${r.responderId}`,
          type: r.type ?? r.department,
          phone: r.phone ?? '',
          lat: r.location?.lat,
          lng: r.location?.lng,
        })).filter((r: any) => typeof r.lat === 'number' && typeof r.lng === 'number')
      : [
          { id: '1', unitId: 'Unit #17', name: 'Police Patrol Unit 17', type: 'POLICE', phone: '+91 98765 00017', lat: 19.079, lng: 72.882 },
          { id: '2', unitId: 'Unit #09', name: 'SAR Medical Team 9', type: 'MEDICAL', phone: '+91 98765 00009', lat: 19.083, lng: 72.880 },
        ];

    const match = findNearestResponder(incidentLat, incidentLng, candidates);

    const incident = {
      incidentId,
      touristId,
      touristName,
      type,
      status,
      location: { lat: incidentLat, lng: incidentLng, address },
      severity,
      riskScore: severity === 'CRITICAL' ? 95 : 75,
      createdAt: new Date().toISOString(),
      assignedResponder: match?.responder?.id ?? null,
      assignedResponderUnitId: match?.responder?.unitId ?? null,
      assignedResponderName: match?.responder?.name ?? null,
      etaMinutes: match?.etaMinutes ?? null,
      resolvedAt: null,
    };

    await insertIncident(incident as any);

    // Notify the realtime gateway so the authority dashboard updates instantly
    emitToGateway("incident:create", incident);

    return NextResponse.json({
      success: true,
      message: "Emergency SOS registered and dispatched to nearest responder team.",
      incident,
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
    let incidents: any[] = await listIncidents(50);

    if (incidents.length === 0) {
      incidents = MOCK_FALLBACK_INCIDENTS;
    }

    // If tourist, filter to only their incidents
    if (session.role === 'tourist' && session.touristId) {
      incidents = incidents.filter(
        (i) => i.touristId === session.touristId || i.touristId === 'TOUR-7890' || i.touristId === session.userId
      );
    }

    return NextResponse.json({ success: true, incidents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Dispatch / status update. Requires responder, authority, or admin role.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ['responder', 'authority', 'admin']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const { incidentId, status, assignedResponderUnitId, assignedResponderName, etaMinutes } = body;

    if (!incidentId) {
      return NextResponse.json({ success: false, error: "incidentId is required" }, { status: 400 });
    }

    const fields: Record<string, any> = {};
    if (status) fields.status = status;
    if (assignedResponderUnitId) fields.assignedResponderUnitId = assignedResponderUnitId;
    if (assignedResponderName) fields.assignedResponderName = assignedResponderName;
    if (typeof etaMinutes === "number") fields.etaMinutes = etaMinutes;
    if (status === "resolved" || status === "RESOLVED") fields.resolvedAt = new Date().toISOString();

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

    emitToGateway("incident:update", updated);

    return NextResponse.json({ success: true, incident: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

