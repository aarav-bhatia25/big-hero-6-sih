'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  KeyRound,
  AlertTriangle,
  QrCode,
  Smartphone,
} from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '';
  const errorParam = searchParams.get('error');

  const [activeTab, setActiveTab] = useState<'staff' | 'tourist'>('staff');

  // Staff Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(
    errorParam === 'forbidden' ? 'Access denied. You do not have permission for that page.' : null
  );

  // Tourist Form State
  const [touristIdentifier, setTouristIdentifier] = useState('');
  const [touristLoading, setTouristLoading] = useState(false);
  const [touristError, setTouristError] = useState<string | null>(null);

  const applyStaffPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setStaffError(null);
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffLoading(true);
    setStaffError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) {
        setStaffError(data.error || 'Login failed. Please verify your credentials.');
        return;
      }
      router.push((redirect || '/admin') as any);
      router.refresh();
    } catch (err: any) {
      setStaffError(err.message || 'Connection error. Please try again.');
    } finally {
      setStaffLoading(false);
    }
  };

  const handleTouristLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouristLoading(true);
    setTouristError(null);
    try {
      const res = await fetch('/api/auth/tourist-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: touristIdentifier }),
      });
      const data = await res.json();
      if (!data.success) {
        setTouristError(data.error || 'Identity lookup failed.');
        return;
      }
      router.push((redirect || '/citizen') as any);
      router.refresh();
    } catch (err: any) {
      setTouristError(err.message || 'Connection error. Please try again.');
    } finally {
      setTouristLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col justify-between font-sans">
      {/* Top bar */}
      <div className="border-b-2 border-line px-4 md:px-8 py-3 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 font-black tracking-tight">
          <ShieldCheck className="w-5 h-5 text-accent" /> PRAHARI
        </Link>
        <ThemeToggle />
      </div>

      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-lg space-y-6">
          {/* Brand */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-accent text-accent-ink rounded-nb border-2 border-line shadow-nb mb-1">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-ink">PRAHARI ACCESS PORTAL</h1>
            <p className="text-xs text-ink-soft font-mono">
              Role-Based Access Control • W3C Credential Verification • Govt Dispatch
            </p>
          </div>

          {/* Login Card */}
          <div className="nb-card p-6 md:p-8 space-y-6">
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                className={`nb-btn text-xs ${activeTab === 'staff' ? 'nb-btn-accent' : 'nb-btn-ghost !border-2'}`}
              >
                <Building2 className="w-4 h-4" /> Staff &amp; Authority
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tourist')}
                className={`nb-btn text-xs ${activeTab === 'tourist' ? '!bg-[#15a34a] !text-white' : 'nb-btn-ghost !border-2'}`}
              >
                <Smartphone className="w-4 h-4" /> Tourist &amp; Citizen
              </button>
            </div>

            {/* STAFF */}
            {activeTab === 'staff' && (
              <form onSubmit={handleStaffLogin} className="space-y-4 text-xs">
                {staffError && (
                  <div className="nb-card-flat bg-danger/10 border-danger p-3 flex items-center gap-2 font-bold" style={{ color: 'var(--nb-ink)' }}>
                    <AlertTriangle className="w-4 h-4 shrink-0 text-danger" />
                    <span>{staffError}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="block font-bold uppercase tracking-wider text-[11px]">Official Government Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-ink-soft absolute left-3 top-3 z-10" />
                    <input
                      type="email" required placeholder="officer.sharma@police.gov.in"
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      className="nb-input pl-9 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold uppercase tracking-wider text-[11px]">Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-ink-soft absolute left-3 top-3 z-10" />
                    <input
                      type="password" required placeholder="••••••••••••"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="nb-input pl-9 font-mono text-xs"
                    />
                  </div>
                </div>
                <button type="submit" disabled={staffLoading} className="nb-btn nb-btn-accent w-full !py-3">
                  {staffLoading ? 'Verifying Credentials...' : 'Authenticate & Open Command Console →'}
                </button>

                {/* Presets */}
                <div className="pt-4 border-t-2 border-line space-y-2">
                  <span className="text-[10px] uppercase font-mono text-ink-soft block text-center font-bold">
                    Quick demo credential presets
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => applyStaffPreset('officer.sharma@police.gov.in', 'Officer@123')}
                      className="nb-btn nb-btn-ghost !border-2 !shadow-nb-sm text-[10px] font-mono !px-1">Authority</button>
                    <button type="button" onClick={() => applyStaffPreset('admin@prahari.gov.in', 'Admin@123')}
                      className="nb-btn nb-btn-ghost !border-2 !shadow-nb-sm text-[10px] font-mono !px-1">Admin</button>
                    <button type="button" onClick={() => applyStaffPreset('unit17@dispatch.gov.in', 'Unit17@123')}
                      className="nb-btn nb-btn-ghost !border-2 !shadow-nb-sm text-[10px] font-mono !px-1">Unit #17</button>
                  </div>
                </div>
              </form>
            )}

            {/* TOURIST */}
            {activeTab === 'tourist' && (
              <form onSubmit={handleTouristLogin} className="space-y-4 text-xs">
                {touristError && (
                  <div className="nb-card-flat bg-danger/10 border-danger p-3 flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-danger" />
                    <span>{touristError}</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="block font-bold uppercase tracking-wider text-[11px]">
                    Decentralized Tourist ID (DID) or Tourist ID
                  </label>
                  <div className="relative">
                    <QrCode className="w-4 h-4 text-ink-soft absolute left-3 top-3 z-10" />
                    <input
                      type="text" required placeholder="did:prahari:... or TOUR-7890"
                      value={touristIdentifier} onChange={(e) => setTouristIdentifier(e.target.value)}
                      className="nb-input pl-9 font-mono text-xs"
                    />
                  </div>
                  <p className="text-[10px] text-ink-soft">
                    Tourists verify using proof of DID credential ownership — no password required.
                  </p>
                </div>
                <button type="submit" disabled={touristLoading} className="nb-btn w-full !py-3" style={{ background: '#15a34a', color: '#fff' }}>
                  {touristLoading ? 'Validating DID...' : 'Verify DID & Open Safety Hub →'}
                </button>
                <div className="pt-4 border-t-2 border-line space-y-3">
                  <button type="button" onClick={() => setTouristIdentifier('TOUR-7890')}
                    className="nb-btn nb-btn-ghost !border-2 w-full text-xs font-mono">
                    Quick demo tourist: <strong>TOUR-7890 (Ralston)</strong>
                  </button>
                  <div className="text-center pt-1">
                    <Link href="/onboarding" className="text-ink-soft hover:text-accent transition inline-flex items-center gap-1.5 text-xs font-bold">
                      New Traveller to India? <span className="text-accent-strong font-black underline">Complete Onboarding →</span>
                    </Link>
                  </div>
                </div>
              </form>
            )}
          </div>

          <div className="text-center text-[11px] font-mono text-ink-soft flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Digital Personal Data Protection (DPDP) Act 2023 Aligned</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg text-ink flex items-center justify-center font-mono">Loading authentication portal...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
