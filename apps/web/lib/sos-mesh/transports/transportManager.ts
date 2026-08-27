/**
 * Offline SOS Mesh — Transport Manager
 * 
 * Central coordinator selecting the best available transport channel based on priority:
 * 1. Internet Transport (REST API)
 * 2. SMS Transport (Cellular fallback)
 * 3. BLE Relay Transport (Peer-to-peer mesh)
 * 4. Local Queue Transport (IndexedDB store-and-forward)
 * 
 * Listens for network restoration to automatically flush and deliver queued offline packets.
 */

import { SOSTransport, TransportResult, TransportChannel } from './types';
import { InternetTransport } from './internetTransport';
import { BleTransport } from './bleTransport';
import { globalWebRtcTransport } from './webRtcTransport';
import { LocalTransport } from './localTransport';
import { SOSPacket } from '../sosPacket';
import { globalSOSStateMachine } from '../sosStateMachine';
import { getPendingQueuedPackets, updateQueuedPacketStatus } from '../indexedDbQueue';

export class SOSTransportManager {
  private transports: SOSTransport[];
  private isProcessingQueue = false;

  constructor() {
    this.transports = [
      new InternetTransport(),
      globalWebRtcTransport,
      new BleTransport(),
      new LocalTransport(),
    ];

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[SOSTransportManager] Network online event detected! Flushing queued SOS packets...');
        void this.flushQueuedPackets();
      });
    }
  }

  /**
   * Dispatches an emergency packet using the best available transport channel.
   */
  public async dispatch(packet: SOSPacket): Promise<TransportResult> {
    globalSOSStateMachine.transitionTo('TRY_INTERNET', {
      incidentId: packet.incidentId,
      message: 'Evaluating available transport channels for SOS delivery...',
    });

    for (const transport of this.transports) {
      const isAvail = await transport.isAvailable();
      if (!isAvail) continue;

      if (transport.name === 'INTERNET') {
        globalSOSStateMachine.transitionTo('TRY_INTERNET', { incidentId: packet.incidentId });
      } else if (transport.name === 'BLE_RELAY') {
        globalSOSStateMachine.transitionTo('TRY_BLE_RELAY', { incidentId: packet.incidentId });
      }

      console.log(`[SOSTransportManager] Attempting delivery via channel: ${transport.name}`);
      const result = await transport.send(packet);

      if (result.success) {
        if (result.channel === 'INTERNET') {
          globalSOSStateMachine.transitionTo('DELIVERED', {
            incidentId: packet.incidentId,
            transport: 'INTERNET',
            message: result.message || 'SOS delivered to police backend via internet.',
          });
        } else if (result.channel === 'BLE_RELAY') {
          globalSOSStateMachine.transitionTo('RELAYED', {
            incidentId: packet.incidentId,
            transport: 'BLE_RELAY',
            hopCount: packet.hopCount + 1,
            message: result.message || 'SOS transmitted to nearby relay device.',
          });
        } else if (result.channel === 'LOCAL_QUEUE') {
          globalSOSStateMachine.transitionTo('LOCAL_PERSISTED', {
            incidentId: packet.incidentId,
            transport: 'LOCAL_QUEUE',
            message: result.message || 'SOS safely saved in local offline queue.',
          });
        }
        return result;
      }

      console.warn(`[SOSTransportManager] Delivery failed on channel ${transport.name}:`, result.error);
    }

    // Ultimate fallback: save locally
    const localTransport = this.transports.find((t) => t.name === 'LOCAL_QUEUE') as LocalTransport;
    const fallbackResult = await localTransport.send(packet);

    globalSOSStateMachine.transitionTo('LOCAL_PERSISTED', {
      incidentId: packet.incidentId,
      transport: 'LOCAL_QUEUE',
      message: 'No active channels reached; packet secured in local queue.',
    });

    return fallbackResult;
  }

  /**
   * Flushes all stored offline packets to the server when internet returns.
   */
  public async flushQueuedPackets(): Promise<{ processed: number; succeeded: number }> {
    if (this.isProcessingQueue) return { processed: 0, succeeded: 0 };
    this.isProcessingQueue = true;

    try {
      const internetTransport = this.transports.find((t) => t.name === 'INTERNET') as InternetTransport;
      const isOnline = await internetTransport.isAvailable();
      if (!isOnline) {
        this.isProcessingQueue = false;
        return { processed: 0, succeeded: 0 };
      }

      const pendingRecords = await getPendingQueuedPackets();
      let succeeded = 0;

      for (const record of pendingRecords) {
        console.log(`[SOSTransportManager] Flushing queued packet: ${record.packetId}`);
        const res = await internetTransport.send(record.packet);
        if (res.success) {
          await updateQueuedPacketStatus(record.packetId, 'DELIVERED');
          succeeded++;
          globalSOSStateMachine.transitionTo('DELIVERED', {
            incidentId: record.packet.incidentId,
            transport: 'INTERNET',
            message: 'Queued offline SOS delivered upon network restoration.',
          });
        } else {
          await updateQueuedPacketStatus(record.packetId, record.status, res.error);
        }
      }

      return { processed: pendingRecords.length, succeeded };
    } catch (err) {
      console.error('[SOSTransportManager] Error flushing queued packets:', err);
      return { processed: 0, succeeded: 0 };
    } finally {
      this.isProcessingQueue = false;
    }
  }
}

export const globalTransportManager = new SOSTransportManager();
