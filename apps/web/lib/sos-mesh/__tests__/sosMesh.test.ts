/**
 * Offline SOS Mesh — Unit & Integration Test Suite
 * 
 * Tests packet schema validation, TTL/hop limits, deduplication cache, state machine transitions,
 * and transport manager fallback logic.
 */

import assert from 'node:assert';
import { test, describe } from 'node:test';

import {
  calculateNostrEventId,
  createSOSPacket,
  isValidSOSPacket,
  isPacketExpired,
  fromNostrSOSEvent,
  incrementPacketHop,
  meshEventId,
  serializeSOSPacket,
  deserializeSOSPacket,
  verifyNostrSOSEvent,
} from '../sosPacket';
import { __setDeviceKeyPairForTesting } from '../nostrKeys';
import { packMeshFrame, unpackMeshFrame } from '../nostrEncoder';
import { BloomFilter } from '../bloomFilter';
import { verifyRelayedPacket } from '../meshTrust';

// Node has no localStorage, so the device identity is installed explicitly.
// A fixed secret keeps signatures reproducible across runs.
const TEST_SECRET = '0'.repeat(63) + '1';
const TEST_DEVICE = __setDeviceKeyPairForTesting(TEST_SECRET)!;

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


describe('Offline SOS Mesh — Nostr signing & zero-trust verification', () => {
  test('signs every packet with a real BIP-340 signature that verifies', () => {
    const packet = createSOSPacket({ touristId: 'TOUR-SIGN', latitude: 26.1445, longitude: 91.7362 });

    assert.strictEqual(packet.nostrEvent?.pubkey, TEST_DEVICE.pubkeyHex);
    assert.strictEqual(packet.nostrEvent?.sig.length, 128);
    assert.strictEqual(verifyNostrSOSEvent(packet.nostrEvent!), true);
  });

  test('rejects an event whose content was altered in flight', () => {
    const packet = createSOSPacket({ touristId: 'TOUR-TAMPER', latitude: 19.0, longitude: 72.0 });
    const altered = { ...packet.nostrEvent!, content: '{"type":"MEDICAL"}' };

    assert.strictEqual(verifyNostrSOSEvent(altered), false);
  });

  test('rejects a forgery that recomputes a consistent event id but cannot sign it', () => {
    const packet = createSOSPacket({ touristId: 'TOUR-FORGE', latitude: 19.0, longitude: 72.0 });
    const event = packet.nostrEvent!;

    // The attacker moves the victim's coordinates and repairs the id so the
    // hash check passes. Only the signature can catch this.
    const tags = event.tags.map((tag) => (tag[0] === 'lat' ? ['lat', '0'] : tag));
    const forged = {
      ...event,
      tags,
      id: calculateNostrEventId(event.pubkey, event.created_at, event.kind, tags, event.content),
    };

    assert.notStrictEqual(forged.id, event.id);
    assert.strictEqual(verifyNostrSOSEvent(forged), false);
  });

  test('keeps the signed event immutable across relay hops so dedup still works', () => {
    const packet = createSOSPacket({ touristId: 'TOUR-HOPS', latitude: 19.0, longitude: 72.0, ttl: 5 });
    const hop1 = incrementPacketHop(packet, 'RELAY-A', 'BLE_RELAY');
    const hop2 = incrementPacketHop(hop1, 'RELAY-B', 'BLE_RELAY');

    assert.strictEqual(hop2.nostrEvent?.id, packet.nostrEvent?.id);
    assert.strictEqual(meshEventId(hop2), meshEventId(packet));
    assert.strictEqual(verifyNostrSOSEvent(hop2.nostrEvent!), true);
    assert.strictEqual(hop2.hopCount, 2);
    assert.strictEqual(hop2.ttl, 3);
  });
});

