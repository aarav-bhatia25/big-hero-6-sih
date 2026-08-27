/**
 * SOS delivery coordinator.
 *
 * Internet is the complete, primary path. BLE is never loaded or queried while
 * that path works; it is an explicit, optional offline relay. If neither is
 * available, the packet is held in this browser's retry queue.
 */

import type { SOSTransport, TransportResult } from './types';
import { InternetTransport } from './internetTransport';
import { LocalTransport } from './localTransport';
import { SOSPacket } from '../sosPacket';
import { globalSOSStateMachine } from '../sosStateMachine';
import { getPendingQueuedPackets, updateQueuedPacketStatus } from '../indexedDbQueue';

type BleTransportLoader = () => Promise<SOSTransport | null>;

export type SOSTransportManagerDependencies = {
  internetTransport?: InternetTransport;
  localTransport?: LocalTransport;
  loadBleTransport?: BleTransportLoader;
};

const loadOptionalBleTransport: BleTransportLoader = async () => {
  const { globalBleTransport } = await import('./bleTransport');
  return globalBleTransport;
};

export class SOSTransportManager {
  private readonly internetTransport: InternetTransport;
  private readonly localTransport: LocalTransport;
  private readonly loadBleTransport: BleTransportLoader;
  private isProcessingQueue = false;

  constructor(dependencies: SOSTransportManagerDependencies = {}) {
    this.internetTransport = dependencies.internetTransport ?? new InternetTransport();
    this.localTransport = dependencies.localTransport ?? new LocalTransport();
    this.loadBleTransport = dependencies.loadBleTransport ?? loadOptionalBleTransport;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        void this.flushQueuedPackets();
      });
    }
  }

  private async tryTransport(transport: SOSTransport, packet: SOSPacket): Promise<TransportResult | null> {
    try {
      if (!await transport.isAvailable()) return null;
      return await transport.send(packet);
    } catch (error: any) {
      return {
        success: false,
        channel: transport.name,
        error: error?.message || `${transport.name} transport failed unexpectedly.`,
      };
    }
  }

  private markDelivered(packet: SOSPacket, result: TransportResult): TransportResult {
    globalSOSStateMachine.transitionTo('DELIVERED', {
      incidentId: packet.incidentId,
      transport: 'INTERNET',
      message: result.message || 'SOS recorded directly in the Prahari authority queue via Internet.',
    });
    return result;
  }

  /**
   * Sends an SOS directly over the authenticated web API first. `allowBleRelay`
   * defaults to false so a traveller must deliberately set up the optional
   * gateway; Wi-Fi delivery and offline local retry require no BLE support.
   */
  public async dispatch(packet: SOSPacket, { allowBleRelay = false }: { allowBleRelay?: boolean } = {}): Promise<TransportResult> {
    globalSOSStateMachine.transitionTo('TRY_INTERNET', {
      incidentId: packet.incidentId,
      message: 'Sending SOS directly to the Prahari authority queue…',
    });

    const internetResult = await this.tryTransport(this.internetTransport, packet);
    if (internetResult?.success) return this.markDelivered(packet, internetResult);

    if (allowBleRelay) {
      try {
        const bleTransport = await this.loadBleTransport();
        if (bleTransport) {
          globalSOSStateMachine.transitionTo('TRY_BLE_RELAY', { incidentId: packet.incidentId });
          const bleResult = await this.tryTransport(bleTransport, packet);
          if (bleResult?.success) {
            globalSOSStateMachine.transitionTo('RELAYED', {
              incidentId: packet.incidentId,
              transport: 'BLE_RELAY',
              hopCount: packet.hopCount,
              message: bleResult.message || 'SOS accepted by the optional BLE relay gateway.',
            });
            return bleResult;
          }
        }
      } catch {
        // BLE is optional. A missing API, unsupported browser, or gateway error
        // must never prevent the durable local fallback.
      }
    }

    const localResult = await this.tryTransport(this.localTransport, packet);
    if (localResult?.success) {
      globalSOSStateMachine.transitionTo('LOCAL_PERSISTED', {
        incidentId: packet.incidentId,
        transport: 'LOCAL_QUEUE',
        message: localResult.message || 'SOS saved locally and will retry when this browser reconnects.',
      });
      return localResult;
    }

    globalSOSStateMachine.transitionTo('DELIVERY_FAILED', {
      incidentId: packet.incidentId,
      message: localResult?.error || internetResult?.error || 'SOS could not be delivered or saved locally.',
    });
    return localResult ?? internetResult ?? {
      success: false,
      channel: 'LOCAL_QUEUE',
      error: 'SOS could not be delivered or saved locally.',
    };
  }

  /** Flushes browser-stored offline packets as soon as the web connection returns. */
  public async flushQueuedPackets(): Promise<{ processed: number; succeeded: number }> {
    if (this.isProcessingQueue) return { processed: 0, succeeded: 0 };
    this.isProcessingQueue = true;

    try {
      const pendingRecords = await getPendingQueuedPackets();
      let succeeded = 0;

      for (const record of pendingRecords) {
        const result = await this.tryTransport(this.internetTransport, record.packet);
        if (result?.success) {
          await updateQueuedPacketStatus(record.packetId, 'DELIVERED');
          succeeded += 1;
          this.markDelivered(record.packet, result);
        } else {
          await updateQueuedPacketStatus(record.packetId, record.status, result?.error || 'Internet is still unavailable.');
        }
      }

      return { processed: pendingRecords.length, succeeded };
    } catch (error) {
      console.error('[SOSTransportManager] Unable to flush the local SOS queue:', error);
      return { processed: 0, succeeded: 0 };
    } finally {
      this.isProcessingQueue = false;
    }
  }
}

export const globalTransportManager = new SOSTransportManager();
