import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { getNearbyIndiaHazards } from '@/lib/services/indiaHazards';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  const radiusKm = Number(searchParams.get('radiusKm') || '10');

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ success: false, error: 'Valid latitude and longitude are required.' }, { status: 400 });
  }
  if (!Number.isFinite(radiusKm) || radiusKm < 1 || radiusKm > 50) {
    return NextResponse.json({ success: false, error: 'radiusKm must be between 1 and 50.' }, { status: 400 });
  }

  const feed = await getNearbyIndiaHazards({ lat, lng }, radiusKm);
  return NextResponse.json({ success: true, ...feed, location: { lat, lng }, radiusKm });
}
