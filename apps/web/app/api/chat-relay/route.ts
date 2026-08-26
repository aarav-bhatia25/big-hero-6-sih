import { NextRequest, NextResponse } from "next/server";
import { isValidSOSPacket, SOSPacket } from "@/lib/sos-mesh/sosPacket";
import { emitToGateway } from "@/lib/services/gatewayEmit";

// Server-side process memory store for active chat threads
const serverChatThreads = new Map<string, SOSPacket[]>();

/**
 * GET /api/chat-relay?incidentId=INC-1234
 * Fetches the emergency chat transcript for an active incident.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get("incidentId");

    if (!incidentId) {
      return NextResponse.json({ success: false, error: "incidentId is required" }, { status: 400 });
    }

    const messages = serverChatThreads.get(incidentId) ?? [];
    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/chat-relay
 * Receives an incoming offline/online chat message packet, persists it, and broadcasts to Realtime.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const packet = (body.packet ?? body) as SOSPacket;

    if (!isValidSOSPacket(packet)) {
      return NextResponse.json({ success: false, error: "Invalid chat packet schema." }, { status: 400 });
    }

    const incidentId = packet.incidentId;
    if (!incidentId) {
      return NextResponse.json({ success: false, error: "incidentId required in packet." }, { status: 400 });
    }

    const existingList = serverChatThreads.get(incidentId) ?? [];
    const exists = existingList.some((m) => m.packetId === packet.packetId);

    if (!exists) {
      existingList.push(packet);
      serverChatThreads.set(incidentId, existingList);
    }

    // Broadcast live over Realtime Gateway to authority console and citizen UI
    await emitToGateway("chat:message", packet);

    return NextResponse.json({
      success: true,
      message: "Chat packet relayed to emergency command server.",
      packet,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
