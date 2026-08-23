'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

interface MapViewProps {
  touristPos?: { lat: number; lng: number } | null;
  liveTourists?: Array<{ touristId: string; lat: number; lng: number; timestamp?: string }>;
  geofences?: Array<{
    id: string;
    name: string;
    coordinates: Array<[number, number]>;
    severity: string;
  }>;
  incidents?: Array<{
    id: string;
    incidentId: string;
    type: string;
    lat: number;
    lng: number;
    severity: string;
  }>;
  responders?: Array<{
    id: string;
    unitId: string;
    name: string;
    lat: number;
    lng: number;
    type: string;
  }>;
  interactive?: boolean;
}

// Dynamically load Leaflet component on client side only
const ClientMap = dynamic(() => import('./ClientMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-slate-900 animate-pulse rounded-2xl flex items-center justify-center text-slate-500 font-mono text-sm border border-slate-800">
      Loading Interactive Safety Map Engine...
    </div>
  ),
});

export default function MapView(props: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[400px] bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 border border-slate-800">
        Initializing Map...
      </div>
    );
  }

  return <ClientMap {...props} />;
}
