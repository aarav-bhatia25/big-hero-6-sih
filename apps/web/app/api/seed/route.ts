import { NextResponse } from "next/server";
import { issueCredential } from "@/lib/identity/credential";
import { hashSubject } from "@/lib/kyc/hash";
import { kycProvider } from "@/lib/kyc/sandboxProvider";
import {
  upsertTourist,
  logCredentialIssuance,
  insertLocation,
  replaceGeofences,
  replaceResponders,
  upsertIncident,
  isSupabaseConfigured,
} from "@/lib/db";

export async function POST() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local, then restart the dev server.",
      },
      { status: 503 }
    );
  }

  try {
    const now = new Date().toISOString();

    // 1. Tourist "Ralston" — issued a real signed credential so the demo
    //    starts from a genuinely verified identity, not a placeholder.
    const seedSubjectHash = hashSubject("234567890124", "aadhaar");
    const seedIdentity = issueCredential(
      {
        fullName: "Ralston",
        nationality: "India",
        nationalityCode: "IND",
        documentType: "aadhaar",
        maskedDocument: "XXXX-XXXX-0124",
        subjectHash: seedSubjectHash,
        meta: { validation: "Verhoeff checksum verified; seeded demo identity" },
      },
      "TOUR-7890",
      kycProvider.id,
      kycProvider.isSandbox
    );

    await upsertTourist({
      touristId: "TOUR-7890",
      name: "Ralston",
      nationality: "India",
      nationalityCode: "IND",
      identityStatus: "verified",
      did: seedIdentity.did,
      issueDate: now.slice(0, 10),
      didDocument: seedIdentity.didDocument,
      credential: seedIdentity.credential,
      credentialHash: seedIdentity.credentialHash,
      credentialStatus: "active",
      kycMethod: "aadhaar",
      kycProvider: kycProvider.id,
      kycVerifiedAt: now,
      kycSubjectHash: seedSubjectHash,
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
        medicalNotes: "No known allergies",
      },
      trackingConsent: true,
      createdAt: now,
    });

    await logCredentialIssuance({
      touristId: "TOUR-7890",
      did: seedIdentity.did,
      credentialHash: seedIdentity.credentialHash,
      kycMethod: "aadhaar",
      kycProvider: kycProvider.id,
      action: "issued",
    });

    // 2. Initial location ping
    await insertLocation({
      touristId: "TOUR-7890",
      coordinates: { lat: 26.9124, lng: 75.7873 },
      lat: 26.9124,
      lng: 75.7873,
      timestamp: now,
      accuracy: 5.2,
      source: "gps",
    });

    // 3. Geofences (replaces existing)
    await replaceGeofences([
      {
        name: "Pink City Central Safe Zone",
        type: "safe_zone",
        geometry: {
          type: "Polygon",
          coordinates: [[[75.78, 26.91], [75.83, 26.91], [75.83, 26.95], [75.78, 26.95], [75.78, 26.91]]],
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
          coordinates: [[[75.81, 26.935], [75.825, 26.935], [75.825, 26.948], [75.81, 26.948], [75.81, 26.935]]],
        },
        severity: "high",
        active: true,
        metadata: { description: "Steep terrain; unauthorized access after 7 PM prohibited" },
      },
    ]);

    // 4. Responders (replaces existing)
    await replaceResponders([
      {
        responderId: "RESP-POLICE-01",
        unitId: "Unit #17",
        name: "Police Patrol Unit 17",
        phone: "+91 98765 00017",
        department: "Police",
        type: "POLICE",
        location: { lat: 26.915, lng: 75.789 },
        status: "available",
        capabilities: ["First Aid", "Vehicle Patrol", "Multilingual"],
      },
      {
        responderId: "RESP-MED-02",
        unitId: "Unit #09",
        name: "SAR Medical Team 9",
        phone: "+91 98765 00009",
        department: "Medical",
        type: "MEDICAL",
        location: { lat: 26.92, lng: 75.795 },
        status: "available",
        capabilities: ["Ambulance", "Advanced Trauma Support"],
      },
    ]);

    // 5. Seed incident
    await upsertIncident({
      incidentId: "INC-SEED-01",
      touristId: "TOUR-7890",
      touristName: "Ralston",
      riskScore: 64,
      type: "geofence_breach",
      status: "new",
      location: { lat: 26.936, lng: 75.815, address: "Nahargarh Fort View Point" },
      severity: "medium",
      createdAt: now,
      assignedResponder: null,
      resolvedAt: null,
    });

    return NextResponse.json({
      success: true,
      message:
        "Database successfully seeded with initial Tourist, Location, Geofence, Incident, and Responder data.",
      touristId: "TOUR-7890",
      did: seedIdentity.did,
      credentialHash: seedIdentity.credentialHash,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
