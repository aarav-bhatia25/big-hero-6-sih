'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  MapPin,
  IdCard,
  AlertTriangle,
  Siren,
  PhoneCall,
  CheckCircle2,
  X,
  RefreshCw,
  Mic,
  FileText,
  Shirt,
  Download,
  Globe,
  Radio,
  Sparkles,
  ArrowRight,
  Send,
} from 'lucide-react';
import DigitalIdCard from '@/components/tourist/DigitalIdCard';
import SosButton from '@/components/tourist/SosButton';
import MapView from '@/components/maps/MapView';
import { calculateDeterministicRisk } from '@/lib/risk';
import { checkPointInGeofence } from '@/lib/geospatial';

export default function CitizenPage() {
  const [greeting, setGreeting] = useState('Good morning, Tourist');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 19.076, lng: 72.8777 });
  const [locationConsent, setLocationConsent] = useState(true);
  const [activeModal, setActiveModal] = useState<'none' | 'id_pass' | 'efir' | 'attire' | 'voice' | 'offline_map'>('none');
  
  // Incident & SOS state
  const [activeIncident, setActiveIncident] = useState<any | null>(null);

  // Clothing Profile Form State
  const [attireForm, setAttireForm] = useState({
    top: 'Black Water-resistant Jacket',
    bottom: 'Dark Blue Denim Jeans',
    footwear: 'Grey Trekking Boots',
    accessories: 'Red Backpack, Silver Watch',
  });
  const [attireSaved, setAttireSaved] = useState(false);

  // E-FIR State
  const [efirData, setEfirData] = useState<any | null>(null);
  const [efirLoading, setEfirLoading] = useState(false);

  // Multilingual Voice State
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [selectedLang, setSelectedLang] = useState('Hindi (हिंदी)');

  // Geofence & Risk State
  const [geofences, setGeofences] = useState<any[]>([]);
  const [geofenceBreached, setGeofenceBreached] = useState<any | null>(null);

  // Fetch geofences and set up location tracking
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    fetch('/api/geofences')
      .then((res) => res.json())
      .then((data) => {
        if (data.geofences) setGeofences(data.geofences);
      })
      .catch(console.error);

    if (navigator.geolocation && locationConsent) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });

          // Send continuous telemetry to MongoDB
          fetch('/api/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ touristId: 'DTI-IND-000123', lat, lng, source: 'gps' }),
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [locationConsent]);

  // Check geofence status
  const formattedGeofences = geofences.map((g) => ({
    id: g._id || g.name,
    name: g.name,
    type: 'HIGH_RISK' as const,
    severity: (g.severity?.toUpperCase() || 'HIGH') as any,
    coordinates: g.coordinates || g.geometry?.coordinates?.[0]?.map(([lng, lat]: [number, number]) => [lat, lng]) || [
      [19.070, 72.870],
      [19.080, 72.870],
      [19.080, 72.885],
      [19.070, 72.885],
      [19.070, 72.870],
    ],
  }));

  const gfCheck = checkPointInGeofence(coords.lat, coords.lng, formattedGeofences);
  const riskEval = calculateDeterministicRisk({
    inGeofence: gfCheck.isBreached,
    geofenceSeverity: gfCheck.breachedZone?.severity,
    crimeDensityIndex: 15,
  });

  // Handle Save Clothing Profile
  const handleSaveAttire = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/attire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ touristId: 'DTI-IND-000123', ...attireForm }),
      });
      setAttireSaved(true);
      setTimeout(() => {
        setAttireSaved(false);
        setActiveModal('none');
      }, 1500);
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Generate E-FIR Draft
  const handleGenerateEfir = async () => {
    try {
      setEfirLoading(true);
      const res = await fetch('/api/efir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: activeIncident?.incidentId,
          touristId: 'DTI-IND-000123',
          touristName: 'Demo Tourist',
          passportAadhaar: 'IND-P892100',
          incidentType: activeIncident ? activeIncident.type : 'Emergency SOS Panic Alert',
          location: coords,
          clothingProfile: `${attireForm.top}, ${attireForm.bottom}, ${attireForm.accessories}`,
          emergencyContact: 'Ananya Sharma (+91 98765 43210)',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEfirData(data.efir);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEfirLoading(false);
    }
  };

  // Simulate Sarvam Voice Recognition
  const handleStartVoice = () => {
    setListening(true);
    setVoiceText('Recognizing speech via Sarvam AI...');
    setTimeout(() => {
      setVoiceText('\"मुझे आपातकालीन सहायता की आवश्यकता है!\" (Emergency Help Needed)');
      setListening(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-rose-500 selection:text-white pb-12">
      {/* Top Sticky Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-100 text-lg tracking-tight flex items-center gap-2">
              PRAHARI <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">CITIZEN SAFETY HUB</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">Verifiable DID • AI Risk Monitoring • 1-Click Dispatch</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" /> Admin View →
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Welcome Banner & Risk Gauge Split */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/80 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> India AI Summit Digital Identity Architecture
              </div>
              <h2 className="text-2xl font-black text-slate-100">{greeting}, Demo Tourist</h2>
              <p className="text-xs text-slate-400">
                Your Digital Tourist Pass (`did:tourist:DTI-IND-000123`) is active. Continuous spatial geofencing and dynamic safety monitoring are enabled.
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-mono text-emerald-400">
                <MapPin className="w-4 h-4 text-emerald-400" /> GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
              <button
                onClick={() => setLocationConsent(!locationConsent)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  locationConsent ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Tracking: {locationConsent ? 'ENABLED 🟢' : 'DISABLED 🔴'}
              </button>
            </div>
          </div>

          {/* Dynamic Safety Score Gauge Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/80 flex flex-col justify-between text-center">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Dynamic Risk Score</span>
            <div className="my-2">
              <span className="text-4xl font-black font-mono" style={{ color: riskEval.color }}>
                {riskEval.totalScore}/100
              </span>
              <div className="text-xs font-bold mt-1" style={{ color: riskEval.color }}>
                {riskEval.badgeText}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              {gfCheck.isBreached ? '⚠️ High-Risk Geofence Penalty Active' : 'Safe Corridor • Normal Risk Profile'}
            </p>
          </div>
        </div>

        {/* SOS Panic Trigger Component */}
        <SosButton
          touristPos={coords}
          onSosTriggered={(inc) => {
            setActiveIncident(inc);
          }}
        />

        {/* Digital Tourist ID Pass Component */}
        <DigitalIdCard />

        {/* Feature Action Grid Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* E-FIR Draft Generator Button */}
          <button
            onClick={() => {
              setActiveModal('efir');
              if (!efirData) handleGenerateEfir();
            }}
            className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-blue-500/50 bg-slate-900/80 transition flex flex-col items-center text-center gap-2 text-slate-200 group cursor-pointer"
          >
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 group-hover:scale-110 transition">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Auto E-FIR Draft</span>
            <span className="text-[10px] text-slate-400">Instant Complaint Draft</span>
          </button>

          {/* AI Clothing Profile Button */}
          <button
            onClick={() => setActiveModal('attire')}
            className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-purple-500/50 bg-slate-900/80 transition flex flex-col items-center text-center gap-2 text-slate-200 group cursor-pointer"
          >
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 group-hover:scale-110 transition">
              <Shirt className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">AI Visual Profile</span>
            <span className="text-[10px] text-slate-400">Attire for SAR Teams</span>
          </button>

          {/* Sarvam AI Multilingual Voice SOS Button */}
          <button
            onClick={() => setActiveModal('voice')}
            className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-amber-500/50 bg-slate-900/80 transition flex flex-col items-center text-center gap-2 text-slate-200 group cursor-pointer"
          >
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 group-hover:scale-110 transition">
              <Mic className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Voice SOS (10+ Lang)</span>
            <span className="text-[10px] text-slate-400">Sarvam / Bhashini AI</span>
          </button>

          {/* Offline Maps Downloader Button */}
          <button
            onClick={() => setActiveModal('offline_map')}
            className="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-emerald-500/50 bg-slate-900/80 transition flex flex-col items-center text-center gap-2 text-slate-200 group cursor-pointer"
          >
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 group-hover:scale-110 transition">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Offline Regional Maps</span>
            <span className="text-[10px] text-slate-400">No-Network Backup</span>
          </button>
        </div>

        {/* Live Spatial Interactive Map View */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" /> Interactive Safety Map & Geofence Boundaries
            </h3>
            <span className="text-xs font-mono text-slate-400">OpenStreetMap Tiles</span>
          </div>

          <MapView
            touristPos={coords}
            geofences={formattedGeofences}
            incidents={activeIncident ? [{
              id: activeIncident.incidentId,
              incidentId: activeIncident.incidentId,
              type: activeIncident.type,
              lat: activeIncident.location.lat,
              lng: activeIncident.location.lng,
              severity: activeIncident.severity,
            }] : []}
          />
        </div>

        {/* Emergency Helplines Footer Bar */}
        <footer className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <PhoneCall className="w-4 h-4 text-red-500" />
            <span>National Emergency Helpline: <strong className="text-white">112</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span>Tourist Helpline: <strong className="text-white">1363</strong></span>
          </div>
        </footer>
      </main>

      {/* MODAL 1: E-FIR Auto Generator */}
      {activeModal === 'efir' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-blue-500/40 bg-slate-900 p-6 shadow-2xl relative text-slate-100 space-y-4">
            <button
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-100">Automated E-FIR Complaint Draft</h3>
                <p className="text-xs text-slate-400">Verified identity pre-filled • Pending Police Verification</p>
              </div>
            </div>

            {efirLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                <span>Compiling E-FIR draft from verified DID & location history...</span>
              </div>
            ) : efirData ? (
              <div className="space-y-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Draft E-FIR Ticket:</span>
                  <span className="font-mono font-bold text-blue-400">{efirData.efirId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Complainant Name:</span>
                  <span className="font-bold text-slate-200">{efirData.touristName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Verified ID / Passport:</span>
                  <span className="font-mono text-slate-300">{efirData.passportAadhaar}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Incident Category:</span>
                  <span className="font-bold text-red-400">{efirData.incidentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Known GPS:</span>
                  <span className="font-mono text-slate-300">{efirData.location?.lat?.toFixed(4)}, {efirData.location?.lng?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Clothing Description:</span>
                  <span className="text-slate-300">{efirData.clothingProfile}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2 text-emerald-400 font-semibold">
                  <span>Status:</span>
                  <span>{efirData.policeVerification}</span>
                </div>
              </div>
            ) : null}

            <button
              onClick={() => setActiveModal('none')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Submit E-FIR Draft to District Command Center
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: AI Clothing Profile */}
      {activeModal === 'attire' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-purple-500/40 bg-slate-900 p-6 shadow-2xl relative text-slate-100 space-y-4">
            <button
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                <Shirt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-100">AI Visual Attire Profile</h3>
                <p className="text-xs text-slate-400">Structured clothing details for search & rescue units</p>
              </div>
            </div>

            {attireSaved ? (
              <div className="py-8 text-center text-emerald-400 font-bold text-sm flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Visual Attire Profile Saved to MongoDB!
              </div>
            ) : (
              <form onSubmit={handleSaveAttire} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Top Wear (Jacket/Shirt)</label>
                  <input
                    type="text"
                    value={attireForm.top}
                    onChange={(e) => setAttireForm({ ...attireForm, top: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Bottom Wear (Pants/Jeans)</label>
                  <input
                    type="text"
                    value={attireForm.bottom}
                    onChange={(e) => setAttireForm({ ...attireForm, bottom: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Footwear & Accessories</label>
                  <input
                    type="text"
                    value={attireForm.accessories}
                    onChange={(e) => setAttireForm({ ...attireForm, accessories: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition cursor-pointer mt-2"
                >
                  Save Emergency Clothing Profile
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Sarvam AI Multilingual Voice */}
      {activeModal === 'voice' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl relative text-slate-100 space-y-4">
            <button
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-100">Sarvam / Bhashini Voice SOS</h3>
                <p className="text-xs text-slate-400">10+ Indian Languages ASR & Translation</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Select Language</label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                >
                  <option>Hindi (हिंदी)</option>
                  <option>Marathi (मराठी)</option>
                  <option>Bengali (বাংলা)</option>
                  <option>Tamil (தமிழ்)</option>
                  <option>Telugu (తెలుగు)</option>
                  <option>Gujarati (ગુજરાતી)</option>
                  <option>Kannada (ಕನ್ನಡ)</option>
                  <option>English</option>
                </select>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-3">
                <button
                  onClick={handleStartVoice}
                  className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition ${
                    listening ? 'bg-red-600 animate-ping text-white' : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  }`}
                >
                  <Mic className="w-8 h-8" />
                </button>
                <p className="text-xs text-slate-300 font-mono">{voiceText || 'Tap mic and speak your emergency message...'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Offline Map */}
      {activeModal === 'offline_map' && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/40 bg-slate-900 p-6 shadow-2xl relative text-slate-100 space-y-4">
            <button
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 bg-slate-800 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-100">Offline Regional Map Tiles</h3>
                <p className="text-xs text-slate-400">Pre-download vector maps for remote dead-zones</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200 block">Pink City & Fort Ridge Region</span>
                  <span className="text-slate-500 text-[11px]">Size: 24.5 MB • Includes Emergency Markers</span>
                </div>
                <button
                  onClick={() => alert('Downloaded Pink City Offline Map Pack to LocalStorage cache!')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
