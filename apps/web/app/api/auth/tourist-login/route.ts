import { NextRequest, NextResponse } from 'next/server';
import { getTouristByIdOrDid } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/crypto';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Restores a traveller session only with the recovery code issued at verified
 * onboarding. A DID or tourist ID identifies the record; it is not a secret
 * and can never by itself grant access to the protected tourist dashboard.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const searchId = String(body.identifier || body.did || body.touristId || '').trim();
    const recoveryAccessCode = String(body.recoveryAccessCode || '').trim();

    if (!searchId || !recoveryAccessCode) {
      return NextResponse.json({ success: false, error: 'Tourist ID or DID and the onboarding recovery code are required.' }, { status: 400 });
    }
    if (searchId.length > 300 || recoveryAccessCode.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid sign-in details.' }, { status: 400 });
    }

    const tourist = await getTouristByIdOrDid(searchId);
    if (!tourist || tourist.identityStatus !== 'verified' || !tourist.touristAccessCodeHash || !tourist.touristAccessCodeSalt) {
      return NextResponse.json({ success: false, error: 'Sign-in could not be verified. Re-enrol if this credential was issued before recovery codes were enabled.' }, { status: 401 });
    }
    if (!verifyPassword(recoveryAccessCode, tourist.touristAccessCodeHash, tourist.touristAccessCodeSalt)) {
      return NextResponse.json({ success: false, error: 'Sign-in could not be verified.' }, { status: 401 });
    }

    const sessionToken = await createSessionToken({
      userId: tourist.touristId,
      role: 'tourist',
      name: tourist.name || 'Traveller',
      touristId: tourist.touristId,
      entityId: tourist.touristId,
      did: tourist.did,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Traveller session restored.',
      tourist: {
        touristId: tourist.touristId,
        name: tourist.name,
        did: tourist.did,
        identityStatus: tourist.identityStatus,
        nationality: tourist.nationality,
      },
    });
    setSessionCookie(response, sessionToken);
    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Traveller sign-in failed.' }, { status: 500 });
  }
}
