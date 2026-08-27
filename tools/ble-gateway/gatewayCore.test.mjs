import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  DurablePacketStore,
  FrameAssembler,
  packetForUplink,
  validateSosPacket,
} from './gatewayCore.mjs';

function packet() {
  const now = Date.now();
  return {
    version: 1,
    packetId: 'PKT-GATEWAY-1',
    incidentId: 'INC-GATEWAY-1',
    touristId: 'TOUR-GATEWAY-1',
    type: 'PANIC',
    severity: 'CRITICAL',
    latitude: 19.076,
    longitude: 72.8777,
    timestamp: now,
    expiresAt: now + 60_000,
    ttl: 8,
    hopCount: 0,
    originDeviceId: 'NODE-ORIGIN',
    lastKnownTransport: 'LOCAL_QUEUE',
    relayPath: ['NODE-ORIGIN'],
    packetCategory: 'SOS_ALERT',
  };
}

test('reassembles baseline-MTU BLE frames in order', () => {
  const original = packet();
  const source = Buffer.from(JSON.stringify(original));
  const chunks = Array.from({ length: Math.ceil(source.length / 15) }, (_, index) => source.subarray(index * 15, index * 15 + 15));
  const assembler = new FrameAssembler();
  let complete = null;
  chunks.forEach((chunk, index) => {
    complete = assembler.push(Buffer.concat([Buffer.from([0x50, 0x52, 1, chunks.length, index]), chunk]));
  });
  assert.deepEqual(JSON.parse(complete.toString('utf8')), original);
});

test('adds a durable relay hop without accepting an expired packet', () => {
  const relayed = packetForUplink(packet(), 'GW-01');
  assert.equal(relayed.lastKnownTransport, 'BLE_RELAY');
  assert.equal(relayed.ttl, 7);
  assert.equal(relayed.hopCount, 1);
  assert.deepEqual(relayed.relayPath, ['NODE-ORIGIN', 'GW-01']);
  assert.throws(() => validateSosPacket({ ...packet(), expiresAt: Date.now() - 1 }), /expired/);
});

test('persists and deduplicates packets across store re-open', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'prahari-gateway-'));
  const file = join(directory, 'queue.json');
  try {
    const first = new DurablePacketStore(file);
    await first.open();
    assert.equal(await first.enqueue(packet()), true);
    assert.equal(await first.enqueue(packet()), false);
    const second = new DurablePacketStore(file);
    await second.open();
    assert.equal(second.pending().length, 1);
    await second.markTerminal('PKT-GATEWAY-1', 'delivered');
    assert.equal(second.pending().length, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
