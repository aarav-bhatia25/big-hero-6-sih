'use client';

import React from 'react';
import { AlertTriangle, CircleAlert } from 'lucide-react';

interface IncidentItem {
  id?: string;
  incidentId: string;
  touristId?: string;
  touristName?: string;
  type?: string;
  severity?: string;
  status?: string;
  riskScore?: number | null;
  assignedResponderUnitId?: string | null;
  etaMinutes?: number | null;
  transportType?: string;
  hopCount?: number;
}

interface IncidentQueueProps {
  incidents: IncidentItem[];
  selectedIncidentId?: string | null;
  onSelectIncident: (incident: IncidentItem) => void;
}

export default function IncidentQueue({ incidents, selectedIncidentId, onSelectIncident }: IncidentQueueProps) {
  return (
    <section className="minimal-card h-full p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 border-b border-line pb-5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><CircleAlert size={19} className="text-rose-600" />Open incidents</h2>
          <p className="mt-1 text-sm text-ink-soft">{incidents.length} current report{incidents.length === 1 ? '' : 's'}</p>
        </div>
        <span className="rounded-full border border-rose-600/25 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">Live</span>
      </div>

      {incidents.length === 0 ? (
        <div className="flex min-h-80 items-center justify-center text-center">
          <div>
            <p className="font-medium text-ink">No open incidents</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-ink-soft">New SOS reports and safety reviews will appear here as they are recorded.</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {incidents.map((incident) => {
            const selected = selectedIncidentId === incident.incidentId;
            const critical = String(incident.severity ?? '').toLowerCase() === 'critical';
            const isBleRelay = ['BLE_RELAY', 'PEER_MESH', 'LOCAL_QUEUE', 'BLUETOOTH'].includes(incident.transportType ?? '');
            return (
              <button
                type="button"
                key={incident.id ?? incident.incidentId}
                onClick={() => onSelectIncident(incident)}
                className={`w-full rounded-xl border p-4 text-left transition ${selected ? 'border-stone-400 bg-stone-50' : 'border-line bg-surface hover:border-stone-300'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className={critical ? 'text-rose-600' : 'text-amber-600'} />
                      <span className="truncate font-mono text-sm font-semibold text-ink">{incident.incidentId}</span>
                      {isBleRelay && (
                        <span className="rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 font-mono text-[10px] font-bold text-stone-700">
                          BLUETOOTH MESH
                        </span>
                      )}
                    </div>
                    <p className="mt-2 truncate text-sm text-ink-soft">{incident.touristName ?? incident.touristId ?? 'Traveller not recorded'}</p>
                  </div>
                  <span className="rounded-md bg-surface-2 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-ink-soft">{incident.type ?? 'Report'}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                  <span>{incident.assignedResponderUnitId ? `Assigned: ${incident.assignedResponderUnitId}` : 'Unassigned'}</span>
                  {incident.etaMinutes != null && <span>ETA {incident.etaMinutes} min</span>}
                  {incident.riskScore != null && <span>Risk {incident.riskScore}/100</span>}
                  {incident.transportType && <span>Via: {isBleRelay ? 'BLUETOOTH MESH' : incident.transportType}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
