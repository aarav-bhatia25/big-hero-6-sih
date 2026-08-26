'use client';

import React from 'react';
import { Radio, ArrowRight, ShieldCheck, Clock, Layers, Cpu } from 'lucide-react';

interface MeshRouteBadgeProps {
  transportType?: string;
  hopCount?: number;
  originDeviceId?: string;
  originalTimestamp?: string;
  receivedTimestamp?: string;
  relayPath?: string[];
}

export default function MeshRouteBadge({
  transportType = 'BLE_RELAY',
  hopCount = 1,
  originDeviceId = 'NODE-A',
  originalTimestamp,
  receivedTimestamp,
  relayPath,
}: MeshRouteBadgeProps) {
  const isRelay = transportType === 'BLE_RELAY' || (hopCount && hopCount > 0);

  // Construct path nodes
  const path = relayPath && relayPath.length > 0
    ? relayPath
    : [originDeviceId || 'NODE-ORIGIN', 'RELAY-BEACON-#B82F', 'POLICE-GATEWAY'];

  const formattedOriginTime = originalTimestamp
    ? new Date(originalTimestamp).toLocaleTimeString()
    : 'Recorded offline';

  const formattedRecvTime = receivedTimestamp
    ? new Date(receivedTimestamp).toLocaleTimeString()
    : 'Just now';

  return (
    <div className="rounded-xl border border-sky-400/40 bg-slate-900/60 p-4 text-ink shadow-inner">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-sky-400 animate-pulse" />
          <span className="font-semibold text-sky-300 text-sm">
            {isRelay ? 'BLE MESH RELAY INCIDENT' : 'DIRECT INTERNET DISPATCH'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 font-mono text-xs font-bold text-sky-200 border border-sky-400/30">
            Hops: {hopCount ?? 1}
          </span>
          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">
            {transportType}
          </span>
        </div>
      </div>

      {/* Visual Mesh Hop Chain Graph */}
      <div className="mt-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Layers className="size-3.5 text-sky-400" /> Provenance Relay Route Graph
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <Cpu className="size-3.5" />
            <span>SOS Origin ({path[0] || 'NODE-A'})</span>
          </div>

          {path.slice(1, -1).map((node, idx) => (
            <React.Fragment key={idx}>
              <ArrowRight className="size-3.5 text-sky-400 shrink-0" />
              <div className="flex items-center gap-1 text-sky-300 bg-sky-950/60 px-2 py-1 rounded border border-sky-500/30">
                <Radio className="size-3" />
                <span>Relay {node}</span>
              </div>
            </React.Fragment>
          ))}

          <ArrowRight className="size-3.5 text-emerald-400 shrink-0" />
          <div className="flex items-center gap-1.5 text-emerald-300 font-semibold bg-emerald-950/60 px-2 py-1 rounded border border-emerald-500/40">
            <ShieldCheck className="size-3.5" />
            <span>Police Command Gateway</span>
          </div>
        </div>
      </div>

      {/* Timestamp & Provenance Details */}
      <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-slate-400" />
          <span>Offline Origin Time: <strong className="text-white font-mono">{formattedOriginTime}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 sm:justify-end">
          <Clock className="size-3.5 text-slate-400" />
          <span>Gateway Received Time: <strong className="text-white font-mono">{formattedRecvTime}</strong></span>
        </div>
      </div>
    </div>
  );
}
