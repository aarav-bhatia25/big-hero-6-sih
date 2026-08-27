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
  transportType = 'INTERNET',
  hopCount = 0,
  originDeviceId,
  originalTimestamp,
  receivedTimestamp,
  relayPath,
}: MeshRouteBadgeProps) {
  const isRelay = transportType === 'BLE_RELAY';
  const path = relayPath?.filter(Boolean) ?? [];
  const origin = originDeviceId || path[0] || 'Origin device not recorded';
  const relayNodes = path.filter((node) => node !== origin);

  const formattedOriginTime = originalTimestamp
    ? new Date(originalTimestamp).toLocaleTimeString()
    : 'Recorded offline';

  const formattedRecvTime = receivedTimestamp
    ? new Date(receivedTimestamp).toLocaleTimeString()
    : 'Just now';

  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4 text-ink">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-stone-600 animate-pulse" />
          <span className="text-sm font-semibold text-ink">
            {isRelay ? 'BLE GATEWAY RELAY RECEIPT' : 'DIRECT INTERNET RECEIPT'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-stone-300 bg-white px-2.5 py-0.5 font-mono text-xs font-bold text-stone-700">
            Relay hops recorded: {hopCount ?? 0}
          </span>
          <span className="rounded-full bg-white px-2.5 py-0.5 text-xs text-ink-soft">
            {transportType}
          </span>
        </div>
      </div>

      {/* Visual Mesh Hop Chain Graph */}
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          <Layers className="size-3.5 text-stone-600" /> Recorded delivery provenance
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white p-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-amber-700">
            <Cpu className="size-3.5" />
            <span>SOS origin ({origin})</span>
          </div>

          {relayNodes.map((node, idx) => (
            <React.Fragment key={idx}>
              <ArrowRight className="size-3.5 shrink-0 text-stone-500" />
              <div className="flex items-center gap-1 rounded border border-stone-200 bg-stone-50 px-2 py-1 text-stone-700">
                <Radio className="size-3" />
                <span>Recorded relay {node}</span>
              </div>
            </React.Fragment>
          ))}

          <ArrowRight className="size-3.5 shrink-0 text-emerald-600" />
          <div className="flex items-center gap-1.5 rounded border border-emerald-600/25 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
            <ShieldCheck className="size-3.5" />
            <span>Authority queue receipt</span>
          </div>
        </div>
      </div>

      {/* Timestamp & Provenance Details */}
      <div className="mt-3 grid gap-2 text-xs text-ink-soft sm:grid-cols-2">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-ink-soft" />
          <span>Offline Origin Time: <strong className="font-mono text-ink">{formattedOriginTime}</strong></span>
        </div>
        <div className="flex items-center gap-1.5 sm:justify-end">
          <Clock className="size-3.5 text-ink-soft" />
          <span>Authority recorded: <strong className="font-mono text-ink">{formattedRecvTime}</strong></span>
        </div>
      </div>
    </div>
  );
}
