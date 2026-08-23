import { NextRequest, NextResponse } from "next/server";
import { listActiveGeofences, insertGeofence } from "@/lib/db";
import { requireAuth } from "@/lib/auth/guards";
import { operationalGeofences } from "@/lib/operationalData";

export async function GET() {
  try {
    return NextResponse.json({ success: true, geofences: operationalGeofences(await listActiveGeofences()) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['authority', 'admin']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const { name, type, severity, coordinates, description, geometry } = body;

    if (!name || (!coordinates && !geometry)) {
      return NextResponse.json({ success: false, error: 'Name and coordinates or geometry required' }, { status: 400 });
    }

    const newGeofence = {
      name,
      type: type || 'high_risk',
      severity: severity || 'high',
      active: true,
      coordinates,
      geometry: geometry || {
        type: 'Polygon',
        coordinates: [coordinates ? coordinates.map(([lat, lng]: [number, number]) => [lng, lat]) : []],
      },
      metadata: { description },
      createdAt: new Date().toISOString(),
    };

    const saved = await insertGeofence(newGeofence as any);
    if (!saved) {
      return NextResponse.json({ success: false, error: 'The geofence could not be saved.' }, { status: 503 });
    }
    return NextResponse.json({ success: true, geofence: saved });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Error creating geofence' }, { status: 500 });
  }
}
