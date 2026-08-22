import { NextRequest, NextResponse } from 'next/server';
import { getTourist, updateTourist, upsertTourist } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      touristId = 'DTI-IND-000123',
      top = 'Black Water-resistant Jacket',
      bottom = 'Dark Blue Denim Jeans',
      footwear = 'Grey Trekking Boots',
      accessories = 'Red Backpack, Silver Watch',
      additionalNotes = 'Spotted near docklands trail at 18:30',
    } = body;

    const clothingProfile = {
      touristId,
      top,
      bottom,
      footwear,
      accessories,
      additionalNotes,
      structuredDescription: `Top: ${top} | Bottom: ${bottom} | Footwear: ${footwear} | Items: ${accessories}`,
      updatedAt: new Date().toISOString(),
    };

    // upsert: update if the tourist exists, otherwise create a minimal record
    const existing = await getTourist(touristId);
    if (existing) {
      await updateTourist(touristId, { clothingProfile });
    } else {
      await upsertTourist({ touristId, name: touristId, clothingProfile });
    }

    return NextResponse.json({
      success: true,
      message: 'Emergency AI clothing profile saved successfully.',
      clothingProfile,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
