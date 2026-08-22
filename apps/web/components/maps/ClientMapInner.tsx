'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Map Markers (safely instantiated on client only)
const getTouristIcon = () =>
  typeof window !== 'undefined'
    ? new L.DivIcon({
        className: 'custom-leaflet-icon',
        html: `<div style="background-color: #10b981; width: 22px; height: 22px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 12px #10b981;"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })
    : (null as any);

const getIncidentIcon = () =>
  typeof window !== 'undefined'
    ? new L.DivIcon({
        className: 'custom-leaflet-icon pulse-red',
        html: `<div style="background-color: #ef4444; width: 26px; height: 26px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: white;">!</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })
    : (null as any);

const getResponderIcon = () =>
  typeof window !== 'undefined'
    ? new L.DivIcon({
        className: 'custom-leaflet-icon',
        html: `<div style="background-color: #3b82f6; width: 26px; height: 26px; border-radius: 50%; border: 3px solid #ffffff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight:700; color:#fff;">R</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      })
    : (null as any);

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

/**
 * Fits the viewport to whatever is actually on the map. Without this the map
 * sat on a hardcoded Mumbai centre while the data was in Jaipur, so every
 * real marker rendered off-screen.
 */
function FitToData({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  const key = JSON.stringify(points);

  React.useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  return null;
}

// Jaipur — matches the seeded dataset; only used when there is nothing to show.
const FALLBACK_CENTER: [number, number] = [26.9124, 75.7873];

// Helper to extract and normalize coordinates into Leaflet [lat, lng] array
function normalizePolygonCoords(gf: any): Array<[number, number]> {
  let raw = gf.coordinates || gf.geometry?.coordinates || [];
  if (!raw || !Array.isArray(raw) || raw.length === 0) return [];

  // Un-nest GeoJSON 3D array if present: [[[lng, lat], ...]]
  if (Array.isArray(raw[0]) && Array.isArray(raw[0][0])) {
    raw = raw[0];
  }

  const validPoints = raw.filter(
    (c: any) => Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number'
  );

  if (validPoints.length < 3) return [];

  return validPoints.map(([a, b]: [number, number]) => {
    // In India: Latitude is ~8..37, Longitude is ~68..97.
    // If a > b and a > 40 (e.g. 75.78, 26.91 or 72.87, 19.07), 'a' is Longitude and 'b' is Latitude.
    if (a > b && a > 40) return [b, a]; // swap to [lat, lng]
    return [a, b]; // already [lat, lng]
  });
}

const DEFAULT_FALLBACK_GEOFENCES = [
  {
    id: 'gf-mumbai-1',
    name: 'Mira-Bhayander High Risk Coastal Zone',
    severity: 'critical',
    coordinates: [
      [19.26, 72.82],
      [19.31, 72.82],
      [19.31, 72.88],
      [19.26, 72.88],
      [19.26, 72.82],
    ] as Array<[number, number]>,
  },
  {
    id: 'gf-mumbai-2',
    name: 'Sanjay Gandhi National Park Restricted Boundary',
    severity: 'high',
    coordinates: [
      [19.20, 72.87],
      [19.26, 72.87],
      [19.26, 72.94],
      [19.20, 72.94],
      [19.20, 72.87],
    ] as Array<[number, number]>,
  },
  {
    id: 'gf-jaipur-1',
    name: 'Pink City Central Safe Zone',
    severity: 'low',
    coordinates: [
      [26.91, 75.78],
      [26.95, 75.78],
      [26.95, 75.83],
      [26.91, 75.83],
      [26.91, 75.78],
    ] as Array<[number, number]>,
  },
  {
    id: 'gf-jaipur-2',
    name: 'Nahargarh Cliff High Risk Area',
    severity: 'high',
    coordinates: [
      [26.935, 75.81],
      [26.948, 75.81],
      [26.948, 75.825],
      [26.935, 75.825],
      [26.935, 75.81],
    ] as Array<[number, number]>,
  },
];

export default function ClientMapInner({
  touristPos = null,
  geofences = [],
  incidents = [],
  responders = [],
}: ClientMapInnerProps) {
  const touristIcon = React.useMemo(() => getTouristIcon(), []);
  const incidentIcon = React.useMemo(() => getIncidentIcon(), []);
  const responderIcon = React.useMemo(() => getResponderIcon(), []);

  const activeGeofences = geofences.length > 0 ? geofences : DEFAULT_FALLBACK_GEOFENCES;

  const points: Array<[number, number]> = [
    ...(touristPos ? [[touristPos.lat, touristPos.lng] as [number, number]] : []),
    ...incidents
      .filter((i) => typeof i.lat === 'number' && typeof i.lng === 'number')
      .map((i) => [i.lat, i.lng] as [number, number]),
    ...responders
      .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number')
      .map((r) => [r.lat, r.lng] as [number, number]),
    ...activeGeofences.flatMap((g) => normalizePolygonCoords(g)),
  ];

  const [centerLat, centerLng] = points[0] ?? FALLBACK_CENTER;

  return (
    <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative text-slate-900">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={14}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <FitToData points={points} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Tourist Live Marker */}
        {touristPos && (
          <Marker position={[touristPos.lat, touristPos.lng]} icon={touristIcon}>
            <Popup>
              <div className="text-slate-900 font-sans p-1">
                <strong className="block text-sm font-bold">Tourist Location</strong>
                <span className="text-xs text-slate-600 font-mono">
                  {touristPos.lat.toFixed(4)}, {touristPos.lng.toFixed(4)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Geofence Danger Zone Polygons */}
        {activeGeofences.map((gf) => {
          const coords = normalizePolygonCoords(gf);
          if (coords.length < 3) return null;
          const isCritical = String(gf.severity).toLowerCase() === 'critical';
          const isHigh = String(gf.severity).toLowerCase() === 'high';
          const color = isCritical ? '#ef4444' : isHigh ? '#f97316' : '#10b981';

          return (
            <Polygon
              key={gf.id || gf.name}
              positions={coords}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.35,
                weight: 3,
                dashArray: '5, 5',
              }}
            >
              <Popup>
                <div className="text-slate-900 p-1 font-sans">
                  <strong className="block text-sm font-bold" style={{ color }}>
                    {String(gf.severity || 'HIGH').toUpperCase()} RISK ZONE
                  </strong>
                  <span className="text-xs font-semibold">{gf.name}</span>
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* Incident Pins */}
        {incidents.map((inc) => (
          <Marker key={inc.id} position={[inc.lat, inc.lng]} icon={incidentIcon}>
            <Popup>
              <div className="text-slate-900 p-1 font-sans">
                <strong className="block text-sm text-red-600 font-bold">{inc.incidentId}</strong>
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
                <strong className="block text-sm text-blue-600 font-bold">{resp.unitId}</strong>
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
        <span className="flex items-center gap-1 font-medium">SOS Incident</span>
        <span className="flex items-center gap-1 font-medium">Responder</span>
      </div>
    </div>
  );
}
