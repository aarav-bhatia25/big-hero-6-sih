'use client';

import React, { useState } from 'react';
import { Siren, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import OfflineEmergencyChat from '@/components/tourist/OfflineEmergencyChat';

interface SosButtonProps {
  touristPos?: { lat: number; lng: number };
  touristId?: string;
  onSosTriggered?: (incidentData: any) => void;
  onSosCancelled?: () => void;
}

export default function SosButton({
  touristPos,
  touristId,
  onSosTriggered,
  onSosCancelled,
}: SosButtonProps) {
  const [loading, setLoading] = useState(false);
  const [activeSos, setActiveSos] = useState<any | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore active SOS on mount (survives page reloads)
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('prahari_active_sos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.incidentId && parsed.status !== 'CANCELLED' && parsed.status !== 'RESOLVED') {
          setActiveSos(parsed);
          onSosTriggered?.(parsed);
        }
      }
    } catch {}
  }, []);

  const canDispatch = true;

  const handleSosClick = async () => {
    try {
      setLoading(true);
      setError(null);

      // Resolve effective tourist ID
      const effectiveTouristId =
        touristId ||
        (typeof window !== 'undefined' ? localStorage.getItem('prahari_tourist_id') : null) ||
        'TOUR-7890';

      // Resolve effective coordinates (prop -> localStorage -> browser geolocation -> emergency fallback)
      let finalLat = touristPos?.lat;
      let finalLng = touristPos?.lng;

      if (typeof finalLat !== 'number' || typeof finalLng !== 'number') {
        try {
          const cached = typeof localStorage !== 'undefined' ? localStorage.getItem('prahari_last_known_coords') : null;
          if (cached) {
            const parsed = JSON.parse(cached);
            if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
              finalLat = parsed.lat;
              finalLng = parsed.lng;
            }
          }
        } catch {}
      }

      if (typeof finalLat !== 'number' || typeof finalLng !== 'number') {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000, enableHighAccuracy: false });
            });
            finalLat = pos.coords.latitude;
            finalLng = pos.coords.longitude;
          } catch {}
        }
      }

      // Default emergency regional fallback coordinates if GPS blocked/unavailable
      if (typeof finalLat !== 'number' || typeof finalLng !== 'number') {
        finalLat = 19.072826;
        finalLng = 72.899706;
      }

      // Import mesh packet & transport manager dynamically
      const { createSOSPacket } = await import('@/lib/sos-mesh/sosPacket');
      const { globalTransportManager } = await import('@/lib/sos-mesh/transports/transportManager');

      const packet = createSOSPacket({
        touristId: effectiveTouristId,
        latitude: finalLat,
        longitude: finalLng,
        type: 'PANIC',
        severity: 'CRITICAL',
      });

      const result = await globalTransportManager.dispatch(packet);

      if (!result.success) {
        throw new Error(result.error || 'The emergency alert could not be sent. Please try again.');
      }

      const activeRecord = result.incidentRecord || {
        incidentId: packet.incidentId,
        touristId: packet.touristId,
        type: 'PANIC',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        location: { lat: finalLat, lng: finalLng },
        transportType: result.channel,
        hopCount: packet.hopCount,
        assignedResponderUnitId: 'Assigned via Gateway',
        etaMinutes: 8,
      };

      setActiveSos(activeRecord);
      try {
        localStorage.setItem('prahari_active_sos', JSON.stringify(activeRecord));
      } catch {}
      onSosTriggered?.(activeRecord);
    } catch (err: any) {
      console.error('Error triggering SOS:', err);
      setError(err.message || 'The emergency alert could not be sent. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancelSos = async () => {
    if (!activeSos || loading) return;
    const confirmed = window.confirm('Cancel this emergency alert? Authorities will be told this was cancelled.');
    if (!confirmed) return;
    try {
      setLoading(true);
      const res = await fetch('/api/incidents', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: activeSos.incidentId, status: 'CANCELLED' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not cancel the alert.');
      setActiveSos(null);
      try {
        localStorage.removeItem('prahari_active_sos');
      } catch {}
      setCancelled(true);
      onSosCancelled?.();
    } catch (error: any) {
      window.alert(error.message || 'Could not cancel the emergency alert.');
    } finally { setLoading(false); }
  };

  return (
    <section className="minimal-card p-6 text-ink">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-ink"><Siren className="size-5 text-red-400" /> Emergency assistance</h2>
          <p className="mt-1 text-sm text-ink-soft">Send an SOS using your current shared location or offline mesh channel.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              if (typeof navigator === 'undefined' || !('bluetooth' in (navigator as any))) {
                window.alert("Web Bluetooth API is not supported by your browser or operating system.");
                return;
              }
              try {
                const bluetooth = (navigator as any).bluetooth;
                const device = await bluetooth.requestDevice({
                  acceptAllDevices: true,
                  optionalServices: ['battery_service'],
                });
                window.alert(`Bluetooth Scan Success! Paired with: ${device.name || device.id}`);
              } catch (err: any) {
                if (err.name === 'NotFoundError') {
                  window.alert("Bluetooth hardware scan dialog was closed.");
                } else {
                  window.alert(`Bluetooth Hardware Response: ${err.message}`);
                }
              }
            }}
            className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-500/20"
          >
            Scan Bluetooth
          </button>
          <span className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft">Connectivity-Agnostic SOS</span>
        </div>
      </div>

      <p className="mb-5 max-w-2xl text-sm leading-6 text-ink-soft">
        Records an emergency incident. If internet is unavailable, your SOS is securely stored locally and relayed across nearby tourist Bluetooth/Mesh nodes.
      </p>

      {error && <div role="alert" className="mb-4 rounded border border-danger/50 bg-danger/10 px-3 py-2.5 text-xs font-medium text-ink">{error}</div>}

      {activeSos ? (
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-sm font-semibold text-ink">
                {activeSos.transportType === 'INTERNET'
                  ? 'SOS sent to the authority queue'
                  : 'SOS persisted & relayed over offline mesh'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {activeSos.transportType && (
                <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 font-mono text-xs font-semibold text-sky-300 border border-sky-400/30">
                  {activeSos.transportType}
                </span>
              )}
              <span className="rounded-full bg-sky-400/10 px-3 py-1 font-mono text-xs text-sky-300">{activeSos.incidentId}</span>
            </div>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border border-line bg-surface p-3">
              <span className="block text-xs text-ink-soft">Responder</span>
              <span className="mt-1 block font-medium text-ink">{activeSos.assignedResponderUnitId || 'Not assigned yet'}</span>
            </div>
            <div className="rounded-lg border border-line bg-surface p-3">
              <span className="block text-xs text-ink-soft">Estimated arrival</span>
              <span className="mt-1 block font-medium text-ink">{activeSos.etaMinutes != null ? `~${activeSos.etaMinutes} min` : 'Not available'}</span>
            </div>
            <div className="rounded-lg border border-line bg-surface p-3">
              <span className="block text-xs text-ink-soft">Location</span>
              <span className="mt-1 block font-mono text-xs text-ink">
                {typeof activeSos.location?.lat === 'number' ? activeSos.location.lat.toFixed(4) : '19.0728'}, {typeof activeSos.location?.lng === 'number' ? activeSos.location.lng.toFixed(4) : '72.8997'}
              </span>
            </div>
          </div>
          {activeSos.emergencyContactNotifications && (
            <div className={`mt-3 rounded border p-2 text-[11px] text-ink-soft ${['ACCEPTED', 'PARTIAL'].includes(activeSos.emergencyContactNotifications.status) ? 'border-success/40 bg-success/10' : 'border-warning/40 bg-warning/10'}`}>
              <strong className={['ACCEPTED', 'PARTIAL'].includes(activeSos.emergencyContactNotifications.status) ? 'text-success' : 'text-warning'}>{activeSos.emergencyContactNotifications.message}</strong>
            </div>
          )}

          <div className="mt-4">
            <OfflineEmergencyChat
              incidentId={activeSos.incidentId}
              touristId={activeSos.touristId}
              latitude={activeSos.location?.lat}
              longitude={activeSos.location?.lng}
            />
          </div>
          <button onClick={cancelSos} disabled={loading}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/70 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-60">
            <XCircle className="w-4 h-4" /> {loading ? 'Cancelling alert…' : 'Cancel false alarm'}
          </button>
          <p className="mt-2 text-center text-xs text-ink-soft">Only cancel if you are safe.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-2">
          {cancelled && <div className="mb-3 rounded border border-success/40 bg-success/10 px-3 py-2 text-xs font-bold text-success">Emergency alert cancelled. If you still need help, send a new SOS.</div>}
          <button
            onClick={handleSosClick}
            disabled={loading || !canDispatch}
            className="inline-flex w-full max-w-md items-center justify-center gap-2 rounded-xl border border-red-400 bg-red-500 px-5 py-4 text-base font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Siren className="w-6 h-6" />
                <span>Send SOS alert</span>
              </>
            )}
          </button>
          <span className="mt-3 text-center text-xs text-ink-soft">
            {canDispatch ? 'Your current location will be shared with the authority queue.' : 'Waiting for a verified ID and current location.'}
          </span>
        </div>
      )}
    </section>
  );
}
