import { NextRequest, NextResponse } from "next/server";
import { insertLocation, listLocations } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { touristId = "TOUR-7890", lat, lng, accuracy = 5, source = "gps" } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ success: false, error: "Invalid coordinates" }, { status: 400 });
    }

    const ping = {
      touristId,
      coordinates: { lat, lng },
      timestamp: new Date().toISOString(),
      accuracy,
      source,
    };

    await insertLocation({ ...ping, lat, lng });

    return NextResponse.json({ success: true, ping });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const touristId = searchParams.get("touristId") || "TOUR-7890";

  try {
    const history = await listLocations(touristId, 50);

    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
