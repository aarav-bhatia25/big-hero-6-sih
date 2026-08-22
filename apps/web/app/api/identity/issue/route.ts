import { NextRequest, NextResponse } from "next/server";
import { kycProvider } from "@/lib/kyc/sandboxProvider";
import { issueCredential } from "@/lib/identity/credential";
import {
  upsertTourist, getTouristBySubjectHash, logCredentialIssuance, isSupabaseConfigured,
} from "@/lib/db";

export const dynamic = "force-dynamic";

/** Stable, human-readable tourist id: DTI-<ISO3>-<6 digits>. */
function makeTouristId(nationalityCode: string, subjectHash: string): string {
  const n = parseInt(subjectHash.slice(0, 8), 16) % 1_000_000;
  return `DTI-${nationalityCode}-${String(n).padStart(6, "0")}`;
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: false, error: "Database not configured." }, { status: 503 });
  }

  try {
    const { sessionId, otp, emergencyContacts, accommodation, trackingConsent } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "sessionId is required." }, { status: 400 });
    }

    // Re-verify rather than trusting the client's claim that KYC succeeded.
    const verification = await kycProvider.verify({ sessionId, otp });
    if (!verification.ok) {
      return NextResponse.json({ ok: false, error: verification.error }, { status: 400 });
    }

    const subject = verification.subject;

    // Same document -> same DID. Re-enrolment updates rather than duplicates.
    const existing = await getTouristBySubjectHash(subject.subjectHash);
    const touristId = existing?.touristId ?? makeTouristId(subject.nationalityCode, subject.subjectHash);

    const issued = issueCredential(subject, touristId, kycProvider.id, kycProvider.isSandbox);

    const saved = await upsertTourist({
      touristId,
      name: subject.fullName,
      nationality: subject.nationality,
      nationalityCode: subject.nationalityCode,
      identityStatus: "verified",
      did: issued.did,
      issueDate: new Date().toISOString().slice(0, 10),
      didDocument: issued.didDocument,
      credential: issued.credential,
      credentialHash: issued.credentialHash,
      credentialStatus: "active",
      kycMethod: subject.documentType,
      kycProvider: kycProvider.id,
      kycVerifiedAt: new Date().toISOString(),
      kycSubjectHash: subject.subjectHash,
      trackingConsent: trackingConsent ?? true,
      ...(emergencyContacts ? { emergencyContacts } : {}),
      ...(accommodation ? { accommodation } : {}),
      ...(existing ? {} : { createdAt: new Date().toISOString() }),
    });

    if (!saved) {
      return NextResponse.json(
        { ok: false, error: "Credential was issued but could not be saved." },
        { status: 500 }
      );
    }

    await logCredentialIssuance({
      touristId,
      did: issued.did,
      credentialHash: issued.credentialHash,
      kycMethod: subject.documentType,
      kycProvider: kycProvider.id,
      action: existing ? "reinstated" : "issued",
    });

    return NextResponse.json({
      ok: true,
      touristId,
      did: issued.did,
      credentialHash: issued.credentialHash,
      expiresAt: issued.expiresAt,
      credential: issued.credential,
      reissued: Boolean(existing),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
