import { NextRequest, NextResponse } from 'next/server';
import { getTouristByIdOrDid } from '@/lib/db';
import { requireAuth, canAccessTouristData } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

/** Looks up a tourist by business id or DID. No mock fallback: an unknown id is a 404. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);

    if (!canAccessTouristData(auth.session, decodedId)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to access this tourist profile.' },
        { status: 403 }
      );
    }

    const tourist = await getTouristByIdOrDid(decodedId);

    if (!tourist) {
      return NextResponse.json({ success: false, error: 'Tourist not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, tourist });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error fetching tourist identity' },
      { status: 500 }
    );
  }
}

