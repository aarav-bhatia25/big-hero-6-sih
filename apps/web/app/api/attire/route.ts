import { NextRequest, NextResponse } from 'next/server';
import { getTourist, updateTourist } from '@/lib/db';
import { requireAuth, canAccessTouristData } from '@/lib/auth/guards';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['tourist', 'authority', 'admin', 'responder']);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;

  try {
    const body = await request.json();
    const {
      top = '',
      bottom = '',
      footwear = '',
      accessories = '',
      additionalNotes = '',
    } = body;
    const touristId = body.touristId ?? session.touristId;

    if (!touristId) {
      return NextResponse.json({ success: false, error: 'An authenticated tourist identity is required.' }, { status: 400 });
    }

    if (!canAccessTouristData(session, touristId)) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot update another tourist's clothing profile." },
        { status: 403 }
      );
    }

    const fields = { top, bottom, footwear, accessories, additionalNotes };
    if (!Object.values(fields).some((value) => typeof value === 'string' && value.trim())) {
      return NextResponse.json({ success: false, error: 'Add at least one description before saving.' }, { status: 400 });
    }

    const clothingProfile = {
      touristId,
      top: String(top).slice(0, 200),
      bottom: String(bottom).slice(0, 200),
      footwear: String(footwear).slice(0, 200),
      accessories: String(accessories).slice(0, 400),
      additionalNotes: String(additionalNotes).slice(0, 1000),
      structuredDescription: `Top: ${top || 'Not supplied'} | Bottom: ${bottom || 'Not supplied'} | Footwear: ${footwear || 'Not supplied'} | Items: ${accessories || 'Not supplied'}`,
      updatedAt: new Date().toISOString(),
    };

    // This is a traveller-provided record, not an AI inference. Never create a
    // synthetic tourist record when the authenticated identity is missing.
    const existing = await getTourist(touristId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Tourist record not found.' }, { status: 404 });
    }
    if (!await updateTourist(touristId, { clothingProfile })) {
      return NextResponse.json({ success: false, error: 'Could not save the attire record.' }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      message: 'Traveller-provided attire record saved.',
      clothingProfile,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
