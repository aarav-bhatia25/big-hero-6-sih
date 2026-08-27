'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Mail,
  KeyRound,
  AlertTriangle,
  QrCode,
  Smartphone,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '';
  const roleParam = searchParams.get('role');
  const errorParam = searchParams.get('error');

  const [activeTab, setActiveTab] = useState<'staff' | 'tourist'>(
    roleParam === 'tourist' ? 'tourist' : 'staff'
  );

  // Staff Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(
    errorParam === 'forbidden' ? 'Access denied. You do not have permission for that page.' : null
  );

  // Tourist Form State
  const [touristIdentifier, setTouristIdentifier] = useState('');
  const [touristRecoveryCode, setTouristRecoveryCode] = useState('');
  const [touristLoading, setTouristLoading] = useState(false);
  const [touristError, setTouristError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          const role = data.user.role;
          const safeRedirect = redirect.startsWith('/') ? redirect : '';
          const isAuthorityRoute = safeRedirect === '/authority' || safeRedirect === '/admin';
          const isResponderRoute = safeRedirect === '/dashboard';
          const canUseRequestedRoute = Boolean(safeRedirect)
            && (!isAuthorityRoute || role === 'admin' || role === 'authority')
            && (!isResponderRoute || role === 'responder' || role === 'admin' || role === 'authority');

          if (canUseRequestedRoute) {
            router.replace(safeRedirect as any);
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

  const handleQuickDemoLogin = async (role: 'authority' | 'responder') => {
    setStaffLoading(true);
    setStaffError(null);
    try {
      const emailToUse = role === 'responder' ? 'responder@police.gov.in' : 'officer.sharma@police.gov.in';
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse, password: 'Prahari@123' }),
      });
      const data = await res.json();
      if (!data.success) {
        setStaffError(data.error || 'Demo login failed.');
        return;
      }
      const targetRoute = redirect || (role === 'responder' ? '/dashboard' : '/authority');
      router.push(targetRoute as any);
      router.refresh();
    } catch (err: any) {
      setStaffError(err.message || 'Connection error.');
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
        body: JSON.stringify({ identifier: touristIdentifier, recoveryAccessCode: touristRecoveryCode }),
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
      <header className="minimal-nav">
        <Link href="/" className="ui-display text-2xl font-medium tracking-tight text-ink">
          Prahari
        </Link>
        <Link href="/onboarding" className="minimal-text-link">
          Create Tourist ID
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="ui-display text-3xl sm:text-4xl text-ink font-normal tracking-tight">
              Sign in to Prahari
            </h1>
            <p className="text-sm text-ink-soft">
              Access your authority command desk or traveller portal.
            </p>
          </div>

          <div className="minimal-card p-6 space-y-6">
            {/* Clean Segmented Tab Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-2 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'staff'
                    ? 'bg-surface text-ink shadow-sm border border-border'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Authority &amp; Staff</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tourist')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'tourist'
                    ? 'bg-surface text-ink shadow-sm border border-border'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Tourist &amp; Citizen</span>
              </button>
            </div>

            {/* STAFF LOGIN */}
            {activeTab === 'staff' && (
              <form onSubmit={handleStaffLogin} className="space-y-4">
                {staffError && (
                  <div className="p-3 rounded-lg bg-danger/10 border border-danger text-xs font-medium flex items-center gap-2 text-ink">
                    <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                    <span>{staffError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    Officer Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-ink-soft absolute left-3 top-3.5 z-10" />
                    <input
                      type="email"
                      required
                      placeholder="officer.sharma@police.gov.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="nb-input pl-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-ink-soft absolute left-3 top-3.5 z-10" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="nb-input pl-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={staffLoading}
                  className="minimal-button minimal-button-primary w-full !py-3 text-xs"
                >
                  {staffLoading ? 'Verifying credentials…' : 'Sign in to Authority Desk'}
                </button>

                {/* Quick Demo Login Option */}
                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-ink-soft">
                    <span className="flex items-center gap-1 font-medium text-ink">
                      <Zap className="w-3 h-3 text-amber-600" /> Demo Quick Access
                    </span>
                    <span>Evaluation ready</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('authority')}
                      disabled={staffLoading}
                      className="minimal-button minimal-button-secondary text-xs w-full !py-2"
                    >
                      <span>Authority Demo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('responder')}
                      disabled={staffLoading}
                      className="minimal-button minimal-button-secondary text-xs w-full !py-2"
                    >
                      <span>Responder Demo</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* TOURIST LOGIN */}
            {activeTab === 'tourist' && (
              <form onSubmit={handleTouristLogin} className="space-y-4">
                {touristError && (
                  <div className="p-3 rounded-lg bg-danger/10 border border-danger text-xs font-medium flex items-center gap-2 text-ink">
                    <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                    <span>{touristError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    Digital Tourist ID (DID)
                  </label>
                  <div className="relative">
                    <QrCode className="w-4 h-4 text-ink-soft absolute left-3 top-3.5 z-10" />
                    <input
                      type="text"
                      required
                      placeholder="did:prahari:... or DTI-IND-..."
                      value={touristIdentifier}
                      onChange={(e) => setTouristIdentifier(e.target.value)}
                      className="nb-input pl-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    Onboarding Recovery Code
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-ink-soft absolute left-3 top-3.5 z-10" />
                    <input
                      type="password"
                      required
                      placeholder="Saved during enrolment"
                      value={touristRecoveryCode}
                      onChange={(e) => setTouristRecoveryCode(e.target.value)}
                      className="nb-input pl-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={touristLoading}
                  className="minimal-button minimal-button-primary w-full !py-3 text-xs"
                >
                  {touristLoading ? 'Restoring session…' : 'Open Traveller Safety Hub'}
                </button>

                <div className="pt-3 border-t border-border text-center">
                  <Link
                    href="/onboarding"
                    className="text-xs text-ink-soft hover:text-ink font-medium inline-flex items-center gap-1"
                  >
                    <span>Need a Digital Tourist ID? Create one</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-ink-soft">
            Demo Environment · Prahari Tourist Safety Platform
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg text-ink flex items-center justify-center font-mono text-xs">Loading login portal...</div>}>
      <LoginFormContent />
    </Suspense>
  );
}
