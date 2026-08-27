/**
 * Near-Ultrasonic Acoustic Receiver — Microphone FFT Decoder (Web Audio API)
 *
 * Listens for near-ultrasonic sound waves (18 kHz – 19.5 kHz) through the device microphone.
 * Uses a Web Audio API AnalyserNode & Fast Fourier Transform (FFT) to decode FSK frequency
 * shifts into zero-trust Nostr SOS binary packets, which are automatically verified and
 * relayed to Police HQ.
 */

import { unpackMeshFrame } from '../nostrEncoder';
import { fromNostrSOSEvent, verifyNostrSOSEvent, SOSPacket } from '../sosPacket';
import { saveQueuedPacket } from '../indexedDbQueue';

const PREAMBLE_FREQ = 18000;
const BIT_0_FREQ = 18600;
const BIT_1_FREQ = 19200;
const FREQ_TOLERANCE_HZ = 200;

let audioStream: MediaStream | null = null;
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let animationFrameId: number | null = null;
let isListening = false;

function freqToBin(frequency: number, fftSize: number, sampleRate: number): number {
  return Math.round((frequency * fftSize) / sampleRate);
}

function bitsToBytes(bits: number[]): Uint8Array {
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | (bits[i * 8 + b] || 0);
    }
    bytes[i] = byte;
  }
  return bytes;
}

export type UltrasonicSignalEvent = {
  signalLevel: number; // 0 - 100 near-ultrasonic energy
  detectedFrequency?: number;
  lastDecodedPacket?: SOSPacket;
};

/**
 * Starts listening to the microphone for incoming near-ultrasonic SOS beacons.
 */
export async function startUltrasonicListener(
  onSignalUpdate?: (event: UltrasonicSignalEvent) => void,
  onSosDecoded?: (packet: SOSPacket) => void
): Promise<() => void> {
  if (typeof window === 'undefined' || isListening) return () => {};

  try {
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioCtx();
    const source = audioCtx.createMediaStreamSource(audioStream);

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.2;
    source.connect(analyser);

    isListening = true;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const sampleRate = audioCtx.sampleRate;

    const preambleBin = freqToBin(PREAMBLE_FREQ, analyser.fftSize, sampleRate);
    const bit0Bin = freqToBin(BIT_0_FREQ, analyser.fftSize, sampleRate);
    const bit1Bin = freqToBin(BIT_1_FREQ, analyser.fftSize, sampleRate);

    let state: 'IDLE' | 'PREAMBLE_DETECTED' | 'RECEIVING_BITS' = 'IDLE';
    let receivedBits: number[] = [];
    let lastBitTime = 0;

    const processAudio = () => {
      if (!isListening || !analyser) return;

      analyser.getByteFrequencyData(dataArray);

      // Measure near-ultrasonic energy level (18k - 20k)
      const ultrasonicEnergy = Math.max(dataArray[preambleBin] || 0, dataArray[bit0Bin] || 0, dataArray[bit1Bin] || 0);
      const signalPercent = Math.min(100, Math.round((ultrasonicEnergy / 255) * 100));

      if (onSignalUpdate) {
        onSignalUpdate({ signalLevel: signalPercent });
      }

      const now = Date.now();

      // State 1: Preamble Detection (18.0 kHz pulse)
      if (state === 'IDLE') {
        if (dataArray[preambleBin] > 120 && dataArray[preambleBin] > dataArray[bit0Bin] && dataArray[preambleBin] > dataArray[bit1Bin]) {
          state = 'PREAMBLE_DETECTED';
          receivedBits = [];
          lastBitTime = now;
          console.info('[Ultrasonic Receiver] Preamble 18.0 kHz sync tone detected!');
        }
      } else if (state === 'PREAMBLE_DETECTED' || state === 'RECEIVING_BITS') {
        // Sample bits every 30ms interval
        if (now - lastBitTime >= 28) {
          const val0 = dataArray[bit0Bin] || 0;
          const val1 = dataArray[bit1Bin] || 0;

          if (val1 > 100 && val1 > val0) {
            receivedBits.push(1);
            lastBitTime = now;
            state = 'RECEIVING_BITS';
          } else if (val0 > 100 && val0 > val1) {
            receivedBits.push(0);
            lastBitTime = now;
            state = 'RECEIVING_BITS';
          } else if (now - lastBitTime > 400) {
            // End of transmission burst, decode accumulated bits
            if (receivedBits.length >= 64) {
              void (async () => {
                const bytes = bitsToBytes(receivedBits);
                const frame = unpackMeshFrame(bytes);
                if (frame?.event && verifyNostrSOSEvent(frame.event)) {
                  const packet = fromNostrSOSEvent(frame.event, {
                    ttl: frame.ttl,
                    hopCount: frame.hopCount,
                    relayPath: [...(frame.relayPath || []), 'ACOUSTIC_ULTRASONIC_NODE'],
                  });

                  console.info(`[Ultrasonic Receiver] Decoded near-ultrasonic acoustic SOS: ${packet.incidentId}`);
                  onSosDecoded?.(packet);

                  // If online, relay to Police HQ
                  if (navigator.onLine) {
                    await fetch('/api/sos-relay', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ packet }),
                    }).catch(() => null);
                  } else {
                    await saveQueuedPacket(packet, 'QUEUED');
                  }
                }
              })();
            }
            state = 'IDLE';
            receivedBits = [];
          }
        }
      }

      animationFrameId = requestAnimationFrame(processAudio);
    };

    animationFrameId = requestAnimationFrame(processAudio);
  } catch (err) {
    console.warn('[Ultrasonic Receiver] Microphone access error:', err);
    isListening = false;
  }

  return () => {
    isListening = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      audioStream = null;
    }
    if (audioCtx && audioCtx.state !== 'closed') {
      void audioCtx.close();
      audioCtx = null;
    }
  };
}
