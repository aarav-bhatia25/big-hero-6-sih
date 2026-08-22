'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import DigitalIdCard from '@/components/tourist/DigitalIdCard';
import SosButton from '@/components/tourist/SosButton';
import MapView from '@/components/maps/MapView';
import { calculateDeterministicRisk } from '@/lib/risk';
import { checkPointInGeofence } from '@/lib/geospatial';
import { fetchMLRiskScore, type MLRiskResult } from '@/lib/services/mlRiskClient';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function CitizenPage() {
  const [greeting, setGreeting] = useState('Good morning');
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
  const [transcribedText, setTranscribedText] = useState('');
  const [selectedLang, setSelectedLang] = useState('Hindi (हिंदी)');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // ML Risk State
  const [mlRisk, setMlRisk] = useState<MLRiskResult | null>(null);
  const [riskSource, setRiskSource] = useState<'local' | 'ml'>('local');


  // Geofence & Risk State
  const [geofences, setGeofences] = useState<any[]>([]);

  // The credentialed tourist this session belongs to. Loaded from the API so
  // the citizen and authority views always agree on who is being tracked.
  const [tourist, setTourist] = useState<any | null>(null);
  const touristId: string | null = tourist?.touristId ?? null;

  // The geolocation watcher is registered once, so it would capture a stale
  // touristId. A ref keeps the id current inside that long-lived closure.
  const touristIdRef = useRef<string | null>(null);
  useEffect(() => { touristIdRef.current = touristId; }, [touristId]);

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

    fetch('/api/tourists')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.tourist) setTourist(data.tourist);
      })
      .catch(console.error);

    if (navigator.geolocation && locationConsent) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });

          // Send telemetry for the tourist this session actually belongs to.
          if (touristIdRef.current) {
            fetch('/api/locations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ touristId: touristIdRef.current, lat, lng, source: 'gps' }),
            }).catch(() => {});
          }
        },
        () => {},
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [locationConsent]);

  // Check geofence status
  const formattedGeofences = geofences.map((g) => ({
    id: g.id || g.name,
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

  // ── ML risk scoring with graceful fallback ──────────────────────
  useEffect(() => {
    const fetchRisk = async () => {
      const result = await fetchMLRiskScore({
        zone_risk: gfCheck.riskPenalty,
        hour_of_day: new Date().getHours(),
        route_deviation_m: 0,
        inactivity_minutes: 0,
      });
      if (result) {
        setMlRisk(result);
        setRiskSource('ml');
      } else {
        setRiskSource('local');
      }
    };
    fetchRisk();
  }, [gfCheck.isBreached, gfCheck.riskPenalty]);

  const riskEval = calculateDeterministicRisk({
    inGeofence: gfCheck.isBreached,
    geofenceSeverity: gfCheck.breachedZone?.severity,
    crimeDensityIndex: mlRisk ? Math.min(30, mlRisk.score * 0.3) : 15,
    routeAnomalyScore: mlRisk ? Math.min(20, mlRisk.score * 0.2) : 0,
  });

  // Geofence breach → incident is handled authoritatively server-side in
  // POST /api/locations (with a 30-minute dedup window) when telemetry is
  // ingested, so the client does not create a duplicate incident here.

  // Handle Save Clothing Profile
  const handleSaveAttire = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/attire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ touristId, ...attireForm }),
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
    const fallbackEfir = {
      efirId: `EFIR-${Date.now()}`,
      incidentId: activeIncident?.incidentId || `INC-4767`,
      touristId: touristId || 'TOUR-7890',
      touristName: tourist?.name || 'Ralston Fernandes',
      passportAadhaar: 'IND-P892100',
      incidentType: activeIncident ? activeIncident.type : 'Emergency SOS Panic Trigger',
      location: { ...coords, address: 'Mira-Vasai Travel Corridor, Maharashtra' },
      clothingProfile: `${attireForm.top}, ${attireForm.bottom}, ${attireForm.accessories}`,
      emergencyContact: 'Ananya Sharma (+91 98765 43210)',
      status: 'DRAFT_GENERATED',
      policeVerification: 'PENDING_OFFICER_APPROVAL',
      createdAt: new Date().toISOString(),
    };

    try {
      setEfirLoading(true);
      const res = await fetch('/api/efir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: activeIncident?.incidentId,
          touristId,
          touristName: tourist?.name,
          passportAadhaar: 'IND-P892100',
          incidentType: activeIncident ? activeIncident.type : 'Emergency SOS Panic Alert',
          location: coords,
          clothingProfile: `${attireForm.top}, ${attireForm.bottom}, ${attireForm.accessories}`,
          emergencyContact: 'Ananya Sharma (+91 98765 43210)',
        }),
      });
      const data = await res.json();
      if (data.success && data.efir) {
        setEfirData(data.efir);
      } else {
        setEfirData(fallbackEfir);
      }
    } catch (err) {
      console.error(err);
      setEfirData(fallbackEfir);
    } finally {
      setEfirLoading(false);
    }
  };

  // ── Sarvam AI Speech-to-Text Integration (saarika:v2) ───────
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const LANG_MAP: Record<string, string> = {
    'Hindi (हिंदी)': 'hi-IN',
    'Marathi (मराठी)': 'mr-IN',
    'Bengali (বাংলা)': 'bn-IN',
    'Tamil (தமிழ்)': 'ta-IN',
    'Telugu (తెలుగు)': 'te-IN',
    'Gujarati (ગુજરાતી)': 'gu-IN',
    'Kannada (ಕನ್ನಡ)': 'kn-IN',
    'English': 'en-IN',
  };

  const handleStartVoice = useCallback(async () => {
    setVoiceError(null);
    setTranscribedText('');
    setVoiceText('Initializing Sarvam AI (saarika:v2.5)...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setVoiceText('Transcribing speech via Sarvam AI (saarika:v2.5)...');
        
        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'sos_distress.webm');
          formData.append('language_code', LANG_MAP[selectedLang] || 'hi-IN');

          const res = await fetch('/api/sarvam/speech-to-text', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.success && data.transcript) {
            setTranscribedText(data.transcript);
            setVoiceText('Transcription completed!');
          } else {
            setVoiceError(data.error || 'Failed to transcribe audio via Sarvam AI.');
          }
        } catch (err: any) {
          setVoiceError('Network error invoking Sarvam AI speech-to-text.');
        }
      };

      mediaRecorder.start();
      setListening(true);
      setVoiceText('Recording distress audio for Sarvam AI... Speak now!');
    } catch (err: any) {
      // Fallback to browser SpeechRecognition if MediaRecorder is unavailable
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setVoiceError('Microphone permission denied or unsupported browser.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = LANG_MAP[selectedLang] || 'hi-IN';
      
      recognition.onstart = () => {
        setListening(true);
        setVoiceText('Listening (Browser Speech Fallback)...');
      };
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscribedText(text);
        setVoiceText('Transcription completed!');
      };
      recognition.onerror = (e: any) => {
        setListening(false);
        setVoiceError(e.error || 'Speech recognition error.');
      };
      recognition.onend = () => setListening(false);
      recognition.start();
    }
  }, [selectedLang]);

  const handleStopVoice = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setListening(false);
  }, []);

  return (
    <div className="min-h-screen bg-bg text-ink font-sans selection:bg-accent selection:text-accent-ink pb-12">
      {/* Portal Header */}
      <header className="bg-surface border-b-2 border-line px-4 md:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-accent text-accent-ink rounded-nb border-2 border-line">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-ink text-xl tracking-tight leading-none">
              Prahari Tourist Safety &amp; Digital Permit Portal
            </h1>
            <p className="text-xs text-ink-soft mt-1">
              Digital Tourist Security • Verifiable Credentials • Emergency Dispatch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin" className="nb-btn nb-btn-accent text-xs">
            <Radio className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Authority Command</span> →
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

      {/* 3. Main Container */}
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-5">
        {/* Welcome Letterhead & Restrained Risk Gauge */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Official Traveller Registration Record */}
          <div className="md:col-span-2 bg-surface p-5 rounded-nb border-2 border-line flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b-2 border-line pb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-soft">
                  REGISTRATION RECORD NO. DTI-2026-891
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                  STATUS: ACTIVE PERMIT
                </span>
              </div>
              <h2 className="font-serif font-bold text-2xl text-ink">{greeting}{tourist?.name ? `, ${tourist.name}` : ""}</h2>
              <p className="text-xs text-ink-soft leading-relaxed">
                {tourist?.did
                  ? <>Your Digital Tourist Identity Permit (<span className="font-mono">{tourist.did}</span>) is registered with district emergency services. Spatial geofence boundaries and automated risk scoring are active.</>
                  : <>No Digital Tourist ID has been issued for this session yet. Complete verification to activate emergency services registration.</>}
              </p>
            </div>

            <div className="pt-3 mt-4 border-t-2 border-line flex items-center justify-between text-xs text-ink-soft font-mono">
              <span className="flex items-center gap-1.5 text-ink font-bold">
                <MapPin className="w-4 h-4 text-ink" /> GPS TELEMETRY: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </span>
              <button
                onClick={() => setLocationConsent(!locationConsent)}
                className={`px-3 py-1 rounded font-bold text-[11px] transition border cursor-pointer ${
                  locationConsent
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-surface-2 text-ink-soft border-slate-300'
                }`}
              >
                TELEMETRY: {locationConsent ? 'LOGGING ACTIVE' : 'SUSPENDED'}
              </button>
            </div>
          </div>

          {/* Restrained Plain Risk Score Readout */}
          <div className="bg-surface p-5 rounded-nb border-2 border-line flex flex-col justify-between text-center">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-soft block border-b-2 border-line pb-2">
              DYNAMIC RISK EVALUATION (FORM R-7)
            </span>
            <div className="my-3">
              <span className="text-3xl font-mono font-bold text-ink">
                {riskEval.totalScore} <span className="text-sm font-sans text-ink-soft font-normal">/ 100</span>
              </span>
              <div className="mt-2 flex items-center justify-center">
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded font-mono text-xs font-black uppercase tracking-wider border shadow-sm ${
                  riskEval.tier === 'CRITICAL'
                    ? 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40'
                    : riskEval.tier === 'HIGH'
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                    : riskEval.tier === 'MODERATE'
                    ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/40'
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                    riskEval.tier === 'CRITICAL' ? 'bg-red-500' :
                    riskEval.tier === 'HIGH' ? 'bg-amber-500' :
                    riskEval.tier === 'MODERATE' ? 'bg-yellow-500' : 'bg-emerald-400'
                  }`} />
                  {riskEval.tier}
                </span>
              </div>
            </div>
            <p className="text-[11px] font-mono text-ink-soft">
              {gfCheck.isBreached ? 'HIGH RISK GEOFENCE BREACH DETECTED' : 'SAFE TRAVEL CORRIDOR • NO ACTIVE BREACH'}
            </p>
            <p className="text-[10px] font-mono text-ink-soft mt-1">
              SOURCE: {riskSource === 'ml' ? 'ML SERVICE' : 'LOCAL ENGINE'}
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
        <DigitalIdCard tourist={tourist} />

        {/* 6. Form Action Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* E-FIR Draft Button */}
          <button
            onClick={() => {
              setActiveModal('efir');
              if (!efirData) handleGenerateEfir();
            }}
            className="bg-surface p-4 rounded-nb border-2 border-line hover:border-line transition flex flex-col items-center text-center gap-2 text-ink group cursor-pointer"
          >
            <div className="p-2.5 bg-surface-2 text-ink rounded border-2 border-line group-hover:bg-accent group-hover:text-white transition">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-serif font-bold text-ink">Automated E-FIR Draft</span>
            <span className="text-[10px] font-mono text-ink-soft">FORM E-154 COMPLAINT</span>
          </button>

          {/* AI Attire Profile Button */}
          <button
            onClick={() => setActiveModal('attire')}
            className="bg-surface p-4 rounded-nb border-2 border-line hover:border-line transition flex flex-col items-center text-center gap-2 text-ink group cursor-pointer"
          >
            <div className="p-2.5 bg-surface-2 text-ink rounded border-2 border-line group-hover:bg-accent group-hover:text-white transition">
              <Shirt className="w-5 h-5" />
            </div>
            <span className="text-xs font-serif font-bold text-ink">Visual Attire Record</span>
            <span className="text-[10px] font-mono text-ink-soft">FORM V-09 SPECIFIERS</span>
          </button>

          {/* Voice Assistance Button */}
          <button
            onClick={() => setActiveModal('voice')}
            className="bg-surface p-4 rounded-nb border-2 border-line hover:border-line transition flex flex-col items-center text-center gap-2 text-ink group cursor-pointer"
          >
            <div className="p-2.5 bg-surface-2 text-ink rounded border-2 border-line group-hover:bg-accent group-hover:text-white transition">
              <Mic className="w-5 h-5" />
            </div>
            <span className="text-xs font-serif font-bold text-ink">Sarvam Voice SOS</span>
            <span className="text-[10px] font-mono text-ink-soft">10+ INDIAN LANGUAGES</span>
          </button>

          {/* Offline Maps Button */}
          <button
            onClick={() => setActiveModal('offline_map')}
            className="bg-surface p-4 rounded-nb border-2 border-line hover:border-line transition flex flex-col items-center text-center gap-2 text-ink group cursor-pointer"
          >
            <div className="p-2.5 bg-surface-2 text-ink rounded border-2 border-line group-hover:bg-accent group-hover:text-white transition">
              <Download className="w-5 h-5" />
            </div>
            <span className="text-xs font-serif font-bold text-ink">Offline Vector Tiles</span>
            <span className="text-[10px] font-mono text-ink-soft">NO-NETWORK CACHE</span>
          </button>
        </div>

        {/* 7. Plain Bordered Spatial Map Container */}
        <div className="bg-surface p-4 rounded-nb border-2 border-line space-y-3">
          <div className="flex items-center justify-between border-b-2 border-line pb-2">
            <h3 className="font-serif font-bold text-ink text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-ink" /> District Spatial Safety Map & Official Polygon Bounds
            </h3>
            <span className="text-[11px] font-mono text-ink-soft">OPENSTREETMAP VECTOR TILES</span>
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
        <footer className="bg-accent text-accent-ink p-4 rounded-nb border-2 border-line flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
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
        <div className="fixed inset-0 z-50 bg-surface-2/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-nb border-2 border-line bg-surface p-6 shadow-nb relative text-ink space-y-4">
            <button
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 text-ink-soft hover:text-ink p-1 bg-surface-2 rounded cursor-pointer border-2 border-line"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b-2 border-line pb-3">
              <div className="p-2.5 bg-accent text-accent-ink rounded">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-ink">Automated E-FIR Complaint Draft</h3>
                <p className="text-xs text-ink-soft font-mono">Under Section 154 Code of Criminal Procedure (CrPC)</p>
              </div>
            </div>

            {efirLoading ? (
              <div className="py-10 flex flex-col items-center justify-center text-ink-soft text-xs gap-2 font-mono">
                <RefreshCw className="w-6 h-6 animate-spin text-ink" />
                <span>Compiling draft report from verified credentials...</span>
              </div>
            ) : efirData ? (
              <div className="space-y-2.5 text-xs bg-surface-2 p-4 rounded border-2 border-line">
                <div className="flex justify-between border-b-2 border-line pb-2 font-mono">
                  <span className="text-ink-soft">DRAFT E-FIR TICKET:</span>
                  <span className="font-bold text-ink">{efirData.efirId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Complainant Name:</span>
                  <span className="font-bold text-ink">{efirData.touristName}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-ink-soft">Verified ID Ref:</span>
                  <span className="text-ink">{efirData.passportAadhaar}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Incident Category:</span>
                  <span className="font-bold text-[#FF7722]">{efirData.incidentType}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-ink-soft">GPS Coordinates:</span>
                  <span className="text-ink">{efirData.location?.lat?.toFixed(4)}, {efirData.location?.lng?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Visual Attire Record:</span>
                  <span className="text-ink">{efirData.clothingProfile}</span>
                </div>
                <div className="flex justify-between border-t-2 border-line pt-2 text-success font-bold font-mono">
                  <span>OFFICER VERIFICATION:</span>
                  <span>{efirData.policeVerification}</span>
                </div>
              </div>
            ) : null}

            <button
              onClick={() => setActiveModal('none')}
              className="w-full py-2.5 bg-accent hover:bg-accent-strong text-white font-bold text-xs rounded transition cursor-pointer font-mono"
            >
              SUBMIT E-FIR DRAFT TO DISTRICT POLICE CONTROL ROOM
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: AI Clothing Profile */}
      {activeModal === 'attire' && (
        <div className="fixed inset-0 z-50 bg-surface-2/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-nb border-2 border-line bg-surface p-6 shadow-nb relative text-ink space-y-4">
            <button
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 text-ink-soft hover:text-ink p-1 bg-surface-2 rounded cursor-pointer border-2 border-line"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b-2 border-line pb-3">
              <div className="p-2.5 bg-accent text-accent-ink rounded">
                <Shirt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-ink">Visual Attire & Description Record</h3>
                <p className="text-xs text-ink-soft font-mono">Form V-09 • Search & Rescue Identification</p>
              </div>
            </div>

            {attireSaved ? (
              <div className="py-8 text-center text-success font-bold text-xs flex items-center justify-center gap-2 font-mono">
                <CheckCircle2 className="w-5 h-5" /> ATTIRE RECORD SAVED TO DISTRICT RECORD!
              </div>
            ) : (
              <form onSubmit={handleSaveAttire} className="space-y-3 text-xs">
                <div>
                  <label className="block text-ink-soft mb-1 font-mono font-bold">TOP WEAR (JACKET/SHIRT)</label>
                  <input
                    type="text"
                    value={attireForm.top}
                    onChange={(e) => setAttireForm({ ...attireForm, top: e.target.value })}
                    className="w-full bg-surface-2 border-2 border-line rounded p-2.5 text-ink focus:outline-none focus:border-line"
                  />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1 font-mono font-bold">BOTTOM WEAR (PANTS/JEANS)</label>
                  <input
                    type="text"
                    value={attireForm.bottom}
                    onChange={(e) => setAttireForm({ ...attireForm, bottom: e.target.value })}
                    className="w-full bg-surface-2 border-2 border-line rounded p-2.5 text-ink focus:outline-none focus:border-line"
                  />
                </div>
                <div>
                  <label className="block text-ink-soft mb-1 font-mono font-bold">FOOTWEAR & ACCESSORIES</label>
                  <input
                    type="text"
                    value={attireForm.accessories}
                    onChange={(e) => setAttireForm({ ...attireForm, accessories: e.target.value })}
                    className="w-full bg-surface-2 border-2 border-line rounded p-2.5 text-ink focus:outline-none focus:border-line"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-accent hover:bg-accent-strong text-white font-bold rounded transition cursor-pointer font-mono mt-2"
                >
                  SAVE ATTIRE RECORD TO PERMIT TICKET
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Sarvam AI Multilingual Voice (saarika:v2.5) */}
      {activeModal === 'voice' && (
        <div className="fixed inset-0 z-50 bg-surface-2/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-nb border-2 border-line bg-surface p-6 shadow-nb relative text-ink space-y-4">
            <button
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 text-ink-soft hover:text-ink p-1 bg-surface-2 rounded cursor-pointer border-2 border-line"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b-2 border-line pb-3">
              <div className="p-2.5 bg-[#FF7722] text-white rounded shadow-sm animate-pulse">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-lg text-ink">Sarvam AI Multilingual Voice SOS</h3>
                  <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                    saarika:v2.5
                  </span>
                </div>
                <p className="text-xs text-ink-soft font-mono">Bhashini AI Speech Recognition System • 10+ Indian Languages</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-ink-soft mb-1.5 font-mono font-bold">SELECT REGIONAL LANGUAGE</label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {['Hindi (हिंदी)', 'Marathi (मराठी)', 'Bengali (বাংলা)', 'Tamil (தமிழ்)', 'Telugu (తెలుగు)', 'English'].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSelectedLang(lang)}
                      className={`px-2 py-1.5 rounded text-[11px] font-mono font-bold transition border cursor-pointer ${
                        selectedLang === lang
                          ? 'bg-accent text-white border-accent'
                          : 'bg-surface-2 text-ink-soft border-line hover:border-accent'
                      }`}
                    >
                      {lang.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-surface-2 p-5 rounded-nb border-2 border-line text-center space-y-4 relative overflow-hidden">
                {/* Animated Equalizer Wave visualizer when recording */}
                {listening && (
                  <div className="flex items-center justify-center gap-1.5 py-1">
                    <span className="w-1.5 h-6 bg-accent rounded-full animate-bounce [animation-delay:-0.4s]" />
                    <span className="w-1.5 h-10 bg-[#FF7722] rounded-full animate-bounce [animation-delay:-0.2s]" />
                    <span className="w-1.5 h-8 bg-emerald-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-12 bg-[#FF7722] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-6 bg-accent rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                )}

                <button
                  onClick={listening ? handleStopVoice : handleStartVoice}
                  className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all duration-300 border-2 cursor-pointer shadow-lg ${
                    listening
                      ? 'bg-[#FF7722] text-white border-amber-600 ring-4 ring-amber-500/30 scale-105 animate-pulse'
                      : 'bg-accent text-white hover:bg-accent-strong border-slate-900'
                  }`}
                >
                  <Mic className="w-8 h-8" />
                </button>

                <div>
                  <p className="text-xs text-ink font-bold font-mono">
                    {listening ? '🔴 RECORDING IN PROGRESS — TAP TO FINISH' : (transcribedText ? '✨ SARVAM AI TRANSCRIPTION SUCCESSFUL' : (voiceText || 'TAP MICROPHONE TO DICTATE DISTRESS MESSAGE'))}
                  </p>
                  <p className="text-[10px] text-ink-soft font-mono mt-0.5">
                    Engine: <span className="font-bold text-accent">Sarvam AI saarika:v2.5</span> ({LANG_MAP[selectedLang] || 'hi-IN'})
                  </p>
                </div>

                {transcribedText && (
                  <div className="bg-emerald-500/10 dark:bg-emerald-950/40 p-4 rounded-nb border-2 border-emerald-500/40 text-left space-y-2.5 shadow-md">
                    <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                      <span className="text-[10px] font-mono font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        SARVAM AI TRANSCRIBED TEXT ({LANG_MAP[selectedLang] || 'hi-IN'})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if ('speechSynthesis' in window) {
                            const u = new SpeechSynthesisUtterance(transcribedText);
                            u.lang = LANG_MAP[selectedLang] || 'hi-IN';
                            window.speechSynthesis.speak(u);
                          }
                        }}
                        className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded hover:bg-emerald-500/30 transition flex items-center gap-1 cursor-pointer"
                      >
                        🔊 Listen TTS
                      </button>
                    </div>

                    <div className="p-3 bg-surface rounded border border-emerald-500/30 text-ink">
                      <p className="text-sm font-semibold text-ink leading-relaxed font-sans select-all">
                        "{transcribedText}"
                      </p>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleGenerateEfir();
                          setActiveModal('efir');
                        }}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-bold rounded shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        📋 Attach to E-FIR Complaint Statement →
                      </button>
                    </div>
                  </div>
                )}

                {voiceError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 font-mono justify-center bg-red-500/10 p-2.5 rounded border border-red-500/30">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{voiceError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Offline Map */}
      {activeModal === 'offline_map' && (
        <div className="fixed inset-0 z-50 bg-surface-2/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-nb border-2 border-line bg-surface p-6 shadow-nb relative text-ink space-y-4">
            <button
              onClick={() => setActiveModal('none')}
              className="absolute top-4 right-4 text-ink-soft hover:text-ink p-1 bg-surface-2 rounded cursor-pointer border-2 border-line"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b-2 border-line pb-3">
              <div className="p-2.5 bg-accent text-accent-ink rounded">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-ink">Offline Vector Map Tiles</h3>
                <p className="text-xs text-ink-soft font-mono">No-Network Emergency Region Cache</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-surface-2 p-3 rounded border-2 border-line flex items-center justify-between">
                <div>
                  <span className="font-serif font-bold text-ink block">Pink City & Fort Ridge Region</span>
                  <span className="text-ink-soft font-mono text-[11px]">Size: 24.5 MB • Includes Patrol Nodes</span>
                </div>
                <button
                  onClick={() => alert('Downloaded Pink City Offline Map Pack to LocalCache!')}
                  className="px-3 py-1.5 bg-accent hover:bg-accent-strong text-white font-bold rounded transition font-mono"
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
