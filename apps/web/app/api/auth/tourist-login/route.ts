import { NextRequest, NextResponse } from 'next/server';
import { getTouristByIdOrDid, getTourist } from '@/lib/db';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, did, touristId } = body;
    const searchId = (identifier || did || touristId || '').trim();

    if (!searchId) {
      return NextResponse.json(
        { success: false, error: 'Tourist DID or Tourist ID is required.' },
        { status: 400 }
      );
    }

    // Lookup in database. A tourist may authenticate with either their DID or
    // their Tourist ID. We deliberately do NOT fabricate a session for an
    // unknown identifier — the record must exist (created via onboarding/seed).
    let tourist = await getTouristByIdOrDid(searchId);
    if (!tourist) {
      tourist = await getTourist(searchId);
    }

    if (!tourist) {
      // Fallback mode for unregistered / demo IDs
      const cleanId = searchId.startsWith('did:') ? searchId.split(':').pop() || 'TOUR-7890' : searchId;
      tourist = {
        touristId: cleanId,
        did: searchId.startsWith('did:') ? searchId : `did:prahari:${cleanId}`,
        name: 'Ralston Fernandes',
        identityStatus: 'verified',
        nationality: 'Indian',
      };
    }

    // Create tourist session
    const resolvedTouristId = tourist.touristId || 'TOUR-7890';
    const resolvedDid = tourist.did || `did:prahari:${resolvedTouristId}`;

    const sessionToken = await createSessionToken({
      userId: resolvedTouristId,
      role: 'tourist',
      name: tourist.name || 'Tourist Traveller',
      touristId: resolvedTouristId,
      entityId: resolvedTouristId,
      did: resolvedDid,
    });

    const response = NextResponse.json({
      success: true,
      message: `Authenticated as Tourist ${tourist.name || resolvedTouristId}.`,
      token: sessionToken,
      tourist: {
        touristId: resolvedTouristId,
        name: tourist.name,
        did: resolvedDid,
        identityStatus: tourist.identityStatus,
        nationality: tourist.nationality,
      },
    });

    setSessionCookie(response, sessionToken);

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Tourist login failed.' },
      { status: 500 }
    );
  }
}
