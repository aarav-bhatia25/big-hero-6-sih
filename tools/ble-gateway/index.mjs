/**
 * Prahari BLE SOS gateway for a Linux/Raspberry Pi BLE adapter.
 * It advertises the documented GATT service, durably queues received packets,
 * and uploads them to the Prahari authority API after Internet reconnects.
 */
import bleno from '@abandonware/bleno';
import { join } from 'node:path';
import {
  DurablePacketStore,
  FRAME_PREFIX,
  FrameAssembler,
  packetForUplink,
  validateSosPacket,
} from './gatewayCore.mjs';

const SERVICE_UUID = '5b0d0e1a4f4e4ef4ae529f901d4c0101';
const WRITE_UUID = '5b0d0e1a4f4e4ef4ae529f901d4c0102';
const gatewayId = process.env.PRAHARI_GATEWAY_ID?.trim();
const gatewayKey = process.env.PRAHARI_MESH_GATEWAY_KEY;
const appUrl = process.env.PRAHARI_API_BASE_URL?.replace(/\/$/, '');
const dataDirectory = process.env.PRAHARI_GATEWAY_DATA_DIR ?? './data';

if (!gatewayId || !gatewayKey || !appUrl) {
  console.error('PRAHARI_GATEWAY_ID, PRAHARI_MESH_GATEWAY_KEY, and PRAHARI_API_BASE_URL are required.');
  process.exit(1);
}
if (!/^https?:\/\//.test(appUrl)) {
  console.error('PRAHARI_API_BASE_URL must be an http(s) URL.');
  process.exit(1);
}

const store = new DurablePacketStore(join(dataDirectory, 'sos-packets.json'));
await store.open();
const assembler = new FrameAssembler();
let uploading = false;

async function uploadPending() {
  if (uploading) return;
  uploading = true;
  try {
    for (const packet of store.pending()) {
      if (packet.expiresAt < Date.now()) {
        await store.markTerminal(packet.packetId, 'expired');
        continue;
      }
      try {
        const response = await fetch(`${appUrl}/api/sos-relay`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-prahari-mesh-gateway-key': gatewayKey,
          },
          body: JSON.stringify({ packet }),
          signal: AbortSignal.timeout(10_000),
        });
        const body = await response.json().catch(() => null);
        if (response.ok && body?.success) {
          await store.markTerminal(packet.packetId, 'delivered');
          console.log(`Delivered ${packet.packetId} to the authority queue.`);
        } else if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          // A malformed, expired, or unknown-tourist packet cannot become
          // deliverable by retrying. Retain only its terminal ID for dedupe.
          await store.markTerminal(packet.packetId, `rejected_${response.status}`);
          console.warn(`Gateway rejected ${packet.packetId}: ${body?.error ?? response.status}`);
        }
      } catch {
        // Offline or transient server failure: keep the durable packet queued.
      }
    }
  } finally {
    uploading = false;
  }
}

class SosWriteCharacteristic extends bleno.Characteristic {
  constructor() {
    super({ uuid: WRITE_UUID, properties: ['write'], value: null });
  }

  async onWriteRequest(data, offset, _withoutResponse, callback) {
    if (offset !== 0) {
      callback(this.RESULT_INVALID_OFFSET);
      return;
    }
    try {
      const payload = assembler.push(data);
      if (payload) {
        const packet = JSON.parse(payload.toString('utf8'));
        validateSosPacket(packet);
        const queued = await store.enqueue(packetForUplink(packet, gatewayId));
        if (queued) console.log(`Durably queued ${packet.packetId} (${packet.hopCount + 1} hop(s)).`);
        void uploadPending();
      }
      // This acknowledgement means only that each complete packet has passed
      // validation and is stored locally. It is not an authority receipt.
      callback(this.RESULT_SUCCESS);
    } catch (error) {
      console.warn(`Rejected BLE frame: ${error.message}`);
      callback(this.RESULT_UNLIKELY_ERROR);
    }
  }
}

const service = new bleno.PrimaryService({
  uuid: SERVICE_UUID,
  characteristics: [new SosWriteCharacteristic()],
});

bleno.on('stateChange', (state) => {
  if (state === 'poweredOn') {
    bleno.startAdvertising('Prahari Relay', [SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});
bleno.on('advertisingStart', (error) => {
  if (error) {
    console.error(`BLE advertising failed: ${error.message}`);
    return;
  }
  bleno.setServices([service]);
  console.log(`Prahari gateway ${gatewayId} is advertising protocol ${FRAME_PREFIX.join('.')}.`);
});
bleno.on('accept', (clientAddress) => console.log(`BLE client connected: ${clientAddress}`));
bleno.on('disconnect', (clientAddress) => {
  assembler.reset();
  console.log(`BLE client disconnected: ${clientAddress}`);
});
bleno.on('warning', (warning) => console.warn(`BLE warning: ${warning}`));

setInterval(() => void uploadPending(), 15_000).unref();
void uploadPending();
