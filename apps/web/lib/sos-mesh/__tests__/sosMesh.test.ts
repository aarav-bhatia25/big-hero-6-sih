/**
 * Offline SOS Mesh — Unit & Integration Test Suite
 * 
 * Tests packet schema validation, TTL/hop limits, deduplication cache, state machine transitions,
 * and transport manager fallback logic.
 */

import assert from 'node:assert';
import { test, describe } from 'node:test';

import {
  createSOSPacket,
  isValidSOSPacket,
  isPacketExpired,
  incrementPacketHop,
  serializeSOSPacket,
  deserializeSOSPacket,
} from '../sosPacket';

import { SOSStateMachine } from '../sosStateMachine';
import { hasSeenPacket, markPacketAsSeen, saveQueuedPacket } from '../indexedDbQueue';
import { InternetTransport } from '../transports/internetTransport';
import { LocalTransport } from '../transports/localTransport';

describe('Offline SOS Mesh — Packet Suite', () => {
  test('should create valid SOS packet with defaults', () => {
    const packet = createSOSPacket({
      touristId: 'TOUR-7890',
      latitude: 19.0728,
      longitude: 72.8997,
    });

    assert.strictEqual(packet.version, 1);
    assert.strictEqual(packet.touristId, 'TOUR-7890');
    assert.strictEqual(packet.latitude, 19.0728);
    assert.strictEqual(packet.longitude, 72.8997);
    assert.strictEqual(packet.ttl, 8);
    assert.strictEqual(packet.hopCount, 0);
    assert.strictEqual(isValidSOSPacket(packet), true);
  });

  test('should reject invalid or corrupt SOS packet', () => {
    assert.strictEqual(isValidSOSPacket(null), false);
    assert.strictEqual(isValidSOSPacket({}), false);
    assert.strictEqual(isValidSOSPacket({ packetId: 'PKT-1', latitude: 'invalid' }), false);
  });

  test('should detect packet expiration based on TTL', () => {
    const packet = createSOSPacket({ touristId: 'TOUR-1', latitude: 19.0, longitude: 72.0, ttl: 0 });
    assert.strictEqual(isPacketExpired(packet), true);
  });

  test('should increment hop count and decrement TTL on relay hop', () => {
    const packet = createSOSPacket({ touristId: 'TOUR-1', latitude: 19.0, longitude: 72.0, ttl: 5 });
    const hop1 = incrementPacketHop(packet, 'RELAY-NODE-1', 'BLE_RELAY');

    assert.strictEqual(hop1.hopCount, 1);
    assert.strictEqual(hop1.ttl, 4);
    assert.strictEqual(hop1.lastKnownTransport, 'BLE_RELAY');
    assert.deepStrictEqual(hop1.relayPath, [packet.originDeviceId, 'RELAY-NODE-1']);
  });

  test('should correctly serialize and deserialize packet', () => {
    const original = createSOSPacket({ touristId: 'TOUR-1', latitude: 19.0, longitude: 72.0 });
    const raw = serializeSOSPacket(original);
    const restored = deserializeSOSPacket(raw);

    assert.notStrictEqual(restored, null);
    assert.strictEqual(restored?.packetId, original.packetId);
    assert.strictEqual(restored?.touristId, original.touristId);
  });
});

describe('Offline SOS Mesh — State Machine & Loop Guard', () => {
  test('should execute state machine transitions and notify listeners', () => {
    const sm = new SOSStateMachine();
    const transitions: string[] = [];

    sm.subscribe((ev) => {
      transitions.push(`${ev.previousState}->${ev.currentState}`);
    });

    sm.transitionTo('SOS_TRIGGERED');
    sm.transitionTo('PACKET_CREATED');
    sm.transitionTo('TRY_BLE_RELAY');
    sm.transitionTo('RELAYED');

    assert.deepStrictEqual(transitions, [
      'IDLE->SOS_TRIGGERED',
      'SOS_TRIGGERED->PACKET_CREATED',
      'PACKET_CREATED->TRY_BLE_RELAY',
      'TRY_BLE_RELAY->RELAYED',
    ]);
  });

  test('should prevent duplicate packet loops', async () => {
    const testPktId = `TEST-DUP-${Date.now()}`;
    assert.strictEqual(await hasSeenPacket(testPktId), false);

    await markPacketAsSeen(testPktId);
    assert.strictEqual(await hasSeenPacket(testPktId), true);
  });

  test('should write to local fallback queue', async () => {
    const packet = createSOSPacket({ touristId: 'TOUR-TEST', latitude: 19.0, longitude: 72.0 });
    const localTransport = new LocalTransport();
    const res = await localTransport.send(packet);

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.channel, 'LOCAL_QUEUE');
  });
});
