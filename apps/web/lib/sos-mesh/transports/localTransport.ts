/**
 * Offline SOS Mesh — Local Queue Fallback Transport
 * 
 * Invoked when Internet, SMS, and BLE Relay are temporarily unreachable.
 * Safely persists the SOS packet into non-volatile IndexedDB storage and schedules background retries.
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
        message: 'SOS securely stored in local encrypted queue. System will auto-retry delivery upon connectivity.',
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
