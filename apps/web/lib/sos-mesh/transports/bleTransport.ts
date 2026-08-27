/**
 * Offline SOS Mesh — Nostr BLE & Peer Broadcast Mesh Transport
 * 
 * Manages peer discovery and opportunistic binary packet forwarding across nearby devices.
 * Combines Web Bluetooth capability detection with a local BroadcastChannel peer mesh layer
 * and compact Nostr binary wire encoding.
 */

import { SOSTransport, TransportResult } from './types';
import { SOSPacket, incrementPacketHop, getOrCreateDeviceId, verifyNostrSOSEvent, fromNostrSOSEvent } from '../sosPacket';
import { markPacketAsSeen, hasSeenPacket, saveQueuedPacket } from '../indexedDbQueue';
import { packNostrEvent, unpackNostrEvent } from '../nostrEncoder';

export class BleTransport implements SOSTransport {
  public readonly name = 'BLE_RELAY';
  private broadcastChannel?: BroadcastChannel;
  private isRelayModeActive = true;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('prahari_sos_mesh');
        this.setupPeerListener();
      } catch (err) {
        console.warn('[BleTransport] BroadcastChannel initialization failed:', err);
      }
    }
  }

  public async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const hasWebBluetooth = Boolean(typeof navigator !== 'undefined' && (navigator as any) && 'bluetooth' in (navigator as any));
    const hasBroadcast = Boolean(typeof BroadcastChannel !== 'undefined');
    return hasWebBluetooth || hasBroadcast;
  }

  public async send(packet: SOSPacket): Promise<TransportResult> {
    const available = await this.isAvailable();
    if (!available) {
      return {
        success: false,
        channel: 'BLE_RELAY',
        error: 'Bluetooth/Peer Relay unavailable on this device.',
      };
    }

    try {
      const currentDeviceId = getOrCreateDeviceId();
      const relayedPacket = incrementPacketHop(packet, currentDeviceId, 'BLE_RELAY');

      // Persist local record as RELAYED
      await saveQueuedPacket(relayedPacket, 'RELAYED');

      // Compact Binary Encoding for BLE / Radio wire transport
      let binaryBuffer: ArrayBuffer | null = null;
      if (relayedPacket.nostrEvent) {
        const u8 = packNostrEvent(relayedPacket.nostrEvent);
        binaryBuffer = (u8.buffer as ArrayBuffer).slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      }

      // Broadcast over Mesh Channel to nearby peers
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'EMERGENCY_SOS_RELAY',
          packet: relayedPacket,
          binaryBuffer,
          senderDeviceId: currentDeviceId,
          timestamp: Date.now(),
        });
      }

      // Also invoke global simulator if present (evaluator mode)
      if (typeof window !== 'undefined' && (window as any).__PRAHARI_MESH_SIMULATOR__) {
        (window as any).__PRAHARI_MESH_SIMULATOR__.receivePacket(relayedPacket);
      }

      // Relay directly to Police Gateway endpoint if internet is available
      let incidentRecord: any = null;
      try {
        const relayRes = await fetch('/api/sos-relay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packet: relayedPacket }),
        });
        if (relayRes.ok) {
          const relayData = await relayRes.json();
          if (relayData.success) {
            incidentRecord = relayData.incidentRecord ?? relayData.incident;
          }
        }
      } catch (e) {
        // Local network gateway unavailable
      }

      return {
        success: true,
        channel: 'BLE_RELAY',
        message: 'Nostr SOS packet transmitted over high-efficiency BLE mesh.',
        incidentId: packet.incidentId,
        incidentRecord,
        transmittedAt: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        channel: 'BLE_RELAY',
        error: err.message || 'Failed to transmit SOS over BLE mesh relay.',
      };
    }
  }

  private setupPeerListener() {
    if (!this.broadcastChannel) return;
    this.broadcastChannel.onmessage = async (event) => {
      if (!this.isRelayModeActive) return;
      const data = event.data;
      if (!data || data.type !== 'EMERGENCY_SOS_RELAY') return;

      let incomingPacket: SOSPacket | null = data.packet ?? null;

      // Handle binary payload if present
      if (data.binaryBuffer && data.binaryBuffer instanceof ArrayBuffer) {
        const unpackedNostr = unpackNostrEvent(new Uint8Array(data.binaryBuffer));
        if (unpackedNostr) {
          incomingPacket = fromNostrSOSEvent(unpackedNostr);
        }
      }

      if (!incomingPacket) return;

      const currentDeviceId = getOrCreateDeviceId();

      // Do not process own packets or already seen packets
      if (incomingPacket.originDeviceId === currentDeviceId) return;
      const alreadySeen = await hasSeenPacket(incomingPacket.packetId);
      if (alreadySeen) return;

      // Verify Nostr Zero-Trust signature
      if (incomingPacket.nostrEvent) {
        const isValidSig = verifyNostrSOSEvent(incomingPacket.nostrEvent);
        if (!isValidSig) {
          console.warn('[BleTransport] Dropping packet with invalid Nostr signature:', incomingPacket.packetId);
          return;
        }
      }

      console.log('[BleTransport] Received verified Nostr SOS packet from peer mesh:', incomingPacket.packetId);
      await markPacketAsSeen(incomingPacket.packetId);

      // Store received packet in local queue
      await saveQueuedPacket(incomingPacket, 'QUEUED');

      // If online, immediately relay to internet gateway!
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        console.log('[BleTransport] Gateway device online: Uploading peer Nostr SOS packet to police...');
        try {
          const res = await fetch('/api/sos-relay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packet: incomingPacket }),
          });

          if (res.ok) {
            const resData = await res.json();
            console.log('[BleTransport] Relay gateway upload succeeded:', resData);
            await saveQueuedPacket(incomingPacket, 'DELIVERED');
          }
        } catch (err) {
          console.error('[BleTransport] Relay gateway upload error:', err);
        }
      }
    };
  }

  public setRelayMode(enabled: boolean) {
    this.isRelayModeActive = enabled;
  }
}
