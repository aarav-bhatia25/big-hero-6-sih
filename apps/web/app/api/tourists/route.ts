import { NextRequest, NextResponse } from "next/server";
import { getTourist, updateTourist } from "@/lib/db";
import { requireAuth, canAccessTouristData } from "@/lib/auth/guards";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;
  const { searchParams } = new URL(request.url);
  const requestedId = searchParams.get("touristId");

  // Determine target tourist ID
  const targetId = requestedId || (session.role === 'tourist' ? session.touristId : 'TOUR-7890') || 'TOUR-7890';

  if (!canAccessTouristData(session, targetId)) {
    return NextResponse.json(
      { success: false, error: "Forbidden: You are not authorized to view this tourist record." },
      { status: 403 }
    );
  }

  try {
    let tourist: any = await getTourist(targetId);

    if (!tourist) {
      // Fallback mock object if database is initializing
      tourist = {
        touristId: targetId,
        name: session.name || "Ralston",
        nationality: "Indian",
        identityStatus: "verified",
        emergencyContacts: [
          { name: "Ananya Sharma", phone: "+91 98765 43210", relationship: "Sister" },
          { name: "Rajesh Kumar", phone: "+91 98123 45678", relationship: "Friend" },
        ],
        accommodation: {
          hotelName: "Heritage Palace Resort",
          address: "Amer Road, Pink City",
          city: "Jaipur",
        },
        preferences: {
          language: "English",
          notificationMode: "push",
        },
        trackingConsent: true,
        createdAt: new Date(),
      };
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
    const { touristId = session.touristId || "TOUR-7890", trackingConsent, preferences } = body;

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

