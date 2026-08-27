import { NextRequest, NextResponse } from "next/server";
import { insertIncident, listIncidents, updateIncident, listResponders, getTourist } from "@/lib/db";
import { findNearestResponder } from "@/lib/services/dispatchEngine";
import { emitToGateway } from "@/lib/services/gatewayEmit";
import { canAccessTouristData, requireAuth } from "@/lib/auth/guards";
import { notifyEmergencyContacts } from "@/lib/services/emergencyNotifications";
import { isFixtureIncident, operationalIncidents, operationalResponders } from "@/lib/operationalData";
import { isTravellerAssistanceLanguageCode } from '@/lib/languages';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['tourist', 'authority', 'admin', 'responder']);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;

  try {
    const body = await request.json();
    const touristId = body.touristId ?? session.touristId;
    const touristName = body.touristName ?? session.name;
    const {
      type = "PANIC",
      location,
      lat,
      lng,
      severity = "CRITICAL",
      status = "ACTIVE",
      transportType = "INTERNET",
      hopCount = 0,
      originalTimestamp,
      relayPath,
      originDeviceId,
      packetId,
    } = body;
    const voiceStatement = typeof body.voiceStatement === 'string' ? body.voiceStatement.trim().slice(0, 2_000) : '';
    const voiceStatementLanguage = isTravellerAssistanceLanguageCode(body.voiceStatementLanguage)
      ? body.voiceStatementLanguage
      : null;

    const incidentLat = location?.lat ?? lat;
    const incidentLng = location?.lng ?? lng;
    const incidentId = body.incidentId ?? `INC-${Math.floor(1000 + Math.random() * 9000)}`;

    if (!touristId) {
      return NextResponse.json({ success: false, error: 'An authenticated tourist identity is required.' }, { status: 400 });
    }
    if (!canAccessTouristData(session, touristId)) {
      return NextResponse.json({ success: false, error: 'You cannot create an incident for another tourist.' }, { status: 403 });
    }
    if (!Number.isFinite(incidentLat) || !Number.isFinite(incidentLng)) {
      return NextResponse.json({ success: false, error: 'A valid emergency location is required.' }, { status: 400 });
    }
    if (body.voiceStatement != null && !voiceStatement) {
      return NextResponse.json({ success: false, error: 'A voice SOS statement must contain text.' }, { status: 400 });
    }
    if (body.voiceStatement != null && !voiceStatementLanguage) {
      return NextResponse.json({ success: false, error: 'Choose a supported language for the voice SOS statement.' }, { status: 400 });
    }
    const tourist = await getTourist(touristId);
    if (!tourist) {
      return NextResponse.json({ success: false, error: 'Tourist record not found.' }, { status: 404 });
    }
    // A queued browser retry and a BLE gateway uplink can carry the same
    // packet. Treat the incident ID as the idempotency key so the traveller
    // does not receive duplicate contact notifications or case records.
    const existingIncident = (await listIncidents(200)).find((item: any) => item.incidentId === incidentId);
    if (existingIncident) {
      if (existingIncident.touristId !== touristId) {
        return NextResponse.json({ success: false, error: 'An incident with this ID already exists.' }, { status: 409 });
      }
      return NextResponse.json({
        success: true,
        message: 'This SOS was already recorded in the Prahari authority queue.',
        incident: existingIncident,
        idempotent: true,
      });
    }
    // Matching is limited to responder units genuinely registered in the
    // database.  If none are available, the incident remains unassigned.
    const candidates = operationalResponders(await listResponders())
      .filter((responder: any) => String(responder.status ?? '').trim().toLowerCase() === 'available')
      .map((r: any) => ({
        id: r.id ?? r.responderId,
        unitId: r.unitId ?? r.responderId,
        name: r.name ?? r.responderId ?? 'Unnamed responder',
        type: r.type ?? r.department,
        phone: r.phone ?? '',
        lat: r.location?.lat,
        lng: r.location?.lng,
      }))
      .filter((r: any) => typeof r.lat === 'number' && typeof r.lng === 'number');

    const match = findNearestResponder(incidentLat, incidentLng, candidates);

    const incident = {
      incidentId,
      touristId,
      touristName: tourist.name ?? touristName ?? touristId,
      type,
      status,
      location: { lat: incidentLat, lng: incidentLng, ...(location?.address || body.address ? { address: location?.address ?? body.address } : {}) },
      severity,
      riskScore: severity === 'CRITICAL' ? 95 : 75,
      createdAt: new Date().toISOString(),
      assignedResponder: match?.responder?.id ?? null,
      assignedResponderUnitId: match?.responder?.unitId ?? null,
      assignedResponderName: match?.responder?.name ?? null,
      etaMinutes: match?.etaMinutes ?? null,
      resolvedAt: null,
      emergencyContactNotifications: null,
      // Mesh transport metadata:
      transportType,
      hopCount,
      originalTimestamp: originalTimestamp ?? new Date().toISOString(),
      relayPath: relayPath ?? [],
      originDeviceId: originDeviceId ?? null,
      packetId: packetId ?? null,
      // This is a reviewed text transcript, not a retained audio recording.
      // It gives authorised officers the speaker's own wording alongside an
      // explicitly labelled language for later translation.
      ...(voiceStatement ? { voiceStatement, voiceStatementLanguage } : {}),
      ...(tourist.clothingProfile ? {
        emergencyIdentificationProfile: tourist.clothingProfile,
        emergencyIdentificationProfileSharedAt: new Date().toISOString(),
      } : {}),
      timeline: [
        { event: `SOS created via ${transportType} (Hops: ${hopCount})`, at: new Date().toISOString(), actor: session.name },
        ...(voiceStatement ? [{ event: 'Traveller reviewed and attached a voice SOS statement.', at: new Date().toISOString(), actor: session.name }] : []),
        ...(tourist.clothingProfile ? [{ event: 'Emergency identification profile attached for authorised case handling.', at: new Date().toISOString(), actor: 'system' }] : []),
      ],
    };

    if (!await insertIncident(incident as any)) {
      return NextResponse.json({ success: false, error: 'The emergency incident could not be recorded. Call local emergency services directly.' }, { status: 503 });
    }

    const notificationPlan = await notifyEmergencyContacts(tourist.emergencyContacts, incidentId);
    const updatedRecord = (await updateIncident(incidentId, { emergencyContactNotifications: notificationPlan })) ?? incident;

    // Notify the realtime gateway so the authority dashboard updates instantly
    await emitToGateway("incident:create", updatedRecord);

    // The incident is recorded whatever the contact notification did, so the
    // primary message must confirm that first. A contact-notification note is
    // appended only when it tells the traveller something they can act on.
    const notificationNote = notificationPlan.status === 'NO_CONTACTS' || notificationPlan.status === 'NO_EMAIL_CONTACTS'
      ? ''
      : ` ${notificationPlan.message}`;
    return NextResponse.json({
      success: true,
      message: `SOS recorded in the Prahari authority queue.${notificationNote}`,
      incident: updatedRecord,
      contactNotification: {
        status: notificationPlan.status,
        recipientCount: notificationPlan.contacts.length,
        message: notificationPlan.message,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.errorResponse) return auth.errorResponse;

  const { session } = auth;

  try {
    let incidents: any[] = operationalIncidents(await listIncidents(50));

    // If tourist, filter to only their incidents
    if (session.role === 'tourist' && session.touristId) {
      incidents = incidents.filter(
        (i) => i.touristId === session.touristId || i.touristId === session.userId
      );
    }

    return NextResponse.json({ success: true, incidents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * Dispatch / status update. A tourist may only cancel their own active alert.
 */
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request, ['tourist', 'responder', 'authority', 'admin']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const { session } = auth;
    const { incidentId, status, assignedResponderUnitId, assignedResponderName, etaMinutes, action } = body;

    if (!incidentId) {
      return NextResponse.json({ success: false, error: "incidentId is required" }, { status: 400 });
    }

    const existing = (await listIncidents(200)).find((incident: any) => incident.incidentId === incidentId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Incident not found.' }, { status: 404 });
    }
    if (isFixtureIncident(existing)) {
      return NextResponse.json({ success: false, error: 'Fixture incidents cannot be changed through the operational workflow.' }, { status: 400 });
    }

    if (action === 'AUTO_DISPATCH') {
      if (!['authority', 'admin', 'responder'].includes(session.role)) {
        return NextResponse.json({ success: false, error: 'Only authorised operational users can dispatch a responder.' }, { status: 403 });
      }
      const lat = existing.location?.lat;
      const lng = existing.location?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return NextResponse.json({ success: false, error: 'A reported incident location is required before dispatch.' }, { status: 400 });
      }
      const candidates = operationalResponders(await listResponders())
        .filter((responder: any) => String(responder.status ?? '').trim().toLowerCase() === 'available')
        .map((responder: any) => ({
          id: responder.id ?? responder.responderId,
          unitId: responder.unitId ?? responder.responderId,
          name: responder.name ?? responder.responderId ?? 'Unnamed responder',
          type: responder.type ?? responder.department,
          phone: responder.phone ?? '',
          lat: responder.location?.lat,
          lng: responder.location?.lng,
        }))
        .filter((responder: any) => typeof responder.lat === 'number' && typeof responder.lng === 'number');
      const match = findNearestResponder(lat, lng, candidates);
      if (!match) {
        return NextResponse.json({
          success: false,
          error: 'No available registered responder was found within the 15 km automatic-dispatch radius. The incident remains unassigned.',
        }, { status: 409 });
      }
      const updated = await updateIncident(incidentId, {
        status: 'DISPATCHED',
        assignedResponder: match.responder.id,
        assignedResponderUnitId: match.responder.unitId,
        assignedResponderName: match.responder.name,
        etaMinutes: match.etaMinutes,
        timeline: [
          ...(Array.isArray(existing.timeline) ? existing.timeline : []),
          {
            event: `Automatic dispatch assigned ${match.responder.unitId} within the 15 km response radius.`,
            at: new Date().toISOString(),
            actor: session.name,
            estimatedDistanceKm: match.distanceKm,
            estimatedEtaMinutes: match.etaMinutes,
          },
        ],
      });
      if (!updated) {
        return NextResponse.json({ success: false, error: 'The responder assignment could not be saved.' }, { status: 503 });
      }
      await emitToGateway("incident:update", updated);
      return NextResponse.json({ success: true, incident: updated, automaticDispatch: true });
    }
    if (action) {
      return NextResponse.json({ success: false, error: 'Unsupported incident action.' }, { status: 400 });
    }
    if (session.role === 'tourist') {
      if (status !== 'CANCELLED' || !canAccessTouristData(session, existing.touristId)) {
        return NextResponse.json({ success: false, error: 'Tourists may only cancel their own alert.' }, { status: 403 });
      }
    }

    const fields: Record<string, any> = {};
    if (status) fields.status = status;
    if (assignedResponderUnitId) fields.assignedResponderUnitId = assignedResponderUnitId;
    if (assignedResponderName) fields.assignedResponderName = assignedResponderName;
    if (typeof etaMinutes === "number") fields.etaMinutes = etaMinutes;
    if (status === "resolved" || status === "RESOLVED") fields.resolvedAt = new Date().toISOString();
    if (status === 'CANCELLED') {
      fields.cancelledAt = new Date().toISOString();
      fields.cancelledBy = session.name;
      fields.assignedResponder = null;
      fields.assignedResponderUnitId = null;
      fields.assignedResponderName = null;
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ success: false, error: "No updatable fields supplied" }, { status: 400 });
    }

    const updated = await updateIncident(incidentId, fields);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Incident ${incidentId} not found or database unavailable` },
        { status: 404 }
      );
    }

    await emitToGateway("incident:update", updated);

    return NextResponse.json({ success: true, incident: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Incident history is part of the protected operational audit trail. Cases
  // can be cancelled, resolved, or returned for correction, but never erased
  // through the application API.
  return NextResponse.json({
    success: false,
    error: 'Incident deletion is disabled. Resolve or cancel the incident to preserve the audit trail.',
  }, { status: 405 });
}
