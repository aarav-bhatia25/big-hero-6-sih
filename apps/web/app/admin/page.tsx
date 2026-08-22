'use client';

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import MapView from '@/components/maps/MapView';
import IncidentQueue from '@/components/authority/IncidentQueue';
import IncidentDetailModal from '@/components/authority/IncidentDetailModal';

export default function AdminPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [investigationMode, setInvestigationMode] = useState<any | null>(null);
  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [loading, setLoading] = useState(true);

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
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2 tracking-tight">
              AUTHORITY COMMAND CENTER <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono">ADMIN VIEW</span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              District Incident Dispatch • Dynamic Geofences • Sepolia Blockchain Audit Log
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGeofenceModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Geofence Zone
          </button>

          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>

          <Link
            href="/citizen"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Citizen View →
          </Link>
        </div>
      </header>

      {/* Summary Metrics Bar */}
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

      {/* Main Split Grid: Spatial Map & Incident Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Live Spatial Map */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-4 border border-slate-800 bg-slate-900/80 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" /> Live Incident & Responder Spatial Clusters
            </h3>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              ● Socket.IO Gateway Live
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
            onSelectIncident={(inc) => {
              setSelectedIncident(inc);
              setInvestigationMode(inc);
            }}
          />
        </div>
      </div>

      {/* Missing Tourist Investigation Mode Drawer */}
      {investigationMode && (
        <div className="glass-panel p-6 rounded-2xl border border-blue-500/30 bg-slate-900/90 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-base">
                  MISSING TOURIST INVESTIGATION MODE — Ticket {investigationMode.incidentId}
                </h3>
                <p className="text-xs text-slate-400 font-mono">Consented Emergency Access • Verified Identity Credentials</p>
              </div>
            </div>
            <button
              onClick={() => setInvestigationMode(null)}
              className="text-slate-400 hover:text-white p-1 bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Identity & DID */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-blue-400 block uppercase tracking-wider">🪪 Identity Profile</span>
              <div><span className="text-slate-500">Tourist ID:</span> <strong className="text-slate-200 font-mono">{investigationMode.touristId}</strong></div>
              <div><span className="text-slate-500">Complainant:</span> <strong className="text-slate-200">{investigationMode.touristName || 'Demo Tourist'}</strong></div>
              <div><span className="text-slate-500">W3C Credential DID:</span> <span className="font-mono text-emerald-400 block text-[11px]">did:tourist:{investigationMode.touristId}</span></div>
            </div>

            {/* AI Visual Clothing Profile */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-purple-400 flex items-center gap-1 uppercase tracking-wider">
                <Shirt className="w-4 h-4" /> AI Attire Description
              </span>
              <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                Top: Black Water-resistant Jacket<br />
                Bottom: Dark Blue Denim Jeans<br />
                Items: Red Backpack, Silver Watch
              </p>
            </div>

            {/* Sepolia Audit Log & E-FIR */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-wider">
                <Lock className="w-4 h-4" /> Sepolia Blockchain Evidence
              </span>
              <div className="text-[11px] font-mono text-slate-400 space-y-1">
                <div>Hash: <span className="text-slate-200">0x8f3a2b...4e91</span></div>
                <div>Status: <span className="text-emerald-400 font-bold">VERIFIED ON-CHAIN ⛓️</span></div>
                <div>E-FIR: <span className="text-blue-400 font-bold">DRAFT_PENDING_APPROVAL</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-slate-900 p-6 shadow-2xl relative text-slate-100 space-y-4">
            <button
              onClick={() => setShowGeofenceModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-100">Publish Government Geofence</h3>
                <p className="text-xs text-slate-400">Add active danger zone polygon to MongoDB & On-Chain</p>
              </div>
            </div>

            <form onSubmit={handleCreateGeofence} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Geofence Zone Title</label>
                <input
                  type="text"
                  value={newGf.name}
                  onChange={(e) => setNewGf({ ...newGf, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Classification Type</label>
                <select
                  value={newGf.type}
                  onChange={(e) => setNewGf({ ...newGf, type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                >
                  <option value="high_risk">High Risk Zone</option>
                  <option value="restricted">Restricted Access Area</option>
                  <option value="hazard">Hazard / Disaster Zone</option>
                  <option value="safe_zone">Safe Zone</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Severity Level</label>
                <select
                  value={newGf.severity}
                  onChange={(e) => setNewGf({ ...newGf, severity: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                >
                  <option value="critical">CRITICAL</option>
                  <option value="high">HIGH</option>
                  <option value="medium">MEDIUM</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition cursor-pointer mt-2"
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
