'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Map Markers
const touristIcon = new L.DivIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="background-color: #10b981; width: 22px; height: 22px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 12px #10b981;"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const incidentIcon = new L.DivIcon({
  className: 'custom-leaflet-icon pulse-red',
  html: `<div style="background-color: #ef4444; width: 26px; height: 26px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: white;">🚨</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const responderIcon = new L.DivIcon({
  className: 'custom-leaflet-icon',
  html: `<div style="background-color: #3b82f6; width: 26px; height: 26px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; font-size: 14px;">🚓</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

interface ClientMapInnerProps {
  touristPos?: { lat: number; lng: number } | null;
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
}

export default function ClientMapInner({
  touristPos = { lat: 19.076, lng: 72.8777 },
  geofences = [],
  incidents = [],
  responders = [],
}: ClientMapInnerProps) {
  const centerLat = touristPos?.lat || 19.076;
  const centerLng = touristPos?.lng || 72.8777;

  return (
    <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative text-slate-900">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={14}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Tourist Live Marker */}
        {touristPos && (
          <Marker position={[touristPos.lat, touristPos.lng]} icon={touristIcon}>
            <Popup>
              <div className="text-slate-900 font-sans p-1">
                <strong className="block text-sm font-bold">🟢 Tourist Location</strong>
                <span className="text-xs text-slate-600 font-mono">
                  {touristPos.lat.toFixed(4)}, {touristPos.lng.toFixed(4)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Geofence Polygons */}
        {geofences.map((gf) => (
          <Polygon
            key={gf.id}
            positions={gf.coordinates as [number, number][]}
            pathOptions={{
              color: gf.severity === 'CRITICAL' ? '#ef4444' : '#f97316',
              fillColor: gf.severity === 'CRITICAL' ? '#ef4444' : '#f97316',
              fillOpacity: 0.25,
              weight: 2,
              dashArray: '4, 4',
            }}
          >
            <Popup>
              <div className="text-slate-900 p-1 font-sans">
                <strong className="block text-sm text-red-600 font-bold">🔴 HIGH RISK ZONE</strong>
                <span className="text-xs font-semibold">{gf.name}</span>
              </div>
            </Popup>
          </Polygon>
        ))}

        {/* Incident Pins */}
        {incidents.map((inc) => (
          <Marker key={inc.id} position={[inc.lat, inc.lng]} icon={incidentIcon}>
            <Popup>
              <div className="text-slate-900 p-1 font-sans">
                <strong className="block text-sm text-red-600 font-bold">🚨 {inc.incidentId}</strong>
                <span className="text-xs font-medium">Type: {inc.type}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Responder Patrol Units */}
        {responders.map((resp) => (
          <Marker key={resp.id} position={[resp.lat, resp.lng]} icon={responderIcon}>
            <Popup>
              <div className="text-slate-900 p-1 font-sans">
                <strong className="block text-sm text-blue-600 font-bold">🚓 {resp.unitId}</strong>
                <span className="text-xs font-semibold">{resp.name}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Floating Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-700/80 text-xs flex flex-wrap items-center gap-3 z-[1000] text-slate-200 shadow-lg">
        <span className="flex items-center gap-1 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Tourist</span>
        <span className="flex items-center gap-1 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Danger Zone</span>
        <span className="flex items-center gap-1 font-medium">🚨 SOS Incident</span>
        <span className="flex items-center gap-1 font-medium">🚓 Responder</span>
      </div>
    </div>
  );
}
