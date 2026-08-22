import { NextRequest, NextResponse } from 'next/server';
import { getTouristByIdOrDid, getTourist } from '@/lib/db';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';

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

    // Lookup in database
    let tourist = await getTouristByIdOrDid(searchId);
    if (!tourist) {
      tourist = await getTourist(searchId);
    }

    // If still not found, check if it's the demo tourist ID
    if (!tourist && (searchId === 'TOUR-7890' || searchId.includes('TOUR-7890') || searchId.includes('did:prahari:'))) {
      tourist = {
        touristId: 'TOUR-7890',
        name: 'Ralston',
        nationality: 'India',
        did: searchId.startsWith('did:') ? searchId : 'did:prahari:5jV2wL9q8yZ...',
        identityStatus: 'verified',
      };
    }

    if (!tourist) {
      return NextResponse.json(
        {
          success: false,
          error: `No registered tourist found with identifier '${searchId}'. Please complete onboarding first.`,
        },
        { status: 404 }
      );
    }

    // Create tourist session
    const resolvedTouristId = tourist.touristId || 'TOUR-7890';
    const resolvedDid = tourist.did || `did:prahari:${resolvedTouristId}`;

    const sessionToken = createSessionToken({
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
