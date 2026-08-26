/**
 * Offline SOS Mesh — Direct Internet Transport
 * 
 * Attempts immediate REST API POST to `/api/incidents` when browser internet connectivity is available.
 */

import { SOSTransport, TransportResult } from './types';
import { SOSPacket } from '../sosPacket';

export class InternetTransport implements SOSTransport {
  public readonly name = 'INTERNET';

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async send(packet: SOSPacket): Promise<TransportResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      let res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          type: packet.type,
          touristId: packet.touristId,
          location: { lat: packet.latitude, lng: packet.longitude },
          severity: packet.severity,
          status: 'ACTIVE',
          transportType: packet.lastKnownTransport ?? 'INTERNET',
          hopCount: packet.hopCount,
          originDeviceId: packet.originDeviceId,
          originalTimestamp: new Date(packet.timestamp).toISOString(),
          relayPath: packet.relayPath,
          packetId: packet.packetId,
          incidentId: packet.incidentId,
        }),
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('/api/sos-relay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packet }),
        }).catch(() => null);
      }

      clearTimeout(timeoutId);
      const data = res ? await res.json().catch(() => null) : null;

      if (res && res.ok && data?.success) {
        return {
          success: true,
          channel: 'INTERNET',
          message: data.message || 'SOS delivered directly to police backend via Internet.',
          incidentId: data.incident?.incidentId || packet.incidentId,
          incidentRecord: data.incident ?? data.incidentRecord,
          transmittedAt: Date.now(),
        };
      }

      return {
        success: false,
        channel: 'INTERNET',
        error: data?.error || (res ? `HTTP ${res.status} error delivering SOS.` : 'Could not reach server endpoint.'),
      };
    } catch (err: any) {
      const isAbort = err.name === 'AbortError';
      return {
        success: false,
        channel: 'INTERNET',
        error: isAbort ? 'Internet request timed out.' : err.message || 'Failed to reach internet gateway.',
      };
    }
  }
}
