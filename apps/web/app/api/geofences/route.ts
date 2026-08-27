import { NextRequest, NextResponse } from "next/server";
import { listActiveGeofences, insertGeofence, updateGeofence } from "@/lib/db";
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

/** Authority management for an existing boundary. Deactivation preserves the
 * record for operational audit while immediately removing it from evaluation. */
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ['authority', 'admin']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ success: false, error: 'Geofence id is required.' }, { status: 400 });

    const fields: Record<string, unknown> = {};
    if (typeof body.active === 'boolean') fields.active = body.active;
    if (typeof body.severity === 'string' && ['low', 'medium', 'high', 'critical'].includes(body.severity.toLowerCase())) {
      fields.severity = body.severity.toLowerCase();
    }
    if (typeof body.type === 'string' && ['high_risk', 'restricted', 'pickpocket_hotspot', 'disaster_prone', 'tourist_only', 'safe_zone'].includes(body.type.toLowerCase())) {
      fields.type = body.type.toLowerCase();
    }
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ success: false, error: 'Provide active, severity, or type to update.' }, { status: 400 });
    }

    const updated = await updateGeofence(id, fields);
    if (!updated) return NextResponse.json({ success: false, error: 'Geofence not found or could not be saved.' }, { status: 404 });
    return NextResponse.json({ success: true, geofence: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Could not update geofence.' }, { status: 500 });
  }
}
