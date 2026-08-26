import { NextRequest, NextResponse } from "next/server";
import { insertIncident, updateIncident, getTourist, listResponders } from "@/lib/db";
import { emitToGateway } from "@/lib/services/gatewayEmit";
import { findNearestResponder } from "@/lib/services/dispatchEngine";
import { operationalResponders } from "@/lib/operationalData";
import { isValidSOSPacket } from "@/lib/sos-mesh/sosPacket";
import { notifyEmergencyContacts } from "@/lib/services/emergencyNotifications";

/**
 * Public Emergency Gateway Relay Endpoint
 * 
 * Accepts relayed SOS packets from offline devices and gateway nodes.
 * Validates packet schema, provenance, and TTL before recording in police queue.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const packet = body.packet ?? body;

    if (!isValidSOSPacket(packet)) {
      return NextResponse.json({ success: false, error: "Invalid SOS packet payload schema." }, { status: 400 });
    }

    const incidentId = packet.incidentId ?? `INC-${Math.floor(1000 + Math.random() * 9000)}`;
    const touristId = packet.touristId;
    const lat = packet.latitude;
    const lng = packet.longitude;

    const tourist = (await getTourist(touristId)) ?? {
      touristId,
      name: `Traveller (${touristId})`,
      emergencyContacts: [],
    };

    // Find nearest registered responder unit
    const candidates = operationalResponders(await listResponders())
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
      // Provenance & Transport Mesh Metadata:
      transportType: packet.lastKnownTransport ?? 'BLE_RELAY',
      hopCount: packet.hopCount ?? 1,
      originalTimestamp: new Date(packet.timestamp).toISOString(),
      relayPath: packet.relayPath ?? [packet.originDeviceId ?? 'NODE-ORIGIN'],
      originDeviceId: packet.originDeviceId ?? 'NODE-ORIGIN',
      packetId: packet.packetId,
      timeline: [
        {
          event: `Relayed SOS received via ${packet.lastKnownTransport ?? 'BLE_RELAY'} (Hops: ${packet.hopCount ?? 1})`,
          at: new Date().toISOString(),
          actor: 'Offline Mesh Gateway',
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
      message: "Relayed SOS packet successfully processed by police gateway.",
      incident: incidentRecord,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
