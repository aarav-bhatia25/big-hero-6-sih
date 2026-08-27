import { NextRequest, NextResponse } from 'next/server';
import { getTouristByIdOrDid, updateTourist } from '@/lib/db';
import { canAccessTouristData, requireAuth } from '@/lib/auth/guards';
import { createEmergencyClothingProfile } from '@/lib/services/emergencyClothingProfile';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await params;
  const touristId = decodeURIComponent(id);
  if (auth.session.role !== 'tourist' || !canAccessTouristData(auth.session, touristId)) {
    return NextResponse.json({ success: false, error: 'Only the traveller may create their emergency identification profile.' }, { status: 403 });
  }

  try {
    const tourist = await getTouristByIdOrDid(touristId);
    if (!tourist) return NextResponse.json({ success: false, error: 'Tourist not found.' }, { status: 404 });

    const form = await request.formData();
    const notes = String(form.get('notes') ?? '').trim().slice(0, 1_000);
    const photo = form.get('photo');
    let imageDataUrl: string | undefined;

    if (photo instanceof File) {
      if (!IMAGE_TYPES.has(photo.type)) {
        return NextResponse.json({ success: false, error: 'Use a JPEG, PNG, or WebP photo.' }, { status: 400 });
      }
      if (photo.size === 0 || photo.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ success: false, error: 'The photo must be between 1 byte and 5 MB.' }, { status: 400 });
      }
      const bytes = Buffer.from(await photo.arrayBuffer());
      imageDataUrl = `data:${photo.type};base64,${bytes.toString('base64')}`;
    }

    if (!imageDataUrl && !notes) {
      return NextResponse.json({ success: false, error: 'Add a photo or a written clothing description.' }, { status: 400 });
    }

    const profile = await createEmergencyClothingProfile({ imageDataUrl, manualNotes: notes });
    const stored = await updateTourist(tourist.touristId, { clothingProfile: profile });
    if (!stored) {
      return NextResponse.json({ success: false, error: 'The profile was generated but could not be saved.' }, { status: 503 });
    }

    // The original photo is intentionally never persisted. Only this structured,
    // authority-accessible description is retained for emergency use.
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Could not create the emergency profile.' }, { status: 500 });
  }
}
