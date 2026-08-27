'use client';

import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { offlineTileConfiguration, readOfflineMapPack, type OfflineMapPack } from '@/lib/offlineMap';

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

const getOfflinePlaceIcon = (category: string) => {
  const labels: Record<string, string> = { tourist: '★', hospital: '+', police: 'P', fire_station: 'F', safety_zone: '!' };
  const colors: Record<string, string> = { tourist: '#7c3aed', hospital: '#dc2626', police: '#2563eb', fire_station: '#ea580c', safety_zone: '#059669' };
  return typeof window !== 'undefined'
    ? new L.DivIcon({
        className: 'custom-leaflet-icon',
        html: `<div style="background-color:${colors[category] || '#475569'};width:24px;height:24px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:800">${labels[category] || '•'}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
    : (null as any);
};

interface ClientMapInnerProps {
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
}

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
  }, [key, map, points]);

  return null;
}

function normalizePolygonCoords(gf: any): Array<[number, number]> {
  let raw = gf.coordinates || gf.geometry?.coordinates || [];
  if (!raw || !Array.isArray(raw) || raw.length === 0) return [];

  if (Array.isArray(raw[0]) && Array.isArray(raw[0][0])) {
    raw = raw[0];
  }

  const validPoints = raw.filter(
    (c: any) => Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number'
  );

  return validPoints.map(([c0, c1]: [number, number]) =>
    Math.abs(c0) <= 90 && Math.abs(c1) <= 180 ? [c0, c1] : [c1, c0]
  );
}

export default function ClientMapInner({
  touristPos = null,
  liveTourists = [],
  geofences = [],
  incidents = [],
  responders = [],
}: ClientMapInnerProps) {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [offlinePack, setOfflinePack] = useState<OfflineMapPack | null>(null);

  const touristIcon = useMemo(() => getTouristIcon(), []);
  const incidentIcon = useMemo(() => getIncidentIcon(), []);
  const responderIcon = useMemo(() => getResponderIcon(), []);
  const mapTiles = offlineTileConfiguration();

  React.useEffect(() => {
    const refreshOfflinePack = () => setOfflinePack(readOfflineMapPack());
    refreshOfflinePack();
    window.addEventListener('prahari:offline-map-pack-updated', refreshOfflinePack);
    return () => window.removeEventListener('prahari:offline-map-pack-updated', refreshOfflinePack);
  }, []);

  const activeGeofences = geofences;

  const points: Array<[number, number]> = useMemo(() => [
    ...(touristPos ? [[touristPos.lat, touristPos.lng] as [number, number]] : []),
    ...liveTourists
      .filter((tourist) => typeof tourist.lat === 'number' && typeof tourist.lng === 'number')
      .map((tourist) => [tourist.lat, tourist.lng] as [number, number]),
    ...incidents
      .filter((i) => typeof i.lat === 'number' && typeof i.lng === 'number')
      .map((i) => [i.lat, i.lng] as [number, number]),
    ...responders
      .filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number')
      .map((r) => [r.lat, r.lng] as [number, number]),
    ...(offlinePack?.places
      .filter((place) => typeof place.lat === 'number' && typeof place.lng === 'number')
      .map((place) => [place.lat, place.lng] as [number, number]) ?? []),
    ...activeGeofences.flatMap((g) => normalizePolygonCoords(g)),
  ], [touristPos, liveTourists, incidents, responders, offlinePack, activeGeofences]);

  const riskHotspots = useMemo(() => {
    const severityStyle = (severity: string) => {
      const normalized = severity.toLowerCase();
      if (normalized === 'critical') return { color: '#ef4444', radius: 850, intensity: 'Critical' };
      if (normalized === 'high') return { color: '#f97316', radius: 650, intensity: 'High' };
      if (normalized === 'medium') return { color: '#f59e0b', radius: 450, intensity: 'Medium' };
      return { color: '#eab308', radius: 300, intensity: 'Low' };
    };

    const incidentSources = incidents
      .filter((incident) => typeof incident.lat === 'number' && typeof incident.lng === 'number')
      .map((incident) => ({
        id: `incident-${incident.id}`,
        name: incident.incidentId,
        category: `Recorded incident: ${incident.type || 'Safety report'}`,
        lat: incident.lat,
        lng: incident.lng,
        ...severityStyle(String(incident.severity || 'high')),
      }));

    const geofenceSources = activeGeofences
      .map((geofence) => {
        const coordinates = normalizePolygonCoords(geofence);
        if (coordinates.length < 3) return null;
        const [lat, lng] = coordinates.reduce(
          (sum, coordinate) => [sum[0] + coordinate[0], sum[1] + coordinate[1]],
          [0, 0],
        ).map((sum) => sum / coordinates.length) as [number, number];
        return {
          id: `geofence-${geofence.id}`,
          name: geofence.name,
          category: 'Published risk geofence',
          lat,
          lng,
          ...severityStyle(String(geofence.severity || 'high')),
        };
      })
      .filter((source): source is NonNullable<typeof source> => Boolean(source));

    return [...incidentSources, ...geofenceSources];
  }, [activeGeofences, incidents]);

  if (points.length === 0) {
    return (
      <div className="flex h-[420px] w-full items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/40 px-6 text-center text-sm text-slate-400">
        <div>
          <p className="font-medium text-slate-200">No live spatial data yet</p>
          <p className="mt-2 max-w-md leading-6">The map will appear when a consented traveller shares a location, an incident includes coordinates, a responder reports a position, or an authority publishes a real geofence.</p>
        </div>
      </div>
    );
  }

  const [centerLat, centerLng] = points[0];

  return (
    <div className="relative isolate h-[420px] w-full overflow-hidden rounded-xl border border-slate-700/70 text-slate-900">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={14}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <FitToData points={points} />

        <TileLayer
          attribution={mapTiles.template ? mapTiles.attribution : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
          url={mapTiles.template || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"}
        />

        {/* Risk overlay is derived only from current incident and geofence records. */}
        {showHeatmap && riskHotspots.map((hs) => (
          <Circle
            key={hs.id}
            center={[hs.lat, hs.lng]}
            radius={hs.radius}
            pathOptions={{
              color: hs.color,
              fillColor: hs.color,
              fillOpacity: 0.25,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-slate-900 font-sans p-1">
                <strong className="block text-sm font-bold" style={{ color: hs.color }}>
                  RISK OVERLAY: {hs.name}
                </strong>
                <span className="block text-xs font-semibold mt-0.5">Category: {hs.category}</span>
                <span className="text-[11px] text-slate-600">Risk Intensity: {hs.intensity}</span>
              </div>
            </Popup>
          </Circle>
        ))}

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

        {/* Authority view: each consented tourist is kept independently */}
        {liveTourists.map((tourist) => (
          <Marker key={tourist.touristId} position={[tourist.lat, tourist.lng]} icon={touristIcon}>
            <Popup>
              <div className="text-slate-900 font-sans p-1">
                <strong className="block text-sm font-bold">{tourist.touristId}</strong>
                <span className="text-xs text-slate-600 font-mono">{tourist.lat.toFixed(4)}, {tourist.lng.toFixed(4)}</span>
                {tourist.timestamp && <span className="block text-xs text-slate-500 mt-1">Updated {new Date(tourist.timestamp).toLocaleTimeString()}</span>}
              </div>
            </Popup>
          </Marker>
        ))}

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

        {/* Places stored by the traveller's selected offline safety pack. */}
        {offlinePack?.places.map((place) => (
          <Marker key={`offline-${place.id}`} position={[place.lat, place.lng]} icon={getOfflinePlaceIcon(place.category)}>
            <Popup>
              <div className="p-1 font-sans text-slate-900">
                <strong className="block text-sm font-bold">{place.name}</strong>
                <span className="block text-xs font-semibold capitalize">{place.category.replace('_', ' ')}</span>
                {place.address && <span className="mt-1 block text-xs text-slate-600">{place.address}</span>}
                {place.phone && <a href={`tel:${place.phone}`} className="mt-1 block text-xs font-semibold text-blue-700 underline">Call {place.phone}</a>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute bottom-3 left-3 z-[1000] flex flex-wrap items-center gap-3 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 backdrop-blur-md">
        {(touristPos || liveTourists.length > 0) && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Traveller</span>}
        {incidents.length > 0 && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Incident</span>}
        {activeGeofences.length > 0 && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />Geofence</span>}
        {responders.length > 0 && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />Responder</span>}
        {offlinePack && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-500" />Offline pack · {offlinePack.places.length} places</span>}
        <button
          type="button"
          onClick={() => setShowHeatmap((prev) => !prev)}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-semibold transition ${
            showHeatmap
              ? 'bg-purple-500/30 text-purple-300 border border-purple-400/40'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-purple-400" />
          Risk overlay: {showHeatmap ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
