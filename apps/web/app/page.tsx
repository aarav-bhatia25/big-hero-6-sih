'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Building2, Smartphone, Lock } from 'lucide-react';

export default function Home() {
  return (
    <div className="minimal-page min-h-screen flex flex-col justify-between font-sans">
      <header className="minimal-nav">
        <Link href="/" className="ui-display text-2xl font-medium tracking-tight text-ink">
          Prahari
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="minimal-text-link hidden sm:inline-block">
            Sign in
          </Link>
          <Link href="/onboarding" className="minimal-button minimal-button-primary text-xs">
            <span>Get Started</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16 space-y-12 sm:space-y-16">
        {/* Hero Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="minimal-eyebrow">Tourist Safety Command Platform</span>
          </div>
          
          <h1 className="ui-display text-4xl sm:text-5xl md:text-6xl text-ink font-normal leading-[1.12] tracking-tight">
            Travel with a <strong>verified ID.</strong>
            <br />
            <em className="font-serif italic text-ink-soft">Get help when it matters.</em>
          </h1>
          
          <p className="text-base sm:text-lg text-ink-soft max-w-lg mx-auto leading-relaxed">
            Prahari gives travellers a digital safety ID, optional location sharing, and a direct emergency route to authorised responders.
          </p>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/onboarding" className="minimal-button minimal-button-primary minimal-button-large w-full sm:w-auto">
              <span>Create tourist ID</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="minimal-button minimal-button-secondary minimal-button-large w-full sm:w-auto">
              <span>Sign in to Prahari</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="pt-2 text-xs text-ink-soft flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Mock KYC · Sepolia testnet · Location sharing is opt-in</span>
          </div>
        </div>

        {/* Portal Access Cards */}
        <div id="roles" className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Traveller Portal */}
          <div className="minimal-card p-6 sm:p-7 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-ink-soft" />
                  <span className="nb-chip nb-chip-accent text-[10px] py-0.5 px-2">
                    Traveller Portal
                  </span>
                </div>
                <span className="text-xs text-emerald-700 font-medium">Verified Identity</span>
              </div>
              
              <h2 className="ui-display text-2xl text-ink font-semibold">For travellers.</h2>
              <p className="text-sm text-ink-soft leading-relaxed">
                Create a digital tourist ID, keep emergency contacts on file, and reach help without exposing more location data than necessary.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Link href="/onboarding" className="minimal-button minimal-button-primary w-full justify-between">
                <span>Create tourist ID</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login?role=tourist" className="minimal-button minimal-button-secondary w-full justify-between">
                <span>Log in as traveller</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Authority Portal */}
          <div className="minimal-card p-6 sm:p-7 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-ink-soft" />
                  <span className="nb-chip text-[10px] py-0.5 px-2">
                    Authority Portal
                  </span>
                </div>
                <span className="text-xs text-sky-700 font-medium font-mono">24/7 Command</span>
              </div>

              <h2 className="ui-display text-2xl text-ink font-semibold">For authorised staff.</h2>
              <p className="text-sm text-ink-soft leading-relaxed">
                Review live incidents, safety signals, geofences, and verified traveller credentials from one operational desk.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Link href="/authority" className="minimal-button minimal-button-primary w-full justify-between">
                <span>Open authority desk</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login?role=staff" className="minimal-button minimal-button-secondary w-full justify-between">
                <span>Log in as authority</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Value Props / Trust Standard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto pt-6 border-t border-border">
          <div className="p-3 space-y-1">
            <span className="block font-semibold text-sm text-ink">Consent first</span>
            <span className="block text-xs text-ink-soft leading-relaxed">
              Location sharing can be disabled by the traveller at any time.
            </span>
          </div>
          <div className="p-3 space-y-1">
            <span className="block font-semibold text-sm text-ink">Human review</span>
            <span className="block text-xs text-ink-soft leading-relaxed">
              Safety signals support investigation; they do not make decisions.
            </span>
          </div>
          <div className="p-3 space-y-1">
            <span className="block font-semibold text-sm text-ink">Privacy preserving</span>
            <span className="block text-xs text-ink-soft leading-relaxed">
              Only a cryptographic credential commitment is anchored on-chain.
            </span>
          </div>
        </div>
      </main>

      <footer className="minimal-footer">
        <span>Prahari Tourist Safety Platform · Demo Environment</span>
        <a href="tel:112" className="font-semibold text-ink hover:underline">
          Emergency: 112
        </a>
      </footer>
    </div>
  );
}
