import { NextRequest, NextResponse } from 'next/server';
import { getTouristByIdOrDid } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Looks up a tourist by business id or DID. No mock fallback: an unknown id is a 404. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tourist = await getTouristByIdOrDid(decodeURIComponent(id));

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
