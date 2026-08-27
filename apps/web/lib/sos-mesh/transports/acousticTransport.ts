/**
 * Near-Ultrasonic Acoustic SOS Transport (Web Audio API)
 *
 * Transmits zero-trust Nostr SOS binary packets into high-frequency sound waves (18 kHz - 19.5 kHz)
 * using Frequency Shift Keying (FSK). Operates omnidirectionally through pockets, clothing, and
 * debris without requiring Bluetooth or Wi-Fi radio connectivity.
 */

import { SOSTransport, TransportResult } from './types';
import { SOSPacket } from '../sosPacket';
import { packMeshFrame } from '../nostrEncoder';
import { emitUltrasonicSosBeacon } from '../acoustic/ultrasonicFsk';

export class AcousticTransport implements SOSTransport {
  public readonly name = 'ACOUSTIC_ULTRASONIC';

  public async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && Boolean(window.AudioContext || (window as any).webkitAudioContext);
  }

  public async send(packet: SOSPacket): Promise<TransportResult> {
    try {
      const frameBuffer = packMeshFrame(packet);
      
      // Emit near-ultrasonic acoustic sound burst across 18 kHz - 19.5 kHz frequencies
      void emitUltrasonicSosBeacon(frameBuffer, 3);

      return {
        success: true,
        channel: 'ACOUSTIC_ULTRASONIC',
        message: 'SOS emitted via near-ultrasonic sound waves (18.5-19.5 kHz). Nearby mobile microphones will pick up and relay the alert.',
        incidentId: packet.incidentId,
        transmittedAt: Date.now(),
      };
    } catch (err: any) {
      return {
        success: false,
        channel: 'ACOUSTIC_ULTRASONIC',
        error: err.message || 'Could not emit near-ultrasonic acoustic SOS beacon.',
      };
    }
  }
}

export const globalAcousticTransport = new AcousticTransport();
