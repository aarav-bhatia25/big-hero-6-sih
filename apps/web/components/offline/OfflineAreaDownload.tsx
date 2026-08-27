'use client';

import { useState } from 'react';
import { Download, Loader2, MapPinned } from 'lucide-react';
import {
  cacheConfiguredOfflineTiles,
  downloadOfflineMapPack,
  type OfflineMapPack,
  type OfflineMapSelection,
} from '@/lib/offlineMap';

export default function OfflineAreaDownload({ selection }: { selection: OfflineMapSelection | null }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!selection) return null;

  const download = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const params = new URLSearchParams({ lat: String(selection.lat), lng: String(selection.lng), radiusKm: String(selection.radiusKm) });
      const response = await fetch(`/api/offline-map/area?${params}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'The offline safety pack could not be prepared.');

      const pack: OfflineMapPack = {
        version: 1,
        generatedAt: new Date().toISOString(),
        selection: { ...selection, label: selection.label.trim() || 'Selected area' },
        places: data.places,
        safetyInformation: data.safetyInformation,
        emergencyNumbers: data.emergencyNumbers,
        attribution: data.attribution,
      };
      downloadOfflineMapPack(pack);
      const tileResult = await cacheConfiguredOfflineTiles(pack.selection);
      const placeMessage = `${pack.places.length} nearby places and services saved to this device.`;
      if (tileResult.error) {
        setNotice(`${placeMessage} ${tileResult.error}`);
      } else {
        setNotice(`${placeMessage} ${tileResult.cached} of ${tileResult.attempted} approved base-map tiles cached for offline use.`);
      }
    } catch (error: any) {
      setNotice(error.message || 'The offline safety pack could not be prepared.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-nb border border-sky-500/30 bg-sky-50/60 p-4">
      <div className="flex items-start gap-3">
        <MapPinned className="mt-0.5 size-5 text-sky-600" />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-ink">Download your {selection.radiusKm} km safety map</h3>
          <p className="mt-1 text-xs leading-5 text-ink-soft">{selection.label || `${selection.lat.toFixed(4)}, ${selection.lng.toFixed(4)}`}. The pack is saved in Prahari and downloaded as a portable backup file.</p>
        </div>
      </div>
      <button type="button" disabled={busy} onClick={download} className="minimal-button minimal-button-primary mt-3 w-full disabled:opacity-60">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        {busy ? 'Preparing offline area…' : 'Download offline safety map'}
      </button>
      {notice && <p role="status" className="mt-3 text-xs leading-5 text-ink-soft">{notice}</p>}
    </section>
  );
}
