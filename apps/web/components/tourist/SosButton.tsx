'use client';

import React, { useState } from 'react';
import { Siren, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

interface SosButtonProps {
  touristPos?: { lat: number; lng: number };
  onSosTriggered?: (incidentData: any) => void;
}

export default function SosButton({
  touristPos = { lat: 19.076, lng: 72.8777 },
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
          touristId: 'DTI-IND-000123',
          location: {
            lat: touristPos.lat,
            lng: touristPos.lng,
          },
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
    <div className="bg-white rounded-md p-6 border border-[#D8D2C4] text-[#14213D] font-sans">
      <div className="flex items-center justify-between border-b border-[#D8D2C4] pb-3 mb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block">FORM NO. SOS-112</span>
          <h2 className="text-lg font-serif font-bold text-[#14213D] flex items-center gap-2">
            Emergency Response & Police Dispatch Panic Actuator
          </h2>
        </div>
        <span className="text-xs font-mono text-[#FF7722] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[#FF7722]/30 bg-amber-50">
          ● DIRECT DISPATCH NODE
        </span>
      </div>

      <p className="text-xs text-slate-600 max-w-xl mb-5 leading-relaxed">
        Actuating emergency response pings the nearest police control room, broadcasts live GPS telemetry to district dispatchers, and initiates automated E-FIR draft compilation under Section 154 CrPC.
      </p>

      {activeSos ? (
        <div className="w-full bg-amber-50 border-2 border-[#FF7722] p-4 rounded text-[#14213D]">
          <div className="flex items-center justify-between border-b border-[#FF7722]/30 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#FF7722]" />
              <span className="font-serif font-bold text-[#14213D] text-sm">EMERGENCY DISPATCH ACTIVE</span>
            </div>
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#14213D] text-white">
              TICKET REF: {activeSos.incidentId}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded border border-[#D8D2C4]">
              <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">ASSIGNED PATROL UNIT</span>
              <span className="font-bold text-[#14213D]">{activeSos.assignedResponderUnitId || 'District Police Unit #17'}</span>
            </div>
            <div className="bg-white p-2.5 rounded border border-[#D8D2C4]">
              <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">ESTIMATED DISPATCH ETA</span>
              <span className="font-bold text-[#1B5E3C]">~{activeSos.etaMinutes || 4} MINS</span>
            </div>
            <div className="bg-white p-2.5 rounded border border-[#D8D2C4]">
              <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">GPS TELEMETRY POINT</span>
              <span className="font-mono text-[#14213D]">{activeSos.location.lat.toFixed(4)}, {activeSos.location.lng.toFixed(4)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-2">
          {/* Signature SOS Element: Solid rectangular button, deep saffron fill (#FF7722), bold sans label, thin inset border */}
          <button
            onClick={handleSosClick}
            disabled={loading}
            className="w-full max-w-md py-4 px-6 bg-[#FF7722] hover:bg-[#E66412] active:bg-[#CC5205] text-white font-sans font-bold text-base tracking-wider uppercase rounded border-2 border-amber-600 border-t-amber-400 border-b-amber-800 shadow-md flex items-center justify-center gap-3 transition cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Siren className="w-6 h-6 text-white" />
                <span>DISPATCH EMERGENCY RESPONSE</span>
              </>
            )}
          </button>
          <span className="text-[11px] font-mono text-slate-500 mt-2.5">
            PRESS TO IMMEDIATE DISPATCH POLICE & MEDICAL UNITS TO CURRENT GPS COORDINATES
          </span>
        </div>
      )}
    </div>
  );
}
