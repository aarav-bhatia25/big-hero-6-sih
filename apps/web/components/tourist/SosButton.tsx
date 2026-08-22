'use client';

import React, { useState } from 'react';
import { AlertOctagon, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';

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
    <div className="glass-panel rounded-2xl p-6 border border-red-500/40 bg-slate-900/90 shadow-2xl flex flex-col items-center text-center relative overflow-hidden text-slate-100">
      {/* Background ambient red glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2 mb-1">
        <ShieldAlert className="w-6 h-6 text-red-500" /> Emergency Panic Dispatch
      </h2>
      <p className="text-xs text-slate-400 max-w-sm mb-6">
        Pressing SOS instantly dispatches emergency units, alerts authorities, and broadcasts live GPS to your emergency contacts.
      </p>

      {activeSos ? (
        <div className="w-full bg-red-950/80 border border-red-500 p-5 rounded-2xl animate-pulse text-left text-slate-200">
          <div className="flex items-center justify-between border-b border-red-800/80 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-red-400" />
              <span className="font-bold text-red-300">EMERGENCY SOS ACTIVE</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-500 text-white">
              {activeSos.incidentId}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Assigned Unit</span>
              <span className="font-bold text-slate-100">{activeSos.assignedResponderUnitId || 'Unit #17'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Estimated Arrival</span>
              <span className="font-bold text-emerald-400">~{activeSos.etaMinutes || 4} mins</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block font-medium">GPS Dispatch Coordinates</span>
              <span className="font-mono text-slate-300">{activeSos.location.lat.toFixed(4)}, {activeSos.location.lng.toFixed(4)}</span>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={handleSosClick}
          disabled={loading}
          className="w-44 h-44 rounded-full bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 hover:from-red-600 hover:to-rose-400 active:scale-95 text-white font-extrabold text-2xl shadow-[0_0_50px_rgba(225,29,72,0.6)] flex flex-col items-center justify-center gap-2 border-4 border-red-400/50 transition duration-200 relative group cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : (
            <>
              <AlertOctagon className="w-12 h-12 group-hover:scale-110 transition" />
              <span>🚨 SOS</span>
              <span className="text-[10px] tracking-widest font-mono uppercase text-red-200">Tap to Dispatch</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
