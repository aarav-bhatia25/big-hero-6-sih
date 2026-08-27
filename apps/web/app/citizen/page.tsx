'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapPin,
  FileText,
  Shirt,
  Globe,
  Radio,
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
import OfflineMapPackStatus from '@/components/offline/OfflineMapPackStatus';
import EmergencyIdentificationProfile from '@/components/tourist/EmergencyIdentificationProfile';
import TravellerVoiceAssistant from '@/components/tourist/TravellerVoiceAssistant';
import { subscribeToPrahariLive } from '@/lib/supabaseRealtime';

type LiveSafetyRisk = {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  requires_human_review: boolean;
  signals?: Array<{ code: string; message: string }>;
};

type NearbyHazard = {
  id: string;
  hazard: string;
  severity: string;
  reportedSeverity?: string;
  severityColor: string | null;
  likelihood: string | null;
  message: string;
  areaDescription: string;
  source: string;
  language: string | null;
  startsAt: string | null;
  endsAt: string | null;
  distanceKm: number | null;
  approximateCoverageRadiusKm: number | null;
  matchPrecision: 'centroid-and-reported-area' | 'area-not-geocoded';
  officialUrl: string;
};

export default function CitizenPage() {
  const [greeting, setGreeting] = useState('Good morning');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationConsent, setLocationConsent] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [safetyAlert, setSafetyAlert] = useState<string | null>(null);
  const [nearbyHazards, setNearbyHazards] = useState<NearbyHazard[]>([]);
  const [hazardFeedStatus, setHazardFeedStatus] = useState<'available' | 'stale' | 'unavailable' | null>(null);
  const [hazardFeedMessage, setHazardFeedMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'none' | 'id_pass' | 'efir' | 'attire' | 'voice'>('none');
  
  // Incident & SOS state
  const [activeIncident, setActiveIncident] = useState<any | null>(null);

  // Police-ready incident draft state. Prahari does not submit directly to a
  // State/UT police system or claim that an FIR has been registered.
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

  // The score is returned by the server after it receives actual consented telemetry.
  const [liveSafetyRisk, setLiveSafetyRisk] = useState<LiveSafetyRisk | null>(null);
  const [popupsEnabled, setPopupsEnabled] = useState<boolean>(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );


  // Geofence & Risk State
  const [geofences, setGeofences] = useState<any[]>([]);
  const [filedEfirs, setFiledEfirs] = useState<any[]>([]);

  // The credentialed tourist this session belongs to. Loaded from the API so
  // the citizen and authority views always agree on who is being tracked.
  const [tourist, setTourist] = useState<any | null>(null);
  const touristId: string | null = tourist?.touristId ?? null;

  const lastTelemetryRef = useRef<{ lat: number; lng: number; sentAt: number } | null>(null);
  const notifiedHazardIdsRef = useRef(new Set<string>());

  const userLat = coords?.lat ?? 28.6139;
  const userLng = coords?.lng ?? 77.2090;

  const mockNearbyPlaces = useMemo(() => [
    {
      id: 'hosp-apex-1',
      name: 'Apex Emergency Hospital & Trauma Care',
      category: 'hospital' as const,
      lat: userLat + 0.0042,
      lng: userLng + 0.0065,
      address: '24 Main Highway Corridor, Sector 4',
      phone: '102',
      distanceKm: 0.6,
      status: '24/7 ICU & Trauma Unit',
    },
    {
      id: 'police-central-1',
      name: 'Central District Police Station & Tourist Desk',
      category: 'police' as const,
      lat: userLat - 0.0035,
      lng: userLng + 0.0048,
      address: 'Police Lines Rd, District Control Room',
      phone: '112',
      distanceKm: 0.5,
      status: '24/7 Patrol & Tourist Assistance',
    },
    {
      id: 'hosp-stjude-2',
      name: 'St. Jude Super Specialty Hospital',
      category: 'hospital' as const,
      lat: userLat - 0.0078,
      lng: userLng - 0.0062,
      address: 'Ring Road Junction, Block B',
      phone: '+91 98110 99887',
      distanceKm: 1.1,
      status: '24/7 Emergency & Burn Unit',
    },
    {
      id: 'police-subdiv-2',
      name: 'Sub-Divisional Police Post & PCR Unit',
      category: 'police' as const,
      lat: userLat + 0.0085,
      lng: userLng - 0.0055,
      address: 'Civic Center Market Complex',
      phone: '+91 98765 22100',
      distanceKm: 1.3,
      status: 'Rapid Response Mobile Patrol',
    },
    {
      id: 'fire-station-4',
      name: 'Municipal Fire & Rescue Station #4',
      category: 'fire_station' as const,
      lat: userLat + 0.0068,
      lng: userLng + 0.0092,
      address: 'Industrial Safety Corridor, Gate 3',
      phone: '101',
      distanceKm: 1.2,
      status: 'Disaster Rescue & Fire Appliance',
    },
    {
      id: 'prahari-kiosk-1',
      name: 'Prahari Tourist Safe Kiosk & Mesh Node',
      category: 'safety_zone' as const,
      lat: userLat - 0.0022,
      lng: userLng - 0.0031,
      address: 'Tourist Transit Center, Gate 2',
      phone: '1363',
      distanceKm: 0.3,
      status: 'Verified Safe Haven & SOS Booster',
    },
  ], [userLat, userLng]);

  // Load the authenticated identity, published geofences, and filed e-FIRs.
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    let cancelled = false;
    void (async () => {
      try {
        const authResponse = await fetch('/api/auth/me', { cache: 'no-store' });
        const auth = await authResponse.json().catch(() => null);
        const role = auth?.user?.role;
        if (!authResponse.ok || !auth?.authenticated || role !== 'tourist') {
          const destination = ['authority', 'admin', 'responder'].includes(role) ? '/authority' : '/login?redirect=/citizen';
          window.location.assign(destination);
          return;
        }

        const [geofenceResponse, touristResponse, efirResponse] = await Promise.all([
          fetch('/api/geofences'),
          fetch('/api/tourists'),
          fetch('/api/efir'),
        ]);
        const [geofenceData, touristData, efirData] = await Promise.all([
          geofenceResponse.json().catch(() => null),
          touristResponse.json().catch(() => null),
          efirResponse.json().catch(() => null),
        ]);
        if (cancelled) return;

        if (!touristResponse.ok || !touristData?.success || !touristData?.tourist) {
          window.location.assign('/login?redirect=/citizen');
          return;
        }
        if (geofenceResponse.ok && geofenceData?.geofences) setGeofences(geofenceData.geofences);
        if (efirResponse.ok && efirData?.efirs) setFiledEfirs(efirData.efirs);
        setTourist(touristData.tourist);
        if (typeof touristData.tourist.trackingConsent === 'boolean') setLocationConsent(touristData.tourist.trackingConsent);
      } catch (error) {
        console.error('Unable to establish the traveller session:', error);
        window.location.assign('/login?redirect=/citizen');
      }
    })();

    return () => { cancelled = true; };

  }, []);

  // Realtime subscription for live status changes on filed reports & incidents
  useEffect(() => {
    if (!touristId) return;
    const fetchLatestEfirs = () => {
      fetch('/api/efir')
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.efirs)) {
            setFiledEfirs(data.efirs);
          }
        })
        .catch(() => null);
    };

    const unsubscribe = subscribeToPrahariLive({
      onIncidentUpdated: fetchLatestEfirs,
      onIncidentCreated: fetchLatestEfirs,
    });
    const intervalId = window.setInterval(fetchLatestEfirs, 10_000);

    return () => {
      unsubscribe();
      window.clearInterval(intervalId);
    };
  }, [touristId]);

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
          try {
            localStorage.setItem('prahari_last_known_coords', JSON.stringify({ lat, lng }));
          } catch {}

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
                if (data.hazards) {
                  const hazards = Array.isArray(data.hazards.alerts) ? data.hazards.alerts as NearbyHazard[] : [];
                  setNearbyHazards(hazards);
                  setHazardFeedStatus(data.hazards.status || 'unavailable');
                  setHazardFeedMessage(data.hazards.error || null);

                  const newHazard = hazards.find((hazard) => !notifiedHazardIdsRef.current.has(hazard.id));
                  hazards.forEach((hazard) => notifiedHazardIdsRef.current.add(hazard.id));
                  if (newHazard && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    new Notification(`Prahari: ${newHazard.hazard}`, {
                      body: `${newHazard.severity} advisory for ${newHazard.areaDescription}. Open Prahari for official guidance.`,
                      tag: `prahari-hazard-${newHazard.id}`,
                    });
                  }
                }
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
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setLocationError('Location access is blocked by browser permissions. Emergency fallback coordinates will be used if you trigger SOS.');
          } else {
            // Attempt low-accuracy fallback position
            navigator.geolocation.getCurrentPosition(
              (p) => {
                const lat = p.coords.latitude;
                const lng = p.coords.longitude;
                setCoords({ lat, lng });
                try { localStorage.setItem('prahari_last_known_coords', JSON.stringify({ lat, lng })); } catch {}
                setLocationError(null);
              },
              () => setLocationError('GPS signal weak/unavailable indoors. Emergency fallback coordinates ready.'),
              { enableHighAccuracy: false, timeout: 5000 }
            );
          }
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 }
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

  const enableHazardNotifications = async () => {
    if (typeof Notification === 'undefined') {
      setHazardFeedMessage('This browser does not support local alert pop-ups. In-app alerts remain available.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setPopupsEnabled(true);
      setHazardFeedMessage('Local alert pop-ups are enabled while Prahari is open.');
    } else {
      setPopupsEnabled(false);
      setHazardFeedMessage('Local alert pop-ups were not enabled. You can still see official alerts in this dashboard.');
    }
  };

  // Handle creation of a factual, police-ready incident draft.
  const handleGenerateEfir = async () => {
    if (!touristId || !coords) {
      setEfirError('A verified tourist ID and current GPS location are required before preparing this report draft.');
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
          incidentType: activeIncident?.type || 'Incident information',
          reportType: efirForm.category === 'Missing person concern' ? 'MISSING_PERSON_INFORMATION_DRAFT' : 'INCIDENT_INFORMATION_DRAFT',
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
          clothingProfile: tourist?.clothingProfile?.summary || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.efir) {
        setEfirData(data.efir);
      } else {
        setEfirError(data.error || 'The report draft could not be saved.');
      }
    } catch (err) {
      console.error(err);
      setEfirError('The report draft could not be saved. Check your connection and try again.');
    } finally {
      setEfirLoading(false);
    }
  };

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
          <h1 className="ui-display text-2xl text-ink">Prahari</h1>
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
                <span className="rounded-full border border-emerald-600/20 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {tourist?.identityStatus?.toUpperCase() || 'LOADING'}
                </span>
              </div>
              <h2 className="ui-display text-3xl text-ink">{greeting}{tourist?.name ? `, ${tourist.name}` : ""}</h2>
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
                    ? 'border-emerald-600/25 bg-emerald-50 text-emerald-700'
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

        <section className="minimal-card p-5 space-y-4" aria-live="polite">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`p-2.5 rounded-xl border shrink-0 ${
                nearbyHazards.length
                  ? 'border-amber-200 bg-amber-50 text-amber-600'
                  : hazardFeedStatus === 'unavailable'
                  ? 'border-stone-200 bg-stone-100 text-stone-600'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-600'
              }`}>
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink text-sm">Official local hazard alerts</h3>
                  <span className="minimal-eyebrow !text-[10px] text-stone-500">NDMA SACHET</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-soft leading-relaxed">
                  Real-time disaster and safety advisories mapped to your shared GPS position.
                </p>
              </div>
            </div>

            {typeof Notification !== 'undefined' && !popupsEnabled && (
              <button
                onClick={enableHazardNotifications}
                className="minimal-button minimal-button-secondary text-xs shrink-0 self-start sm:self-center"
              >
                Enable pop-ups
              </button>
            )}
          </div>

          <div className="text-xs text-ink-soft">
            {hazardFeedStatus === 'unavailable' ? (
              <p className="py-1 text-ink-soft">{hazardFeedMessage || 'The official alert feed is unavailable. Check NDMA SACHET directly if you are in danger.'}</p>
            ) : nearbyHazards.length ? (
              <div className="space-y-3 pt-1">
                {nearbyHazards.slice(0, 3).map((hazard) => (
                  <article key={hazard.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-amber-950 font-semibold">{hazard.hazard}</strong>
                      <span className="rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold font-mono text-amber-900">
                        {hazard.severity}
                        {hazard.reportedSeverity && hazard.reportedSeverity.toUpperCase() !== hazard.severity ? ` · ${hazard.reportedSeverity}` : ''}
                      </span>
                    </div>
                    <p className="leading-relaxed text-amber-900">{hazard.message}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-800/80 pt-1">
                      <span>{hazard.source} · {hazard.areaDescription}{typeof hazard.distanceKm === 'number' ? ` (${hazard.distanceKm.toFixed(1)} km away)` : ''}</span>
                      <a href={hazard.officialUrl} target="_blank" rel="noreferrer" className="font-semibold text-amber-900 underline hover:text-amber-950">
                        View official guidance →
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 py-1 text-stone-600 font-medium">
                <span className="inline-block size-2 rounded-full bg-emerald-500" />
                <span>No active NDMA hazard advisories found near your location.</span>
              </div>
            )}
            {hazardFeedStatus === 'stale' && <p className="mt-2 text-[11px] text-amber-700">{hazardFeedMessage}</p>}
          </div>
        </section>

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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => {
              setActiveModal('efir');
            }}
            className="minimal-card minimal-card-link flex items-center gap-4 p-5 text-left"
          >
            <div className="rounded-lg bg-sky-400/10 p-3 text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <span><span className="block font-semibold text-ink">Prepare police-ready report</span><span className="mt-1 block text-sm text-ink-soft">Create a factual draft for authorised review; it is not a police filing.</span></span>
          </button>

          <button
            onClick={() => setActiveModal('attire')}
            className="minimal-card minimal-card-link flex items-center gap-4 p-5 text-left"
          >
            <div className="rounded-lg bg-sky-400/10 p-3 text-sky-400">
              <Shirt className="w-5 h-5" />
            </div>
            <span><span className="block font-semibold text-ink">Emergency identification</span><span className="mt-1 block text-sm text-ink-soft">Photo or text becomes a structured description for authorised cases.</span></span>
          </button>

          <button
            onClick={() => setActiveModal('voice')}
            className="minimal-card minimal-card-link flex items-center gap-4 p-5 text-left"
          >
            <div className="rounded-lg bg-red-500/10 p-3 text-red-500">
              <Mic className="w-5 h-5" />
            </div>
            <span><span className="block font-semibold text-ink">Voice emergency help</span><span className="mt-1 block text-sm text-ink-soft">Speak, translate, replay, or send a reviewed voice SOS.</span></span>
          </button>

        </div>

        {/* Filed Incident Information & e-FIR Reports */}
        <section className="minimal-card space-y-4 p-5" aria-labelledby="filed-efirs-title">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <div>
              <h3 id="filed-efirs-title" className="flex items-center gap-2 font-semibold text-ink">
                <FileText className="size-4 text-emerald-600" /> Filed incident reports &amp; e-FIR drafts
              </h3>
              <p className="mt-0.5 text-xs text-ink-soft">
                BNSS Section 173 information drafts prepared under your verified identity.
              </p>
            </div>
            <span className="nb-chip border border-line bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink">
              {filedEfirs.length} report{filedEfirs.length === 1 ? '' : 's'} on record
            </span>
          </div>

          {filedEfirs.length === 0 ? (
            <div className="py-6 text-center text-xs text-ink-soft">
              No e-FIR drafts filed yet. Click &quot;Prepare police-ready report&quot; above to create a factual draft for authorised review.
            </div>
          ) : (
            <div className="space-y-3">
              {filedEfirs.map((efir) => (
                <div key={efir.efirId ?? efir._incidentId} className="rounded-xl border border-line bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-stone-400 transition">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink">{efir.efirId}</span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold font-mono ${
                        efir.status === 'DRAFT_REVIEWED' || efir.policeVerification === 'AUTHORISED_REVIEWED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {efir.status === 'DRAFT_REVIEWED' || efir.policeVerification === 'AUTHORISED_REVIEWED' ? 'REVIEWED BY AUTHORITIES' : 'PENDING AUTHORISED REVIEW'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-ink truncate">{efir.incidentCategory ?? efir.incidentType}</p>
                    <p className="text-[11px] text-ink-soft line-clamp-1">{efir.narrative}</p>
                    <div className="text-[10px] font-mono text-ink-soft">
                      Filed: {new Date(efir.createdAt ?? efir.reportedAt ?? Date.now()).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEfirData(efir);
                      setActiveModal('efir');
                    }}
                    className="minimal-button minimal-button-secondary text-xs shrink-0 self-start sm:self-center"
                  >
                    View Report Receipt
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="minimal-card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
            <h3 className="flex items-center gap-2 font-semibold text-ink">
              <Globe className="size-4 text-sky-400" /> Safety Map & Emergency Facilities
            </h3>
            <span className="text-xs text-ink-soft">
              {coords ? 'Showing nearby hospitals & police stations near your location' : 'Showing emergency services in your area'}
            </span>
          </div>

          <MapView
            touristPos={coords ?? { lat: userLat, lng: userLng }}
            geofences={formattedGeofences}
            nearbyPlaces={mockNearbyPlaces}
            incidents={activeIncident ? [{
              id: activeIncident.incidentId,
              incidentId: activeIncident.incidentId,
              type: activeIncident.type,
              lat: activeIncident.location.lat,
              lng: activeIncident.location.lng,
              severity: activeIncident.severity,
            }] : []}
          />

          {/* Nearby Emergency Services Quick Action Grid */}
          <div className="mt-4 pt-4 border-t border-line space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Nearby Emergency Facilities ({mockNearbyPlaces.length})
              </h4>
              <span className="text-[11px] text-ink-soft">Verified Data • Direct Call</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {mockNearbyPlaces.map((place) => (
                <div key={place.id} className="p-3 rounded-xl border border-line bg-surface-2 hover:border-ink-soft/40 transition flex flex-col justify-between gap-2">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                        place.category === 'hospital' ? 'bg-rose-600' :
                        place.category === 'police' ? 'bg-blue-600' :
                        place.category === 'fire_station' ? 'bg-orange-600' : 'bg-emerald-600'
                      }`}>
                        {place.category === 'hospital' ? '🏥 Hospital' :
                         place.category === 'police' ? '🚓 Police Station' :
                         place.category === 'fire_station' ? '🚒 Fire Station' : '🛡️ Safe Zone'}
                      </span>
                      <span className="text-[11px] font-semibold text-ink-soft">{place.distanceKm} km away</span>
                    </div>
                    <h5 className="font-bold text-xs text-ink leading-snug">{place.name}</h5>
                    <p className="text-[11px] text-ink-soft mt-0.5">{place.address}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-line/60">
                    <span className="text-[10px] text-emerald-600 font-semibold">{place.status}</span>
                    <a
                      href={`tel:${place.phone}`}
                      className="px-2.5 py-1 rounded-lg bg-accent text-accent-ink text-[11px] font-semibold flex items-center gap-1 hover:opacity-90 transition shadow-sm"
                    >
                      <PhoneCall className="size-3" /> Call {place.phone}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <OfflineMapPackStatus />

        <footer className="minimal-footer rounded-xl border border-line">
          <div className="flex items-center gap-2">
            <PhoneCall className="size-4 text-sky-400" />
            <span>Emergency: <strong className="text-ink">112</strong></span>
          </div>
          <span>Tourist helpline: <strong className="text-ink">1363</strong></span>
          <span>Location sharing is optional</span>
        </footer>
      </main>

      {/* Police-ready incident draft */}
      {activeModal === 'efir' && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/40 p-4 sm:p-6 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex min-h-full items-center justify-center py-6 sm:py-10">
            <div className="relative w-full max-w-lg rounded-2xl border border-line bg-surface p-5 sm:p-7 shadow-2xl text-ink space-y-5 my-auto">
              <button
                onClick={() => setActiveModal('none')}
                className="minimal-button minimal-button-secondary absolute top-4 right-4 !p-2 !min-h-0 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

            <div className="flex items-center gap-3 border-b border-line pb-4">
              <div className="p-2.5 rounded-xl border border-line bg-surface-2 text-ink">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="ui-display text-xl text-ink">Police-ready incident draft</h3>
                <p className="minimal-eyebrow mt-0.5">BNSS 2023, section 173 · not a police receipt</p>
              </div>
            </div>

            {efirError && (
              <div role="alert" className="nb-card-flat bg-danger/10 border-danger p-3 text-xs text-ink font-semibold">
                {efirError}
              </div>
            )}

            {efirLoading ? (
              <div className="py-10 flex flex-col items-center justify-center text-ink-soft text-xs gap-2 font-mono">
                <RefreshCw className="w-6 h-6 animate-spin text-ink" />
                <span>Saving your report draft for authorised review…</span>
              </div>
            ) : efirData ? (
              <div className="space-y-3 text-xs minimal-card !p-4">
                <div className="flex justify-between border-b border-line pb-2 font-mono">
                  <span className="text-ink-soft">PRAHARI REPORT DRAFT:</span>
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
                  <span className="font-bold text-amber-600">{efirData.incidentType}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-ink-soft">GPS Coordinates:</span>
                  <span className="text-ink">{efirData.location?.lat?.toFixed(4)}, {efirData.location?.lng?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-soft">Visual Attire Record:</span>
                  <span className="text-ink">{efirData.clothingProfile}</span>
                </div>
                <div className="flex justify-between border-t border-line pt-2 text-emerald-700 font-bold font-mono">
                  <span>AUTHORISED REVIEW:</span>
                  <span>{efirData.policeVerification}</span>
                </div>
                <p className="border-t border-line pt-2 text-ink-soft leading-relaxed">
                  Police filing status: <strong className="text-ink">{efirData.policeFilingStatus ?? 'NOT_FILED_WITH_POLICE'}</strong>. Use the relevant State/UT police process to lodge a complaint; electronic information must meet the required signature process before it is taken on record.
                </p>
                <p className="border-t border-line pt-2 text-ink-soft leading-relaxed">
                  {efirData.narrative}
                </p>
                <div className="text-[11px] text-ink-soft">Saved {new Date(efirData.createdAt).toLocaleString()} · any integrity anchor belongs to this Prahari draft and is not a police acknowledgement.</div>
              </div>
            ) : (
              <form
                className="space-y-4 text-xs"
                onSubmit={(event) => { event.preventDefault(); handleGenerateEfir(); }}
              >
                <div className="nb-card-flat bg-amber-500/10 border-amber-500/30 p-3 text-xs leading-relaxed text-amber-900">
                  Include facts you personally know. Do not include passwords, bank PINs, or unnecessary identity numbers. This saves a Prahari draft for authorised review; it does not lodge an FIR with police.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1.5"><span className="font-bold text-ink">Incident category</span>
                    <select value={efirForm.category} onChange={(e) => setEfirForm({ ...efirForm, category: e.target.value })} className="nb-input text-xs">
                      <option>Emergency / personal safety</option><option>Theft or lost property</option><option>Harassment or assault</option><option>Missing person concern</option><option>Other</option>
                    </select>
                  </label>
                  <label className="space-y-1.5"><span className="font-bold text-ink">When did it happen?</span>
                    <input type="datetime-local" value={efirForm.occurrenceAt} onChange={(e) => setEfirForm({ ...efirForm, occurrenceAt: e.target.value })} className="nb-input text-xs" />
                  </label>
                </div>
                <label className="block space-y-1.5"><span className="font-bold text-ink">What happened? <span className="text-rose-600">*</span></span>
                  <textarea required minLength={20} rows={4} value={efirForm.narrative} onChange={(e) => setEfirForm({ ...efirForm, narrative: e.target.value })} placeholder="Describe events in order: who, what, when, and what help is needed." className="nb-input text-xs" />
                </label>
                <label className="block space-y-1.5"><span className="font-bold text-ink">Suspect / person description (if relevant)</span>
                  <input value={efirForm.suspectDescription} onChange={(e) => setEfirForm({ ...efirForm, suspectDescription: e.target.value })} placeholder="Appearance, vehicle, direction of travel" className="nb-input text-xs" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1.5"><span className="font-bold text-ink">Witness name</span><input value={efirForm.witnessName} onChange={(e) => setEfirForm({ ...efirForm, witnessName: e.target.value })} className="nb-input text-xs" /></label>
                  <label className="space-y-1.5"><span className="font-bold text-ink">Witness contact</span><input value={efirForm.witnessContact} onChange={(e) => setEfirForm({ ...efirForm, witnessContact: e.target.value })} className="nb-input text-xs" /></label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1.5"><span className="font-bold text-ink">Injuries / medical need</span><input value={efirForm.injuries} onChange={(e) => setEfirForm({ ...efirForm, injuries: e.target.value })} className="nb-input text-xs" /></label>
                  <label className="space-y-1.5"><span className="font-bold text-ink">Callback number</span><input type="tel" value={efirForm.callbackNumber} onChange={(e) => setEfirForm({ ...efirForm, callbackNumber: e.target.value })} className="nb-input text-xs" /></label>
                </div>
                <label className="block space-y-1.5"><span className="font-bold text-ink">Property / items (one per line)</span><textarea rows={2} value={efirForm.stolenItems} onChange={(e) => setEfirForm({ ...efirForm, stolenItems: e.target.value })} className="nb-input text-xs" /></label>
                <label className="block space-y-1.5"><span className="font-bold text-ink">Evidence reference</span><input value={efirForm.evidenceReference} onChange={(e) => setEfirForm({ ...efirForm, evidenceReference: e.target.value })} placeholder="Photo ID, CCTV request, document reference (no uploads yet)" className="nb-input text-xs" /></label>
                <label className="flex gap-2 items-start text-xs text-ink-soft"><input required type="checkbox" checked={efirForm.declarationAccepted} onChange={(e) => setEfirForm({ ...efirForm, declarationAccepted: e.target.checked })} className="mt-0.5 rounded border-line" /><span>I confirm these facts are true to the best of my knowledge and understand this is not an FIR filing or police acknowledgement.</span></label>
                <button type="submit" className="minimal-button minimal-button-primary w-full !py-3 text-xs font-semibold">SAVE DRAFT FOR AUTHORISED REVIEW</button>
              </form>
            )}

            {efirData && <button
              onClick={() => setActiveModal('none')}
              className="minimal-button minimal-button-secondary w-full"
            >
              CLOSE DRAFT
            </button>}
          </div>
        </div>
      </div>
    )}

      {activeModal === 'attire' && (
        <EmergencyIdentificationProfile
          touristId={touristId}
          profile={tourist?.clothingProfile}
          onClose={() => setActiveModal('none')}
          onSaved={(profile) => setTourist((current: any) => current ? { ...current, clothingProfile: profile } : current)}
        />
      )}

      {activeModal === 'voice' && (
        <TravellerVoiceAssistant
          touristId={touristId}
          coords={coords}
          preferredLanguage={tourist?.preferences?.language}
          onClose={() => setActiveModal('none')}
          onVoiceSos={(incident) => setActiveIncident(incident)}
          onUseInReport={(text) => {
            setEfirData(null);
            setEfirForm((current) => ({ ...current, narrative: text }));
            setActiveModal('efir');
          }}
        />
      )}

    </div>
  );
}
