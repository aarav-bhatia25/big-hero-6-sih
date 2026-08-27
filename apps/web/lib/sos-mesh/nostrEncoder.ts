/**
 * Offline SOS Mesh — Compact Nostr Binary Encoder / Decoder
 * 
 * Compresses standard Nostr JSON events (~600 bytes) into a tightly packed Uint8Array (~140-160 bytes).
 * Ensures SOS packets fit inside a single Web Bluetooth GATT Notification MTU window (ATT MTU 247 bytes),
 * reducing latency, packet loss, and transmission power.
 */

import { NostrSOSEvent } from './sosPacket';

const MAGIC_HEADER = 0x4e4f; // 'NO' in hex
const FORMAT_VERSION = 1;

function hexToBytes(hex: string, expectedLength?: number): Uint8Array {
  const cleanHex = hex.replace(/^0x/, '').padStart((expectedLength ?? hex.length / 2) * 2, '0');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16) || 0;
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Encodes a NostrSOSEvent into a compact Uint8Array for BLE transport.
 */
export function packNostrEvent(event: NostrSOSEvent): Uint8Array {
  const encoder = new TextEncoder();

  // Extract geohash tag if present
  const geoTag = event.tags.find((t) => t[0] === 'g')?.[1] ?? '';
  const geoBytes = encoder.encode(geoTag);

  // Extract metadata from tags or content
  const ttlTag = parseInt(event.tags.find((t) => t[0] === 'ttl')?.[1] ?? '8', 10);
  const hopTag = parseInt(event.tags.find((t) => t[0] === 'hop')?.[1] ?? '0', 10);
  const latTag = parseFloat(event.tags.find((t) => t[0] === 'lat')?.[1] ?? '0');
  const lonTag = parseFloat(event.tags.find((t) => t[0] === 'lon')?.[1] ?? '0');

  const contentBytes = encoder.encode(event.content ?? '');
  const pubkeyBytes = hexToBytes(event.pubkey, 32);
  const idBytes = hexToBytes(event.id, 32);
  const sigBytes = hexToBytes(event.sig ?? '', 64);

  // Calculate buffer size
  const totalLength = 2 + 1 + 2 + 4 + 32 + 32 + 4 + 4 + 1 + 1 + 1 + geoBytes.length + 2 + contentBytes.length + 64;
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  let offset = 0;

  // Magic & Version
  view.setUint16(offset, MAGIC_HEADER, false); offset += 2;
  view.setUint8(offset, FORMAT_VERSION); offset += 1;

  // Kind & CreatedAt
  view.setUint16(offset, event.kind, false); offset += 2;
  view.setUint32(offset, Math.floor(event.created_at), false); offset += 4;

  // Pubkey & ID
  bytes.set(pubkeyBytes.subarray(0, 32), offset); offset += 32;
  bytes.set(idBytes.subarray(0, 32), offset); offset += 32;

  // Lat / Lon scaled 1e7
  view.setInt32(offset, Math.round(latTag * 1e7), false); offset += 4;
  view.setInt32(offset, Math.round(lonTag * 1e7), false); offset += 4;

  // Hop & TTL packed into 1 byte (4 bits hop, 4 bits ttl)
  const packedHopTtl = ((hopTag & 0x0f) << 4) | (ttlTag & 0x0f);
  view.setUint8(offset, packedHopTtl); offset += 1;

  // Flag byte (reserved for kind/severity)
  view.setUint8(offset, 0x01); offset += 1;

  // Geohash
  view.setUint8(offset, geoBytes.length); offset += 1;
  bytes.set(geoBytes, offset); offset += geoBytes.length;

  // Content Payload
  view.setUint16(offset, contentBytes.length, false); offset += 2;
  bytes.set(contentBytes, offset); offset += contentBytes.length;

  // Signature
  bytes.set(sigBytes.subarray(0, 64), offset); offset += 64;

  return bytes;
}

/**
 * Decodes a compact Uint8Array back into a NostrSOSEvent.
 */
export function unpackNostrEvent(buffer: Uint8Array): NostrSOSEvent | null {
  try {
    if (buffer.length < 140) return null; // Minimum header + hashes size

    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    let offset = 0;

    const magic = view.getUint16(offset, false); offset += 2;
    if (magic !== MAGIC_HEADER) return null;

    const version = view.getUint8(offset); offset += 1;
    if (version !== FORMAT_VERSION) return null;

    const kind = view.getUint16(offset, false); offset += 2;
    const createdAt = view.getUint32(offset, false); offset += 4;

    const pubkey = bytesToHex(buffer.subarray(offset, offset + 32)); offset += 32;
    const id = bytesToHex(buffer.subarray(offset, offset + 32)); offset += 32;

    const latInt = view.getInt32(offset, false); offset += 4;
    const lonInt = view.getInt32(offset, false); offset += 4;
    const lat = latInt / 1e7;
    const lon = lonInt / 1e7;

    const packedHopTtl = view.getUint8(offset); offset += 1;
    const hop = (packedHopTtl >> 4) & 0x0f;
    const ttl = packedHopTtl & 0x0f;

    offset += 1; // skip flag byte

    const geoLen = view.getUint8(offset); offset += 1;
    const decoder = new TextDecoder();
    const geohash = decoder.decode(buffer.subarray(offset, offset + geoLen)); offset += geoLen;

    const contentLen = view.getUint16(offset, false); offset += 2;
    const content = decoder.decode(buffer.subarray(offset, offset + contentLen)); offset += contentLen;

    const sig = bytesToHex(buffer.subarray(offset, offset + 64)); offset += 64;

    const tags: string[][] = [
      ['g', geohash],
      ['lat', lat.toString()],
      ['lon', lon.toString()],
      ['ttl', ttl.toString()],
      ['hop', hop.toString()],
      ['t', kind === 20001 ? 'CHAT_MESSAGE' : 'SOS_ALERT'],
    ];

    return {
      id,
      pubkey,
      created_at: createdAt,
      kind,
      tags,
      content,
      sig,
    };
  } catch (err) {
    console.warn('[nostrEncoder] Failed to unpack binary buffer:', err);
    return null;
  }
}
