'use client';

import { useState } from 'react';
import { Siren, CheckCircle2, Loader2, Radio, XCircle } from 'lucide-react';
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
  const [bleStatus, setBleStatus] = useState({ supported: false, paired: false, gatewayName: null as string | null });
  const [pairingBle, setPairingBle] = useState(false);
  const [bleError, setBleError] = useState<string | null>(null);

  const canDispatch = Boolean(touristId);

  const setUpOptionalBleGateway = async () => {
    try {
      setPairingBle(true);
      setBleError(null);
      const { globalBleTransport } = await import('@/lib/sos-mesh/transports/bleTransport');
      const knownGateway = await globalBleTransport.reconnectKnownGateway();
      setBleStatus(knownGateway.paired ? knownGateway : await globalBleTransport.pairGateway());
    } catch (cause: any) {
      setBleError(cause.message || 'Could not set up the optional BLE relay gateway.');
    } finally {
      setPairingBle(false);
    }
  };

  const handleSosClick = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!touristId) {
        throw new Error('Complete identity verification before sending an SOS.');
      }
      const effectiveTouristId = touristId;

      // Resolve a real current position. Never substitute a demo or regional
      // coordinate for an emergency report.
      let finalLat = touristPos?.lat;
      let finalLng = touristPos?.lng;

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

      if (typeof finalLat !== 'number' || typeof finalLng !== 'number') {
        throw new Error('A current location is required to send an SOS. Enable location sharing, then try again. If you are in immediate danger, call 112.');
      }

      // Import the local-queue-capable delivery transport dynamically.
      const { createSOSPacket } = await import('@/lib/sos-mesh/sosPacket');
      const { globalTransportManager } = await import('@/lib/sos-mesh/transports/transportManager');

      const packet = createSOSPacket({
        touristId: effectiveTouristId,
        latitude: finalLat,
        longitude: finalLng,
        type: 'PANIC',
        severity: 'CRITICAL',
      });

      // Wi-Fi/internet is always the direct first path. BLE is consulted only
      // after a traveller has deliberately paired an optional relay gateway.
      const result = await globalTransportManager.dispatch(packet, { allowBleRelay: bleStatus.paired });

      if (!result.success) {
        throw new Error(result.error || 'The emergency alert could not be sent. Please try again.');
      }

      const activeRecord = result.incidentRecord || {
        incidentId: packet.incidentId,
        touristId: packet.touristId,
        type: 'PANIC',
        severity: 'CRITICAL',
        status: result.channel === 'LOCAL_QUEUE' ? 'PENDING_LOCAL_DELIVERY' : 'PENDING_RELAY_DELIVERY',
        location: { lat: finalLat, lng: finalLng },
        transportType: result.channel,
        hopCount: packet.hopCount,
        packetId: packet.packetId,
        assignedResponderUnitId: null,
        etaMinutes: null,
      };

      setActiveSos(activeRecord);
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
    const wasDelivered = activeSos.transportType === 'INTERNET';
    const confirmed = window.confirm(wasDelivered
      ? 'Cancel this emergency alert? Authorities will be told this was cancelled.'
      : 'Discard this locally queued SOS? It has not yet reached the authority queue.');
    if (!confirmed) return;
    try {
      setLoading(true);
      if (!wasDelivered) {
        const { removeQueuedPacket } = await import('@/lib/sos-mesh/indexedDbQueue');
        if (activeSos.packetId) await removeQueuedPacket(activeSos.packetId);
        setActiveSos(null);
        setCancelled(true);
        return;
      }
      const res = await fetch('/api/incidents', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: activeSos.incidentId, status: 'CANCELLED' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not cancel the alert.');
      setActiveSos(null);
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
          <p className="mt-1 text-sm text-ink-soft">Send an SOS using your current location. With Wi‑Fi or mobile data, it goes straight to the authority queue.</p>
        </div>
        <span className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft">Direct online delivery</span>
      </div>

      <p className="mb-5 max-w-2xl text-sm leading-6 text-ink-soft">
        When online, this records an emergency incident and alerts the authority queue without Bluetooth. If this device has no internet connection, the alert is saved locally and retried when this browser reconnects. A separately provisioned BLE relay is an optional offline enhancement, never a requirement.
      </p>

      <details className="mb-5 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-xs text-ink-soft">
        <summary className="cursor-pointer select-none font-medium text-ink">Optional offline BLE relay</summary>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="max-w-xl leading-5">This is only for a separately provisioned Prahari relay gateway when the browser has no internet. It is not needed for Wi‑Fi, mobile data, or the local retry queue.</div>
          <div className="flex items-center gap-2"><Radio className="size-4 text-stone-600" /><span>{bleStatus.paired ? `Relay paired${bleStatus.gatewayName ? `: ${bleStatus.gatewayName}` : ''}` : 'Not set up'}</span></div>
          <button type="button" onClick={() => void setUpOptionalBleGateway()} disabled={pairingBle} className="minimal-button minimal-button-secondary px-3 py-1.5 text-xs">{pairingBle ? <Loader2 className="size-3.5 animate-spin" /> : <Radio className="size-3.5" />}{pairingBle ? 'Setting up…' : 'Set up relay'}</button>
        </div>
        {bleError && <p role="alert" className="mt-3 border-t border-line pt-3 text-rose-700">{bleError}</p>}
      </details>

      {error && <div role="alert" className="mb-4 rounded border border-danger/50 bg-danger/10 px-3 py-2.5 text-xs font-medium text-ink">{error}</div>}

      {activeSos ? (
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-sm font-semibold text-ink">
                {activeSos.transportType === 'INTERNET'
                  ? 'SOS sent to the authority queue'
                  : activeSos.transportType === 'BLE_RELAY'
                    ? 'SOS accepted by a BLE relay — authority delivery pending'
                    : 'SOS stored locally — awaiting delivery'}
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
                {typeof activeSos.location?.lat === 'number' ? activeSos.location.lat.toFixed(4) : 'Not available'}, {typeof activeSos.location?.lng === 'number' ? activeSos.location.lng.toFixed(4) : 'Not available'}
              </span>
            </div>
          </div>
          {activeSos.emergencyContactNotifications && (
            <div className={`mt-3 rounded border p-2 text-[11px] text-ink-soft ${['ACCEPTED', 'PARTIAL'].includes(activeSos.emergencyContactNotifications.status) ? 'border-success/40 bg-success/10' : 'border-warning/40 bg-warning/10'}`}>
              <strong className={['ACCEPTED', 'PARTIAL'].includes(activeSos.emergencyContactNotifications.status) ? 'text-success' : 'text-warning'}>{activeSos.emergencyContactNotifications.message}</strong>
            </div>
          )}

          {activeSos.transportType === 'INTERNET' && <div className="mt-4">
            <OfflineEmergencyChat
              incidentId={activeSos.incidentId}
              touristId={activeSos.touristId}
              latitude={activeSos.location?.lat}
              longitude={activeSos.location?.lng}
            />
          </div>}
          {activeSos.transportType !== 'BLE_RELAY' && <button onClick={cancelSos} disabled={loading}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/70 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-60">
            <XCircle className="w-4 h-4" /> {loading ? 'Cancelling alert…' : 'Cancel false alarm'}
          </button>}
          <p className="mt-2 text-center text-xs text-ink-soft">{activeSos.transportType === 'BLE_RELAY' ? 'A paired relay may upload this SOS later. Contact emergency services directly if you need immediate help.' : 'Only cancel if you are safe.'}</p>
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
            {canDispatch ? 'Your current location will be shared with the authority queue when delivery succeeds.' : 'Complete identity verification before sending an SOS.'}
          </span>
        </div>
      )}
    </section>
  );
}
