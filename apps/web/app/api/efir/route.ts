import { NextRequest, NextResponse } from 'next/server';
import { listIncidentsWithEfir, upsertIncident, listIncidents, updateIncident } from '@/lib/db';
import { emitToGateway } from '@/lib/services/gatewayEmit';
import { requireAuth } from '@/lib/auth/guards';

export async function POST(request: NextRequest) {
  const auth = requireAuth(request, ['tourist', 'authority', 'admin', 'responder']);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;

  try {
    const body = await request.json();
    const {
      incidentId,
      touristId = session.touristId || 'DTI-IND-000123',
      touristName = session.name || 'Demo Tourist',
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

export async function GET(request: NextRequest) {
  const auth = requireAuth(request, ['authority', 'admin', 'responder']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const incidentsWithEfir = await listIncidentsWithEfir();

    return NextResponse.json({ success: true, efirs: incidentsWithEfir.map((i) => ({ ...i.efirDraft, _incidentId: i.incidentId })) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Officer verification step for an E-FIR draft.
 * Accepts: { incidentId, action: 'APPROVE' | 'REJECT', officerName?, officerBadge?, remarks? }
 */
export async function PATCH(request: NextRequest) {
  const auth = requireAuth(request, ['authority', 'admin']);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;

  try {
    const body = await request.json();
    const { incidentId, action, officerName = session.name, officerBadge = session.badge || 'AUTH-001', remarks } = body;

    if (!incidentId || !action) {
      return NextResponse.json(
        { success: false, error: "incidentId and action ('APPROVE' or 'REJECT') are required" },
        { status: 400 }
      );
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { success: false, error: "action must be 'APPROVE' or 'REJECT'" },
        { status: 400 }
      );
    }

    // Find the incident with the E-FIR draft
    const allIncidents = await listIncidents(200);
    const incident = allIncidents.find((i: any) => i.incidentId === incidentId && i.efirDraft);

    if (!incident) {
      return NextResponse.json(
        { success: false, error: `Incident ${incidentId} not found or has no E-FIR draft` },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const updatedDraft = {
      ...incident.efirDraft,
      policeVerification: action === 'APPROVE' ? 'OFFICER_VERIFIED' : 'REJECTED',
      status: action === 'APPROVE' ? 'OFFICER_VERIFIED' : 'REJECTED',
      verifiedAt: now,
      verifiedBy: officerName || 'Authority Officer',
      officerBadge: officerBadge || null,
      remarks: remarks || null,
    };

    const updated = await updateIncident(incidentId, { efirDraft: updatedDraft });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Failed to update incident' },
        { status: 500 }
      );
    }

    emitToGateway('incident:update', { incidentId, efirDraft: updatedDraft });

    return NextResponse.json({
      success: true,
      message: `E-FIR ${action === 'APPROVE' ? 'approved' : 'rejected'} by ${officerName || 'Authority Officer'}`,
      efir: updatedDraft,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

