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
import { getPendingQueuedPackets, hasSeenPacket, markPacketAsSeen, saveQueuedPacket } from '../indexedDbQueue';
import { InternetTransport } from '../transports/internetTransport';
import { LocalTransport } from '../transports/localTransport';
import { BleTransport, encodeBleRelayFrames, PRAHARI_BLE_RELAY_SERVICE_UUID, PRAHARI_BLE_RELAY_WRITE_UUID } from '../transports/bleTransport';
import { SOSTransportManager } from '../transports/transportManager';

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

  test('should frame a BLE relay packet within the baseline GATT write size', () => {
    const packet = createSOSPacket({ touristId: 'TOUR-1', latitude: 19.0, longitude: 72.0 });
    const frames = encodeBleRelayFrames(packet);
    assert.ok(frames.length > 1);
    assert.ok(frames.every((frame) => frame.length <= 20));
    assert.ok(frames.every((frame, index) => frame[0] === 0x50 && frame[1] === 0x52 && frame[2] === 1 && frame[4] === index));
  });

  test('should write every SOS frame to a paired gateway and retain BLE provenance for later uplink', async () => {
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const writes: Uint8Array[] = [];
    let connected = false;
    const characteristic = {
      writeValueWithResponse: async (value: BufferSource) => {
        writes.push(new Uint8Array(value as ArrayBuffer));
      },
    };
    const device = {
      name: 'Prahari test gateway',
      gatt: {
        get connected() { return connected; },
        async connect() {
          connected = true;
          return {
            async getPrimaryService(service: string) {
              assert.strictEqual(service, PRAHARI_BLE_RELAY_SERVICE_UUID);
              return {
                async getCharacteristic(characteristicId: string) {
                  assert.strictEqual(characteristicId, PRAHARI_BLE_RELAY_WRITE_UUID);
                  return characteristic;
                },
              };
            },
          };
        },
        disconnect() { connected = false; },
      },
      addEventListener() {},
    };
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { bluetooth: { requestDevice: async () => device } },
    });

    try {
      const packet = createSOSPacket({ touristId: 'TOUR-BLE', latitude: 19.0, longitude: 72.0 });
      const transport = new BleTransport();
      const paired = await transport.pairGateway();
      assert.strictEqual(paired.paired, true);
      const result = await transport.send(packet);
      assert.strictEqual(result.success, true);
      assert.ok(writes.length > 1);
      assert.ok(writes.every((frame) => frame.length <= 20));
      const queued = (await getPendingQueuedPackets()).find((record) => record.packetId === packet.packetId);
      assert.strictEqual(queued?.status, 'RELAYED');
      assert.strictEqual(queued?.packet.lastKnownTransport, 'BLE_RELAY');
    } finally {
      if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
      else delete (globalThis as { navigator?: unknown }).navigator;
    }
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

describe('SOS delivery independence from BLE', () => {
  test('delivers directly over Internet without loading the optional BLE transport', async () => {
    class DirectInternetTransport extends InternetTransport {
      calls = 0;
      async send(packet: ReturnType<typeof createSOSPacket>) {
        this.calls += 1;
        return { success: true as const, channel: 'INTERNET' as const, incidentId: packet.incidentId, message: 'Recorded directly.' };
      }
    }
    class UnusedLocalTransport extends LocalTransport {
      calls = 0;
      async send(packet: ReturnType<typeof createSOSPacket>) {
        this.calls += 1;
        return super.send(packet);
      }
    }

    const internet = new DirectInternetTransport();
    const local = new UnusedLocalTransport();
    let bleWasLoaded = false;
    const manager = new SOSTransportManager({
      internetTransport: internet,
      localTransport: local,
      loadBleTransport: async () => {
        bleWasLoaded = true;
        return null;
      },
    });

    const result = await manager.dispatch(createSOSPacket({ touristId: 'TOUR-WIFI', latitude: 19.07, longitude: 72.88 }));
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.channel, 'INTERNET');
    assert.strictEqual(internet.calls, 1);
    assert.strictEqual(local.calls, 0);
    assert.strictEqual(bleWasLoaded, false);
  });

  test('falls back to the local retry queue without loading BLE when internet is unavailable', async () => {
    class OfflineInternetTransport extends InternetTransport {
      async send() {
        return { success: false as const, channel: 'INTERNET' as const, error: 'No internet connection.' };
      }
    }
    class QueueTransport extends LocalTransport {
      calls = 0;
      async send(packet: ReturnType<typeof createSOSPacket>) {
        this.calls += 1;
        return { success: true as const, channel: 'LOCAL_QUEUE' as const, incidentId: packet.incidentId };
      }
    }

    const local = new QueueTransport();
    let bleWasLoaded = false;
    const manager = new SOSTransportManager({
      internetTransport: new OfflineInternetTransport(),
      localTransport: local,
      loadBleTransport: async () => {
        bleWasLoaded = true;
        return null;
      },
    });

    const result = await manager.dispatch(createSOSPacket({ touristId: 'TOUR-QUEUE', latitude: 28.61, longitude: 77.2 }));
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.channel, 'LOCAL_QUEUE');
    assert.strictEqual(local.calls, 1);
    assert.strictEqual(bleWasLoaded, false);
  });
});
