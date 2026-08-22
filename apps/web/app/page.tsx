'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Radio,
  FileText,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Activity,
  Layers,
  Globe,
  Award,
  Smartphone,
} from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function Home() {
  return (
    <div className="min-h-screen bg-bg text-ink font-sans">
      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-surface border-b-2 border-line px-4 md:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-accent text-accent-ink rounded-nb border-2 border-line shadow-nb-sm">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-ink">PRAHARI</h1>
            <p className="text-xs text-ink-soft hidden sm:block">
              Predictive Tourist Safety, Incident Response &amp; Digital ID
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/citizen" className="nb-btn text-xs" style={{ background: '#15a34a', color: '#fff' }}>
            <Smartphone className="w-4 h-4" /> <span className="hidden md:inline">Citizen Portal</span> →
          </Link>
          <Link href="/admin" className="nb-btn nb-btn-accent text-xs">
            <Radio className="w-4 h-4" /> <span className="hidden md:inline">Authority Command</span> →
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-ink tracking-tight leading-tight pt-4">
            AI-Driven Proactive Tourist Protection &amp; Emergency Incident Dispatch
          </h2>

          <p className="text-ink-soft text-sm md:text-base leading-relaxed">
            Transitioning traveller security from reactive post-incident reporting to proactive AI
            monitoring. Featuring W3C Verifiable Credentials, Turf.js spatial geofencing, automated
            E-FIR generation, and Sepolia blockchain evidence logging.
          </p>

          {/* Core Portal Entry Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-left">
            {/* Citizen Portal Card */}
            <Link
              href="/citizen"
              className="group nb-card p-6 flex flex-col justify-between transition-transform hover:-translate-x-1 hover:-translate-y-1"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-nb border-2 border-line text-white" style={{ background: '#15a34a' }}>
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <span className="nb-chip">PUBLIC / TRAVELLER</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-ink flex items-center justify-between gap-2">
                    Citizen &amp; Tourist Portal
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition text-accent" />
                  </h3>
                  <p className="text-xs text-ink-soft mt-2 leading-relaxed">
                    Your Verifiable Digital Tourist ID, 1-Click SOS Panic Button, automated E-FIR
                    draft generator, AI clothing profile builder, dynamic risk score, and voice
                    assistance.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-6 border-t-2 border-line flex items-center justify-between text-xs font-bold text-ink">
                <span>Open Citizen Safety Hub</span>
                <CheckCircle2 className="w-4 h-4 text-accent" />
              </div>
            </Link>

            {/* Authority Command Center Card */}
            <Link
              href="/admin"
              className="group nb-card p-6 flex flex-col justify-between transition-transform hover:-translate-x-1 hover:-translate-y-1"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-nb border-2 border-line bg-accent text-accent-ink">
                    <Radio className="w-6 h-6" />
                  </div>
                  <span className="nb-chip">AUTHORITY / POLICE</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-ink flex items-center justify-between gap-2">
                    Authority Command Dashboard
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition text-accent" />
                  </h3>
                  <p className="text-xs text-ink-soft mt-2 leading-relaxed">
                    District command monitor with live tourist spatial map, real-time incident queue,
                    intelligent responder dispatch, geofence zone creator, missing-tourist
                    investigation mode, and blockchain audit logs.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-6 border-t-2 border-line flex items-center justify-between text-xs font-bold text-ink">
                <span>Launch Command Center</span>
                <Building2 className="w-4 h-4 text-accent" />
              </div>
            </Link>
          </div>
        </section>

        {/* 4. Capabilities Matrix */}
        <section className="space-y-6 pt-6">
          <div className="border-b-2 border-line pb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-ink flex items-center gap-2">
                <Award className="w-5 h-5 text-accent" /> Key Technical Architecture Modules
              </h3>
              <p className="text-xs text-ink-soft">
                End-to-End Privacy, Proactive Anomaly Detection &amp; Immutable Audit Logging
              </p>
            </div>
            <span className="nb-chip normal-case tracking-normal font-mono">
              ISO/IEC 27001 &amp; DPDP Act Aligned
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Lock, title: 'W3C Verifiable Credentials', body: 'Privacy-preserving Decentralized Identifiers (DIDs) backed by offline Aadhaar/Passport MRZ check digits. Identity details stay encrypted and are accessed only during authorized emergencies.' },
              { icon: Layers, title: 'Turf.js Spatial Geofencing', body: 'Real-time point-in-polygon evaluation against government-published safe corridors, restricted areas, and live IMD/NDMA hazard overlays.' },
              { icon: FileText, title: 'Smart Dispatch & Auto E-FIR', body: 'Geodesic distance matching to the nearest available responder unit with ETA. Generates pre-filled draft E-FIRs subject to police verification.' },
              { icon: Activity, title: 'Dynamic Risk Engine (0–100)', body: 'Synthesizes location, night-travel factors, crime density, route anomaly, and environmental warnings into an explainable numerical score.' },
              { icon: Globe, title: 'Multilingual Voice SOS', body: 'Speech recognition across Indian regional languages for voice-based emergency reporting and cross-language translation.' },
              { icon: Lock, title: 'Sepolia Blockchain Audit', body: 'Anchors cryptographic evidence hashes on the Ethereum Sepolia testnet for immutable, tamper-evident audit trails.' },
            ].map((f, i) => (
              <div key={i} className="nb-card p-5 space-y-3">
                <div className="p-2.5 rounded-nb border-2 border-line bg-accent-soft text-accent-strong w-fit">
                  <f.icon className="w-5 h-5" />
                </div>
                <h4 className="font-black text-ink text-sm">{f.title}</h4>
                <p className="text-xs text-ink-soft leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Statistics Bar */}
        <section className="nb-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { label: 'Monitored Districts', value: '48', color: 'text-ink' },
            { label: 'Verified Credentials', value: '14,290+', color: 'text-accent-strong' },
            { label: 'Avg Response Time', value: '< 4.5m', color: 'text-ink' },
            { label: 'Audit Hashing', value: '100%', color: 'text-accent-strong' },
          ].map((s, i) => (
            <div key={i}>
              <span className="text-[11px] text-ink-soft font-bold block uppercase tracking-wide">{s.label}</span>
              <span className={`text-3xl font-black font-mono ${s.color} mt-1 block`}>{s.value}</span>
            </div>
          ))}
        </section>

        {/* 6. Advisory Notice */}
        <section className="nb-card p-5 flex items-start gap-4 text-xs" style={{ background: 'var(--nb-surface)' }}>
          <div className="p-2 rounded-nb border-2 border-line bg-warning text-ink shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-ink text-sm">
              Official Tourist Advisory: High Terrain &amp; Night Travel Guidance
            </h4>
            <p className="text-ink-soft leading-relaxed">
              Tourists visiting remote hill stations or cliff views are advised to keep location
              tracking enabled and download regional offline vector tiles. Night access to cliff
              trails is restricted after 19:00 hrs.
            </p>
          </div>
        </section>
      </main>

      {/* 7. Footer */}
      <footer className="border-t-2 border-line bg-surface px-4 md:px-8 py-8 text-xs text-ink-soft space-y-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-ink" />
            <div>
              <span className="font-black text-ink block">Prahari National Tourist Safety Initiative</span>
              <span className="text-[11px]">Maintained under Smart City &amp; Tourist Infrastructure Framework</span>
            </div>
          </div>
          <div className="flex items-center gap-5 font-mono font-bold text-[11px]">
            <Link href="/citizen" className="hover:text-accent transition">Citizen Portal</Link>
            <Link href="/admin" className="hover:text-accent transition">Admin Portal</Link>
            <a href="tel:112" className="text-danger hover:underline">SOS 112</a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto border-t-2 border-line pt-4 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span>© 2026 Government of India — Ministry of Tourism &amp; Home Affairs.</span>
          <span>DPDP Compliant • NCIIPC Security Standards</span>
        </div>
      </footer>
    </div>
  );
}
