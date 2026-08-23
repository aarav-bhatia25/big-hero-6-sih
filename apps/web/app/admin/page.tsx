'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  FileText,
  LogOut,
  Plus,
  Radio,
  RefreshCw,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import MapView from '@/components/maps/MapView';
import IncidentQueue from '@/components/authority/IncidentQueue';
import { subscribeToPrahariLive } from '@/lib/supabaseRealtime';

type DashboardStats = {
  activeTourists: number;
  liveIncidents: number;
  highRiskZones: number;
  respondersAvailable: number;
  respondersTotal: number;
};

function coordinatesForDisplay(location?: { lat?: number; lng?: number } | null) {
  if (typeof location?.lat !== 'number' || typeof location?.lng !== 'number') return 'Not reported';
  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
}

function isAvailable(responder: any) {
  return String(responder.status ?? '').toLowerCase() === 'available';
}

function hasRecentLocation(timestamp?: string) {
  const reportedAt = timestamp ? new Date(timestamp).getTime() : Number.NaN;
  const ageMs = Date.now() - reportedAt;
  return Number.isFinite(reportedAt) && ageMs >= -60_000 && ageMs <= 5 * 60_000;
}

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [responders, setResponders] = useState<any[]>([]);
  const [liveLocations, setLiveLocations] = useState<Record<string, { touristId: string; lat: number; lng: number; timestamp?: string }>>({});
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [investigationData, setInvestigationData] = useState<{ tourist: any | null; locations: any[]; loading: boolean }>({
    tourist: null,
    locations: [],
    loading: false,
  });
  const [efirs, setEfirs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [efirLoading, setEfirLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [realtimeDelivery, setRealtimeDelivery] = useState<'checking' | 'verified' | 'fallback'>('checking');
  const [showGeofenceForm, setShowGeofenceForm] = useState(false);
  const [geofenceError, setGeofenceError] = useState<string | null>(null);
  const [geofenceSaving, setGeofenceSaving] = useState(false);
  const [geofenceForm, setGeofenceForm] = useState({
    name: '',
    type: 'high_risk',
    severity: 'high',
    description: '',
    coordinates: '',
  });
  const realtimeProbeNonce = useRef<string | null>(null);
  const realtimeProbeTimer = useRef<number | null>(null);

  const verifyRealtimeDelivery = useCallback(async () => {
    if (realtimeProbeTimer.current) window.clearTimeout(realtimeProbeTimer.current);
    const nonce = crypto.randomUUID().replaceAll('-', '');
    realtimeProbeNonce.current = nonce;
    setRealtimeDelivery('checking');
    try {
      const response = await fetch('/api/realtime/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonce }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.delivery?.accepted) {
        setRealtimeDelivery('fallback');
        return;
      }
      realtimeProbeTimer.current = window.setTimeout(() => {
        if (realtimeProbeNonce.current === nonce) setRealtimeDelivery('fallback');
      }, 5_000);
    } catch {
      setRealtimeDelivery('fallback');
    }
  }, []);

  const fetchEfirs = useCallback(async () => {
    try {
      setEfirLoading(true);
      const response = await fetch('/api/efir');
      const data = await response.json();
      if (response.ok && data.success) setEfirs(data.efirs ?? []);
    } catch (error) {
      console.error('Unable to refresh E-FIR queue:', error);
    } finally {
      setEfirLoading(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [incRes, geoRes, statRes, responderRes, touristRes] = await Promise.all([
        fetch('/api/incidents'),
        fetch('/api/geofences'),
        fetch('/api/stats'),
        fetch('/api/responders'),
        fetch('/api/tourists'),
      ]);
      const [incData, geoData, statData, responderData, touristData] = await Promise.all([
        incRes.json(), geoRes.json(), statRes.json(), responderRes.json(), touristRes.json(),
      ]);

      if (incRes.ok && incData.success) setIncidents(incData.incidents ?? []);
      if (geoRes.ok && geoData.success) {
        setGeofences((geoData.geofences ?? []).map((geofence: any) => ({
          id: geofence.id ?? geofence.name,
          name: geofence.name,
          coordinates: geofence.coordinates ?? geofence.geometry?.coordinates?.[0] ?? [],
          severity: geofence.severity,
        })));
      }
      if (statRes.ok && statData.success) setStats(statData.stats);
      if (responderRes.ok && responderData.success) {
        setResponders((responderData.responders ?? []).map((responder: any) => ({
          id: responder.id ?? responder.responderId,
          unitId: responder.unitId ?? responder.responderId,
          name: responder.name ?? responder.responderId ?? 'Unnamed responder',
          status: responder.status,
          lat: responder.location?.lat,
          lng: responder.location?.lng,
          type: responder.type ?? responder.department,
        })).filter((responder: any) => typeof responder.lat === 'number' && typeof responder.lng === 'number'));
      }
      if (touristRes.ok && touristData.success) {
        const reportedLocations = Object.fromEntries(
          (touristData.tourists ?? [])
            .filter((tourist: any) => tourist.trackingConsent !== false && typeof tourist.currentLocation?.lat === 'number' && typeof tourist.currentLocation?.lng === 'number' && hasRecentLocation(tourist.currentLocation.timestamp))
            .map((tourist: any) => [tourist.touristId, {
              touristId: tourist.touristId,
              lat: tourist.currentLocation.lat,
              lng: tourist.currentLocation.lng,
              timestamp: tourist.currentLocation.timestamp,
            }])
        );
        setLiveLocations(reportedLocations);
      }
    } catch (error) {
      console.error('Unable to refresh authority dashboard:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
    void fetchEfirs();
    void fetch('/api/auth/me')
      .then((response) => response.json())
      .then((data) => { if (data.authenticated && data.user) setCurrentUser(data.user); })
      .catch(() => {});

    const refreshTimer = window.setInterval(() => void fetchDashboardData(true), 15_000);
    return () => window.clearInterval(refreshTimer);
  }, [fetchDashboardData, fetchEfirs]);

  useEffect(() => subscribeToPrahariLive({
    onConnectionChange: (connected) => {
      setSocketConnected(connected);
      if (connected) void verifyRealtimeDelivery();
      else setRealtimeDelivery('fallback');
    },
    onIncidentCreated: () => { void fetchDashboardData(true); void fetchEfirs(); },
    onIncidentUpdated: () => { void fetchDashboardData(true); void fetchEfirs(); },
    onTouristLocation: () => void fetchDashboardData(true),
    onProbe: (probe: any) => {
      if (probe?.nonce && probe.nonce === realtimeProbeNonce.current) {
        if (realtimeProbeTimer.current) window.clearTimeout(realtimeProbeTimer.current);
        setRealtimeDelivery('verified');
      }
    },
  }), [fetchDashboardData, fetchEfirs, verifyRealtimeDelivery]);

  useEffect(() => () => {
    if (realtimeProbeTimer.current) window.clearTimeout(realtimeProbeTimer.current);
  }, []);

  useEffect(() => {
    if (!selectedIncident?.touristId) {
      setInvestigationData({ tourist: null, locations: [], loading: false });
      return;
    }

    let cancelled = false;
    setInvestigationData((previous) => ({ ...previous, loading: true }));
    Promise.all([
      fetch(`/api/tourists/${encodeURIComponent(selectedIncident.touristId)}`).then((response) => response.json()).catch(() => null),
      fetch(`/api/locations?touristId=${encodeURIComponent(selectedIncident.touristId)}`).then((response) => response.json()).catch(() => null),
    ]).then(([touristResult, locationResult]) => {
      if (!cancelled) {
        setInvestigationData({
          tourist: touristResult?.success ? touristResult.tourist : null,
          locations: locationResult?.success ? locationResult.history ?? [] : [],
          loading: false,
        });
      }
    });
    return () => { cancelled = true; };
  }, [selectedIncident?.touristId]);

  const handleDispatch = async () => {
    if (!selectedIncident) return;
    const responder = responders.find((item) => isAvailable(item));
    if (!responder) {
      window.alert('No available responder with a reported location is currently on record. This incident remains unassigned.');
      return;
    }

    try {
      const response = await fetch('/api/incidents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: selectedIncident.incidentId,
          status: 'DISPATCHED',
          assignedResponderUnitId: responder.unitId,
          assignedResponderName: responder.name,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Unable to dispatch responder.');
      setSelectedIncident(data.incident);
      void fetchDashboardData(true);
    } catch (error: any) {
      window.alert(error.message ?? 'Unable to dispatch responder.');
    }
  };

  const handleEfirAction = async (incidentId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const response = await fetch('/api/efir', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, action }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Unable to update E-FIR.');
      await fetchEfirs();
    } catch (error: any) {
      window.alert(error.message ?? 'Unable to update E-FIR.');
    }
  };

  const handleCreateGeofence = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGeofenceError(null);

    const coordinates = geofenceForm.coordinates
      .split(/\n|;/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(',').map((value) => Number(value.trim())));

    const validCoordinates = coordinates.length >= 3 && coordinates.every(
      ([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    );
    if (!validCoordinates) {
      setGeofenceError('Enter at least three valid latitude, longitude pairs—one pair per line.');
      return;
    }

    const closedCoordinates = [...coordinates] as Array<[number, number]>;
    const first = closedCoordinates[0];
    const last = closedCoordinates[closedCoordinates.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) closedCoordinates.push(first);

    try {
      setGeofenceSaving(true);
      const response = await fetch('/api/geofences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: geofenceForm.name.trim(),
          type: geofenceForm.type,
          severity: geofenceForm.severity,
          description: geofenceForm.description.trim(),
          coordinates: closedCoordinates,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Unable to create geofence.');
      setShowGeofenceForm(false);
      setGeofenceForm({ name: '', type: 'high_risk', severity: 'high', description: '', coordinates: '' });
      await fetchDashboardData(true);
    } catch (error: any) {
      setGeofenceError(error.message ?? 'Unable to create geofence.');
    } finally {
      setGeofenceSaving(false);
    }
  };

  const liveIncidents = incidents.filter((incident) => !['resolved', 'cancelled', 'rejected'].includes(String(incident.status ?? '').toLowerCase()));
  const mapIncidents = liveIncidents
    .filter((incident) => typeof incident.location?.lat === 'number' && typeof incident.location?.lng === 'number')
    .map((incident) => ({
      id: incident.id ?? incident.incidentId,
      incidentId: incident.incidentId,
      type: incident.type,
      lat: incident.location.lat,
      lng: incident.location.lng,
      severity: incident.severity,
    }));

  return (
    <div className="minimal-page min-h-screen">
      <header className="minimal-nav">
        <Link href="/" className="text-xl font-semibold tracking-tight text-ink">Prahari</Link>
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser && <span className="hidden items-center gap-2 text-sm text-ink-soft md:flex"><UserRound size={15} className="text-sky-400" />{currentUser.name} · {currentUser.role}</span>}
          <button onClick={() => void fetchDashboardData()} className="minimal-button minimal-button-secondary" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={() => { setGeofenceError(null); setShowGeofenceForm(true); }} className="minimal-button minimal-button-secondary">
            <Plus size={16} /><span className="hidden sm:inline">Add geofence</span>
          </button>
          <Link href="/citizen" className="minimal-button minimal-button-primary">Citizen view</Link>
          <button
            onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }}
            aria-label="Sign out"
            className="minimal-button minimal-button-secondary px-3"
          ><LogOut size={17} /></button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:py-12">
        <section className="flex flex-col justify-between gap-4 border-b border-line pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="minimal-eyebrow">Authority workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">Live safety operations</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">Only current records from the operational database are shown. Fixture and test records are excluded.</p>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${realtimeDelivery === 'verified' ? 'border-sky-400/40 bg-sky-400/10 text-sky-200' : 'border-slate-600 text-ink-soft'}`}>
            <Radio size={14} />{realtimeDelivery === 'verified' ? 'Instant updates verified' : socketConnected && realtimeDelivery === 'checking' ? 'Checking live delivery…' : 'Syncing every 15 seconds'}
          </span>
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Registered travellers" value={stats?.activeTourists} icon={<Users size={20} />} />
          <Metric label="Open incidents" value={stats?.liveIncidents} icon={<CircleAlert size={20} />} tone="text-rose-300" />
          <Metric label="High-risk geofences" value={stats?.highRiskZones} icon={<AlertTriangle size={20} />} tone="text-amber-300" />
          <Metric label="Available responders" value={stats ? `${stats.respondersAvailable}/${stats.respondersTotal}` : undefined} icon={<Radio size={20} />} />
        </section>

        <section className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.85fr)]">
          <div className="minimal-card p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">Operations map</h2>
                <p className="mt-1 text-sm text-ink-soft">Consented locations, active incidents, responder positions, and published geofences.</p>
              </div>
              <span className="text-sm text-ink-soft">{Object.keys(liveLocations).length} reporting traveller{Object.keys(liveLocations).length === 1 ? '' : 's'}</span>
            </div>
            <MapView liveTourists={Object.values(liveLocations)} geofences={geofences} incidents={mapIncidents} responders={responders} />
          </div>
          <IncidentQueue incidents={liveIncidents} selectedIncidentId={selectedIncident?.incidentId} onSelectIncident={setSelectedIncident} />
        </section>

        {selectedIncident && (
          <section className="minimal-card mt-7 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
              <div>
                <p className="minimal-eyebrow">Incident review</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">{selectedIncident.incidentId}</h2>
                <p className="mt-2 text-sm text-ink-soft">{selectedIncident.type} · Reported at {coordinatesForDisplay(selectedIncident.location)}</p>
              </div>
              <button onClick={() => setSelectedIncident(null)} className="minimal-button minimal-button-secondary px-3" aria-label="Close incident review"><X size={17} /></button>
            </div>

            {investigationData.loading ? (
              <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-ink-soft"><RefreshCw size={16} className="animate-spin" />Loading authorised record…</div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard label="Traveller" value={investigationData.tourist?.name ?? selectedIncident.touristName ?? selectedIncident.touristId ?? 'Not recorded'} detail={investigationData.tourist?.did ?? 'No credential DID on record'} />
                <InfoCard label="Identity status" value={investigationData.tourist?.identityStatus ? String(investigationData.tourist.identityStatus).replaceAll('_', ' ') : 'Not recorded'} detail={investigationData.tourist?.nationality ?? 'Nationality not recorded'} />
                <InfoCard label="Location history" value={investigationData.locations.length ? `${investigationData.locations.length} recorded ping${investigationData.locations.length === 1 ? '' : 's'}` : 'No recorded location history'} detail={investigationData.locations[0] ? coordinatesForDisplay(investigationData.locations[0].coordinates ?? investigationData.locations[0]) : undefined} />
                <InfoCard label="Responder" value={selectedIncident.assignedResponderUnitId ?? 'Unassigned'} detail={selectedIncident.etaMinutes != null ? `ETA ${selectedIncident.etaMinutes} min` : 'No ETA reported'} />
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <p className="text-sm text-ink-soft">Emergency contacts and additional identity data are shown only through the authorised investigation record.</p>
              <button onClick={handleDispatch} className="minimal-button minimal-button-primary" disabled={!responders.some(isAvailable)}>Dispatch available responder</button>
            </div>
          </section>
        )}

        <section className="minimal-card mt-7 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><FileText size={19} className="text-sky-400" />E-FIR review</h2>
              <p className="mt-1 text-sm text-ink-soft">Reports submitted from real incident records only.</p>
            </div>
            <button onClick={() => void fetchEfirs()} className="minimal-button minimal-button-secondary" disabled={efirLoading}><RefreshCw size={16} className={efirLoading ? 'animate-spin' : ''} />Refresh</button>
          </div>

          {efirs.length === 0 ? (
            <div className="py-12 text-center"><p className="font-medium text-ink">No E-FIR reports to review</p><p className="mt-2 text-sm text-ink-soft">New, authenticated reports will appear here.</p></div>
          ) : (
            <div className="divide-y divide-slate-700/70">
              {efirs.map((efir) => {
                const incidentId = efir._incidentId ?? efir.incidentId;
                const pending = efir.policeVerification === 'PENDING_OFFICER_APPROVAL';
                const verified = efir.policeVerification === 'OFFICER_VERIFIED';
                return (
                  <article key={efir.efirId} className="py-5 first:pt-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-mono text-sm font-semibold text-ink">{efir.efirId}</h3>
                        <p className="mt-1 text-sm text-ink-soft">{incidentId} · {efir.incidentType ?? 'Incident type not recorded'}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${pending ? 'border-amber-400/40 text-amber-200' : verified ? 'border-emerald-400/40 text-emerald-200' : 'border-rose-400/40 text-rose-200'}`}>{pending ? 'Awaiting review' : verified ? 'Verified' : 'Rejected'}</span>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
                      <p>Complainant: <span className="text-ink">{efir.touristName ?? 'Not recorded'}</span></p>
                      <p>Filed: <span className="text-ink">{efir.createdAt ? new Date(efir.createdAt).toLocaleString() : 'Not recorded'}</span></p>
                      <p>Location: <span className="font-mono text-ink">{coordinatesForDisplay(efir.location)}</span></p>
                      {efir.blockchainEvidence && <p>Evidence: <span className="text-ink">{efir.blockchainEvidence.status}</span></p>}
                    </div>
                    {pending && <div className="mt-4 flex gap-2"><button onClick={() => void handleEfirAction(incidentId, 'APPROVE')} className="minimal-button minimal-button-primary">Approve</button><button onClick={() => void handleEfirAction(incidentId, 'REJECT')} className="minimal-button minimal-button-secondary">Reject</button></div>}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {showGeofenceForm && (
        <div className="fixed inset-0 z-[3000] overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="geofence-dialog-title">
          <div className="flex min-h-full items-center justify-center py-6">
            <form onSubmit={handleCreateGeofence} className="relative z-[3100] w-full max-w-xl rounded-2xl border border-slate-600 bg-[#2a2b2e] p-5 shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
                <div>
                  <p className="minimal-eyebrow">Live operations</p>
                  <h2 id="geofence-dialog-title" className="mt-1 text-xl font-semibold text-ink">Add geofence</h2>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">Publish a boundary from coordinates you supply. Nothing is prefilled or simulated.</p>
                </div>
                <button type="button" onClick={() => setShowGeofenceForm(false)} className="minimal-button minimal-button-secondary px-3" aria-label="Close add geofence"><X size={17} /></button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2"><span className="text-sm font-medium text-ink">Zone name</span><input required value={geofenceForm.name} onChange={(event) => setGeofenceForm((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2.5 text-sm text-ink outline-none focus:border-sky-400" placeholder="e.g. Restricted area name" /></label>
                <label className="block"><span className="text-sm font-medium text-ink">Type</span><select value={geofenceForm.type} onChange={(event) => setGeofenceForm((current) => ({ ...current, type: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2.5 text-sm text-ink outline-none focus:border-sky-400"><option value="high_risk">High-risk area</option><option value="restricted">Restricted area</option><option value="hazard">Hazard</option><option value="safe_zone">Safe zone</option></select></label>
                <label className="block"><span className="text-sm font-medium text-ink">Severity</span><select value={geofenceForm.severity} onChange={(event) => setGeofenceForm((current) => ({ ...current, severity: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2.5 text-sm text-ink outline-none focus:border-sky-400"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                <label className="block sm:col-span-2"><span className="text-sm font-medium text-ink">Boundary coordinates</span><textarea required rows={6} value={geofenceForm.coordinates} onChange={(event) => setGeofenceForm((current) => ({ ...current, coordinates: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2.5 font-mono text-sm text-ink outline-none focus:border-sky-400" placeholder={'latitude, longitude\nlatitude, longitude\nlatitude, longitude'} /><span className="mt-2 block text-xs leading-5 text-ink-soft">Enter at least three corner pairs, one per line. The boundary closes automatically when saved.</span></label>
                <label className="block sm:col-span-2"><span className="text-sm font-medium text-ink">Operational note <span className="font-normal text-ink-soft">(optional)</span></span><input value={geofenceForm.description} onChange={(event) => setGeofenceForm((current) => ({ ...current, description: event.target.value }))} className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2.5 text-sm text-ink outline-none focus:border-sky-400" placeholder="Reason or source for this boundary" /></label>
              </div>

              {geofenceError && <p className="mt-4 rounded-lg border border-rose-400/40 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-100">{geofenceError}</p>}
              <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setShowGeofenceForm(false)} className="minimal-button minimal-button-secondary">Cancel</button><button type="submit" disabled={geofenceSaving} className="minimal-button minimal-button-primary">{geofenceSaving ? 'Publishing…' : 'Publish geofence'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon, tone = 'text-sky-300' }: { label: string; value?: number | string; icon: React.ReactNode; tone?: string }) {
  return (
    <div className="minimal-card flex items-center gap-4 p-5">
      <span className={tone}>{icon}</span>
      <div><p className="text-sm text-ink-soft">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{value ?? '—'}</p></div>
    </div>
  );
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-900/30 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-sky-300">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-ink">{value}</p>
      {detail && <p className="mt-1 break-all text-xs leading-5 text-ink-soft">{detail}</p>}
    </div>
  );
}
