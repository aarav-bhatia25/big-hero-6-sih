'use client';

import React, { useEffect, useState } from 'react';
import { Radio, Volume2, ShieldCheck, Zap } from 'lucide-react';
import { startUltrasonicListener } from '@/lib/sos-mesh/acoustic/ultrasonicReceiver';
import { SOSPacket } from '@/lib/sos-mesh/sosPacket';

export default function AcousticBeaconRadar() {
  const [active, setActive] = useState(false);
  const [signalLevel, setSignalLevel] = useState(0);
  const [lastDecoded, setLastDecoded] = useState<SOSPacket | null>(null);
  const [relayedCount, setRelayedCount] = useState(0);

  useEffect(() => {
    if (!active) return;

    let cleanup: (() => void) | null = null;
    void (async () => {
      cleanup = await startUltrasonicListener(
        (event) => {
          setSignalLevel(event.signalLevel);
        },
        (packet) => {
          setLastDecoded(packet);
          setRelayedCount((prev) => prev + 1);
        }
      );
    })();

    return () => {
      cleanup?.();
      setSignalLevel(0);
    };
  }, [active]);

  return (
    <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg border ${active ? 'border-sky-400 bg-sky-500/10 text-sky-400 animate-pulse' : 'border-line bg-surface-2 text-ink-soft'}`}>
            <Radio className="size-4" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-ink">Near-Ultrasonic Acoustic Radar (18-20 kHz)</h4>
            <p className="text-[11px] text-ink-soft">Zero-pairing microphone listener for acoustic SOS beacons</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActive(!active)}
          className={`minimal-button text-xs ${active ? 'minimal-button-primary bg-sky-600 hover:bg-sky-500' : 'minimal-button-secondary'}`}
        >
          <Volume2 className="size-3.5" />
          {active ? 'Listening for Beacons' : 'Enable Acoustic Radar'}
        </button>
      </div>

      {active ? (
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono text-ink-soft">MICROPHONE FFT ULTRASONIC SIGNAL:</span>
            <span className="font-mono font-bold text-sky-400">{signalLevel}%</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2 border border-line">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-emerald-400 to-rose-500 transition-all duration-150"
              style={{ width: `${Math.min(100, Math.max(4, signalLevel))}%` }}
            />
          </div>

          {lastDecoded ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1">
              <div className="flex items-center justify-between font-mono font-bold text-emerald-400">
                <span className="flex items-center gap-1.5"><Zap className="size-3.5 text-emerald-400 animate-bounce" /> DECODED ACOUSTIC SOS</span>
                <span>{lastDecoded.incidentId}</span>
              </div>
              <p className="text-[11px] text-ink-soft">Tourist: <strong className="text-ink">{lastDecoded.touristId}</strong> | Coordinates: {lastDecoded.latitude?.toFixed(4)}, {lastDecoded.longitude?.toFixed(4)}</p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-300 font-mono">
                <ShieldCheck className="size-3 text-emerald-400" />
                <span>Schnorr BIP-340 verified · Relayed {relayedCount} acoustic packet{relayedCount === 1 ? '' : 's'}</span>
              </div>
            </div>
          ) : (
            <p className="py-2 text-center text-[11px] text-ink-soft font-mono">
              Listening for near-ultrasonic sound waves across 18.0 kHz – 19.5 kHz…
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-ink-soft">
          Activate to use this device&apos;s microphone to intercept near-ultrasonic acoustic SOS beacons emitted by nearby phones through pockets or debris.
        </p>
      )}
    </div>
  );
}
