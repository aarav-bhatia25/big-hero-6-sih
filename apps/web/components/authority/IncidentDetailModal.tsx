'use client';

import React from 'react';
import { X, Send, PhoneCall, History, Shield, MapPin, User, Clock } from 'lucide-react';

interface IncidentDetailProps {
  incident: any;
  onClose: () => void;
  onDispatchAction: (incidentId: string) => void;
}

export default function IncidentDetailModal({
  incident,
  onClose,
  onDispatchAction,
}: IncidentDetailProps) {
  if (!incident) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-red-500/40 bg-slate-900 text-slate-100 p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 bg-slate-800 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
          <div className="p-3 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 font-mono">
              INCIDENT {incident.incidentId}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold uppercase">
              {incident.status} • {incident.severity}
            </span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                <User className="w-3.5 h-3.5 text-emerald-400" /> Tourist Identity
              </span>
              <span className="font-bold text-slate-200 font-mono">{incident.touristId}</span>
              <p className="text-xs text-slate-400 mt-0.5">{incident.touristName || 'Demo Tourist'}</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                <Shield className="w-3.5 h-3.5 text-red-400" /> Calculated Risk
              </span>
              <span className="font-bold text-red-400 text-lg">{incident.riskScore || 91}/100</span>
              <p className="text-[11px] text-red-300">Critical Action Threshold</p>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" /> Last Known Location
            </span>
            <span className="font-mono text-slate-200">
              {incident.location?.lat?.toFixed(4)}, {incident.location?.lng?.toFixed(4)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 mb-1 block">Nearest Responder Unit</span>
              <span className="font-bold text-blue-400">{incident.assignedResponderUnitId || 'Unit #17'}</span>
              <p className="text-xs text-slate-400">{incident.assignedResponderName || 'Police Patrol Unit 17'}</p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Estimated Arrival (ETA)
              </span>
              <span className="font-bold text-emerald-400 text-lg">04:32 mins</span>
            </div>
          </div>
        </div>

        {/* Action Button Controls */}
        <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => onDispatchAction(incident.incidentId)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-red-600/30 cursor-pointer"
          >
            <Send className="w-4 h-4" /> DISPATCH
          </button>
          <button
            onClick={() => alert(`Dialing Tourist Emergency Line for ${incident.touristId}...`)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <PhoneCall className="w-4 h-4 text-emerald-400" /> CONTACT
          </button>
          <button
            onClick={() => alert(`Audit History for ${incident.incidentId}:\n- SOS Panic Triggered\n- Dispatch matched to Unit #17\n- Emergency Contacts Notified`)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
          >
            <History className="w-4 h-4 text-blue-400" /> HISTORY
          </button>
        </div>
      </div>
    </div>
  );
}
