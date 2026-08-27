'use client';

import React from 'react';
import { MapContainer, Marker, TileLayer, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MousePointerClick, Undo, Trash2 } from 'lucide-react';

export type Point = [number, number]; // [lat, lng]

interface GeofencePickerMapProps {
  points: Point[];
  onAddPoint: (point: Point) => void;
  onRemoveLastPoint: () => void;
  onClearPoints: () => void;
}

const cornerIcon = typeof window === 'undefined'
  ? null
  : new L.DivIcon({
      className: 'geofence-corner-marker',
      html: '<div style="width:16px;height:16px;border-radius:9999px;background:#e11d48;border:2.5px solid white;box-shadow:0 0 0 2px rgba(225,29,72,.4)"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

function MapClickHandler({ onAddPoint }: { onAddPoint: (point: Point) => void }) {
  useMapEvents({
    click: (e) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      onAddPoint([lat, lng]);
    },
  });
  return null;
}

export default function GeofencePickerMap({
  points,
  onAddPoint,
  onRemoveLastPoint,
  onClearPoints,
}: GeofencePickerMapProps) {
  const center: [number, number] = points.length > 0
    ? [points[points.length - 1][0], points[points.length - 1][1]]
    : [26.9124, 75.7873]; // Default region

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-ink">
          <MousePointerClick className="size-3.5 text-rose-600 animate-pulse" />
          <span>Click anywhere on the map to add boundary points</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRemoveLastPoint}
            disabled={points.length === 0}
            className="minimal-button minimal-button-secondary !py-1 px-2 text-[11px] disabled:opacity-40"
            title="Undo last placed point"
          >
            <Undo className="size-3" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={onClearPoints}
            disabled={points.length === 0}
            className="minimal-button minimal-button-secondary !py-1 px-2 text-[11px] disabled:opacity-40"
            title="Clear all points"
          >
            <Trash2 className="size-3 text-rose-600" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="relative h-60 w-full overflow-hidden rounded-xl border border-line shadow-inner">
        <MapContainer center={center} zoom={points.length > 0 ? 12 : 6} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onAddPoint={onAddPoint} />

          {points.map((pt, idx) => (
            <Marker key={`${pt[0]}-${pt[1]}-${idx}`} position={[pt[0], pt[1]]} icon={cornerIcon as any} />
          ))}

          {points.length >= 2 && (
            <Polygon
              positions={points}
              pathOptions={{
                color: '#e11d48',
                fillColor: '#fb7185',
                fillOpacity: 0.25,
                weight: 2.5,
                dashArray: points.length < 3 ? '6, 6' : undefined,
              }}
            />
          )}
        </MapContainer>

        <div className="absolute bottom-2 left-2 z-[1000] rounded-md bg-surface/90 px-2 py-1 text-[11px] font-mono font-medium text-ink shadow border border-line backdrop-blur-sm">
          {points.length} point{points.length === 1 ? '' : 's'} placed {points.length >= 3 ? '✓ Complete Polygon' : '(Need at least 3 points)'}
        </div>
      </div>
    </div>
  );
}
