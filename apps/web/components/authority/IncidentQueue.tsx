'use client';

import React from 'react';
import { AlertCircle, ShieldAlert, AlertTriangle } from 'lucide-react';

interface IncidentItem {
  id: string;
  incidentId: string;
  touristId: string;
  touristName?: string;
  type: string;
  severity: string;
  status: string;
  riskScore?: number | null;
  location?: { lat: number; lng: number } | null;
  assignedResponderUnitId?: string;
  etaMinutes?: number;
}

interface IncidentQueueProps {
  incidents: IncidentItem[];
  selectedIncidentId?: string | null;
  onSelectIncident: (inc: IncidentItem) => void;
}

export default function IncidentQueue({
  incidents,
  selectedIncidentId,
  onSelectIncident,
}: IncidentQueueProps) {
  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 bg-slate-900/90 h-[520px] flex flex-col text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <h3 className="font-bold text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" /> Active Emergency Incidents
        </h3>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
          {incidents.length} LIVE
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {incidents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            No active emergency incidents reported.
          </div>
        ) : (
          incidents.map((inc) => {
            const isSelected = selectedIncidentId === inc.incidentId;
            return (
              <div
                key={inc.id || inc.incidentId}
                onClick={() => onSelectIncident(inc)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-red-950/60 border-red-500 text-white shadow-lg'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {String(inc.severity).toLowerCase() === 'critical' ? (
                      <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )}
                    <span className="font-bold text-sm font-mono">{inc.incidentId}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium uppercase">
                      {inc.type}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-red-400">
                    Risk: {inc.riskScore ?? '—'}/100
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-1">
                  <div>
                    <span className="text-slate-500">Tourist: </span>
                    <span className="font-semibold">{inc.touristName || inc.touristId}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 pt-1">
                    <span>Assigned: <strong className="text-blue-400">{inc.assignedResponderUnitId || 'Searching...'}</strong></span>
                    <span>ETA: <strong className="text-emerald-400">{inc.etaMinutes != null ? `~${inc.etaMinutes} min` : '—'}</strong></span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
