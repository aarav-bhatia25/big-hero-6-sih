/**
 * Offline SOS Mesh — Cellular SMS Transport Fallback
 * 
 * Prepares a compact emergency SMS payload and triggers cellular fallback protocol
 * when IP connectivity is unavailable but cellular radio is accessible.
 */

import { SOSTransport, TransportResult } from './types';
import { SOSPacket, serializeSOSPacket } from '../sosPacket';

export class SmsTransport implements SOSTransport {
  public readonly name = 'SMS';
  private emergencyNumber = '112'; // National Emergency Number in India

  public async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    // SMS protocol links work on mobile platforms or cellular desktop devices
    return true;
  }

  public async send(packet: SOSPacket): Promise<TransportResult> {
    try {
      const smsBody = `PRAHARI SOS:${packet.incidentId}:${packet.touristId}:${packet.latitude.toFixed(5)},${packet.longitude.toFixed(5)}:HOP${packet.hopCount}`;
      const smsUrl = `sms:${this.emergencyNumber}?body=${encodeURIComponent(smsBody)}`;

      if (typeof window !== 'undefined') {
        // Opportunistically attempt to trigger SMS client without navigating away
        const link = document.createElement('a');
        link.href = smsUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      return {
        success: true,
        channel: 'SMS',
        message: `Emergency SMS payload generated for ${this.emergencyNumber}.`,
        incidentId: packet.incidentId,
        transmittedAt: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        channel: 'SMS',
        error: err.message || 'Could not launch SMS fallback client.',
      };
    }
  }
}
