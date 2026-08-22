import { NextRequest, NextResponse } from 'next/server';
import { listIncidentsWithEfir, upsertIncident, listIncidents } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      incidentId,
      touristId = 'DTI-IND-000123',
      touristName = 'Demo Tourist',
      passportAadhaar = 'XXXX-XXXX-8921',
      incidentType = 'SOS Panic Trigger',
      location = { lat: 19.0760, lng: 72.8777, address: 'Docklands Sector B' },
      clothingProfile = 'Black Jacket, Blue Jeans, Red Backpack',
      emergencyContact = 'Ananya Sharma (+91 98765 43210)',
    } = body;

    const efirId = `EFIR-${Date.now()}`;
    const draftEfIR = {
      efirId,
      incidentId: incidentId || `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      touristId,
      touristName,
      passportAadhaar,
      incidentType,
      location,
      clothingProfile,
      emergencyContact,
      status: 'DRAFT_GENERATED',
      policeVerification: 'PENDING_OFFICER_APPROVAL',
      createdAt: new Date().toISOString(),
    };

    // Attach the draft to the incident, creating a stub incident if absent.
    const existing = (await listIncidents(100)).find(
      (i: any) => i.incidentId === draftEfIR.incidentId
    );
    await upsertIncident({
      ...(existing ?? {
        incidentId: draftEfIR.incidentId,
        touristId,
        touristName,
        type: 'SOS',
        status: 'new',
        location,
        severity: 'critical',
      }),
      efirDraft: draftEfIR,
    });

    return NextResponse.json({
      success: true,
      message: 'Automated E-FIR draft successfully generated and queued for officer verification.',
      efir: draftEfIR,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const incidentsWithEfir = await listIncidentsWithEfir();

    return NextResponse.json({ success: true, efirs: incidentsWithEfir.map((i) => i.efirDraft) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
