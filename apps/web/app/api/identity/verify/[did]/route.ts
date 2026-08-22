import { NextRequest, NextResponse } from "next/server";
import { getTouristByDid } from "@/lib/db";
import { verifyCredential } from "@/lib/identity/credential";

export const dynamic = "force-dynamic";

/**
 * Public credential verification — what an authority scanning the QR hits.
 * Returns only what is needed to confirm validity, never the full profile.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ did: string }> }) {
  try {
    const { did } = await params;
    const tourist = await getTouristByDid(decodeURIComponent(did));

    if (!tourist) {
      return NextResponse.json({ ok: false, valid: false, error: "No credential found for this DID." }, { status: 404 });
    }

    if (tourist.credentialStatus === "revoked" || tourist.credentialStatus === "suspended") {
      return NextResponse.json({
        ok: true, valid: false, reason: `Credential is ${tourist.credentialStatus}.`,
        did: tourist.did, status: tourist.credentialStatus,
      });
    }

    const result = verifyCredential(tourist.credential);

    return NextResponse.json({
      ok: true,
      valid: result.valid,
      ...(result.reason ? { reason: result.reason } : {}),
      did: tourist.did,
      touristId: tourist.touristId,
      holderName: tourist.name,
      nationality: tourist.nationality,
      identityStatus: tourist.identityStatus,
      credentialHash: tourist.credentialHash,
      issuedAt: tourist.kycVerifiedAt,
      expiresAt: tourist.credential?.expirationDate ?? null,
      kycMethod: tourist.kycMethod,
      sandbox: Boolean(tourist.credential?.sandbox),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
