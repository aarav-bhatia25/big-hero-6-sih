import { NextRequest, NextResponse } from "next/server";
import { listActiveGeofences, insertGeofence } from "@/lib/db";
import { requireAuth } from "@/lib/auth/guards";

export async function GET() {
  try {
    let geofences: any[] = await listActiveGeofences();

    if (geofences.length === 0) {
      // Fallback mock geofences
      geofences = [
        {
          name: "Pink City Central Safe Zone",
          type: "safe_zone",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [75.78, 26.91],
                [75.83, 26.91],
                [75.83, 26.95],
                [75.78, 26.95],
                [75.78, 26.91],
              ],
            ],
          },
          severity: "low",
          active: true,
          metadata: { description: "High security tourist hub with 24/7 patrol" },
        },
        {
          name: "Nahargarh Cliff Restricted Area",
          type: "restricted",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [75.81, 26.935],
                [75.825, 26.935],
                [75.825, 26.948],
                [75.81, 26.948],
                [75.81, 26.935],
              ],
            ],
          },
          severity: "high",
          active: true,
          metadata: { description: "Steep terrain; unauthorized access after 7 PM prohibited" },
        },
      ];
    }

    return NextResponse.json({ success: true, geofences });
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
    return NextResponse.json({ success: true, geofence: saved ?? newGeofence });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Error creating geofence' }, { status: 500 });
  }
}

