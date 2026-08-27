import { NextRequest, NextResponse } from "next/server";
import { insertIncident, updateIncident, getTourist, listResponders, listIncidents } from "@/lib/db";
import { emitToGateway } from "@/lib/services/gatewayEmit";
import { findNearestResponder } from "@/lib/services/dispatchEngine";
import { operationalResponders } from "@/lib/operationalData";
import { isPacketExpired, isValidSOSPacket } from "@/lib/sos-mesh/sosPacket";
import { notifyEmergencyContacts } from "@/lib/services/emergencyNotifications";
import { canAccessTouristData, requireAuth } from '@/lib/auth/guards';

function hasGatewayCredential(request: NextRequest): boolean {
  const configured = process.env.PRAHARI_MESH_GATEWAY_KEY;
  const supplied = request.headers.get('x-prahari-mesh-gateway-key') ?? '';
  if (!configured || supplied.length !== configured.length) return false;
  let difference = 0;
  for (let index = 0; index < configured.length; index += 1) {
    difference |= configured.charCodeAt(index) ^ supplied.charCodeAt(index);
  }
  return difference === 0;
}

/**
 * Authenticated emergency gateway relay endpoint. A browser cannot safely act
 * as a cross-device relay without a separately provisioned gateway identity,
 * so packets are accepted only from an authenticated user authorised for the
 * packet's tourist record.
 */
export async function POST(request: NextRequest) {
  const gatewayAuthenticated = hasGatewayCredential(request);
  const auth = gatewayAuthenticated ? null : await requireAuth(request, ['tourist', 'authority', 'admin', 'responder']);
  if (auth?.errorResponse) return auth.errorResponse;
  try {
    const body = await request.json();
    const packet = body.packet ?? body;

    if (!isValidSOSPacket(packet)) {
      return NextResponse.json({ success: false, error: "Invalid SOS packet payload schema." }, { status: 400 });
    }
    if (isPacketExpired(packet)) {
      return NextResponse.json({ success: false, error: 'This SOS packet has expired and cannot be delivered.' }, { status: 410 });
    }
    if (packet.packetCategory !== 'SOS_ALERT' || typeof packet.latitude !== 'number' || typeof packet.longitude !== 'number') {
      return NextResponse.json({ success: false, error: 'Only location-bearing SOS alert packets can be relayed.' }, { status: 400 });
    }

    const incidentId = packet.incidentId ?? `INC-${Math.floor(1000 + Math.random() * 9000)}`;
    const touristId = packet.touristId;
    const lat = packet.latitude;
    const lng = packet.longitude;
    // The packet schema does not constrain this field, so a queued packet from
    // an older client can arrive without it. Never write an unrecognised value
    // into the incident's transport provenance or its timeline wording.
    const relayedTransport = gatewayAuthenticated
      ? 'BLE_RELAY'
      : (['INTERNET', 'BLE_RELAY', 'LOCAL_QUEUE'] as const).find((known) => known === packet.lastKnownTransport) ?? 'LOCAL_QUEUE';

    if (!gatewayAuthenticated && !canAccessTouristData(auth!.session, touristId)) {
      return NextResponse.json({ success: false, error: 'You are not authorised to relay an SOS for this tourist.' }, { status: 403 });
    }
    const tourist = await getTourist(touristId);
    if (!tourist) {
      return NextResponse.json({ success: false, error: 'Tourist record not found.' }, { status: 404 });
    }
    const existing = (await listIncidents(200)).find((incident: any) => incident.incidentId === incidentId);
    if (existing) {
      return NextResponse.json({ success: true, message: 'SOS packet was already recorded.', incident: existing, idempotent: true });
    }

    // Find nearest registered responder unit
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

    const match = findNearestResponder(lat, lng, candidates);

    const incidentRecord = {
      incidentId,
      touristId,
      touristName: tourist.name ?? touristId,
      type: packet.type ?? 'PANIC',
      status: 'ACTIVE',
      location: { lat, lng },
      severity: packet.severity ?? 'CRITICAL',
      riskScore: 95,
      createdAt: new Date().toISOString(),
      assignedResponder: match?.responder?.id ?? null,
      assignedResponderUnitId: match?.responder?.unitId ?? null,
      assignedResponderName: match?.responder?.name ?? null,
      etaMinutes: match?.etaMinutes ?? null,
      resolvedAt: null,
      emergencyContactNotifications: null,
      // Gateway-originated packets are labelled as BLE relay receipts. The
      // browser never claims a relay or authority receipt before this record
      // has been durably written.
      transportType: relayedTransport,
      hopCount: packet.hopCount ?? 0,
      originalTimestamp: new Date(packet.timestamp).toISOString(),
      relayPath: packet.relayPath ?? [],
      originDeviceId: packet.originDeviceId ?? null,
      packetId: packet.packetId,
      timeline: [
        {
          event: `Relayed SOS recorded via ${relayedTransport} (recorded relay hops: ${packet.hopCount ?? 0})`,
          at: new Date().toISOString(),
          actor: gatewayAuthenticated ? 'Prahari relay gateway' : 'Authenticated Prahari user',
        },
      ],
    };

    const inserted = await insertIncident(incidentRecord as any);
    if (!inserted) {
      return NextResponse.json({ success: false, error: "Failed to record relayed incident." }, { status: 500 });
    }

    // Trigger emergency contact notification if contacts configured
    if (tourist.emergencyContacts && tourist.emergencyContacts.length > 0) {
      const notificationPlan = await notifyEmergencyContacts(tourist.emergencyContacts, incidentId);
      await updateIncident(incidentId, { emergencyContactNotifications: notificationPlan });
    }

    // Broadcast to Supabase Realtime Gateway so police dashboard updates live
    await emitToGateway("incident:create", incidentRecord);

    return NextResponse.json({
      success: true,
      message: "Relayed SOS packet recorded in the Prahari authority queue.",
      incident: incidentRecord,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
