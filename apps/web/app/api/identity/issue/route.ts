import { NextRequest, NextResponse } from "next/server";
import { kycProvider } from "@/lib/kyc/sandboxProvider";
import { issueCredential } from "@/lib/identity/credential";
import {
  upsertTourist, getTouristBySubjectHash, logCredentialIssuance, updateTourist, isSupabaseConfigured,
} from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { anchorCredential } from "@/lib/blockchain/registry";

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

    // Anchor the credential hash on-chain (best-effort — never blocks issuance).
    // Only the hash goes on-chain; no PII. Returns null if no chain is configured.
    let anchor: { txHash: string; chainId: number; alreadyAnchored?: boolean } | null = null;
    try {
      const result = await anchorCredential(issued.credentialHash, issued.expiresAt);
      if (result) {
        anchor = result;
        if (result.txHash) {
          await updateTourist(touristId, {
            anchorTxHash: result.txHash,
            anchorChainId: result.chainId,
          });
        }
      }
    } catch (err) {
      console.warn("[prahari] anchoring skipped:", err);
    }

    const sessionToken = await createSessionToken({
      userId: touristId,
      role: 'tourist',
      name: subject.fullName,
      touristId,
      entityId: touristId,
      did: issued.did,
    });

    const response = NextResponse.json({
      ok: true,
      touristId,
      did: issued.did,
      credentialHash: issued.credentialHash,
      expiresAt: issued.expiresAt,
      credential: issued.credential,
      reissued: Boolean(existing),
      anchorTxHash: anchor?.txHash || null,
      anchorChainId: anchor?.chainId ?? null,
      anchored: Boolean(anchor),
      token: sessionToken,
    });

    setSessionCookie(response, sessionToken);

    return response;
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
