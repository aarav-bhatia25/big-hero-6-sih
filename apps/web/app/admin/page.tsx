'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Users,
  AlertTriangle,
  Radio,
  RefreshCw,
  Plus,
  Search,
  Eye,
  Send,
  PhoneCall,
  History,
  Shirt,
  FileText,
  Lock,
  Layers,
  MapPin,
  X,
  CheckCircle2,
  Clock,
  Ban,
  LogOut,
  User,
} from 'lucide-react';
import MapView from '@/components/maps/MapView';
import IncidentQueue from '@/components/authority/IncidentQueue';
import IncidentDetailModal from '@/components/authority/IncidentDetailModal';
import { getSocket } from '@/lib/socket';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [responders, setResponders] = useState<any[]>([]);
  const [stats, setStats] = useState<{
    activeTourists: number; liveIncidents: number;
    highRiskZones: number; respondersAvailable: number; respondersTotal: number;
  } | null>(null);
  const [touristPos, setTouristPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [investigationMode, setInvestigationMode] = useState<any | null>(null);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Socket.IO realtime state
  const [socketConnected, setSocketConnected] = useState(false);

  // Investigation mode live data
  const [investigationData, setInvestigationData] = useState<{
    tourist: any | null;
    locations: any[];
    loading: boolean;
  }>({ tourist: null, locations: [], loading: false });

  // E-FIR review state
  const [efirs, setEfirs] = useState<any[]>([]);
  const [efirLoading, setEfirLoading] = useState(false);

  // New Geofence Form State
  const [newGf, setNewGf] = useState({
    name: 'Temporary Disaster Risk Zone B',
    type: 'high_risk',
    severity: 'critical',
    description: 'Flash flood alert active around riverbed',
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [incRes, geoRes, statRes, respRes, locRes] = await Promise.all([
        fetch('/api/incidents'),
        fetch('/api/geofences'),
        fetch('/api/stats'),
        fetch('/api/responders'),
        fetch('/api/locations?touristId=TOUR-7890'),
      ]);

      const incData = await incRes.json();
      const geoData = await geoRes.json();
      const statData = await statRes.json();
      const respData = await respRes.json();
      const locData = await locRes.json();

      if (statData.stats) setStats(statData.stats);

      if (respData.responders) {
        setResponders(
          respData.responders
            .map((r: any) => ({
              id: r.id ?? r.responderId,
              unitId: r.unitId ?? r.responderId,
              name: r.name ?? `${r.department ?? 'Unit'} ${r.responderId ?? ''}`.trim(),
              lat: r.location?.lat,
              lng: r.location?.lng,
              type: r.type ?? r.department ?? 'POLICE',
            }))
            .filter((r: any) => typeof r.lat === 'number' && typeof r.lng === 'number')
        );
      }

      // Latest known position of the tracked tourist (drives the map marker).
      const latest = locData?.history?.[0];
      if (latest?.coordinates?.lat != null) {
        setTouristPos({ lat: latest.coordinates.lat, lng: latest.coordinates.lng });
      }

      if (incData.incidents) setIncidents(incData.incidents);
      if (geoData.geofences) {
        setGeofences(
          geoData.geofences.map((g: any) => ({
            id: g.id || g.name,
            name: g.name,
            coordinates: g.coordinates || g.geometry?.coordinates?.[0]?.map(([lng, lat]: [number, number]) => [lat, lng]) || [],
            severity: g.severity || 'high',
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Fetch authenticated user session
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) setCurrentUser(d.user);
      })
      .catch(() => {});
  }, []);

  // ── Socket.IO realtime subscription (#21) ────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    const onIncidentCreated = (incident: any) => {
      setIncidents((prev) => {
        // Dedup: don't add if already present
        if (prev.some((i) => i.incidentId === incident.incidentId)) return prev;
        return [incident, ...prev];
      });
    };

    const onIncidentUpdated = (incident: any) => {
      setIncidents((prev) =>
        prev.map((i) => (i.incidentId === incident.incidentId ? { ...i, ...incident } : i))
      );
    };

    const onTouristLocation = (loc: any) => {
      if (loc?.lat != null && loc?.lng != null) {
        setTouristPos({ lat: loc.lat, lng: loc.lng });
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('incident:created', onIncidentCreated);
    socket.on('incident:updated', onIncidentUpdated);
    socket.on('tourist:location', onTouristLocation);

    if (socket.connected) setSocketConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('incident:created', onIncidentCreated);
      socket.off('incident:updated', onIncidentUpdated);
      socket.off('tourist:location', onTouristLocation);
    };
  }, []);

  // ── Fetch E-FIRs for review panel (#25) ──────────────────────────
  const fetchEfirs = async () => {
    try {
      setEfirLoading(true);
      const res = await fetch('/api/efir');
      const data = await res.json();
      if (data.success && data.efirs) setEfirs(data.efirs);
    } catch (err) {
      console.error('Error fetching E-FIRs:', err);
    } finally {
      setEfirLoading(false);
    }
  };

  useEffect(() => { fetchEfirs(); }, []);

  // ── Investigation mode: fetch live data (#23) ────────────────────
  useEffect(() => {
    if (!investigationMode) {
      setInvestigationData({ tourist: null, locations: [], loading: false });
      return;
    }
    const tid = investigationMode.touristId;
    if (!tid) return;

    setInvestigationData((prev) => ({ ...prev, loading: true }));

    Promise.all([
      fetch(`/api/tourists/${tid}`).then((r) => r.json()).catch(() => null),
      fetch(`/api/locations?touristId=${tid}`).then((r) => r.json()).catch(() => null),
    ]).then(([touristRes, locRes]) => {
      setInvestigationData({
        tourist: touristRes?.tourist ?? touristRes ?? null,
        locations: locRes?.history ?? [],
        loading: false,
      });
    });
  }, [investigationMode?.touristId]);

  // ── E-FIR approve/reject handler (#25) ──────────────────────────
  const handleEfirAction = async (incidentId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch('/api/efir', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId,
          action,
          officerName: 'Authority Officer',
          officerBadge: 'AUTH-001',
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh the E-FIR list
        fetchEfirs();
        alert(`E-FIR ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully.`);
      } else {
        alert(`E-FIR action failed: ${data.error}`);
      }
    } catch (err) {
      console.error('E-FIR action failed:', err);
    }
  };

  const handleDispatchAction = async (incidentId: string) => {
    // Pick the nearest available responder we actually have on record.
    const inc = incidents.find((i) => i.incidentId === incidentId);
    const unit =
      responders.find((r) => r.unitId === inc?.assignedResponderUnitId) ?? responders[0] ?? null;

    try {
      const res = await fetch('/api/incidents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId,
          status: 'DISPATCHED',
          ...(unit ? { assignedResponderUnitId: unit.unitId, assignedResponderName: unit.name } : {}),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        alert(`Dispatch failed: ${data.error ?? 'unknown error'}`);
        return;
      }

      // Reflect the persisted row rather than guessing.
      setIncidents((prev) =>
        prev.map((i) => (i.incidentId === incidentId ? { ...i, ...data.incident } : i))
      );
      setSelectedIncident(null);
      alert(
        `Dispatch confirmed for ${incidentId}` +
          (unit ? ` — ${unit.unitId} (${unit.name}) notified.` : '. No responder unit on record.')
      );
    } catch (err) {
      console.error('Dispatch failed:', err);
      alert('Dispatch failed — could not reach the server.');
    }
  };

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/geofences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGf,
          coordinates: [
            [19.070, 72.870],
            [19.085, 72.870],
            [19.085, 72.890],
            [19.070, 72.890],
            [19.070, 72.870],
          ],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowGeofenceModal(false);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen bg-bg text-ink p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-accent text-accent-ink rounded-nb border-2 border-line shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-ink tracking-tight leading-none">
                Authority Command Center
              </h1>
              <span className="nb-chip nb-chip-accent">ADMIN VIEW</span>
            </div>
            <p className="text-xs text-ink-soft mt-1">
              District Incident Dispatch • Dynamic Geofences • Blockchain Audit Log
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser && (
            <div className="hidden lg:flex items-center gap-2 nb-chip normal-case tracking-normal">
              <User className="w-3.5 h-3.5 text-accent" />
              <span className="font-bold">{currentUser.name}</span>
              <span className="text-accent-strong font-black">· {currentUser.role}</span>
            </div>
          )}

          <button onClick={() => setShowGeofenceModal(true)} className="nb-btn nb-btn-danger text-xs">
            <Plus className="w-4 h-4" /> <span className="hidden md:inline">Add Geofence</span>
          </button>

          <button onClick={fetchDashboardData} className="nb-btn nb-btn-ghost !border-2 text-xs">
            <RefreshCw className={`w-4 h-4 text-success ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </button>

          <Link href="/citizen" className="nb-btn text-xs" style={{ background: '#15a34a', color: '#fff' }}>
            <span className="hidden sm:inline">Citizen View</span> →
          </Link>

          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
            title="Logout"
            className="nb-btn nb-btn-ghost !border-2 h-9 w-9 !px-0"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="nb-card p-4 rounded-nb border-2 border-line bg-surface/80 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-success rounded-nb border border-emerald-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-ink-soft uppercase font-semibold block">Active Tourists</span>
            <span className="text-2xl font-black font-mono text-ink">{stats ? stats.activeTourists : '—'}</span>
          </div>
        </div>

        <div className="nb-card p-4 rounded-nb border border-red-500/30 bg-surface/80 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-danger rounded-nb border border-red-500/20">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-ink-soft uppercase font-semibold block">Live Incidents</span>
            <span className="text-2xl font-black font-mono text-danger">{stats ? stats.liveIncidents : incidents.length}</span>
          </div>
        </div>

        <div className="nb-card p-4 rounded-nb border border-amber-500/30 bg-surface/80 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-warning rounded-nb border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-ink-soft uppercase font-semibold block">High Risk Zones</span>
            <span className="text-2xl font-black font-mono text-warning">{stats ? stats.highRiskZones : '—'}</span>
          </div>
        </div>

        <div className="nb-card p-4 rounded-nb border border-blue-500/30 bg-surface/80 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-accent rounded-nb border border-blue-500/20">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-ink-soft uppercase font-semibold block">Responders</span>
            <span className="text-2xl font-black font-mono text-accent">
              {stats ? `${stats.respondersAvailable}/${stats.respondersTotal} AVAILABLE` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Grid: Spatial Map & Incident Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Live Spatial Map */}
        <div className="lg:col-span-2 nb-card rounded-nb p-4 border-2 border-line bg-surface/80 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-ink text-sm flex items-center gap-2">
              <Radio className="w-4 h-4 text-success animate-pulse" /> Live Incident & Responder Spatial Clusters
            </h3>
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
              socketConnected
                ? 'text-success bg-emerald-500/10 border-emerald-500/20'
                : 'text-danger bg-red-500/10 border-red-500/20'
            }`}>
              {socketConnected ? 'Gateway Connected' : 'Gateway Disconnected'}
            </span>
          </div>

          <MapView
            touristPos={touristPos}
            geofences={geofences}
            incidents={incidents.filter((inc) => inc.location?.lat != null).map((inc) => ({
              id: inc.id || inc.incidentId,
              incidentId: inc.incidentId,
              type: inc.type,
              lat: inc.location?.lat,
              lng: inc.location?.lng,
              severity: inc.severity,
            }))}
            responders={responders}
          />
        </div>

        {/* Right Column: Active Incident Queue */}
        <div>
          <IncidentQueue
            incidents={incidents}
            selectedIncidentId={selectedIncident?.incidentId}
            onSelectIncident={(inc) => {
              setSelectedIncident(inc);
              setInvestigationMode(inc);
            }}
          />
        </div>
      </div>

      {/* Missing Tourist Investigation Mode Drawer — Live Data (#23) */}
      {investigationMode && (
        <div className="nb-card p-6 rounded-nb border border-blue-500/30 bg-surface/90 shadow-nb space-y-4">
          <div className="flex items-center justify-between border-b-2 border-line pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 text-accent rounded-nb border border-blue-500/30">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-ink text-base">
                  MISSING TOURIST INVESTIGATION MODE — Ticket {investigationMode.incidentId}
                </h3>
                <p className="text-xs text-ink-soft font-mono">Consented Emergency Access • Verified Identity Credentials</p>
              </div>
            </div>
            <button
              onClick={() => setInvestigationMode(null)}
              className="text-ink-soft hover:text-white p-1 bg-surface-2 rounded-nb cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {investigationData.loading ? (
            <div className="py-8 flex items-center justify-center text-ink-soft">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading investigation data...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Identity & DID — real data */}
              <div className="bg-surface-2 p-4 rounded-nb border-2 border-line space-y-2">
                <span className="font-bold text-accent block uppercase tracking-wider">Identity Profile</span>
                <div><span className="text-ink-soft">Tourist ID:</span> <strong className="text-ink font-mono">{investigationMode.touristId}</strong></div>
                <div><span className="text-ink-soft">Name:</span> <strong className="text-ink">{investigationData.tourist?.name || investigationMode.touristName || 'Unknown'}</strong></div>
                <div><span className="text-ink-soft">W3C Credential DID:</span> <span className="font-mono text-success block text-[11px]">{investigationData.tourist?.did || 'No DID issued'}</span></div>
                <div><span className="text-ink-soft">Identity Status:</span> <span className={`font-mono font-bold text-[11px] ${investigationData.tourist?.identityStatus === 'verified' ? 'text-success' : 'text-warning'}`}>{(investigationData.tourist?.identityStatus || 'unknown').toUpperCase()}</span></div>
                <div><span className="text-ink-soft">Nationality:</span> <span className="text-ink">{investigationData.tourist?.nationality || 'N/A'}</span></div>
              </div>

              {/* AI Visual Clothing Profile — real data */}
              <div className="bg-surface-2 p-4 rounded-nb border-2 border-line space-y-2">
                <span className="font-bold text-accent flex items-center gap-1 uppercase tracking-wider">
                  <Shirt className="w-4 h-4" /> AI Attire Description
                </span>
                {investigationData.tourist?.clothingProfile ? (
                  <p className="text-ink-soft font-mono text-[11px] leading-relaxed whitespace-pre-line">
                    {typeof investigationData.tourist.clothingProfile === 'object'
                      ? Object.entries(investigationData.tourist.clothingProfile)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join('\n')
                      : String(investigationData.tourist.clothingProfile)}
                  </p>
                ) : (
                  <p className="text-ink-soft italic text-[11px]">No attire record on file</p>
                )}
              </div>

              {/* Movement History — real data */}
              <div className="bg-surface-2 p-4 rounded-nb border-2 border-line space-y-2">
                <span className="font-bold text-success flex items-center gap-1 uppercase tracking-wider">
                  <MapPin className="w-4 h-4" /> Movement History
                </span>
                {investigationData.locations.length > 0 ? (
                  <div className="text-[11px] font-mono text-ink-soft space-y-1 max-h-32 overflow-y-auto">
                    {investigationData.locations.slice(0, 10).map((loc: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-ink">
                          {loc.coordinates?.lat?.toFixed(4) ?? loc.lat?.toFixed(4)}, {loc.coordinates?.lng?.toFixed(4) ?? loc.lng?.toFixed(4)}
                        </span>
                        <span className="text-ink-soft">
                          {loc.timestamp ? new Date(loc.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-ink-soft italic text-[11px]">No location history available</p>
                )}
                {investigationData.locations.length > 0 && (
                  <div className="text-[10px] text-ink-soft pt-1 border-t-2 border-line">
                    Showing {Math.min(10, investigationData.locations.length)} of {investigationData.locations.length} pings
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* E-FIR Officer Review Panel (#25) */}
      <div className="nb-card p-5 rounded-nb border-2 border-line bg-surface/80 space-y-4">
        <div className="flex items-center justify-between border-b-2 border-line pb-3">
          <h3 className="font-bold text-ink text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-warning" /> E-FIR Officer Verification Queue
          </h3>
          <button
            onClick={fetchEfirs}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-2 hover:bg-surface-2 rounded-nb text-xs text-ink-soft font-mono cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${efirLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {efirs.length === 0 ? (
          <div className="py-6 text-center text-ink-soft text-sm">
            No E-FIR drafts pending review.
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {efirs.map((efir: any) => {
              const isPending = efir.policeVerification === 'PENDING_OFFICER_APPROVAL';
              const isVerified = efir.policeVerification === 'OFFICER_VERIFIED';
              const isRejected = efir.policeVerification === 'REJECTED';
              const incidentId = efir._incidentId || efir.incidentId;

              return (
                <div
                  key={efir.efirId}
                  className={`p-4 rounded-nb border text-xs ${
                    isPending
                      ? 'bg-amber-950/30 border-amber-500/30'
                      : isVerified
                      ? 'bg-emerald-950/30 border-emerald-500/30'
                      : 'bg-red-950/30 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-ink">{efir.efirId}</span>
                      <span className="text-ink-soft">•</span>
                      <span className="text-ink-soft font-mono">{incidentId}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded font-bold font-mono text-[11px] ${
                      isPending ? 'bg-amber-500/20 text-warning' :
                      isVerified ? 'bg-emerald-500/20 text-success' :
                      'bg-red-500/20 text-danger'
                    }`}>
                      {isPending ? 'PENDING' : isVerified ? 'VERIFIED' : 'REJECTED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-ink-soft mb-3">
                    <div>Complainant: <strong className="text-ink">{efir.touristName}</strong></div>
                    <div>Incident: <strong className="text-ink">{efir.incidentType}</strong></div>
                    <div>Location: <span className="text-ink-soft font-mono">{efir.location?.lat?.toFixed(4)}, {efir.location?.lng?.toFixed(4)}</span></div>
                    <div>Filed: <span className="text-ink-soft">{efir.createdAt ? new Date(efir.createdAt).toLocaleString() : 'N/A'}</span></div>
                  </div>

                  {efir.verifiedBy && (
                    <div className="text-[11px] text-ink-soft mb-2 font-mono">
                      {isVerified ? 'Approved' : 'Rejected'} by: {efir.verifiedBy} at {efir.verifiedAt ? new Date(efir.verifiedAt).toLocaleString() : ''}
                      {efir.remarks && <span className="block text-ink-soft mt-0.5">Remarks: {efir.remarks}</span>}
                    </div>
                  )}

                  {isPending && (
                    <div className="flex items-center gap-2 pt-2 border-t-2 border-line">
                      <button
                        onClick={() => handleEfirAction(incidentId, 'APPROVE')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-nb transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> APPROVE
                      </button>
                      <button
                        onClick={() => handleEfirAction(incidentId, 'REJECT')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-nb transition cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" /> REJECT
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Popup on Incident Selection */}
      {selectedIncident && !investigationMode && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onDispatchAction={handleDispatchAction}
        />
      )}

      {/* Geofence Zone Creator Modal */}
      {showGeofenceModal && (
        <div className="fixed inset-0 z-50 bg-surface-2/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-nb border border-red-500/40 bg-surface p-6 shadow-nb relative text-ink space-y-4">
            <button
              onClick={() => setShowGeofenceModal(false)}
              className="absolute top-4 right-4 text-ink-soft hover:text-white p-1 bg-surface-2 rounded-nb cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b-2 border-line pb-3">
              <div className="p-2.5 bg-red-500/20 text-danger rounded-nb border border-red-500/30">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-ink">Publish Government Geofence</h3>
                <p className="text-xs text-ink-soft">Add active danger zone polygon to Supabase & On-Chain</p>
              </div>
            </div>

            <form onSubmit={handleCreateGeofence} className="space-y-3 text-xs">
              <div>
                <label className="block text-ink-soft mb-1">Geofence Zone Title</label>
                <input
                  type="text"
                  value={newGf.name}
                  onChange={(e) => setNewGf({ ...newGf, name: e.target.value })}
                  className="w-full bg-surface-2 border-2 border-line rounded-nb p-2.5 text-ink focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-ink-soft mb-1">Classification Type</label>
                <select
                  value={newGf.type}
                  onChange={(e) => setNewGf({ ...newGf, type: e.target.value })}
                  className="w-full bg-surface-2 border-2 border-line rounded-nb p-2.5 text-ink"
                >
                  <option value="high_risk">High Risk Zone</option>
                  <option value="restricted">Restricted Access Area</option>
                  <option value="hazard">Hazard / Disaster Zone</option>
                  <option value="safe_zone">Safe Zone</option>
                </select>
              </div>

              <div>
                <label className="block text-ink-soft mb-1">Severity Level</label>
                <select
                  value={newGf.severity}
                  onChange={(e) => setNewGf({ ...newGf, severity: e.target.value })}
                  className="w-full bg-surface-2 border-2 border-line rounded-nb p-2.5 text-ink"
                >
                  <option value="critical">CRITICAL</option>
                  <option value="high">HIGH</option>
                  <option value="medium">MEDIUM</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-nb transition cursor-pointer mt-2"
              >
                Publish Geofence to System
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
