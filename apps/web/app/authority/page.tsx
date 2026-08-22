'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, Users, AlertTriangle, Radio, ArrowLeft, RefreshCw } from 'lucide-react';
import MapView from '@/components/maps/MapView';
import IncidentQueue from '@/components/authority/IncidentQueue';
import IncidentDetailModal from '@/components/authority/IncidentDetailModal';

export default function AuthorityPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [incRes, geoRes] = await Promise.all([
        fetch('/api/incidents'),
        fetch('/api/geofences'),
      ]);

      const incData = await incRes.json();
      const geoData = await geoRes.json();

      if (incData.incidents) setIncidents(incData.incidents);
      if (geoData.geofences) {
        setGeofences(
          geoData.geofences.map((g: any) => ({
            id: g._id || g.name,
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
  }, []);

  const handleDispatchAction = (incidentId: string) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.incidentId === incidentId
          ? { ...inc, status: 'DISPATCHED', assignedResponderUnitId: 'Unit #17 (En Route)' }
          : inc
      )
    );
    setSelectedIncident(null);
    alert(`🚨 EMERGENCY DISPATCH DISPATCHED for Incident ${incidentId}! Patrol Unit #17 notified.`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2 tracking-tight">
              <ShieldAlert className="w-7 h-7 text-red-500" /> TOURIST SAFETY COMMAND CENTER
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Real-time Spatial Monitoring • Emergency Incident Dispatch • Authority Dashboard
            </p>
          </div>
        </div>

        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-emerald-400 ${loading ? 'animate-spin' : ''}`} /> Refresh Feed
        </button>
      </header>

      {/* Summary Stats Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-900/80 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold block">Active Tourists</span>
            <span className="text-2xl font-black font-mono text-slate-100">124</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-red-500/30 bg-slate-900/80 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold block">Live Incidents</span>
            <span className="text-2xl font-black font-mono text-red-400">{incidents.length}</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-slate-900/80 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold block">High Risk Count</span>
            <span className="text-2xl font-black font-mono text-amber-400">12</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-blue-500/30 bg-slate-900/80 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold block">Responders</span>
            <span className="text-2xl font-black font-mono text-blue-400">4 AVAILABLE</span>
          </div>
        </div>
      </div>

      {/* Main Split Grid: Live Map & Incident Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Live Spatial Map */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-4 border border-slate-800 bg-slate-900/80 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> Live Incident & Responder Clusters
            </h3>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              ● Socket.IO Stream Online
            </span>
          </div>

          <MapView
            touristPos={{ lat: 19.076, lng: 72.8777 }}
            geofences={geofences}
            incidents={incidents.map((inc) => ({
              id: inc._id || inc.incidentId,
              incidentId: inc.incidentId,
              type: inc.type,
              lat: inc.location?.lat || 19.076,
              lng: inc.location?.lng || 72.8777,
              severity: inc.severity,
            }))}
            responders={[
              { id: '1', unitId: 'Unit #17', name: 'Police Patrol Unit 17', lat: 19.079, lng: 72.882, type: 'POLICE' },
              { id: '2', unitId: 'Unit #09', name: 'SAR Medical Team 9', lat: 19.083, lng: 72.880, type: 'MEDICAL' },
              { id: '3', unitId: 'Unit #04', name: 'Rapid Response Unit 4', lat: 19.071, lng: 72.873, type: 'RESCUE' },
            ]}
          />
        </div>

        {/* Right Column: Active Incident Queue */}
        <div>
          <IncidentQueue
            incidents={incidents}
            selectedIncidentId={selectedIncident?.incidentId}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
          />
        </div>
      </div>

      {/* Modal Popup on Incident Click */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onDispatchAction={handleDispatchAction}
        />
      )}
    </main>
  );
}
