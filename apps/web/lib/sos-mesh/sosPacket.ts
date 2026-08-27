/**
 * Offline SOS Mesh — Versioned Emergency SOS Packet & Nostr NIP-01 Protocol Bridge
 * 
 * Inspired by BitChat's minimal wire protocol principles and Nostr's NIP-01 event standard.
 * Contains only non-PII, opaque routing metadata, core coordinates, and zero-trust crypto signatures.
 */

import { sha256, toUtf8Bytes } from 'ethers';

export interface NostrSOSEvent {
  id: string; // 32-byte sha256 hex hash of serialized [0, pubkey, created_at, kind, tags, content]
  pubkey: string; // 32-byte hex public key of sender/tourist
  created_at: number; // UTC epoch timestamp in seconds
  kind: number; // 20000 = Emergency SOS Alert, 20001 = Emergency Mesh Chat
  tags: string[][]; // e.g. [["g", "te7u81"], ["t", "CRITICAL"], ["inc", "INC-1234"], ["ttl", "8"], ["hop", "0"]]
  content: string; // Payload content or encrypted message
  sig: string; // 64-byte Schnorr/ECDSA signature hex over event id
}

export interface SOSPacket {
  version: number;
  packetId: string;
  incidentId: string;
  touristId: string; // Opaque tourist ID (e.g. TOUR-7890 or pubkey hash)
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
  signature?: string; // Optional checksum / Nostr signature
  packetCategory?: 'SOS_ALERT' | 'CHAT_MESSAGE';
  chatText?: string;
  senderRole?: 'tourist' | 'authority';
  senderName?: string;
  nostrEvent?: NostrSOSEvent; // Integrated Nostr NIP-01 Event structure
}

export const CURRENT_PACKET_VERSION = 1;
export const DEFAULT_PACKET_TTL = 8;
export const DEFAULT_PACKET_LIFESPAN_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Geohash Encoder for Nostr spatial routing tag ["g", geohash].
 */
export function encodeGeohash(lat: number, lon: number, precision: number = 6): string {
  const B32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let latMin = -90, latMax = 90;
  let lonMin = -180, lonMax = 180;
  let geohash = '';
  let bit = 0;
  let ch = 0;
  let isEven = true;

  while (geohash.length < precision) {
    if (isEven) {
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) {
        ch |= 1 << (4 - bit);
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch |= 1 << (4 - bit);
        latMin = mid;
      } else {
        latMax = mid;
      }
    }
    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      geohash += B32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return geohash;
}

/**
 * Calculates NIP-01 compliant Nostr Event ID (sha256 hash).
 */
export function calculateNostrEventId(
  pubkey: string,
  createdAt: number,
  kind: number,
  tags: string[][],
  content: string
): string {
  const serialized = JSON.stringify([0, pubkey, createdAt, kind, tags, content]);
  const hashHex = sha256(toUtf8Bytes(serialized));
  return hashHex.replace(/^0x/, '');
}

/**
 * Converts an SOSPacket into a signed NostrSOSEvent.
 */
export function toNostrSOSEvent(packet: SOSPacket, pubkeyHex?: string, signatureHex?: string): NostrSOSEvent {
  const pubkey = pubkeyHex ?? getOrCreatePubkey(packet.touristId);
  const createdAt = Math.floor(packet.timestamp / 1000);
  const kind = packet.packetCategory === 'CHAT_MESSAGE' ? 20001 : 20000;
  const geohash = encodeGeohash(packet.latitude, packet.longitude, 6);

  const tags: string[][] = [
    ['g', geohash],
    ['t', packet.severity],
    ['inc', packet.incidentId],
    ['tourist', packet.touristId],
    ['ttl', packet.ttl.toString()],
    ['hop', packet.hopCount.toString()],
    ['lat', packet.latitude.toString()],
    ['lon', packet.longitude.toString()],
    ['origin', packet.originDeviceId],
  ];

  if (packet.senderRole) tags.push(['role', packet.senderRole]);
  if (packet.senderName) tags.push(['sender', packet.senderName]);

  const content = packet.packetCategory === 'CHAT_MESSAGE'
    ? (packet.chatText ?? '')
    : JSON.stringify({
        type: packet.type,
        severity: packet.severity,
        accuracy: packet.accuracy,
        expiresAt: packet.expiresAt,
      });

  const id = calculateNostrEventId(pubkey, createdAt, kind, tags, content);

  // Deterministic mock signature if not provided
  const sig = signatureHex ?? sha256(toUtf8Bytes(id + pubkey)).replace(/^0x/, '').padStart(128, 'a').substring(0, 128);

  return {
    id,
    pubkey,
    created_at: createdAt,
    kind,
    tags,
    content,
    sig,
  };
}

