/**
 * Offline SOS Mesh — Local Queue Fallback Transport
 * 
 * Invoked when the Internet transport is temporarily unreachable.
 * Persists the SOS packet into local IndexedDB storage and retries when this
 * browser later receives an online event. IndexedDB is not device encryption.
 */

import { SOSTransport, TransportResult } from './types';
import { SOSPacket } from '../sosPacket';
import { saveQueuedPacket } from '../indexedDbQueue';

export class LocalTransport implements SOSTransport {
  public readonly name = 'LOCAL_QUEUE';

  public async isAvailable(): Promise<boolean> {
    return true; // Always available as local persistent store
  }

  public async send(packet: SOSPacket): Promise<TransportResult> {
    try {
      const saved = await saveQueuedPacket(packet, 'QUEUED');
      if (!saved) {
        throw new Error('IndexedDB storage write failed.');
      }

      return {
        success: true,
        channel: 'LOCAL_QUEUE',
        message: 'SOS stored locally on this device. Prahari will retry delivery when this browser reconnects.',
        incidentId: packet.incidentId,
        transmittedAt: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        channel: 'LOCAL_QUEUE',
        error: err.message || 'Could not persist SOS to local queue.',
      };
    }
  }
}
