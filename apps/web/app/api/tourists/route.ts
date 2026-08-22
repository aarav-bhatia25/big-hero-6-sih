import { NextRequest, NextResponse } from "next/server";
import { getTouristsCollection } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const touristId = searchParams.get("touristId") || "TOUR-7890";

  try {
    const col = await getTouristsCollection();
    let tourist = col ? await col.findOne({ touristId }) : null;

    if (!tourist) {
      // Fallback mock object if database is initializing
      tourist = {
        touristId: "TOUR-7890",
        name: "Ralston",
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
  try {
    const body = await request.json();
    const { touristId = "TOUR-7890", trackingConsent, preferences } = body;

    const col = await getTouristsCollection();
    if (col) {
      const updateFields: any = {};
      if (typeof trackingConsent === "boolean") updateFields.trackingConsent = trackingConsent;
      if (preferences) updateFields.preferences = preferences;

      await col.updateOne({ touristId }, { $set: updateFields });
    }

    return NextResponse.json({ success: true, message: "Tourist preferences updated" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
