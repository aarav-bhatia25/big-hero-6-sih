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
import MeshRouteBadge from '@/components/authority/MeshRouteBadge';
import AuthorityEmergencyChat from '@/components/authority/AuthorityEmergencyChat';
import AIIncidentBrief from '@/components/authority/AIIncidentBrief';
import MissingPersonDraftPanel from '@/components/authority/MissingPersonDraftPanel';
import { languageCodeFromPreference, travellerLanguageLabel } from '@/lib/languages';
import { subscribeToPrahariLive } from '@/lib/supabaseRealtime';
import dynamic from 'next/dynamic';

const GeofencePickerMap = dynamic(() => import('@/components/maps/GeofencePickerMap'), { ssr: false });

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

function lastReportedForDisplay(timestamp?: string) {
  if (!timestamp) return 'Not reported';
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return 'Not reported';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [responders, setResponders] = useState<any[]>([]);
  const [consentedTravellers, setConsentedTravellers] = useState<any[]>([]);
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
  const [geofenceUpdatingId, setGeofenceUpdatingId] = useState<string | null>(null);
  const [geofenceForm, setGeofenceForm] = useState({
    name: '',
    type: 'high_risk',
    severity: 'high',
    description: '',
    coordinates: '',
  });
  const realtimeProbeNonce = useRef<string | null>(null);
  const realtimeProbeTimer = useRef<number | null>(null);

  /**
   * A browser has one session cookie per origin, not per tab. If a traveller
   * signs in from another tab, an already-rendered authority desk must not
   * continue to look authenticated until the next protected action fails.
   */
  const requireAuthoritySession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      const role = data?.user?.role;
      if (!response.ok || !data?.authenticated || !['authority', 'admin', 'responder'].includes(role)) {
        setCurrentUser(null);
        window.location.assign('/login?redirect=/authority');
        return null;
      }
      setCurrentUser(data.user);
      return data.user;
    } catch {
      setCurrentUser(null);
      window.location.assign('/login?redirect=/authority');
      return null;
    }
  }, []);

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
      console.error('Unable to refresh incident-draft queue:', error);
    } finally {
      setEfirLoading(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const session = await requireAuthoritySession();
      if (!session) return;
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

      const incList = (incRes.ok && incData.success && Array.isArray(incData.incidents)) ? incData.incidents : [];
      setIncidents(incList);

      const geoList = (geoRes.ok && geoData.success && Array.isArray(geoData.geofences))
        ? geoData.geofences.map((g: any) => ({
            id: g.id ?? g.name,
            name: g.name,
            coordinates: g.coordinates ?? g.geometry?.coordinates?.[0] ?? [],
            severity: g.severity,
          }))
        : [];
      setGeofences(geoList);

      if (statRes.ok && statData.success) {
        setStats(statData.stats);
      } else {
        setStats(null);
      }

      const respList = (responderRes.ok && responderData.success && Array.isArray(responderData.responders))
        ? responderData.responders.map((r: any) => ({
            id: r.id ?? r.responderId,
            unitId: r.unitId ?? r.responderId,
            name: r.name ?? r.responderId ?? 'Unnamed responder',
            status: r.status,
            lat: r.location?.lat,
            lng: r.location?.lng,
            type: r.type ?? r.department,
          })).filter((r: any) => typeof r.lat === 'number' && typeof r.lng === 'number')
        : [];
      setResponders(respList);

      if (touristRes.ok && touristData.success) {
        const consentedTouristRows = (touristData.tourists ?? [])
          .filter((tourist: any) => tourist.trackingConsent !== false);
        setConsentedTravellers(consentedTouristRows);
        const reportedLocations = Object.fromEntries(
          consentedTouristRows
            .filter((t: any) => typeof t.currentLocation?.lat === 'number' && typeof t.currentLocation?.lng === 'number' && hasRecentLocation(t.currentLocation.timestamp))
            .map((t: any) => [t.touristId, {
              touristId: t.touristId,
              lat: t.currentLocation.lat,
              lng: t.currentLocation.lng,
              timestamp: t.currentLocation.timestamp,
            }])
        );
        setLiveLocations(reportedLocations);
      } else {
        setLiveLocations({});
        setConsentedTravellers([]);
      }
    } catch (error) {
      console.error('Unable to refresh authority dashboard:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [requireAuthoritySession]);

  useEffect(() => {
    void fetchDashboardData();
    void fetchEfirs();

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
    try {
      const response = await fetch('/api/incidents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: selectedIncident.incidentId,
          action: 'AUTO_DISPATCH',
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

  const handleResolveIncident = async () => {
    if (!selectedIncident) return;
    try {
      const response = await fetch('/api/incidents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: selectedIncident.incidentId,
          status: 'RESOLVED',
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Unable to resolve incident.');
      setSelectedIncident(null);
      void fetchDashboardData(true);
    } catch (error: any) {
      window.alert(error.message ?? 'Unable to resolve incident.');
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
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Unable to update incident draft.');
      await fetchEfirs();
    } catch (error: any) {
      window.alert(error.message ?? 'Unable to update incident draft.');
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

  const handleDeactivateGeofence = async (geofence: any) => {
    if (!geofence?.id || geofenceUpdatingId) return;
    if (!window.confirm(`Deactivate ${geofence.name}? It will stop generating safety evaluations but remain retained in the operational database.`)) return;
    try {
      setGeofenceUpdatingId(geofence.id);
      const response = await fetch('/api/geofences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: geofence.id, active: false }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Unable to deactivate geofence.');
      await fetchDashboardData(true);
    } catch (error: any) {
      window.alert(error.message ?? 'Unable to deactivate geofence.');
    } finally {
      setGeofenceUpdatingId(null);
    }
  };

  const liveIncidents = incidents.filter((incident) => !['resolved', 'cancelled', 'rejected'].includes(String(incident.status ?? '').toLowerCase()));
  const activeIncidentTouristIds = new Set(liveIncidents.map((incident) => incident.touristId));
  const mapIncidents = incidents
    .filter((incident) => {
      const recordedAt = new Date(incident.createdAt ?? 0).getTime();
      return Number.isFinite(recordedAt) && recordedAt >= Date.now() - 30 * 24 * 60 * 60 * 1000;
    })
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
            <h1 className="ui-display mt-2 text-3xl text-ink sm:text-4xl">Live safety operations</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-ink-soft">Only current records from the operational database are shown. Fixture and test records are excluded.</p>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${realtimeDelivery === 'verified' ? 'border-emerald-600/25 bg-emerald-50 text-emerald-700' : 'border-line bg-surface text-ink-soft'}`}>
            <Radio size={14} />{realtimeDelivery === 'verified' ? 'Instant updates verified' : socketConnected && realtimeDelivery === 'checking' ? 'Checking live delivery…' : 'Syncing every 15 seconds'}
          </span>
        </section>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Registered travellers" value={stats?.activeTourists} icon={<Users size={20} />} />
          <Metric label="Open incidents" value={stats?.liveIncidents} icon={<CircleAlert size={20} />} tone="text-rose-600" />
          <Metric label="High-risk geofences" value={stats?.highRiskZones} icon={<AlertTriangle size={20} />} tone="text-amber-600" />
          <Metric label="Available responders" value={stats ? `${stats.respondersAvailable}/${stats.respondersTotal}` : undefined} icon={<Radio size={20} />} />
        </section>

        <section className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.85fr)]">
          <div className="minimal-card p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">Operations map</h2>
                <p className="mt-1 text-sm text-ink-soft">Consented locations, recent incident records, responder positions, and published geofences.</p>
              </div>
              <span className="text-sm text-ink-soft">{Object.keys(liveLocations).length} reporting traveller{Object.keys(liveLocations).length === 1 ? '' : 's'}</span>
            </div>
            <MapView liveTourists={Object.values(liveLocations)} geofences={geofences} incidents={mapIncidents} responders={responders} />
          </div>
          <IncidentQueue incidents={liveIncidents} selectedIncidentId={selectedIncident?.incidentId} onSelectIncident={setSelectedIncident} />
        </section>

        <section className="minimal-card mt-7 overflow-hidden" aria-labelledby="traveller-watch-heading">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-5 sm:px-6">
            <div>
              <p className="minimal-eyebrow">Consent-based traveller watch</p>
              <h2 id="traveller-watch-heading" className="mt-1 text-lg font-semibold text-ink">Current travellers</h2>
              <p className="mt-1 text-sm text-ink-soft">Only travellers who opted into location sharing are listed. Full emergency-identification detail stays limited to their active emergency or missing-person case.</p>
            </div>
            <span className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink-soft">{consentedTravellers.length} consented</span>
          </div>

          {consentedTravellers.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-soft sm:px-6">No consented traveller records are available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-line bg-surface-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 sm:px-6">Traveller</th>
                    <th scope="col" className="px-5 py-3.5">Last shared location</th>
                    <th scope="col" className="px-5 py-3.5">Last update</th>
                    <th scope="col" className="px-5 py-3.5">Emergency identification</th>
                    <th scope="col" className="px-5 py-3.5">Case status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {consentedTravellers.map((traveller) => {
                    const location = traveller.currentLocation;
                    const hasLocation = typeof location?.lat === 'number' && typeof location?.lng === 'number';
                    const isLive = hasRecentLocation(location?.timestamp);
                    const hasActiveCase = activeIncidentTouristIds.has(traveller.touristId);
                    const clothingSummary = traveller.clothingProfile?.summary;
                    return (
                      <tr key={traveller.touristId} className="align-top transition-colors hover:bg-surface-2/70">
                        <td className="px-5 py-4 sm:px-6">
                          <p className="font-medium text-ink">{traveller.name || 'Name not recorded'}</p>
                          <p className="mt-1 font-mono text-xs text-ink-soft">{traveller.touristId}</p>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-ink">{hasLocation ? coordinatesForDisplay(location) : 'Not currently shared'}</td>
                        <td className="px-5 py-4 text-xs text-ink-soft">
                          <p>{lastReportedForDisplay(location?.timestamp)}</p>
                          <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 font-medium ${isLive ? 'border-emerald-600/25 bg-emerald-50 text-emerald-700' : 'border-line bg-surface text-ink-soft'}`}>{isLive ? 'Live' : 'Not live'}</span>
                        </td>
                        <td className="max-w-sm px-5 py-4 text-xs leading-5 text-ink-soft">
                          {clothingSummary
                            ? hasActiveCase
                              ? clothingSummary
                              : 'Profile on file — open an active case to view it.'
                            : 'Not provided'}
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-ink">
                          {hasActiveCase ? <span className="text-rose-700">Active case</span> : <span className="text-ink-soft">No active case</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="minimal-card mt-7 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">Published geofences</h2>
              <p className="mt-1 text-sm text-ink-soft">Only authority-published active boundaries are evaluated. Deactivation preserves the operational record.</p>
            </div>
            <span className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-ink-soft">{geofences.length} active</span>
          </div>
          {geofences.length === 0 ? (
            <p className="py-6 text-sm text-ink-soft">No active geofences are currently published.</p>
          ) : (
            <div className="divide-y divide-line">
              {geofences.map((geofence) => (
                <div key={geofence.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <div>
                    <p className="font-medium text-ink">{geofence.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-ink-soft">{geofence.severity ?? 'high'} severity · {geofence.coordinates?.length ?? 0} boundary points</p>
                  </div>
                  <button type="button" onClick={() => void handleDeactivateGeofence(geofence)} disabled={geofenceUpdatingId === geofence.id} className="minimal-button minimal-button-secondary px-3 py-2 text-xs disabled:opacity-60">
                    {geofenceUpdatingId === geofence.id ? 'Deactivating…' : 'Deactivate'}
                  </button>
                </div>
              ))}
            </div>
          )}
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
              <div className="mt-5 space-y-4">
                <MeshRouteBadge
                  transportType={selectedIncident.transportType}
                  hopCount={selectedIncident.hopCount}
                  originDeviceId={selectedIncident.originDeviceId}
                  originalTimestamp={selectedIncident.originalTimestamp || selectedIncident.createdAt}
                  receivedTimestamp={selectedIncident.createdAt}
                  relayPath={selectedIncident.relayPath}
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoCard label="Traveller" value={investigationData.tourist?.name ?? selectedIncident.touristName ?? selectedIncident.touristId ?? 'Not recorded'} detail={investigationData.tourist?.did ?? 'No credential DID on record'} />
                  <InfoCard label="Identity status" value={investigationData.tourist?.identityStatus ? String(investigationData.tourist.identityStatus).replaceAll('_', ' ') : 'Not recorded'} detail={investigationData.tourist?.nationality ?? 'Nationality not recorded'} />
                  <InfoCard label="Location history" value={investigationData.locations.length ? `${investigationData.locations.length} recorded ping${investigationData.locations.length === 1 ? '' : 's'}` : 'No recorded location history'} detail={investigationData.locations[0] ? coordinatesForDisplay(investigationData.locations[0].coordinates ?? investigationData.locations[0]) : undefined} />
                  <InfoCard label="Responder" value={selectedIncident.assignedResponderUnitId ?? 'Unassigned'} detail={selectedIncident.etaMinutes != null ? `ETA ${selectedIncident.etaMinutes} min` : 'No ETA reported'} />
                </div>

                {investigationData.tourist?.clothingProfile && (
                  <section className="rounded-nb border border-sky-400/30 bg-sky-400/10 p-4" aria-label="Emergency identification profile">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="minimal-eyebrow text-sky-300">Emergency identification profile</p>
                        <p className="mt-1 text-sm font-semibold text-ink">{investigationData.tourist.clothingProfile.summary || 'No summary recorded'}</p>
                      </div>
                      <span className="rounded-full border border-sky-400/30 px-2.5 py-1 text-xs font-semibold text-sky-200">
                        {investigationData.tourist.clothingProfile.photoAnalysed ? 'Photo-assisted' : 'Traveller-described'} · {investigationData.tourist.clothingProfile.confidence || 'low'} confidence
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Clothing</p>
                        <ul className="mt-1.5 space-y-1 text-ink">
                          {(investigationData.tourist.clothingProfile.clothing ?? []).length
                            ? investigationData.tourist.clothingProfile.clothing.map((item: any, index: number) => <li key={`${item.item}-${index}`}>{item.item}: {item.color}{item.details && item.details !== 'Not observed' ? ` — ${item.details}` : ''}</li>)
                            : <li>Not recorded</li>}
                        </ul>
                      </div>
                      <InfoCard label="Footwear" value={investigationData.tourist.clothingProfile.footwear || 'Not recorded'} />
                      <InfoCard label="Accessories" value={(investigationData.tourist.clothingProfile.accessories ?? []).join(', ') || 'None recorded'} />
                      <InfoCard label="Carried items" value={(investigationData.tourist.clothingProfile.carriedItems ?? []).join(', ') || 'None recorded'} />
                    </div>

                    {(investigationData.tourist.clothingProfile.visibleText?.length > 0 || investigationData.tourist.clothingProfile.distinguishingDetails?.length > 0) && (
                      <p className="mt-4 border-t border-sky-400/20 pt-3 text-xs leading-5 text-ink-soft">
                        {[...(investigationData.tourist.clothingProfile.visibleText ?? []), ...(investigationData.tourist.clothingProfile.distinguishingDetails ?? [])].join(' · ')}
                      </p>
                    )}
                  </section>
                )}
                {selectedIncident.voiceStatement && (
                  <section className="rounded-nb border border-emerald-400/30 bg-emerald-400/10 p-4" aria-label="Traveller reviewed voice SOS statement">
                    <p className="minimal-eyebrow text-emerald-300">Traveller-reviewed voice SOS statement</p>
                    <p className="mt-1 text-xs text-ink-soft">Original language: {travellerLanguageLabel(selectedIncident.voiceStatementLanguage)}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">{selectedIncident.voiceStatement}</p>
                    <p className="mt-3 text-xs leading-5 text-ink-soft">This is the traveller&apos;s reviewed transcript, not an audio recording. Use the incident chat translation action or AI brief as an aid; retain the original wording in operational decisions.</p>
                  </section>
                )}
                <MissingPersonDraftPanel
                  incident={selectedIncident}
                  onSaved={(incident) => {
                    setSelectedIncident(incident);
                    void fetchDashboardData(true);
                  }}
                />
                <AIIncidentBrief incidentId={selectedIncident.incidentId} />
              </div>
            )}

            <AuthorityEmergencyChat
              incidentId={selectedIncident.incidentId}
              touristName={selectedIncident.touristName ?? selectedIncident.touristId}
              touristLanguage={languageCodeFromPreference(investigationData.tourist?.preferences?.language)}
            />

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <p className="text-sm text-ink-soft">Emergency contacts and additional identity data are shown only through the authorised investigation record.</p>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={handleDispatch} className="minimal-button minimal-button-primary" disabled={!responders.some(isAvailable)}>Dispatch responder</button>
                <button onClick={handleResolveIncident} className="minimal-button border border-emerald-500/50 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30">Resolve incident</button>
              </div>
            </div>
          </section>
        )}

        <section className="minimal-card mt-7 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><FileText size={19} className="text-sky-400" />Police-ready draft review</h2>
              <p className="mt-1 text-sm text-ink-soft">Prahari drafts from real incident records only — not police or CCTNS filing records.</p>
            </div>
            <button onClick={() => void fetchEfirs()} className="minimal-button minimal-button-secondary" disabled={efirLoading}><RefreshCw size={16} className={efirLoading ? 'animate-spin' : ''} />Refresh</button>
          </div>

          {efirs.length === 0 ? (
            <div className="py-12 text-center"><p className="font-medium text-ink">No police-ready drafts to review</p><p className="mt-2 text-sm text-ink-soft">New authenticated drafts will appear here for authorised review.</p></div>
          ) : (
            <div className="divide-y divide-slate-700/70">
              {efirs.map((efir) => {
                const incidentId = efir._incidentId ?? efir.incidentId;
                const pending = ['PENDING_AUTHORISED_REVIEW', 'PENDING_OFFICER_APPROVAL'].includes(efir.policeVerification);
                const reviewed = ['AUTHORISED_REVIEWED', 'OFFICER_VERIFIED'].includes(efir.policeVerification);
                return (
                  <article key={efir.efirId} className="py-5 first:pt-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-mono text-sm font-semibold text-ink">{efir.efirId}</h3>
                        <p className="mt-1 text-sm text-ink-soft">{incidentId} · {efir.incidentType ?? 'Incident type not recorded'}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${pending ? 'border-amber-400/40 text-amber-200' : reviewed ? 'border-emerald-400/40 text-emerald-200' : 'border-rose-400/40 text-rose-200'}`}>{pending ? 'Awaiting authorised review' : reviewed ? 'Reviewed — not filed' : 'Returned for correction'}</span>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
                      <p>Complainant: <span className="text-ink">{efir.touristName ?? 'Not recorded'}</span></p>
                      <p>Saved: <span className="text-ink">{efir.createdAt ? new Date(efir.createdAt).toLocaleString() : 'Not recorded'}</span></p>
                      <p>Location: <span className="font-mono text-ink">{coordinatesForDisplay(efir.location)}</span></p>
                      <p>Police filing: <span className="text-ink">{efir.policeFilingStatus ?? 'NOT_FILED_WITH_POLICE'}</span></p>
                      {efir.blockchainEvidence && <p>Evidence: <span className="text-ink">{efir.blockchainEvidence.status}</span></p>}
                    </div>
                    {pending && <div className="mt-4 flex gap-2"><button onClick={() => void handleEfirAction(incidentId, 'APPROVE')} className="minimal-button minimal-button-primary">Mark reviewed</button><button onClick={() => void handleEfirAction(incidentId, 'REJECT')} className="minimal-button minimal-button-secondary">Return for correction</button></div>}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {showGeofenceForm && (
        <div className="fixed inset-0 z-[3000] overflow-y-auto bg-stone-950/30 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="geofence-dialog-title">
          <div className="flex min-h-full items-center justify-center py-6">
            <form onSubmit={handleCreateGeofence} className="relative z-[3100] w-full max-w-xl rounded-2xl border border-line bg-surface p-5 shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-4 border-b border-line pb-5">
                <div>
                  <p className="minimal-eyebrow">Live operations</p>
                  <h2 id="geofence-dialog-title" className="mt-1 text-xl font-semibold text-ink">Add geofence</h2>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">Publish a boundary from coordinates you supply. Nothing is prefilled or simulated.</p>
                </div>
                <button type="button" onClick={() => setShowGeofenceForm(false)} className="minimal-button minimal-button-secondary px-3" aria-label="Close add geofence"><X size={17} /></button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2"><span className="text-sm font-medium text-ink">Zone name</span><input required value={geofenceForm.name} onChange={(event) => setGeofenceForm((current) => ({ ...current, name: event.target.value }))} className="nb-input mt-2 text-sm" placeholder="e.g. Restricted area name" /></label>
                <label className="block"><span className="text-sm font-medium text-ink">Type</span><select value={geofenceForm.type} onChange={(event) => setGeofenceForm((current) => ({ ...current, type: event.target.value }))} className="nb-input mt-2 text-sm"><option value="high_risk">High-risk area</option><option value="restricted">Restricted area</option><option value="pickpocket_hotspot">Pickpocket hotspot</option><option value="disaster_prone">Disaster-prone area</option><option value="tourist_only">Tourist-only zone</option><option value="safe_zone">Safe zone</option></select></label>
                <label className="block"><span className="text-sm font-medium text-ink">Severity</span><select value={geofenceForm.severity} onChange={(event) => setGeofenceForm((current) => ({ ...current, severity: event.target.value }))} className="nb-input mt-2 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                {/* Interactive Map Picker */}
                <div className="block sm:col-span-2 space-y-1">
                  <span className="text-sm font-medium text-ink">Choose boundary points on map</span>
                  <GeofencePickerMap
                    points={geofenceForm.coordinates
                      .split('\n')
                      .map((line) => {
                        const parts = line.split(',').map((s) => parseFloat(s.trim()));
                        return parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])
                          ? [parts[0], parts[1]] as [number, number]
                          : null;
                      })
                      .filter((pt): pt is [number, number] => pt !== null)}
                    onAddPoint={(pt) => {
                      const newLine = `${pt[0]}, ${pt[1]}`;
                      setGeofenceForm((prev) => ({
                        ...prev,
                        coordinates: prev.coordinates ? `${prev.coordinates.trim()}\n${newLine}` : newLine,
                      }));
                    }}
                    onRemoveLastPoint={() => {
                      const lines = geofenceForm.coordinates.trim().split('\n').filter(Boolean);
                      lines.pop();
                      setGeofenceForm((prev) => ({ ...prev, coordinates: lines.join('\n') }));
                    }}
                    onClearPoints={() => {
                      setGeofenceForm((prev) => ({ ...prev, coordinates: '' }));
                    }}
                  />
                </div>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-medium text-ink">Boundary coordinates <span className="font-normal text-ink-soft">(auto-updates when clicking map above)</span></span>
                  <textarea required rows={3} value={geofenceForm.coordinates} onChange={(event) => setGeofenceForm((current) => ({ ...current, coordinates: event.target.value }))} className="nb-input mt-2 font-mono text-xs" placeholder={'latitude, longitude\nlatitude, longitude\nlatitude, longitude'} />
                  <span className="mt-1 block text-xs leading-5 text-ink-soft">Click points on the map above or edit coordinates directly. Enter at least three corner pairs.</span>
                </label>
                <label className="block sm:col-span-2"><span className="text-sm font-medium text-ink">Operational note <span className="font-normal text-ink-soft">(optional)</span></span><input value={geofenceForm.description} onChange={(event) => setGeofenceForm((current) => ({ ...current, description: event.target.value }))} className="nb-input mt-2 text-sm" placeholder="Reason or source for this boundary" /></label>
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

function Metric({ label, value, icon, tone = 'text-ink' }: { label: string; value?: number | string; icon: React.ReactNode; tone?: string }) {
  return (
    <div className="minimal-card flex items-center gap-4 p-5">
      <span className={tone}>{icon}</span>
      <div><p className="text-sm text-ink-soft">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{value ?? '—'}</p></div>
    </div>
  );
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-ink">{value}</p>
      {detail && <p className="mt-1 break-all text-xs leading-5 text-ink-soft">{detail}</p>}
    </div>
  );
}
