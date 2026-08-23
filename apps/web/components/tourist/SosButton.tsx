'use client';

import React, { useState } from 'react';
import { Siren, CheckCircle2, Loader2, XCircle } from 'lucide-react';

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

  const canDispatch = Boolean(
    touristId &&
    typeof touristPos?.lat === 'number' &&
    typeof touristPos?.lng === 'number'
  );

  const handleSosClick = async () => {
    if (!touristId) {
      setError('Your tourist identity is still loading. Please wait a moment and try again.');
      return;
    }
    if (!touristPos) {
      setError('A current GPS location is required before an SOS can be sent. Enable location sharing and wait for a location fix.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PANIC',
          ...(touristId ? { touristId } : {}),
          location: { lat: touristPos.lat, lng: touristPos.lng },
          severity: 'CRITICAL',
          status: 'ACTIVE',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data.incident) {
        throw new Error(data?.error || 'The emergency alert could not be sent. Please try again.');
      }
      setActiveSos(data.incident);
      onSosTriggered?.(data.incident);
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
          <p className="mt-1 text-sm text-ink-soft">Send an SOS using your current shared location.</p>
        </div>
        <span className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft">Location required</span>
      </div>

      <p className="mb-5 max-w-2xl text-sm leading-6 text-ink-soft">
        This records an incident in the authority queue. Registered emergency contacts are notified only when a delivery provider is configured.
      </p>

      {error && <div role="alert" className="mb-4 rounded border border-danger/50 bg-danger/10 px-3 py-2.5 text-xs font-medium text-ink">{error}</div>}

      {activeSos ? (
        <div className="rounded-xl border border-line bg-surface-2 p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <span className="text-sm font-semibold text-ink">SOS sent to the authority queue</span>
            </div>
            <span className="rounded-full bg-sky-400/10 px-3 py-1 font-mono text-xs text-sky-300">{activeSos.incidentId}</span>
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
              <span className="mt-1 block font-mono text-xs text-ink">{activeSos.location.lat.toFixed(4)}, {activeSos.location.lng.toFixed(4)}</span>
            </div>
          </div>
          {activeSos.emergencyContactNotifications && (
            <div className={`mt-3 rounded border p-2 text-[11px] text-ink-soft ${['ACCEPTED', 'PARTIAL'].includes(activeSos.emergencyContactNotifications.status) ? 'border-success/40 bg-success/10' : 'border-warning/40 bg-warning/10'}`}>
              <strong className={['ACCEPTED', 'PARTIAL'].includes(activeSos.emergencyContactNotifications.status) ? 'text-success' : 'text-warning'}>{activeSos.emergencyContactNotifications.message}</strong>
            </div>
          )}
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
