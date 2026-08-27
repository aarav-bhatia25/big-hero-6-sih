import { NextRequest, NextResponse } from 'next/server';
import { getTouristByDid } from '@/lib/db';
import { verifyCredential } from '@/lib/identity/credential';
import { verifyOnChain } from '@/lib/blockchain/registry';

export const dynamic = 'force-dynamic';

function sameValue(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

/**
 * Public, privacy-minimised credential verification for a Digital Tourist ID QR.
 * It intentionally never returns the holder's profile, nationality, contacts,
 * document metadata, or location. Those remain in the signed-in authority case
 * workflow, where access is audited.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ did: string }> }) {
  try {
    const { did } = await params;
    const tourist = await getTouristByDid(decodeURIComponent(did));

    if (!tourist) {
      return NextResponse.json({ ok: false, valid: false, error: 'No credential found for this DID.' }, { status: 404 });
    }

    const presentedHash = new URL(request.url).searchParams.get('h');
    const hasQrProof = Boolean(presentedHash);
    const qrProofMatches = Boolean(
      presentedHash && tourist.credentialHash && sameValue(presentedHash, tourist.credentialHash)
    );

    if (hasQrProof && !qrProofMatches) {
      return NextResponse.json({
        ok: true,
        valid: false,
        did: tourist.did,
        credentialStatus: tourist.credentialStatus ?? 'unknown',
        verificationMethod: 'QR claim hash',
        reason: 'The QR claim does not match the current credential.',
      });
    }

    if (tourist.credentialStatus === 'revoked' || tourist.credentialStatus === 'suspended') {
      return NextResponse.json({
        ok: true,
        valid: false,
        reason: `Credential is ${tourist.credentialStatus}.`,
        did: tourist.did,
        credentialStatus: tourist.credentialStatus,
        verificationMethod: hasQrProof ? 'QR claim hash' : 'Direct DID lookup',
      });
    }

    const signature = verifyCredential(tourist.credential);
    const onChain = tourist.credentialHash ? await verifyOnChain(tourist.credentialHash) : null;
    const blockchainValid = onChain ? onChain.exists && onChain.isValid : null;
    const valid = signature.valid && blockchainValid !== false;

    return NextResponse.json({
      ok: true,
      valid,
      ...(signature.reason ? { reason: signature.reason } : {}),
      did: tourist.did,
      credentialStatus: tourist.credentialStatus ?? 'active',
      verificationMethod: hasQrProof ? 'QR claim hash + signed credential' : 'Direct DID lookup + signed credential',
      issuedAt: tourist.kycVerifiedAt,
      expiresAt: tourist.credential?.expirationDate ?? null,
      sandbox: Boolean(tourist.credential?.sandbox),
      blockchain: onChain
        ? {
            anchored: onChain.exists,
            valid: onChain.isValid,
            state: onChain.state,
            chainId: onChain.chainId,
            txHash: tourist.anchorTxHash ?? null,
          }
        : null,
      disclosure: {
        personalDataDisclosed: false,
        detailAccess: 'Only a signed-in, authorised authority user in the protected case workflow can view protected tourist records.',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