describe('Offline SOS Mesh — Binary mesh frame codec', () => {
  test('round-trips identity, location and signature across a hop', () => {
    const packet = createSOSPacket({
      touristId: 'TOUR-MESH-1',
      incidentId: 'INC-4242',
      latitude: 26.1445,
      longitude: 91.7362,
    });

    const decoded = unpackMeshFrame(packMeshFrame(packet));
    assert.ok(decoded, 'frame should decode');

    const rebuilt = fromNostrSOSEvent(decoded!.event, {
      ttl: decoded!.ttl,
      hopCount: decoded!.hopCount,
      relayPath: decoded!.relayPath,
    });
    assert.strictEqual(rebuilt.incidentId, 'INC-4242');
    assert.strictEqual(rebuilt.touristId, 'TOUR-MESH-1');
    assert.strictEqual(rebuilt.originDeviceId, packet.originDeviceId);
    assert.strictEqual(rebuilt.latitude, 26.1445);
    assert.strictEqual(rebuilt.longitude, 91.7362);
    assert.strictEqual(rebuilt.severity, 'CRITICAL');
    // The whole point: the far side can still verify the origin's signature.
    assert.strictEqual(verifyNostrSOSEvent(rebuilt.nostrEvent!), true);
  });

  test('carries mutable hop and TTL outside the signed region', () => {
    const packet = createSOSPacket({ touristId: 'TOUR-ENV', latitude: 19.0, longitude: 72.0, ttl: 6 });
    const hop1 = incrementPacketHop(packet, 'RELAY-A', 'BLE_RELAY');

    const decoded = unpackMeshFrame(packMeshFrame(hop1));
    assert.strictEqual(decoded?.ttl, 5);
    assert.strictEqual(decoded?.hopCount, 1);
    assert.strictEqual(decoded?.event.id, packet.nostrEvent?.id);
  });

  test('carries relay provenance so an officer sees the full delivery path', () => {
    const packet = createSOSPacket({ touristId: 'TOUR-PATH', latitude: 19.0, longitude: 72.0, originDeviceId: 'NODE-ORIGIN' });
    const hop1 = incrementPacketHop(packet, 'NODE-B', 'BLE_RELAY');
    const hop2 = incrementPacketHop(hop1, 'NODE-C', 'BLE_RELAY');

    const decoded = unpackMeshFrame(packMeshFrame(hop2));
    assert.deepStrictEqual(decoded?.relayPath, ['NODE-ORIGIN', 'NODE-B', 'NODE-C']);
    assert.strictEqual(decoded?.hopCount, 2);
  });

  test('refuses buffers that are not Prahari mesh frames', () => {
    assert.strictEqual(unpackMeshFrame(new Uint8Array(4)), null);
    assert.strictEqual(unpackMeshFrame(new Uint8Array(200)), null);
  });
});

describe('Offline SOS Mesh — Bloom peer synchronisation', () => {
  test('a peer digest survives the wire and names what the peer is missing', () => {
    const mine = new BloomFilter();
    ['event-a', 'event-b'].forEach((id) => mine.add(id));

    const peerView = BloomFilter.fromBuffer(mine.toBuffer());
    assert.strictEqual(peerView.has('event-a'), true);

    const missing = peerView.getMissingItemsForPeer(['event-a', 'event-b', 'event-c']);
    assert.deepStrictEqual(missing, ['event-c']);
  });
});

describe('Offline SOS Mesh — Gateway relay trust', () => {
  const registeredTourist = { touristId: 'TOUR-MESH-1', meshPubkeys: [TEST_DEVICE.pubkeyHex] };

  const relayedPacket = () => createSOSPacket({
    touristId: 'TOUR-MESH-1',
    incidentId: 'INC-4242',
    latitude: 26.1445,
    longitude: 91.7362,
  });

  test('accepts a stranger-relayed packet signed by a registered device key', () => {
    const verdict = verifyRelayedPacket(relayedPacket(), registeredTourist);
    assert.strictEqual(verdict.trusted, true);
  });

  test('refuses a packet signed by a key the tourist never registered', () => {
    const verdict = verifyRelayedPacket(relayedPacket(), { touristId: 'TOUR-MESH-1', meshPubkeys: [] });
    assert.strictEqual(verdict.trusted, false);
  });

  test('a relay cannot rewrite the routing fields of a packet it carries', () => {
    // The relay keeps the valid signed event but rewrites the plain JSON
    // envelope around it, trying to redirect the incident.
    const tampered = {
      ...relayedPacket(),
      touristId: 'TOUR-ATTACKER',
      incidentId: 'INC-9999',
      latitude: 0,
      longitude: 0,
    };

    const verdict = verifyRelayedPacket(tampered, registeredTourist);
    assert.strictEqual(verdict.trusted, true);
    assert.strictEqual(verdict.trusted && verdict.packet.touristId, 'TOUR-MESH-1');
    assert.strictEqual(verdict.trusted && verdict.packet.incidentId, 'INC-4242');
    assert.strictEqual(verdict.trusted && verdict.packet.latitude, 26.1445);
  });

  test('refuses a packet older than the mesh retention window', () => {
    const packet = relayedPacket();
    const verdict = verifyRelayedPacket(packet, registeredTourist, Date.now() + 48 * 60 * 60 * 1000);
    assert.strictEqual(verdict.trusted, false);
  });

  test('refuses an unsigned packet outright', () => {
    const { nostrEvent, ...unsigned } = relayedPacket();
    const verdict = verifyRelayedPacket(unsigned as any, registeredTourist);
    assert.strictEqual(verdict.trusted, false);
  });
});
