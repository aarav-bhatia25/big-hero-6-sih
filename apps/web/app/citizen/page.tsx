'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  MapPin,
  FileText,
  Shirt,
  Download,
  Globe,
  Radio,
  CheckCircle2,
  X,
  RefreshCw,
  Mic,
  PhoneCall,
  Building2,
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
    <div className="min-h-screen bg-[#F7F5F0] text-[#14213D] font-sans selection:bg-[#14213D] selection:text-white pb-12">
      {/* 1. Official Government Top Letterhead Header Bar */}
      <div className="bg-[#14213D] text-white text-[11px] px-4 md:px-8 py-2 border-b-2 border-[#D8D2C4] flex flex-wrap items-center justify-between font-mono">
        <div className="flex items-center gap-3">
          <span className="font-bold text-amber-400">🇮🇳 भारत सरकार | GOVERNMENT OF INDIA</span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:inline text-slate-300">MINISTRY OF TOURISM & HOME AFFAIRS</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>FORM REF: T-101</span>
          <span>● NATIONAL SAFETY NODE ONLINE</span>
        </div>
      </div>

      {/* 2. Portal Header */}
      <header className="bg-white border-b border-[#D8D2C4] px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-[#14213D] text-white rounded">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-[#14213D] text-xl tracking-tight leading-none">
              Prahari Tourist Safety & Digital Permit Portal
            </h1>
            <p className="text-xs text-slate-600 font-mono mt-1">
              National Digital Tourist Security Framework • Verifiable Credentials • Emergency Dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#14213D] hover:bg-[#1C2D52] text-white rounded text-xs font-bold transition cursor-pointer border border-[#14213D]"
          >
            <Radio className="w-3.5 h-3.5" /> Authority Command Portal →
          </Link>
        </div>
      </header>

      {/* 3. Main Container */}
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-5">
        {/* Welcome Letterhead & Restrained Risk Gauge */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Official Traveller Registration Record */}
          <div className="md:col-span-2 bg-white p-5 rounded-md border border-[#D8D2C4] flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-[#D8D2C4] pb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  REGISTRATION RECORD NO. DTI-2026-891
                </span>
                <span className="text-[11px] font-mono font-bold text-[#1B5E3C] bg-emerald-50 px-2 py-0.5 rounded border border-[#1B5E3C]/30">
                  STATUS: ACTIVE PERMIT
                </span>
              </div>
              <h2 className="font-serif font-bold text-2xl text-[#14213D]">{greeting}, Demo Tourist</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your Digital Tourist Identity Permit (`did:tourist:DTI-IND-000123`) is registered with district emergency services. Spatial geofence boundaries and automated risk scoring are active.
              </p>
            </div>

            <div className="pt-3 mt-4 border-t border-[#D8D2C4] flex items-center justify-between text-xs text-slate-600 font-mono">
              <span className="flex items-center gap-1.5 text-[#14213D] font-bold">
                <MapPin className="w-4 h-4 text-[#14213D]" /> GPS TELEMETRY: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
              <button
                onClick={() => setLocationConsent(!locationConsent)}
                className={`px-3 py-1 rounded font-bold text-[11px] transition border cursor-pointer ${
                  locationConsent
                    ? 'bg-emerald-50 text-[#1B5E3C] border-[#1B5E3C]'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                TELEMETRY: {locationConsent ? 'LOGGING ACTIVE ✓' : 'SUSPENDED ✕'}
              </button>
            </div>
          </div>

          {/* Restrained Plain Risk Score Readout */}
          <div className="bg-white p-5 rounded-md border border-[#D8D2C4] flex flex-col justify-between text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block border-b border-[#D8D2C4] pb-2">
              DYNAMIC RISK EVALUATION (FORM R-7)
            </span>
            <div className="my-3">
              <span className="text-3xl font-mono font-bold text-[#14213D]">
                {riskEval.totalScore} <span className="text-sm font-sans text-slate-500 font-normal">/ 100</span>
              </span>
              <div className="mt-2">
                <span className="inline-block px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider border border-[#1B5E3C] text-[#1B5E3C] bg-emerald-50/50">
                  {riskEval.badgeText}
                </span>
              </div>
            </div>
            <p className="text-[11px] font-mono text-slate-500">
              {gfCheck.isBreached ? '⚠️ HIGH RISK GEOFENCE BREACH DETECTED' : 'SAFE TRAVEL CORRIDOR • NO ACTIVE BREACH'}
            </p>
          </div>
        </div>

        {/* 4. Signature SOS Button Component */}
        <SosButton
          touristPos={coords}
          onSosTriggered={(inc) => {
            setActiveIncident(inc);
          }}
        />

        {/* 5. Official Digital Tourist ID Pass Component */}
        <DigitalIdCard />

        {/* 6. Form Action Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* E-FIR Draft Button */}
          <button
            onClick={() => {
              setActiveModal('efir');
              if (!efirData) handleGenerateEfir();
            }}
            className="bg-white p-4 rounded-md border border-[#D8D2C4] hover:border-[#14213D] transition flex flex-col items-center text-center gap-2 text-[#14213D] group cursor-pointer"
          >
            <div className="p-2.5 bg-[#F7F5F0] text-[#14213D] rounded border border-[#D8D2C4] group-hover:bg-[#14213D] group-hover:text-white transition">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-serif font-bold text-[#14213D]">Automated E-FIR Draft</span>
            <span className="text-[10px] font-mono text-slate-500">FORM E-154 COMPLAINT</span>
          </button>

          {/* AI Attire Profile Button */}
          <button
            onClick={() => setActiveModal('attire')}
            className="bg-white p-4 rounded-md border border-[#D8D2C4] hover:border-[#14213D] transition flex flex-col items-center text-center gap-2 text-[#14213D] group cursor-pointer"
          >
            <div className="p-2.5 bg-[#F7F5F0] text-[#14213D] rounded border border-[#D8D2C4] group-hover:bg-[#14213D] group-hover:text-white transition">
              <Shirt className="w-5 h-5" />
            </div>
            <span className="text-xs font-serif font-bold text-[#14213D]">Visual Attire Record</span>
            <span className="text-[10px] font-mono text-slate-500">FORM V-09 SPECIFIERS</span>
          </button>

          {/* Voice Assistance Button */}
          <button
            onClick={() => setActiveModal('voice')}
            className="bg-white p-4 rounded-md border border-[#D8D2C4] hover:border-[#14213D] transition flex flex-col items-center text-center gap-2 text-[#14213D] group cursor-pointer"
          >
            <div className="p-2.5 bg-[#F7F5F0] text-[#14213D] rounded border border-[#D8D2C4] group-hover:bg-[#14213D] group-hover:text-white transition">
              <Mic className="w-5 h-5" />
            </div>
            <span className="text-xs font-serif font-bold text-[#14213D]">Sarvam Voice SOS</span>
            <span className="text-[10px] font-mono text-slate-500">10+ INDIAN LANGUAGES</span>
          </button>

          {/* Offline Maps Button */}
          <button
            onClick={() => setActiveModal('offline_map')}
            className="bg-white p-4 rounded-md border border-[#D8D2C4] hover:border-[#14213D] transition flex flex-col items-center text-center gap-2 text-[#14213D] group cursor-pointer"
          >
            <div className="p-2.5 bg-[#F7F5F0] text-[#14213D] rounded border border-[#D8D2C4] group-hover:bg-[#14213D] group-hover:text-white transition">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-xs font-serif font-bold text-[#14213D]">Offline Vector Tiles</span>
            <span className="text-[10px] font-mono text-slate-500">NO-NETWORK CACHE</span>
          </button>
        </div>

        {/* 7. Plain Bordered Spatial Map Container */}
        <div className="bg-white p-4 rounded-md border border-[#D8D2C4] space-y-3">
          <div className="flex items-center justify-between border-b border-[#D8D2C4] pb-2">
            <h3 className="font-serif font-bold text-[#14213D] text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#14213D]" /> District Spatial Safety Map & Official Polygon Bounds
            </h3>
            <span className="text-[11px] font-mono text-slate-500">OPENSTREETMAP VECTOR TILES</span>
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

        {/* 8. Official Notice Strip Helpline Footer */}
        <footer className="bg-[#14213D] text-white p-4 rounded-md border border-[#14213D] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-amber-400" />
            <span>NATIONAL EMERGENCY HOTLINE: <strong className="text-white font-mono">112</strong></span>
          </div>
          <div>
            <span>TOURIST HELPLINE: <strong className="text-white font-mono">1363</strong></span>
          </div>
          <div>
            <span>DPDP ACT 2023 COMPLIANT</span>
          </div>
        </footer>
      </main>

      {/* MODAL 1: E-FIR Auto Generator */}
      {activeModal === 'efir' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-md border border-[#D8D2C4] bg-white p-6 shadow-xl relative text-[#14213D] space-y-4">
            <button
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 text-slate-500 hover:text-[#14213D] p-1 bg-[#F7F5F0] rounded cursor-pointer border border-[#D8D2C4]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#D8D2C4] pb-3">
              <div className="p-2.5 bg-[#14213D] text-white rounded">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#14213D]">Automated E-FIR Complaint Draft</h3>
                <p className="text-xs text-slate-600 font-mono">Under Section 154 Code of Criminal Procedure (CrPC)</p>
              </div>
            </div>

            {efirLoading ? (
              <div className="py-10 flex flex-col items-center justify-center text-slate-600 text-xs gap-2 font-mono">
                <RefreshCw className="w-6 h-6 animate-spin text-[#14213D]" />
                <span>Compiling draft report from verified credentials...</span>
              </div>
            ) : efirData ? (
              <div className="space-y-2.5 text-xs bg-[#F7F5F0] p-4 rounded border border-[#D8D2C4]">
                <div className="flex justify-between border-b border-[#D8D2C4] pb-2 font-mono">
                  <span className="text-slate-600">DRAFT E-FIR TICKET:</span>
                  <span className="font-bold text-[#14213D]">{efirData.efirId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Complainant Name:</span>
                  <span className="font-bold text-[#14213D]">{efirData.touristName}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-600">Verified ID Ref:</span>
                  <span className="text-[#14213D]">{efirData.passportAadhaar}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Incident Category:</span>
                  <span className="font-bold text-[#FF7722]">{efirData.incidentType}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-600">GPS Coordinates:</span>
                  <span className="text-[#14213D]">{efirData.location?.lat?.toFixed(4)}, {efirData.location?.lng?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Visual Attire Record:</span>
                  <span className="text-[#14213D]">{efirData.clothingProfile}</span>
                </div>
                <div className="flex justify-between border-t border-[#D8D2C4] pt-2 text-[#1B5E3C] font-bold font-mono">
                  <span>OFFICER VERIFICATION:</span>
                  <span>{efirData.policeVerification}</span>
                </div>
              </div>
            ) : null}

            <button
              onClick={() => setActiveModal('none')}
              className="w-full py-2.5 bg-[#14213D] hover:bg-[#1C2D52] text-white font-bold text-xs rounded transition cursor-pointer font-mono"
            >
              SUBMIT E-FIR DRAFT TO DISTRICT POLICE CONTROL ROOM
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: AI Clothing Profile */}
      {activeModal === 'attire' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-md border border-[#D8D2C4] bg-white p-6 shadow-xl relative text-[#14213D] space-y-4">
            <button
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 text-slate-500 hover:text-[#14213D] p-1 bg-[#F7F5F0] rounded cursor-pointer border border-[#D8D2C4]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#D8D2C4] pb-3">
              <div className="p-2.5 bg-[#14213D] text-white rounded">
                <Shirt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#14213D]">Visual Attire & Description Record</h3>
                <p className="text-xs text-slate-600 font-mono">Form V-09 • Search & Rescue Identification</p>
              </div>
            </div>

            {attireSaved ? (
              <div className="py-8 text-center text-[#1B5E3C] font-bold text-xs flex items-center justify-center gap-2 font-mono">
                <CheckCircle2 className="w-5 h-5" /> ATTIRE RECORD SAVED TO DISTRICT RECORD!
              </div>
            ) : (
              <form onSubmit={handleSaveAttire} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1 font-mono font-bold">TOP WEAR (JACKET/SHIRT)</label>
                  <input
                    type="text"
                    value={attireForm.top}
                    onChange={(e) => setAttireForm({ ...attireForm, top: e.target.value })}
                    className="w-full bg-[#F7F5F0] border border-[#D8D2C4] rounded p-2.5 text-[#14213D] focus:outline-none focus:border-[#14213D]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-mono font-bold">BOTTOM WEAR (PANTS/JEANS)</label>
                  <input
                    type="text"
                    value={attireForm.bottom}
                    onChange={(e) => setAttireForm({ ...attireForm, bottom: e.target.value })}
                    className="w-full bg-[#F7F5F0] border border-[#D8D2C4] rounded p-2.5 text-[#14213D] focus:outline-none focus:border-[#14213D]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-mono font-bold">FOOTWEAR & ACCESSORIES</label>
                  <input
                    type="text"
                    value={attireForm.accessories}
                    onChange={(e) => setAttireForm({ ...attireForm, accessories: e.target.value })}
                    className="w-full bg-[#F7F5F0] border border-[#D8D2C4] rounded p-2.5 text-[#14213D] focus:outline-none focus:border-[#14213D]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#14213D] hover:bg-[#1C2D52] text-white font-bold rounded transition cursor-pointer font-mono mt-2"
                >
                  SAVE ATTIRE RECORD TO PERMIT TICKET
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Sarvam AI Multilingual Voice */}
      {activeModal === 'voice' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-md border border-[#D8D2C4] bg-white p-6 shadow-xl relative text-[#14213D] space-y-4">
            <button
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 text-slate-500 hover:text-[#14213D] p-1 bg-[#F7F5F0] rounded cursor-pointer border border-[#D8D2C4]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#D8D2C4] pb-3">
              <div className="p-2.5 bg-[#14213D] text-white rounded">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#14213D]">Sarvam AI Multilingual Voice SOS</h3>
                <p className="text-xs text-slate-600 font-mono">Bhashini AI Speech Recognition System</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-mono font-bold">SELECT REGIONAL LANGUAGE</label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full bg-[#F7F5F0] border border-[#D8D2C4] rounded p-2.5 text-[#14213D] font-medium"
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

              <div className="bg-[#F7F5F0] p-4 rounded border border-[#D8D2C4] text-center space-y-3">
                <button
                  onClick={handleStartVoice}
                  className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center transition border ${
                    listening ? 'bg-[#FF7722] text-white border-amber-600' : 'bg-[#14213D] text-white hover:bg-[#1C2D52]'
                  }`}
                >
                  <Mic className="w-6 h-6" />
                </button>
                <p className="text-xs text-slate-600 font-mono">{voiceText || 'Tap microphone to dictate emergency message...'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Offline Map */}
      {activeModal === 'offline_map' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-md border border-[#D8D2C4] bg-white p-6 shadow-xl relative text-[#14213D] space-y-4">
            <button
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 text-slate-500 hover:text-[#14213D] p-1 bg-[#F7F5F0] rounded cursor-pointer border border-[#D8D2C4]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-[#D8D2C4] pb-3">
              <div className="p-2.5 bg-[#14213D] text-white rounded">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#14213D]">Offline Vector Map Tiles</h3>
                <p className="text-xs text-slate-600 font-mono">No-Network Emergency Region Cache</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#F7F5F0] p-3 rounded border border-[#D8D2C4] flex items-center justify-between">
                <div>
                  <span className="font-serif font-bold text-[#14213D] block">Pink City & Fort Ridge Region</span>
                  <span className="text-slate-500 font-mono text-[11px]">Size: 24.5 MB • Includes Patrol Nodes</span>
                </div>
                <button
                  onClick={() => alert('Downloaded Pink City Offline Map Pack to LocalCache!')}
                  className="px-3 py-1.5 bg-[#14213D] hover:bg-[#1C2D52] text-white font-bold rounded transition font-mono"
                >
                  DOWNLOAD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