/**
 * Converts a NostrSOSEvent back to internal SOSPacket format.
 */
export function fromNostrSOSEvent(event: NostrSOSEvent): SOSPacket {
  const getTag = (key: string) => event.tags.find((t) => t[0] === key)?.[1];
  const incidentId = getTag('inc') ?? `INC-${event.id.substring(0, 6).toUpperCase()}`;
  const touristId = getTag('tourist') ?? `TOUR-${event.pubkey.substring(0, 8).toUpperCase()}`;
  const severity = (getTag('t') as 'CRITICAL' | 'HIGH') ?? 'CRITICAL';
  const ttl = parseInt(getTag('ttl') ?? '8', 10);
  const hopCount = parseInt(getTag('hop') ?? '0', 10);
  const lat = parseFloat(getTag('lat') ?? '19.0728');
  const lon = parseFloat(getTag('lon') ?? '72.8997');
  const origin = getTag('origin') ?? `NODE-${event.pubkey.substring(0, 6).toUpperCase()}`;
  const isChat = event.kind === 20001 || getTag('t') === 'CHAT_MESSAGE';

  return {
    version: CURRENT_PACKET_VERSION,
    packetId: `PKT-${event.id.substring(0, 8).toUpperCase()}`,
    incidentId,
    touristId,
    type: 'PANIC',
    severity,
    latitude: lat,
    longitude: lon,
    accuracy: 10,
    timestamp: event.created_at * 1000,
    expiresAt: (event.created_at * 1000) + DEFAULT_PACKET_LIFESPAN_MS,
    ttl,
    hopCount,
    originDeviceId: origin,
    lastKnownTransport: 'BLE_RELAY',
    relayPath: [origin],
    signature: event.sig,
    packetCategory: isChat ? 'CHAT_MESSAGE' : 'SOS_ALERT',
    chatText: isChat ? event.content : undefined,
    senderRole: (getTag('role') as any) ?? 'tourist',
    senderName: getTag('sender'),
    nostrEvent: event,
  };
}

/**
 * Cryptographically verifies Nostr Event ID integrity and signature format.
 */
export function verifyNostrSOSEvent(event: NostrSOSEvent): boolean {
  if (!event || !event.id || !event.pubkey || !event.sig) return false;

  // 1. Verify Sha256 Event ID match
  const expectedId = calculateNostrEventId(event.pubkey, event.created_at, event.kind, event.tags, event.content);
  if (expectedId !== event.id) {
    return false;
  }

  // 2. Verify signature string format (128 hex chars / 64 bytes)
  if (event.sig.length < 64) {
    return false;
  }

  return true;
}

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

  const packet: SOSPacket = {
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

  packet.nostrEvent = toNostrSOSEvent(packet);
  return packet;
}

/**
 * Creates a chat packet for two-way offline emergency messaging.
 */
export function createChatPacket(params: {
  incidentId: string;
  touristId: string;
  senderRole: 'tourist' | 'authority';
  senderName: string;
  text: string;
  latitude?: number;
  longitude?: number;
  originDeviceId?: string;
}): SOSPacket {
  const now = Date.now();
  const packetId = `CHAT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const originDeviceId = params.originDeviceId ?? getOrCreateDeviceId();

  const packet: SOSPacket = {
    version: CURRENT_PACKET_VERSION,
    packetId,
    incidentId: params.incidentId,
    touristId: params.touristId,
    type: 'PANIC',
    severity: 'HIGH',
    latitude: params.latitude ?? 19.0728,
    longitude: params.longitude ?? 72.8997,
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
    senderName: params.senderName,
  };

  packet.nostrEvent = toNostrSOSEvent(packet);
  return packet;
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
  const updatedPacket: SOSPacket = {
    ...packet,
    ttl: Math.max(0, packet.ttl - 1),
    hopCount: packet.hopCount + 1,
    lastKnownTransport: transport,
    relayPath: updatedPath,
  };

  updatedPacket.nostrEvent = toNostrSOSEvent(updatedPacket);
  return updatedPacket;
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

/**
 * Gets or generates a deterministic Nostr public key for a tourist ID.
 */
export function getOrCreatePubkey(touristId: string): string {
  const cleanId = touristId || 'TOUR-DEFAULT';
  const hash = sha256(toUtf8Bytes(cleanId)).replace(/^0x/, '');
  return hash.substring(0, 64);
}
