/**
 * Offline SOS Mesh — Versioned Emergency SOS Packet
 * 
 * Inspired by BitChat's minimal wire protocol principles.
 * Contains only non-PII, opaque routing metadata and core coordinates.
 */

export interface SOSPacket {
  version: number;
  packetId: string;
  incidentId: string;
  touristId: string; // Opaque tourist ID (e.g. TOUR-7890 or hash)
  type: 'SOS' | 'PANIC' | 'MEDICAL';
  severity: 'CRITICAL' | 'HIGH';
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number; // UTC epoch millis
  expiresAt: number; // UTC epoch millis (packet expiration)
  ttl: number; // Time To Live (max remaining hops)
  hopCount: number; // Hops taken so far
  originDeviceId: string; // Ephemeral/opaque device ID
  lastKnownTransport: 'INTERNET' | 'SMS' | 'BLE_RELAY' | 'LOCAL_QUEUE';
  relayPath: string[]; // List of relay node IDs e.g. ["DEV-ORIGIN", "RELAY-B82F"]
  signature?: string; // Optional checksum / signature
  packetCategory?: 'SOS_ALERT' | 'CHAT_MESSAGE';
  chatText?: string;
  senderRole?: 'tourist' | 'authority';
  senderName?: string;
}

export const CURRENT_PACKET_VERSION = 1;
export const DEFAULT_PACKET_TTL = 8;
export const DEFAULT_PACKET_LIFESPAN_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Creates a brand new emergency packet for origin dispatch.
 */
export function createSOSPacket(params: {
  touristId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  incidentId?: string;
  type?: 'SOS' | 'PANIC' | 'MEDICAL';
  severity?: 'CRITICAL' | 'HIGH';
  originDeviceId?: string;
  ttl?: number;
}): SOSPacket {
  const now = Date.now();
  const incidentId = params.incidentId ?? `INC-${Math.floor(1000 + Math.random() * 9000)}`;
  const packetId = `PKT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const originDeviceId = params.originDeviceId ?? getOrCreateDeviceId();

  return {
    version: CURRENT_PACKET_VERSION,
    packetId,
    incidentId,
    touristId: params.touristId,
    type: params.type ?? 'PANIC',
    severity: params.severity ?? 'CRITICAL',
    latitude: params.latitude,
    longitude: params.longitude,
    accuracy: params.accuracy ?? 10,
    timestamp: now,
    expiresAt: now + DEFAULT_PACKET_LIFESPAN_MS,
    ttl: params.ttl ?? DEFAULT_PACKET_TTL,
    hopCount: 0,
    originDeviceId,
    lastKnownTransport: 'LOCAL_QUEUE',
    relayPath: [originDeviceId],
    packetCategory: 'SOS_ALERT',
  };
}

/**
 * Creates a chat packet for two-way offline emergency messaging.
 */
export function createChatPacket(params: {
  incidentId: string;
  touristId?: string;
  senderRole: 'tourist' | 'authority';
  senderName?: string;
  text: string;
  latitude?: number;
  longitude?: number;
  originDeviceId?: string;
}): SOSPacket {
  const now = Date.now();
  const packetId = `CHAT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const originDeviceId = params.originDeviceId ?? getOrCreateDeviceId();
  const effectiveTouristId = params.touristId || 'DTI-IND-000123';
  const effectiveSenderName = params.senderName || (params.senderRole === 'tourist' ? 'Traveller' : 'Police HQ');

  return {
    version: CURRENT_PACKET_VERSION,
    packetId,
    incidentId: params.incidentId,
    touristId: effectiveTouristId,
    type: 'PANIC',
    severity: 'HIGH',
    latitude: typeof params.latitude === 'number' && Number.isFinite(params.latitude) ? params.latitude : 19.0728,
    longitude: typeof params.longitude === 'number' && Number.isFinite(params.longitude) ? params.longitude : 72.8997,
    accuracy: 10,
    timestamp: now,
    expiresAt: now + DEFAULT_PACKET_LIFESPAN_MS,
    ttl: DEFAULT_PACKET_TTL,
    hopCount: 0,
    originDeviceId,
    lastKnownTransport: 'LOCAL_QUEUE',
    relayPath: [originDeviceId],
    packetCategory: 'CHAT_MESSAGE',
    chatText: params.text,
    senderRole: params.senderRole,
    senderName: effectiveSenderName,
  };
}

/**
 * Validates packet schema & invariants. Returns true if valid.
 */
export function isValidSOSPacket(packet: any): packet is SOSPacket {
  if (!packet || typeof packet !== 'object') return false;
  if (typeof packet.version !== 'number' || packet.version <= 0) return false;
  if (typeof packet.packetId !== 'string' || !packet.packetId) return false;
  if (typeof packet.incidentId !== 'string' || !packet.incidentId) return false;
  if (typeof packet.touristId !== 'string' || !packet.touristId) return false;
  if (typeof packet.latitude !== 'number' || !Number.isFinite(packet.latitude)) return false;
  if (typeof packet.longitude !== 'number' || !Number.isFinite(packet.longitude)) return false;
  if (typeof packet.timestamp !== 'number' || packet.timestamp <= 0) return false;
  if (typeof packet.ttl !== 'number' || packet.ttl < 0) return false;
  if (typeof packet.hopCount !== 'number' || packet.hopCount < 0) return false;
  return true;
}

/**
 * Checks if a packet is expired based on current timestamp or TTL.
 */
export function isPacketExpired(packet: SOSPacket, now: number = Date.now()): boolean {
  if (packet.ttl <= 0) return true;
  if (packet.expiresAt && now > packet.expiresAt) return true;
  return false;
}

/**
 * Prepares a packet for forwarding over a mesh hop:
 * - Increments hopCount
 * - Decrements TTL
 * - Appends relay Node ID to relayPath if available
 */
export function incrementPacketHop(packet: SOSPacket, relayDeviceId: string, transport: 'BLE_RELAY' | 'SMS' | 'INTERNET'): SOSPacket {
  const updatedPath = packet.relayPath ? [...packet.relayPath] : [packet.originDeviceId];
  if (!updatedPath.includes(relayDeviceId)) {
    updatedPath.push(relayDeviceId);
  }
  return {
    ...packet,
    ttl: Math.max(0, packet.ttl - 1),
    hopCount: packet.hopCount + 1,
    lastKnownTransport: transport,
    relayPath: updatedPath,
  };
}

/**
 * Serializes SOSPacket to a compact JSON string for transport.
 */
export function serializeSOSPacket(packet: SOSPacket): string {
  return JSON.stringify(packet);
}

/**
 * Safely parses JSON string to SOSPacket.
 */
export function deserializeSOSPacket(raw: string): SOSPacket | null {
  try {
    const parsed = JSON.parse(raw);
    if (isValidSOSPacket(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Gets or generates an ephemeral local device ID for mesh relay routing.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'NODE-SERVER';
  try {
    let deviceId = localStorage.getItem('prahari_device_id');
    if (!deviceId) {
      deviceId = `NODE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      localStorage.setItem('prahari_device_id', deviceId);
    }
    return deviceId;
  } catch {
    return `NODE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
}
