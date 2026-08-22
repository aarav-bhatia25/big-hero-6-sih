'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle,
  Fingerprint, BookUser, Loader2, KeyRound, FlaskConical, Copy,
} from 'lucide-react';

type Method = 'aadhaar' | 'passport';
type Step = 'method' | 'details' | 'otp' | 'consent' | 'done';

const SPECIMEN = {
  line1: ('P<UTO' + 'ERIKSSON<<ANNA<MARIA').padEnd(44, '<'),
  line2: 'L898902C36UTO7408122F3404159ZE184226B<<<<<16',
};

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<Method>('aadhaar');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [mrz1, setMrz1] = useState('');
  const [mrz2, setMrz2] = useState('');

  const [sessionId, setSessionId] = useState('');
  const [maskedTarget, setMaskedTarget] = useState('');
  const [sandboxOtp, setSandboxOtp] = useState('');
  const [otp, setOtp] = useState('');

  const [trackingConsent, setTrackingConsent] = useState(true);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [hotel, setHotel] = useState('');

  const [issued, setIssued] = useState<any | null>(null);

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  async function handleInitiate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const data = await post('/api/kyc/initiate',
        method === 'aadhaar'
          ? { method, fullName, aadhaarNumber: aadhaar }
          : { method, mrzLine1: mrz1, mrzLine2: mrz2 });

      if (!data.ok) { setError(data.error); return; }

      setSessionId(data.sessionId);
      if (data.requiresOtp) {
        setMaskedTarget(data.maskedTarget ?? '');
        setSandboxOtp(data.sandboxOtp ?? '');
        setStep('otp');
      } else {
        if (data.subject?.fullName) setFullName(data.subject.fullName);
        setStep('consent');
      }
    } catch { setError('Could not reach the verification service.'); }
    finally { setBusy(false); }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const data = await post('/api/kyc/verify', { sessionId, otp });
      if (!data.ok) {
        setError(data.error);
        if (data.locked) { setStep('details'); setOtp(''); }
        return;
      }
      setStep('consent');
    } catch { setError('Could not reach the verification service.'); }
    finally { setBusy(false); }
  }

  async function handleIssue(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const data = await post('/api/identity/issue', {
        sessionId,
        otp: method === 'aadhaar' ? otp : undefined,
        trackingConsent,
        ...(contactName && contactPhone
          ? { emergencyContacts: [{ name: contactName, phone: contactPhone, relationship: 'Primary' }] }
          : {}),
        ...(hotel ? { accommodation: { hotelName: hotel, address: '', city: '' } } : {}),
      });
      if (!data.ok) { setError(data.error); return; }
      setIssued(data);
      setStep('done');
    } catch { setError('Could not issue the credential.'); }
    finally { setBusy(false); }
  }

  const stepIndex = ['method', 'details', 'otp', 'consent', 'done'].indexOf(step);

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-brand-600">
          <ShieldCheck size={19} /> Prahari
        </Link>

        {/* Sandbox notice — must never be removed while the provider is simulated */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <FlaskConical className="mt-0.5 shrink-0 text-amber-600" size={18} />
          <div className="text-xs text-amber-900">
            <strong className="block text-sm">Sandbox verification</strong>
            Aadhaar checksum and passport MRZ check digits are validated for real. The
            identity lookup itself is simulated — this is not a UIDAI authentication and
            the credential issued is not government-recognised.
          </div>
        </div>

        <div className="mt-8 text-center">
          <span className="text-sm font-bold text-brand-600">DIGITAL TOURIST ID</span>
          <h1 className="mt-2 text-3xl font-bold">Travel safer, on your terms.</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">
            Create a consent-based, verifiable tourist credential. Your personal
            information is shared only when you authorise it or during an active emergency.
          </p>
        </div>

        {/* Progress */}
        <div className="mt-8 flex items-center gap-2">
          {['Identity', 'Verify', 'Consent', 'Issued'].map((label, i) => {
            const reached = (step === 'otp' ? 1 : stepIndex > 1 ? stepIndex - 1 : stepIndex) >= i;
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <div className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  reached ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {i + 1}
                </div>
                <span className={`text-xs font-semibold ${reached ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
                {i < 3 && <div className={`h-px flex-1 ${reached ? 'bg-brand-600' : 'bg-slate-200'}`} />}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {/* STEP 1 — method */}
        {step === 'method' && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {([
              { id: 'aadhaar' as const, icon: Fingerprint, title: 'Indian citizen', sub: 'Verify with Aadhaar + OTP' },
              { id: 'passport' as const, icon: BookUser, title: 'Foreign national', sub: 'Verify with passport MRZ' },
            ]).map(({ id, icon: Icon, title, sub }) => (
              <button
                key={id}
                onClick={() => { setMethod(id); setStep('details'); setError(null); }}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-left transition hover:border-brand-500 hover:shadow-md"
              >
                <Icon className="text-brand-600" size={26} />
                <h2 className="mt-4 font-bold">{title}</h2>
                <p className="mt-1 text-sm text-slate-500">{sub}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-600">
                  Continue <ArrowRight size={15} />
                </span>
              </button>
            ))}
          </div>
        )}

        {/* STEP 2 — details */}
        {step === 'details' && (
          <form onSubmit={handleInitiate} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            {method === 'aadhaar' ? (
              <>
                <div>
                  <label className="text-sm font-semibold">Full name (as on Aadhaar)</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                    placeholder="Ralston Fernandes" />
                </div>
                <div>
                  <label className="text-sm font-semibold">Aadhaar number</label>
                  <input value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} required inputMode="numeric"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm outline-none focus:border-brand-500"
                    placeholder="XXXX XXXX XXXX" maxLength={14} />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Validated with the Verhoeff checksum. Never stored — only a salted hash is kept.
                  </p>
                  <button type="button" onClick={() => setAadhaar('234567890124')}
                    className="mt-2 text-xs font-semibold text-brand-600 underline">
                    Use a valid sandbox number
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-semibold">Passport MRZ — line 1</label>
                  <input value={mrz1} onChange={(e) => setMrz1(e.target.value)} required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-xs uppercase outline-none focus:border-brand-500"
                    placeholder="P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<" />
                </div>
                <div>
                  <label className="text-sm font-semibold">Passport MRZ — line 2</label>
                  <input value={mrz2} onChange={(e) => setMrz2(e.target.value)} required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-xs uppercase outline-none focus:border-brand-500"
                    placeholder="L898902C36UTO7408122F3404159ZE184226B<<<<<16" />
                </div>
                <p className="text-xs text-slate-500">
                  The two 44-character lines at the bottom of the photo page. Check digits are
                  verified against ICAO 9303 — a mistyped line is rejected.
                </p>
                <button type="button" onClick={() => { setMrz1(SPECIMEN.line1); setMrz2(SPECIMEN.line2); }}
                  className="text-xs font-semibold text-brand-600 underline">
                  Use the ICAO specimen passport
                </button>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setStep('method'); setError(null); }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">
                <ArrowLeft size={15} /> Back
              </button>
              <button type="submit" disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                {busy ? 'Verifying…' : 'Verify identity'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3 — OTP */}
        {step === 'otp' && (
          <form onSubmit={handleOtp} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <KeyRound className="text-brand-600" size={22} />
              <div>
                <h2 className="font-bold">Enter the OTP</h2>
                <p className="text-sm text-slate-500">Sent to the mobile linked with {maskedTarget}</p>
              </div>
            </div>

            {sandboxOtp && (
              <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                <div className="text-xs text-amber-900">
                  <strong>Sandbox OTP:</strong> <span className="font-mono text-base font-bold">{sandboxOtp}</span>
                  <span className="mt-0.5 block">No SMS is sent — a licensed provider would deliver this.</span>
                </div>
                <button type="button" onClick={() => setOtp(sandboxOtp)}
                  className="flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white">
                  <Copy size={13} /> Fill
                </button>
              </div>
            )}

            <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} required
              inputMode="numeric" maxLength={6}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-brand-500"
              placeholder="000000" />
            <p className="text-xs text-slate-500">Expires in 10 minutes. Three incorrect attempts locks the session.</p>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setStep('details'); setOtp(''); setError(null); }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">
                <ArrowLeft size={15} /> Back
              </button>
              <button type="submit" disabled={busy || otp.length !== 6}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {busy ? 'Checking…' : 'Confirm OTP'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4 — consent */}
        {step === 'consent' && (
          <form onSubmit={handleIssue} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              <CheckCircle2 size={17} /> Identity verified{fullName ? ` — ${fullName}` : ''}
            </div>

            <h2 className="pt-1 font-bold">Emergency contact <span className="font-normal text-slate-400">(optional)</span></h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name"
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+91 98765 43210"
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />
            </div>
            <input value={hotel} onChange={(e) => setHotel(e.target.value)} placeholder="Accommodation (optional)"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500" />

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input type="checkbox" checked={trackingConsent} onChange={(e) => setTrackingConsent(e.target.checked)}
                className="mt-0.5 size-4 accent-brand-600" />
              <span className="text-sm">
                <strong className="block">Share my location with authorities</strong>
                <span className="text-slate-500">
                  Location is visible to authorities only during an active emergency or an
                  authorised missing-person investigation. Revocable at any time.
                </span>
              </span>
            </label>

            <button type="submit" disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {busy ? 'Issuing credential…' : 'Issue my Digital Tourist ID'}
            </button>
          </form>
        )}

        {/* STEP 5 — done */}
        {step === 'done' && issued && (
          <div className="mt-6 space-y-4 rounded-2xl border border-emerald-300 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Credential issued</h2>
                <p className="text-sm text-slate-500">
                  {issued.reissued ? 'Existing identity re-verified.' : 'Your Digital Tourist ID is active.'}
                </p>
              </div>
            </div>

            <dl className="grid gap-2 rounded-xl bg-slate-50 p-4 text-xs">
              {[
                ['Tourist ID', issued.touristId],
                ['DID', issued.did],
                ['Credential hash', issued.credentialHash],
                ['Valid until', new Date(issued.expiresAt).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k as string} className="flex flex-wrap justify-between gap-2">
                  <dt className="font-semibold text-slate-500">{k}</dt>
                  <dd className="break-all font-mono text-slate-800">{v as string}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap gap-3">
              <Link href="/citizen"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white">
                Open my safety dashboard <ArrowRight size={15} />
              </Link>
              <a href={`/api/identity/verify/${encodeURIComponent(issued.did)}`} target="_blank" rel="noreferrer"
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">
                Verify credential
              </a>
            </div>
          </div>
        )}

        <p className="mt-6 flex justify-center gap-2 text-center text-xs text-slate-500">
          <CheckCircle2 size={15} className="text-emerald-600" /> You can revoke consent at any time.
        </p>
      </div>
    </main>
  );
}
