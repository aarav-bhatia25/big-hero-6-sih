'use client';

import React, { useState } from 'react';
import { Siren, CheckCircle2, Loader2 } from 'lucide-react';

interface SosButtonProps {
  touristPos?: { lat: number; lng: number };
  touristId?: string;
  onSosTriggered?: (incidentData: any) => void;
}

export default function SosButton({
  touristPos = { lat: 19.076, lng: 72.8777 },
  touristId,
  onSosTriggered,
}: SosButtonProps) {
  const [loading, setLoading] = useState(false);
  const [activeSos, setActiveSos] = useState<any | null>(null);

  const handleSosClick = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PANIC',
          ...(touristId ? { touristId } : {}),
          location: { lat: touristPos.lat, lng: touristPos.lng },
          severity: 'CRITICAL',
          status: 'ACTIVE',
        }),
      });
      const data = await res.json();
      if (data.success && data.incident) {
        setActiveSos(data.incident);
        if (onSosTriggered) onSosTriggered(data.incident);
      }
    } catch (err) {
      console.error('Error triggering SOS:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nb-card p-6 text-ink font-sans">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-line pb-3 mb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink-soft font-bold block">FORM NO. SOS-112</span>
          <h2 className="text-lg font-black text-ink flex items-center gap-2">
            Emergency Response &amp; Police Dispatch
          </h2>
        </div>
        <span className="nb-chip" style={{ background: '#f97316', color: 'var(--nb-accent-ink)' }}>
          DIRECT DISPATCH NODE
        </span>
      </div>

      <p className="text-xs text-ink-soft max-w-xl mb-5 leading-relaxed">
        Actuating emergency response pings the nearest police control room, broadcasts live GPS
        telemetry to district dispatchers, and initiates automated E-FIR draft compilation under
        Section 154 CrPC.
      </p>

      {activeSos ? (
        <div className="nb-inset p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-line pb-2 mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="font-black text-ink text-sm">EMERGENCY DISPATCH ACTIVE</span>
            </div>
            <span className="nb-chip nb-chip-accent font-mono">TICKET: {activeSos.incidentId}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="nb-card-flat p-2.5">
              <span className="text-[10px] font-mono text-ink-soft uppercase block font-bold">ASSIGNED PATROL UNIT</span>
              <span className="font-bold text-ink">{activeSos.assignedResponderUnitId || 'District Police Unit #17'}</span>
            </div>
            <div className="nb-card-flat p-2.5">
              <span className="text-[10px] font-mono text-ink-soft uppercase block font-bold">ESTIMATED DISPATCH ETA</span>
              <span className="font-bold text-success">~{activeSos.etaMinutes || 4} MINS</span>
            </div>
            <div className="nb-card-flat p-2.5">
              <span className="text-[10px] font-mono text-ink-soft uppercase block font-bold">GPS TELEMETRY POINT</span>
              <span className="font-mono text-ink">{activeSos.location.lat.toFixed(4)}, {activeSos.location.lng.toFixed(4)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-2">
          <button
            onClick={handleSosClick}
            disabled={loading}
            className="nb-btn w-full max-w-md !py-4 text-base tracking-wider uppercase"
            style={{ background: '#e11d48', color: '#fff' }}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Siren className="w-6 h-6" />
                <span>Dispatch Emergency Response</span>
              </>
            )}
          </button>
          <span className="text-[11px] font-mono text-ink-soft mt-2.5 text-center">
            PRESS TO IMMEDIATELY DISPATCH POLICE &amp; MEDICAL UNITS TO CURRENT GPS COORDINATES
          </span>
        </div>
      )}
    </div>
  );
}
