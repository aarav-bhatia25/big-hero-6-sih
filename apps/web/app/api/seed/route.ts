import { NextRequest, NextResponse } from "next/server";
import { issueCredential } from "@/lib/identity/credential";
import { hashSubject } from "@/lib/kyc/hash";
import { kycProvider } from "@/lib/kyc/sandboxProvider";
import {
  upsertTourist,
  updateTourist,
  logCredentialIssuance,
  insertLocation,
  replaceGeofences,
  replaceResponders,
  upsertIncident,
  upsertUser,
  listUsers,
  isSupabaseConfigured,
} from "@/lib/db";
import { anchorCredential } from "@/lib/blockchain/registry";
import { hashPassword } from "@/lib/auth/crypto";
import { requireAuth } from "@/lib/auth/guards";

export async function POST(request: NextRequest) {
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

  // Allow unauthenticated seed ONLY if database has 0 users (initial bootstrap).
  // Once any user exists, seeding is an admin-only operation.
  const existingUsers = await listUsers();
  if (existingUsers.length > 0) {
    const auth = await requireAuth(request, ['admin']);
    if (auth.errorResponse) return auth.errorResponse;
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

    // 1b. Anchor the seeded credential on-chain (best-effort, non-fatal).
    try {
      const anchor = await anchorCredential(seedIdentity.credentialHash, seedIdentity.expiresAt);
      if (anchor?.txHash) {
        await updateTourist("TOUR-7890", {
          anchorTxHash: anchor.txHash,
          anchorChainId: anchor.chainId,
        });
      }
    } catch (err) {
      console.warn("[prahari] seed anchoring skipped:", err);
    }

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

    // 6. Seed staff users for RBAC authentication
    const adminPass = hashPassword("Admin@123");
    const authPass = hashPassword("Officer@123");
    const respPass = hashPassword("Unit17@123");

    await Promise.all([
      upsertUser({
        userId: "USR-ADMIN-01",
        email: "admin@prahari.gov.in",
        passwordHash: adminPass.hash,
        salt: adminPass.salt,
        name: "Chief Admin Officer",
        role: "admin",
        department: "Ministry of Tourism & Home Affairs",
        badge: "ADM-001",
        phone: "+91 98000 00001",
        active: true,
      }),
      upsertUser({
        userId: "USR-AUTH-01",
        email: "officer.sharma@police.gov.in",
        passwordHash: authPass.hash,
        salt: authPass.salt,
        name: "Inspector Vikram Sharma",
        role: "authority",
        department: "District Police Control Room",
        badge: "AUTH-109",
        phone: "+91 98000 00109",
        active: true,
      }),
      upsertUser({
        userId: "USR-RESP-17",
        email: "unit17@dispatch.gov.in",
        passwordHash: respPass.hash,
        salt: respPass.salt,
        name: "Unit #17 Patrol Lead",
        role: "responder",
        entityId: "Unit #17",
        department: "Emergency Quick Response Team",
        badge: "QRT-017",
        phone: "+91 98765 00017",
        active: true,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message:
        "Database successfully seeded with Tourist, Location, Geofence, Incident, Responders, and Staff Users.",
      touristId: "TOUR-7890",
      did: seedIdentity.did,
      credentialHash: seedIdentity.credentialHash,
      staffAccounts: [
        { email: "admin@prahari.gov.in", role: "admin", defaultPassword: "Admin@123" },
        { email: "officer.sharma@police.gov.in", role: "authority", defaultPassword: "Officer@123" },
        { email: "unit17@dispatch.gov.in", role: "responder", defaultPassword: "Unit17@123" },
      ],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

