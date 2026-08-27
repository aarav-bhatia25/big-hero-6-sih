'use client';

import { useEffect, useState } from 'react';
import { HeartPulse, MapPinned, ShieldCheck } from 'lucide-react';
import { readOfflineMapPack, type OfflineMapPack } from '@/lib/offlineMap';

const PLACE_COLORS: Record<string, string> = {
  tourist: '#7c3aed',
  hospital: '#dc2626',
  police: '#2563eb',
  fire_station: '#ea580c',
  safety_zone: '#059669',
};

function OfflinePackMiniMap({ pack }: { pack: OfflineMapPack }) {
  const longitudeScale = Math.max(0.2, Math.cos(pack.selection.lat * Math.PI / 180));
  const toPoint = (lat: number, lng: number) => {
    const xKm = (lng - pack.selection.lng) * 111.32 * longitudeScale;
    const yKm = (lat - pack.selection.lat) * 110.574;
    return {
      x: Math.min(284, Math.max(16, 150 + xKm / pack.selection.radiusKm * 118)),
      y: Math.min(164, Math.max(16, 90 - yKm / pack.selection.radiusKm * 74)),
    };
  };

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-slate-950 p-2">
      <svg viewBox="0 0 300 180" className="h-44 w-full" role="img" aria-label={`Offline map of ${pack.selection.label}`}>
        <defs>
          <pattern id="offline-map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#334155" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="300" height="180" rx="8" fill="#0f172a" />
        <rect width="300" height="180" rx="8" fill="url(#offline-map-grid)" opacity="0.8" />
        <ellipse cx="150" cy="90" rx="118" ry="74" fill="#0ea5e9" fillOpacity="0.08" stroke="#38bdf8" strokeDasharray="4 4" />
        {pack.places.slice(0, 100).map((place) => {
          const point = toPoint(place.lat, place.lng);
          return <circle key={place.id} cx={point.x} cy={point.y} r="4" fill={PLACE_COLORS[place.category] || '#94a3b8'} stroke="#fff" strokeWidth="1"><title>{place.name} · {place.category.replace('_', ' ')}</title></circle>;
        })}
        <circle cx="150" cy="90" r="6" fill="#10b981" stroke="#fff" strokeWidth="2"><title>Selected area centre</title></circle>
        <text x="12" y="20" fill="#e2e8f0" fontSize="11" fontWeight="700">{pack.selection.label}</text>
        <text x="12" y="166" fill="#94a3b8" fontSize="10">{pack.selection.radiusKm} km coverage · green: centre</text>
      </svg>
    </div>
  );
}

export default function OfflineMapPackStatus() {
  const [pack, setPack] = useState<OfflineMapPack | null>(null);

  useEffect(() => {
    const refresh = () => setPack(readOfflineMapPack());
    refresh();
    window.addEventListener('prahari:offline-map-pack-updated', refresh);
    return () => window.removeEventListener('prahari:offline-map-pack-updated', refresh);
  }, []);

  if (!pack) return null;
  const grouped = pack.places.reduce<Record<string, OfflineMapPack['places']>>((groups, place) => {
    (groups[place.category] ||= []).push(place);
    return groups;
  }, {});

  return (
    <section className="minimal-card space-y-4 p-5" aria-labelledby="offline-pack-heading">
      <div className="flex items-start gap-3 border-b border-line pb-3">
        <MapPinned className="mt-0.5 size-5 text-sky-500" />
        <div>
          <h3 id="offline-pack-heading" className="font-semibold text-ink">Saved offline safety map</h3>
          <p className="mt-1 text-xs leading-5 text-ink-soft">{pack.selection.label} · {pack.selection.radiusKm} km · saved {new Date(pack.generatedAt).toLocaleDateString()}. The places and guidance below remain on this device without a network connection.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-surface-2 p-3 text-sm">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-soft"><HeartPulse size={14} /> Emergency contacts</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {pack.emergencyNumbers.map((item) => <a key={item.number} href={`tel:${item.number}`} className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-brand-600">{item.label}: {item.number}</a>)}
          </div>
        </div>
        <div className="rounded-lg bg-surface-2 p-3 text-sm">
          <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-soft"><ShieldCheck size={14} /> Safety guidance</h4>
          <ul className="mt-2 space-y-2 text-xs leading-5 text-ink-soft">
            {pack.safetyInformation.map((item) => <li key={item.title}><strong className="text-ink">{item.title}:</strong> {item.body}</li>)}
          </ul>
        </div>
      </div>

      <OfflinePackMiniMap pack={pack} />

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-soft">Saved nearby places ({pack.places.length})</h4>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(grouped).map(([category, places]) => (
            <div key={category} className="rounded-lg border border-line p-3 text-xs">
              <p className="font-bold capitalize text-ink">{category.replace('_', ' ')}</p>
              <ul className="mt-1.5 space-y-1.5 text-ink-soft">
                {places.slice(0, 4).map((place) => <li key={place.id}>{place.name}{place.phone ? <a href={`tel:${place.phone}`} className="ml-1 text-brand-600 underline">Call</a> : null}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-ink-soft">{pack.attribution.join(' · ')}</p>
    </section>
  );
}
