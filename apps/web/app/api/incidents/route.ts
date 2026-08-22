import { NextRequest, NextResponse } from "next/server";
import { getIncidentsCollection, getRespondersCollection } from "@/lib/db";
import { findNearestResponder } from "@/lib/services/dispatchEngine";

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
  try {
    const body = await request.json();
    const {
      touristId = "DTI-IND-000123",
      touristName = "Demo Tourist",
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

    const mockResponders = [
      { id: '1', unitId: 'Unit #17', name: 'Police Patrol Unit 17', type: 'POLICE', phone: '+91 98765 00017', lat: 19.079, lng: 72.882 },
      { id: '2', unitId: 'Unit #09', name: 'SAR Medical Team 9', type: 'MEDICAL', phone: '+91 98765 00009', lat: 19.083, lng: 72.880 },
    ];

    const match = findNearestResponder(incidentLat, incidentLng, mockResponders);

    const incident = {
      incidentId,
      touristId,
      touristName,
      type,
      status,
      location: { lat: incidentLat, lng: incidentLng, address },
      severity,
      riskScore: severity === 'CRITICAL' ? 95 : 75,
      createdAt: new Date(),
      assignedResponder: match?.responder?.id || "1",
      assignedResponderUnitId: match?.responder?.unitId || "Unit #17",
      assignedResponderName: match?.responder?.name || "Police Patrol Unit 17",
      etaMinutes: match?.etaMinutes || 4,
      resolvedAt: null,
    };

    const col = await getIncidentsCollection();
    if (col) {
      await col.insertOne(incident as any);
    }

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
  try {
    const col = await getIncidentsCollection();
    let incidents = col
      ? await col.find({}).sort({ createdAt: -1 }).limit(20).toArray()
      : [];

    if (incidents.length === 0) {
      incidents = MOCK_FALLBACK_INCIDENTS;
    }

    return NextResponse.json({ success: true, incidents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
