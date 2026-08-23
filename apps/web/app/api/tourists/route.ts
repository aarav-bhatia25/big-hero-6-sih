import { NextRequest, NextResponse } from "next/server";
import { getTourist, listTourists, updateTourist } from "@/lib/db";
import { requireAuth, canAccessTouristData } from "@/lib/auth/guards";
import { operationalTourists } from "@/lib/operationalData";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;
  const { searchParams } = new URL(request.url);
  const requestedId = searchParams.get("touristId");

  if (!requestedId && ['authority', 'admin', 'responder'].includes(session.role)) {
    try {
      return NextResponse.json({ success: true, tourists: operationalTourists(await listTourists()) });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  }

  const targetId = requestedId || session.touristId;
  if (!targetId) {
    return NextResponse.json({ success: false, error: "A tourist ID is required." }, { status: 400 });
  }

  if (!canAccessTouristData(session, targetId)) {
    return NextResponse.json(
      { success: false, error: "Forbidden: You are not authorized to view this tourist record." },
      { status: 403 }
    );
  }

  try {
    const tourist: any = await getTourist(targetId);
    if (!tourist) {
      return NextResponse.json({ success: false, error: "Tourist not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, tourist });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;

  try {
    const body = await request.json();
    const { trackingConsent, preferences } = body;
    const touristId = body.touristId ?? session.touristId;
    if (!touristId) {
      return NextResponse.json({ success: false, error: "A tourist ID is required." }, { status: 400 });
    }

    if (!canAccessTouristData(session, touristId)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot modify other tourists' settings." },
        { status: 403 }
      );
    }

    const updateFields: any = {};
    if (typeof trackingConsent === "boolean") updateFields.trackingConsent = trackingConsent;
    if (preferences) updateFields.preferences = preferences;
    if (Object.keys(updateFields).length) await updateTourist(touristId, updateFields);

    return NextResponse.json({ success: true, message: "Tourist preferences updated" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
