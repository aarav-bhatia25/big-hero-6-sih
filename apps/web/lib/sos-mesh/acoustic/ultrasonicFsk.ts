/**
 * Near-Ultrasonic Acoustic Beaconing — FSK Transmitter (Web Audio API)
 *
 * Converts zero-trust SOS binary payloads into near-ultrasonic sound waves (18 kHz – 19.5 kHz)
 * using Frequency Shift Keying (FSK). Inaudible to human ears, but reliably captured by
 * smartphone microphones across room distances, pockets, and debris.
 */

const PREAMBLE_FREQ = 18000; // 18.0 kHz sync tone
const BIT_0_FREQ = 18600;    // 18.6 kHz (Binary 0)
const BIT_1_FREQ = 19200;    // 19.2 kHz (Binary 1)
const BIT_DURATION_MS = 30;  // 30ms per bit (~33 bps, highly robust against room reverb)

let activeAudioCtx: AudioContext | null = null;
let isTransmitting = false;

function getAudioContext(): AudioContext {
  if (!activeAudioCtx || activeAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    activeAudioCtx = new AudioCtx();
  }
  if (activeAudioCtx.state === 'suspended') {
    void activeAudioCtx.resume();
  }
  return activeAudioCtx;
}

/** Converts a binary Uint8Array frame into a stream of bits */
function bufferToBits(buffer: Uint8Array): number[] {
  const bits: number[] = [];
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    for (let b = 7; b >= 0; b--) {
      bits.push((byte >> b) & 1);
    }
  }
  return bits;
}

/**
 * Transmits a binary frame over near-ultrasonic sound waves.
 * Emits a 100ms 18 kHz sync tone, followed by 30ms FSK tones per bit.
 */
export async function emitUltrasonicSosBeacon(buffer: Uint8Array, repetitions: number = 3): Promise<void> {
  if (typeof window === 'undefined' || isTransmitting) return;
  isTransmitting = true;

  try {
    const audioCtx = getAudioContext();
    const bits = bufferToBits(buffer);

    for (let rep = 0; rep < repetitions; rep++) {
      if (!isTransmitting) break;

      // 1. Play 100ms Preamble Sync Tone (18.0 kHz)
      await playTone(audioCtx, PREAMBLE_FREQ, 120);

      // 2. Transmit FSK Bitstream
      for (const bit of bits) {
        if (!isTransmitting) break;
        const freq = bit === 1 ? BIT_1_FREQ : BIT_0_FREQ;
        await playTone(audioCtx, freq, BIT_DURATION_MS);
      }

      // Short silence gap between pulse bursts
      await new Promise((res) => setTimeout(res, 200));
    }
  } catch (err) {
    console.warn('[Ultrasonic FSK] Audio transmission error:', err);
  } finally {
    isTransmitting = false;
  }
}

/** Stops any currently playing ultrasonic acoustic beacon */
export function stopUltrasonicSosBeacon(): void {
  isTransmitting = false;
  if (activeAudioCtx && activeAudioCtx.state !== 'closed') {
    try {
      void activeAudioCtx.suspend();
    } catch {}
  }
}

function playTone(audioCtx: AudioContext, frequency: number, durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

      // Soft envelope ramp to prevent audible speaker clicks
      const rampMs = 0.005;
      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.8, audioCtx.currentTime + rampMs);
      gain.gain.setValueAtTime(0.8, audioCtx.currentTime + (durationMs / 1000) - rampMs);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + (durationMs / 1000));

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + (durationMs / 1000));

      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        resolve();
      };
    } catch {
      resolve();
    }
  });
}
