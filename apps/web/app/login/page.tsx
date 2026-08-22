'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  User,
  Radio,
  Sparkles,
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

  // Quick Preset Handlers
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

      // Route based on role or redirect query param
      if (redirect) {
        router.push(redirect as any);
      } else if (data.user.role === 'admin' || data.user.role === 'authority') {
        router.push('/admin');
      } else {
        router.push('/admin');
      }
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

      if (redirect) {
        router.push(redirect as any);
      } else {
        router.push('/citizen');
      }
      router.refresh();
    } catch (err: any) {
      setTouristError(err.message || 'Connection error. Please try again.');
    } finally {
      setTouristLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* 1. Official Government Header Strip */}
      <div className="bg-slate-900 border-b border-slate-800 text-[11px] px-4 md:px-8 py-2 flex flex-wrap items-center justify-between text-slate-300 font-mono">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-bold">🇮🇳 भारत सरकार | GOVERNMENT OF INDIA</span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-400">MINISTRY OF TOURISM & HOME AFFAIRS</span>
        </div>
        <div className="text-emerald-400 font-bold">
          ● SECURE AUTHENTICATION GATEWAY (FORM A-01)
        </div>
      </div>

      {/* 2. Main Login Container */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-lg space-y-6">
          {/* Brand Logo & Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-gradient-to-tr from-blue-700 to-indigo-600 rounded-2xl text-white shadow-xl shadow-blue-600/30 mb-2">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              PRAHARI ACCESS PORTAL
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Role-Based Access Control • W3C Credential Verification • Government Dispatch
            </p>
          </div>

          {/* Login Card */}
          <div className="glass-panel p-6 md:p-8 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl space-y-6">
            {/* Tab Selector */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'staff'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4" /> Staff & Authority
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tourist')}
                className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'tourist'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4" /> Tourist & Citizen
              </button>
            </div>

            {/* TAB 1: STAFF LOGIN */}
            {activeTab === 'staff' && (
              <form onSubmit={handleStaffLogin} className="space-y-4 text-xs">
                {staffError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{staffError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    Official Government Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="officer.sharma@police.gov.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 text-xs font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={staffLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {staffLoading ? 'Verifying Credentials...' : 'Authenticate & Open Command Console →'}
                </button>

                {/* Quick Presets for Demo */}
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block text-center font-bold">
                    ⚡ Quick Demo Credential Presets
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => applyStaffPreset('officer.sharma@police.gov.in', 'Officer@123')}
                      className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-[10px] text-blue-400 font-mono transition cursor-pointer"
                    >
                      👮 Authority
                    </button>
                    <button
                      type="button"
                      onClick={() => applyStaffPreset('admin@prahari.gov.in', 'Admin@123')}
                      className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-[10px] text-amber-400 font-mono transition cursor-pointer"
                    >
                      🛡️ Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => applyStaffPreset('unit17@dispatch.gov.in', 'Unit17@123')}
                      className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-[10px] text-emerald-400 font-mono transition cursor-pointer"
                    >
                      🚓 Unit #17
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* TAB 2: TOURIST LOGIN */}
            {activeTab === 'tourist' && (
              <form onSubmit={handleTouristLogin} className="space-y-4 text-xs">
                {touristError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{touristError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                    Decentralized Tourist ID (DID) or Tourist ID
                  </label>
                  <div className="relative">
                    <QrCode className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="did:prahari:... or TOUR-7890"
                      value={touristIdentifier}
                      onChange={(e) => setTouristIdentifier(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 text-xs font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Tourists verify using proof of DID credential ownership — no password required.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={touristLoading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {touristLoading ? 'Validating DID...' : 'Verify DID & Open Safety Hub →'}
                </button>

                {/* Quick Demo Preset & Onboarding Link */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <button
                    type="button"
                    onClick={() => setTouristIdentifier('TOUR-7890')}
                    className="w-full p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs text-emerald-400 font-mono transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>⚡ Quick Demo Tourist: <strong>TOUR-7890 (Ralston)</strong></span>
                  </button>

                  <div className="text-center pt-1">
                    <Link
                      href="/onboarding"
                      className="text-slate-400 hover:text-white transition inline-flex items-center gap-1.5 text-xs font-semibold"
                    >
                      New Traveller to India? <span className="text-emerald-400 font-bold underline">Complete Onboarding Enrolment →</span>
                    </Link>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Footer note */}
          <div className="text-center text-[11px] font-mono text-slate-500 flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Digital Personal Data Protection (DPDP) Act 2023 Aligned</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-mono">Loading authentication portal...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
