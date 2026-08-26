/**
 * Offline SOS Mesh — Emergency Relay Engine
 * 
 * Runs on devices acting as opportunistic Emergency Relay Beacons.
 * Handles deduplication, TTL validation, local storage, and opportunistic forwarding.
 */

import { SOSPacket, isPacketExpired, incrementPacketHop, getOrCreateDeviceId } from '../sosPacket';
import { hasSeenPacket, markPacketAsSeen, saveQueuedPacket } from '../indexedDbQueue';

export interface RelayEvent {
  type: 'PACKET_RECEIVED' | 'PACKET_FORWARDED' | 'DUPLICATE_DROPPED' | 'EXPIRED_DROPPED';
  packetId: string;
  hopCount: number;
  timestamp: number;
  relayDeviceId: string;
  detail?: string;
}

export class BLERelayEngine {
  private isEnabled = true;
  private eventListeners: Set<(event: RelayEvent) => void> = new Set();

  public isRelayActive(): boolean {
    return this.isEnabled;
  }

  public setRelayActive(active: boolean) {
    this.isEnabled = active;
  }

  public subscribe(listener: (event: RelayEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Processes an incoming SOS packet received over BLE/Mesh.
   */
  public async handleIncomingPacket(packet: SOSPacket): Promise<{ action: 'RELAYED' | 'DROPPED' | 'UPLOADED'; reason?: string }> {
    if (!this.isEnabled) {
      return { action: 'DROPPED', reason: 'Emergency Relay Mode disabled on this device.' };
    }

    const currentDeviceId = getOrCreateDeviceId();

    // 1. Expiration & TTL check
    if (isPacketExpired(packet)) {
      this.emit({
        type: 'EXPIRED_DROPPED',
        packetId: packet.packetId,
        hopCount: packet.hopCount,
        timestamp: Date.now(),
        relayDeviceId: currentDeviceId,
        detail: 'Packet TTL reached 0 or timestamp expired.',
      });
      return { action: 'DROPPED', reason: 'Packet expired or max hops reached.' };
    }

    // 2. Deduplication check
    const alreadySeen = await hasSeenPacket(packet.packetId);
    if (alreadySeen) {
      this.emit({
        type: 'DUPLICATE_DROPPED',
        packetId: packet.packetId,
        hopCount: packet.hopCount,
        timestamp: Date.now(),
        relayDeviceId: currentDeviceId,
        detail: 'Packet ID already processed by this node.',
      });
      return { action: 'DROPPED', reason: 'Duplicate packet ID already seen.' };
    }

    // Mark as seen immediately
    await markPacketAsSeen(packet.packetId);

    this.emit({
      type: 'PACKET_RECEIVED',
      packetId: packet.packetId,
      hopCount: packet.hopCount,
      timestamp: Date.now(),
      relayDeviceId: currentDeviceId,
    });

    // 3. Store locally in IndexedDB
    const updatedPacket = incrementPacketHop(packet, currentDeviceId, 'BLE_RELAY');
    await saveQueuedPacket(updatedPacket, 'QUEUED');

    // 4. Gateway check: If online, upload to police backend immediately!
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await fetch('/api/sos-relay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packet: updatedPacket }),
        });

        if (res.ok) {
          await saveQueuedPacket(updatedPacket, 'DELIVERED');
          this.emit({
            type: 'PACKET_FORWARDED',
            packetId: updatedPacket.packetId,
            hopCount: updatedPacket.hopCount,
            timestamp: Date.now(),
            relayDeviceId: currentDeviceId,
            detail: 'Relayed directly to police gateway endpoint over internet.',
          });
          return { action: 'UPLOADED', reason: 'Relayed to police gateway over internet.' };
        }
      } catch (err: any) {
        console.warn('[BLERelayEngine] Internet gateway upload failed, keeping in local queue:', err);
      }
    }

    // 5. Forward to next hop over BroadcastChannel / BLE Mesh
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('prahari_sos_mesh');
        bc.postMessage({
          type: 'EMERGENCY_SOS_RELAY',
          packet: updatedPacket,
          senderDeviceId: currentDeviceId,
          timestamp: Date.now(),
        });
        bc.close();
      } catch (err) {
        console.warn('[BLERelayEngine] BroadcastChannel post failed:', err);
      }
    }

    this.emit({
      type: 'PACKET_FORWARDED',
      packetId: updatedPacket.packetId,
      hopCount: updatedPacket.hopCount,
      timestamp: Date.now(),
      relayDeviceId: currentDeviceId,
    });

    return { action: 'RELAYED', reason: 'Packet stored locally and forwarded to mesh.' };
  }

  private emit(event: RelayEvent) {
    this.eventListeners.forEach((listener) => {
      try { listener(event); } catch (err) { console.error('[BLERelayEngine] Listener error:', err); }
    });
  }
}

export const globalBLERelayEngine = new BLERelayEngine();
