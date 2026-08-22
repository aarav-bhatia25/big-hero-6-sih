import { NextRequest, NextResponse } from 'next/server';
import { getTouristsCollection } from '@/lib/db';
import { MOCK_DEMO_TOURIST } from '@/lib/services/digitalId';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const col = await getTouristsCollection();
    let tourist = col ? await col.findOne({ $or: [{ touristId: id }, { did: id }] }) : null;

    if (!tourist) {
      // Fallback mock tourist record for demo verification
      if (id === MOCK_DEMO_TOURIST.touristId || id === MOCK_DEMO_TOURIST.did || id === 'DTI-IND-000123') {
        return NextResponse.json({
          success: true,
          tourist: {
            touristId: MOCK_DEMO_TOURIST.touristId,
            name: MOCK_DEMO_TOURIST.name,
            nationality: MOCK_DEMO_TOURIST.nationality,
            identityStatus: 'verified',
            did: MOCK_DEMO_TOURIST.did,
            issueDate: MOCK_DEMO_TOURIST.issueDate,
            emergencyContacts: [
              { name: 'Ananya', phone: '+91 98765 43210', relationship: 'Spouse' },
            ],
            accommodation: {
              hotelName: 'Heritage Palace Resort',
              address: 'Johari Bazaar, Pink City',
              city: 'Jaipur',
            },
            status: 'SAFE',
            riskScore: 15,
          },
        });
      }

      return NextResponse.json({ success: false, error: 'Tourist not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, tourist });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Error fetching tourist identity' }, { status: 500 });
  }
}
