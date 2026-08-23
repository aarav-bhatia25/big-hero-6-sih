'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  FileText,
  Shirt,
  Globe,
  Radio,
  CheckCircle2,
  X,
  RefreshCw,
  Mic,
  PhoneCall,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import DigitalIdCard from '@/components/tourist/DigitalIdCard';
import SosButton from '@/components/tourist/SosButton';
import MapView from '@/components/maps/MapView';

type LiveSafetyRisk = {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  requires_human_review: boolean;
  signals?: Array<{ code: string; message: string }>;
};

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

export default function CitizenPage() {
  const [greeting, setGreeting] = useState('Good morning');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationConsent, setLocationConsent] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [safetyAlert, setSafetyAlert] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'none' | 'id_pass' | 'efir' | 'attire' | 'voice'>('none');
  
  // Incident & SOS state
  const [activeIncident, setActiveIncident] = useState<any | null>(null);

  // Clothing Profile Form State
  const [attireForm, setAttireForm] = useState({
    top: '',
    bottom: '',
    footwear: '',
    accessories: '',
  });
  const [attireSaved, setAttireSaved] = useState(false);
  const [attireError, setAttireError] = useState<string | null>(null);

  // E-FIR State
  const [efirData, setEfirData] = useState<any | null>(null);
  const [efirLoading, setEfirLoading] = useState(false);
  const [efirError, setEfirError] = useState<string | null>(null);
  const [efirForm, setEfirForm] = useState({
    category: 'Emergency / personal safety',
    occurrenceAt: '',
    narrative: '',
    suspectDescription: '',
    witnessName: '',
    witnessContact: '',
    stolenItems: '',
    injuries: '',
    evidenceReference: '',
    callbackNumber: '',
    declarationAccepted: false,
  });

  // Multilingual Voice State
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [selectedLang, setSelectedLang] = useState('Hindi (हिंदी)');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // The score is returned by the server after it receives actual consented telemetry.
  const [liveSafetyRisk, setLiveSafetyRisk] = useState<LiveSafetyRisk | null>(null);


  // Geofence & Risk State
  const [geofences, setGeofences] = useState<any[]>([]);

  // The credentialed tourist this session belongs to. Loaded from the API so
  // the citizen and authority views always agree on who is being tracked.
  const [tourist, setTourist] = useState<any | null>(null);
  const touristId: string | null = tourist?.touristId ?? null;

  const lastTelemetryRef = useRef<{ lat: number; lng: number; sentAt: number } | null>(null);

  // Load the authenticated identity and published geofences once.
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
        if (data.success && data.tourist) {
          setTourist(data.tourist);
          if (typeof data.tourist.trackingConsent === 'boolean') setLocationConsent(data.tourist.trackingConsent);
        }
      })
      .catch(console.error);

  }, []);

  // Start tracking only after the tourist identity is known. Previously the
  // first GPS callback could arrive before this ID and be silently discarded.
  useEffect(() => {
    if (!locationConsent) {
      setCoords(null);
      setLiveSafetyRisk(null);
      return;
    }
    if (!touristId) return;
    if (!navigator.geolocation) {
      setLocationError('This browser does not support location sharing.');
      return;
    }

    setLocationError(null);
    const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });

          // Send at most once every 15 seconds unless the person moved more
          // than ~25 m. This preserves a useful responder trail without
          // needlessly draining the device or storing duplicate GPS points.
          const last = lastTelemetryRef.current;
          const movedEnough = !last || Math.hypot(lat - last.lat, lng - last.lng) > 0.00023;
          const due = !last || Date.now() - last.sentAt >= 15_000;

          if (movedEnough || due) {
            lastTelemetryRef.current = { lat, lng, sentAt: Date.now() };
            fetch('/api/locations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                touristId,
                lat,
                lng,
                accuracy: pos.coords.accuracy,
                speed: pos.coords.speed,
                source: 'gps',
              }),
            })
              .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => null) }))
              .then(({ ok, data }) => {
                if (!ok) {
                  setLocationError(data?.error || 'Your location could not be saved.');
                  return;
                }
                setLocationError(null);
                if (!data?.safety) return;
                setLiveSafetyRisk({
                  score: data.safety.score,
                  level: data.safety.level,
                  requires_human_review: data.safety.requiresHumanReview,
                  signals: data.safety.signals,
                });
                if (data.breach) {
                  setSafetyAlert(`You entered ${data.breach.zone}. Incident ${data.breach.incidentId} was sent to the authority queue for review.`);
                } else if (data.safetyReview) {
                  setSafetyAlert(`Safety signals require human review. Incident ${data.safetyReview.incidentId} was added to the authority queue.`);
                }
              })
              .catch(() => setLocationError('Your location could not be sent. Check your connection and try again.'));
          }
        },
        (error) => setLocationError(error.code === error.PERMISSION_DENIED ? 'Location sharing is blocked. Allow location access to enable safety monitoring and SOS.' : 'A current GPS location could not be obtained.'),
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
      );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [locationConsent, touristId]);

  // Check geofence status
  const formattedGeofences = geofences.map((g) => ({
    id: g.id || g.name,
    name: g.name,
    type: 'HIGH_RISK' as const,
    severity: (g.severity?.toUpperCase() || 'HIGH') as any,
    coordinates: g.coordinates || g.geometry?.coordinates?.[0]?.map(([lng, lat]: [number, number]) => [lat, lng]) || [],
  }));

  const displayRiskScore = liveSafetyRisk?.score ?? null;
  const displayRiskTier = liveSafetyRisk
    ? ({ low: 'LOW', medium: 'MODERATE', high: 'HIGH', critical: 'CRITICAL' }[liveSafetyRisk.level])
    : 'AWAITING TELEMETRY';
  const riskMessage = liveSafetyRisk?.signals?.[0]?.message
    ?? (coords ? 'Your latest location is being assessed by the safety engine.' : 'Share a current location to begin a safety assessment.');

  // Geofence breach → incident is handled authoritatively server-side in
  // POST /api/locations (with a 30-minute dedup window) when telemetry is
  // ingested, so the client does not create a duplicate incident here.

  const toggleLocationConsent = async () => {
    if (!touristId) return;
    const nextConsent = !locationConsent;
    setLocationError(null);
    try {
      const response = await fetch('/api/tourists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ touristId, trackingConsent: nextConsent }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Your location-sharing preference could not be saved.');
      }
      setLocationConsent(nextConsent);
      setSafetyAlert(nextConsent ? null : 'Location sharing is paused. No new telemetry will be sent until you resume it.');
    } catch (error: any) {
      setLocationError(error.message || 'Your location-sharing preference could not be saved.');
    }
  };

  // Handle Save Clothing Profile
  const handleSaveAttire = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAttireError(null);
      const response = await fetch('/api/attire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ touristId, ...attireForm }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.error || 'The attire record could not be saved.');
      setAttireSaved(true);
      setTimeout(() => {
        setAttireSaved(false);
        setActiveModal('none');
      }, 1500);
    } catch (err: any) {
      setAttireError(err.message || 'The attire record could not be saved.');
    }
  };


  // Handle Generate E-FIR Draft
  const handleGenerateEfir = async () => {
    if (!touristId || !coords) {
      setEfirError('A verified tourist ID and current GPS location are required before filing an E-FIR.');
      return;
    }

    try {
      setEfirLoading(true);
      setEfirError(null);
      const res = await fetch('/api/efir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: activeIncident?.incidentId,
          touristId,
          touristName: tourist?.name,
          passportAadhaar: tourist?.credential?.credentialSubject?.identityDocument?.masked,
          incidentType: activeIncident?.type || 'E-FIR report',
          incidentCategory: efirForm.category,
          occurrenceAt: efirForm.occurrenceAt || null,
          narrative: efirForm.narrative,
          suspectDescription: efirForm.suspectDescription,
          witnesses: efirForm.witnessName ? [{ name: efirForm.witnessName, contact: efirForm.witnessContact }] : [],
          stolenItems: efirForm.stolenItems.split('\n').map((item) => item.trim()).filter(Boolean),
          injuries: efirForm.injuries,
          evidence: efirForm.evidenceReference ? [{ type: 'reference', reference: efirForm.evidenceReference }] : [],
          callbackNumber: efirForm.callbackNumber,
          declarationAccepted: efirForm.declarationAccepted,
          location: { ...coords },
          clothingProfile: [attireForm.top, attireForm.bottom, attireForm.footwear, attireForm.accessories].filter(Boolean).join(', ') || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.efir) {
        setEfirData(data.efir);
      } else {
        setEfirError(data.error || 'The E-FIR could not be submitted.');
      }
    } catch (err) {
      console.error(err);
      setEfirError('The E-FIR could not be submitted. Check your connection and try again.');
    } finally {
      setEfirLoading(false);
    }
  };

  // ── Sarvam AI Speech-to-Text Integration (saarika:v2) ───────
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  const openAuthorityCommand = async () => {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      const session = await response.json();
      if (session.authenticated && ['authority', 'admin'].includes(session.user?.role)) {
        window.location.href = '/authority';
        return;
      }
    } catch {
      // A tourist session is intentionally taken through the authority sign-in flow below.
    }

    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login?redirect=/authority';
  };

  return (
    <div className="minimal-page min-h-screen pb-12 font-sans">
      <header className="minimal-nav">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Prahari</h1>
          <p className="mt-0.5 text-sm text-ink-soft">Your safety dashboard</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={openAuthorityCommand} className="minimal-button minimal-button-primary" title="Open the authority sign-in">
            <Radio className="size-4" /> <span className="hidden sm:inline">Authority desk</span> →
          </button>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
            title="Logout"
            className="minimal-text-link inline-flex size-10 items-center justify-center rounded-lg border border-line hover:text-ink"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-5 pt-8 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          <section className="minimal-card flex flex-col justify-between p-6 lg:col-span-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
                <span className="text-xs font-medium text-ink-soft">
                  Digital ID · {tourist?.touristId || 'Loading…'}
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                  {tourist?.identityStatus?.toUpperCase() || 'LOADING'}
                </span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">{greeting}{tourist?.name ? `, ${tourist.name}` : ""}</h2>
              <p className="max-w-2xl text-sm leading-6 text-ink-soft">
                {tourist?.did
                  ? <>Your Digital Tourist ID (<span className="font-mono">{tourist.did}</span>) is active. Safety analysis begins only after you share a current location.</>
                  : <>No Digital Tourist ID has been issued for this session yet. Complete verification to activate emergency services registration.</>}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm text-ink-soft">
              <span className="flex items-center gap-2">
                <MapPin className="size-4 text-sky-400" /> {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Waiting for current location'}
              </span>
              <button
                onClick={toggleLocationConsent}
                disabled={!touristId}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  locationConsent
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                    : 'border-line bg-surface-2 text-ink-soft'
                }`}
              >
                Location sharing: {locationConsent ? 'On' : 'Off'}
              </button>
            </div>
            {locationError && <p role="alert" className="mt-3 text-xs text-danger">{locationError}</p>}
            {safetyAlert && <p role="status" className="mt-3 rounded border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-ink">{safetyAlert}</p>}
          </section>

          <section className="minimal-card flex flex-col justify-between p-6 text-center">
            <span className="border-b border-line pb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Safety status
            </span>
            <div className="my-5">
              <span className="text-4xl font-semibold tracking-tight text-ink">
                {displayRiskScore ?? '—'} <span className="text-sm font-sans text-ink-soft font-normal">/ 100</span>
              </span>
              <div className="mt-2 flex items-center justify-center">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  displayRiskTier === 'AWAITING TELEMETRY'
                    ? 'bg-surface-2 text-ink-soft border-line'
                    : displayRiskTier === 'CRITICAL'
                    ? 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40'
                    : displayRiskTier === 'HIGH'
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                    : displayRiskTier === 'MODERATE'
                    ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/40'
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                }`}>
                  <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                    displayRiskTier === 'AWAITING TELEMETRY' ? 'bg-slate-400' :
                    displayRiskTier === 'CRITICAL' ? 'bg-red-500' :
                    displayRiskTier === 'HIGH' ? 'bg-amber-500' :
                    displayRiskTier === 'MODERATE' ? 'bg-yellow-500' : 'bg-emerald-400'
                  }`} />
                  {displayRiskTier}
                </span>
              </div>
            </div>
            <p className="text-sm leading-6 text-ink-soft">
              {riskMessage}
            </p>
            <p className="mt-2 text-xs text-ink-soft">
              {liveSafetyRisk ? 'Server-side explainable safety signals' : 'No assessment before telemetry'}
            </p>
          </section>
        </div>

        {/* 4. Signature SOS Button Component */}
        <SosButton
          touristPos={coords ?? undefined}
          touristId={touristId ?? undefined}
          onSosTriggered={(inc) => {
            setActiveIncident(inc);
          }}
          onSosCancelled={() => setActiveIncident(null)}
        />

        {/* 5. Official Digital Tourist ID Pass Component */}
        <DigitalIdCard tourist={tourist} />

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => {
              setActiveModal('efir');
            }}
            className="minimal-card minimal-card-link flex items-center gap-4 p-5 text-left"
          >
            <div className="rounded-lg bg-sky-400/10 p-3 text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <span><span className="block font-semibold text-ink">File an E-FIR</span><span className="mt-1 block text-sm text-ink-soft">Submit a factual report for officer review.</span></span>
          </button>

          {/* AI Attire Profile Button */}
          <button
            onClick={() => setActiveModal('attire')}
            className="minimal-card minimal-card-link flex items-center gap-4 p-5 text-left"
          >
            <div className="rounded-lg bg-sky-400/10 p-3 text-sky-400">
              <Shirt className="w-5 h-5" />
            </div>
            <span><span className="block font-semibold text-ink">Visual attire record</span><span className="mt-1 block text-sm text-ink-soft">Optional details that may help after an emergency.</span></span>
          </button>

        </div>

        <section className="minimal-card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <h3 className="flex items-center gap-2 font-semibold text-ink">
              <Globe className="size-4 text-sky-400" /> Safety map
            </h3>
            <span className="text-xs text-ink-soft">Live location and configured zones</span>
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
        </section>

        <footer className="minimal-footer rounded-xl border border-line">
          <div className="flex items-center gap-2">
            <PhoneCall className="size-4 text-sky-400" />
            <span>Emergency: <strong className="text-ink">112</strong></span>
          </div>
          <span>Tourist helpline: <strong className="text-ink">1363</strong></span>
          <span>Location sharing is optional</span>
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
                <h3 className="font-serif font-bold text-lg text-ink">E-FIR complaint</h3>
                <p className="text-xs text-ink-soft font-mono">Under Section 154 Code of Criminal Procedure (CrPC)</p>
              </div>
            </div>

            {efirError && <p role="alert" className="rounded border border-danger/50 bg-danger/10 p-3 text-xs text-ink">{efirError}</p>}

            {efirLoading ? (
              <div className="py-10 flex flex-col items-center justify-center text-ink-soft text-xs gap-2 font-mono">
                <RefreshCw className="w-6 h-6 animate-spin text-ink" />
                <span>Submitting your report to the district police queue...</span>
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
                <p className="border-t-2 border-line pt-2 text-ink-soft leading-relaxed">
                  {efirData.narrative}
                </p>
                <div className="text-[11px] text-ink-soft">Submitted {new Date(efirData.createdAt).toLocaleString()} · immutable evidence receipt will appear after officer review.</div>
              </div>
            ) : (
              <form
                className="space-y-3 text-xs"
                onSubmit={(event) => { event.preventDefault(); handleGenerateEfir(); }}
              >
                <p className="rounded border border-warning/40 bg-warning/10 p-2 text-ink-soft leading-relaxed">
                  Include facts you personally know. Do not include passwords, bank PINs, or unnecessary identity numbers.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1"><span className="font-bold">Incident category</span>
                    <select value={efirForm.category} onChange={(e) => setEfirForm({ ...efirForm, category: e.target.value })} className="w-full rounded border-2 border-line bg-surface-2 p-2">
                      <option>Emergency / personal safety</option><option>Theft or lost property</option><option>Harassment or assault</option><option>Missing person concern</option><option>Other</option>
                    </select>
                  </label>
                  <label className="space-y-1"><span className="font-bold">When did it happen?</span>
                    <input type="datetime-local" value={efirForm.occurrenceAt} onChange={(e) => setEfirForm({ ...efirForm, occurrenceAt: e.target.value })} className="w-full rounded border-2 border-line bg-surface-2 p-2" />
                  </label>
                </div>
                <label className="block space-y-1"><span className="font-bold">What happened? <span className="text-danger">*</span></span>
                  <textarea required minLength={20} rows={4} value={efirForm.narrative} onChange={(e) => setEfirForm({ ...efirForm, narrative: e.target.value })} placeholder="Describe events in order: who, what, when, and what help is needed." className="w-full rounded border-2 border-line bg-surface-2 p-2" />
                </label>
                <label className="block space-y-1"><span className="font-bold">Suspect / person description (if relevant)</span>
                  <input value={efirForm.suspectDescription} onChange={(e) => setEfirForm({ ...efirForm, suspectDescription: e.target.value })} placeholder="Appearance, vehicle, direction of travel" className="w-full rounded border-2 border-line bg-surface-2 p-2" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1"><span className="font-bold">Witness name</span><input value={efirForm.witnessName} onChange={(e) => setEfirForm({ ...efirForm, witnessName: e.target.value })} className="w-full rounded border-2 border-line bg-surface-2 p-2" /></label>
                  <label className="space-y-1"><span className="font-bold">Witness contact</span><input value={efirForm.witnessContact} onChange={(e) => setEfirForm({ ...efirForm, witnessContact: e.target.value })} className="w-full rounded border-2 border-line bg-surface-2 p-2" /></label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1"><span className="font-bold">Injuries / medical need</span><input value={efirForm.injuries} onChange={(e) => setEfirForm({ ...efirForm, injuries: e.target.value })} className="w-full rounded border-2 border-line bg-surface-2 p-2" /></label>
                  <label className="space-y-1"><span className="font-bold">Callback number</span><input type="tel" value={efirForm.callbackNumber} onChange={(e) => setEfirForm({ ...efirForm, callbackNumber: e.target.value })} className="w-full rounded border-2 border-line bg-surface-2 p-2" /></label>
                </div>
                <label className="block space-y-1"><span className="font-bold">Property / items (one per line)</span><textarea rows={2} value={efirForm.stolenItems} onChange={(e) => setEfirForm({ ...efirForm, stolenItems: e.target.value })} className="w-full rounded border-2 border-line bg-surface-2 p-2" /></label>
                <label className="block space-y-1"><span className="font-bold">Evidence reference</span><input value={efirForm.evidenceReference} onChange={(e) => setEfirForm({ ...efirForm, evidenceReference: e.target.value })} placeholder="Photo ID, CCTV request, document reference (no uploads yet)" className="w-full rounded border-2 border-line bg-surface-2 p-2" /></label>
                <label className="flex gap-2 items-start text-ink-soft"><input required type="checkbox" checked={efirForm.declarationAccepted} onChange={(e) => setEfirForm({ ...efirForm, declarationAccepted: e.target.checked })} className="mt-0.5" /><span>I confirm this information is true to the best of my knowledge and consent to police review.</span></label>
                <button type="submit" className="w-full py-2.5 bg-accent hover:bg-accent-strong text-white font-bold text-xs rounded transition cursor-pointer font-mono">SUBMIT E-FIR FOR POLICE REVIEW</button>
              </form>
            )}

            {efirData && <button
              onClick={() => setActiveModal('none')}
              className="w-full py-2.5 bg-accent hover:bg-accent-strong text-white font-bold text-xs rounded transition cursor-pointer font-mono"
            >
              CLOSE RECEIPT
            </button>}
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
                {attireError && <p role="alert" className="rounded border border-danger/50 bg-danger/10 p-3 text-xs text-ink">{attireError}</p>}
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
                    value={attireForm.footwear}
                    onChange={(e) => setAttireForm({ ...attireForm, footwear: e.target.value })}
                    placeholder="Footwear"
                    className="w-full mb-2 bg-surface-2 border-2 border-line rounded p-2.5 text-ink focus:outline-none focus:border-line"
                  />
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
                        &quot;{transcribedText}&quot;
                      </p>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEfirData(null);
                          setEfirForm((current) => ({ ...current, narrative: transcribedText }));
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

    </div>
  );
}
