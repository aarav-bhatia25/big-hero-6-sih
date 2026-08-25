'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Lock,
  Mail,
  KeyRound,
  AlertTriangle,
  QrCode,
  Smartphone,
} from 'lucide-react';

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

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          const role = data.user.role;
          if (redirect && redirect.startsWith('/')) {
            router.replace(redirect as any);
          } else if (role === 'admin' || role === 'authority') {
            router.replace('/authority');
          } else if (role === 'responder') {
            router.replace('/dashboard');
          } else {
            router.replace('/citizen');
          }
        }
      })
      .catch(() => {});
  }, [router, redirect]);

  const applyTouristPreset = async (presetId: string) => {
    setTouristIdentifier(presetId);
    setTouristLoading(true);
    setTouristError(null);
    try {
      const res = await fetch('/api/auth/tourist-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: presetId }),
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
      router.push((redirect || '/authority') as any);
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
    <div className="minimal-page min-h-screen flex flex-col justify-between font-sans">
      <div className="minimal-nav">
        <Link href="/" className="text-xl font-semibold tracking-tight text-ink">
          Prahari
        </Link>
      </div>

      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">Sign in to Prahari</h1>
            <p className="text-base text-ink-soft">Choose the access type that applies to you.</p>
          </div>

          <Link href="/onboarding" className="minimal-button minimal-button-primary w-full">
            New traveller? Create your Digital Tourist ID <span aria-hidden>→</span>
          </Link>

          <div className="minimal-card !min-h-0 p-5 md:p-6 space-y-5">
            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                className={`minimal-button text-xs ${activeTab === 'staff' ? 'minimal-button-primary' : 'minimal-button-secondary'}`}
              >
                <Building2 className="w-4 h-4" /> Staff &amp; Authority
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tourist')}
                className={`minimal-button text-xs ${activeTab === 'tourist' ? 'minimal-button-primary' : 'minimal-button-secondary'}`}
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
                <button type="submit" disabled={staffLoading} className="minimal-button minimal-button-primary w-full !py-3">
                  {staffLoading ? 'Verifying credentials…' : 'Sign in to authority desk'}
                </button>

                {/* Presets */}
                <div className="pt-4 border-t-2 border-line space-y-2">
                  <span className="text-[10px] uppercase tracking-wider text-ink-soft block text-center font-semibold">
                    Demo access
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => applyStaffPreset('officer.sharma@police.gov.in', 'Officer@123')}
                      className="minimal-button minimal-button-secondary text-[11px] !px-1">Authority</button>
                    <button type="button" onClick={() => applyStaffPreset('unit17@dispatch.gov.in', 'Unit17@123')}
                      className="minimal-button minimal-button-secondary text-[11px] !px-1">Unit #17</button>
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
                <button type="submit" disabled={touristLoading} className="minimal-button minimal-button-primary w-full !py-3">
                  {touristLoading ? 'Verifying ID…' : 'Open traveller safety hub'}
                </button>
                <div className="pt-4 border-t-2 border-line space-y-3">
                  <button type="button" onClick={() => applyTouristPreset('TOUR-7890')}
                    disabled={touristLoading}
                    className="minimal-button minimal-button-secondary w-full text-xs">
                    {touristLoading ? 'Verifying demo ID…' : <>Use demo traveller: <strong>TOUR-7890</strong></>}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="text-center text-[11px] text-ink-soft flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Demo environment · Do not enter real identity documents</span>
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
